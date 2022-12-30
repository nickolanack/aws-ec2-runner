import AWS from 'aws-sdk';
import {
	EventEmitter
} from 'node:events';

export class EC2Manager extends EventEmitter {



	constructor() {

		super();
		AWS.config.getCredentials((err) => {

			if (err) {
				console.log(err.stack);
				return;
			}



			AWS.config.update({
				region: 'ca-central-1'
			});

			console.log("Access key:", AWS.config.credentials.accessKeyId);
			console.log("Region: ", AWS.config.region);


			this._loaded = true;
			this._ec2 = new AWS.EC2({
				apiVersion: '2016-11-15'
			});


			this.emit('load')

		});

	}

	_init() {

		return new Promise((resolve) => {


			if (this._loaded == true) {
				resolve(true);
				return;
			}

			this.on('load', () => {
				resolve(true);
			});

		});


	}

	listInstances() {



		return this._init().then(() => {


			var params = {
				DryRun: false
			};

			console.log("Listing instances");

			return new Promise((resolve) => {

				this._ec2.describeInstances(params, (err, data) => {

					if (err) {
						throw err;
					}



					console.log("Success");

					//console.log(JSON.stringify(data, null, '   '));


					var instances = data.Reservations.filter((instanceData) => {

						return instanceData.Instances[0].Tags.filter((tag) => {

							if (tag.Key === 'Name' && tag.Value.indexOf('ProcessRunner') === 0) {
								return true;
							}

							if (tag.Key === 'Owner' && tag.Value === 'hello-world') {
								return true;
							}

							return false;

						}).length === 2;

					}).filter((instanceData) => {

						return instanceData.Instances[0].State.Name != 'terminated';

					}).map((instanceData) => {

						let out = {};

						([

							"ImageId",
							"InstanceId",
							"InstanceType",
							"LaunchTime",
							"Monitoring",
							"Placement",
							"PublicDnsName",
							"PublicIpAddress",
							"State",
							"Architecture",
							"Tags",
							"CpuOptions",
							"PlatformDetails",
							"UsageOperation"

						]).forEach((k) => {
							out[k] =  instanceData.Instances[0][k];
						});


						return out;



					});


					resolve(instances);


				});

			});

		});


	}


	createInstance(label, options) {


		return this._init().then(() => {



			// AMI is amzn-ami-2011.09.1.x86_64-ebs
			var instanceParams = {
				ImageId: 'ami-014b71fc78f51dec0',
				InstanceType: 't2.micro',
				KeyName: 'ec2_rsa',
				MinCount: 1,
				MaxCount: 1
			};



			Object.keys(options || {}).forEach((k) => {
				instanceParams[k] = options[k];
			});

			return this._ec2.runInstances(instanceParams).promise();



		}).then((data) => {

			var instanceId = data.Instances[0].InstanceId;

			var tagParams = {
				Resources: [instanceId],
				Tags: [{
						Key: 'Name',
						Value: 'ProcessRunner ' + (new Date()).getTime()
					}, {
						Key: 'Owner',
						Value: 'hello-world'
					}, {
						Key: 'Label',
						Value: label
					}

				]
			};

			return this._ec2.createTags(tagParams).promise();
			
		});



	}



}