import AWS from 'aws-sdk';
import {
	EventEmitter
} from 'node:events';

export class EC2Manager extends EventEmitter {



	constructor() {

		super();


		/**
			* the default params used to create new instances, can be set by setInstanceParams, and can also be set from options when calling createInstance
			*/

		this._instanceParams = {

			ImageId: 'ami-06c3426233c180fef', //Amazon Linux 2 Kernel 5.10 AMI 2.0.20221210.1 x86_64 HVM gp2
			InstanceType: 't2.micro',
			//KeyName: 'ec2_rsa', //optional
			MinCount: 1,
			MaxCount: 1

		}


		/**
			* this is the list of valid instance params used to validate options passed to createInstance
			*/

		this._validInstanceParams = {
			ImageId: ['ami-06c3426233c180fef'],
			InstanceType: ['t2.micro'],
		};


		(new Promise((resolve, reject) => {

			AWS.config.getCredentials((err) => {

				if (err) {
					reject(err);
					return;
				}
				resolve(true);

			});


		})).catch(() => {

			AWS.config.loadFromPath('./.credentials.json');
			console.log('loaded from json file');
			return true;

		}).then(() => {


			AWS.config.update({
				region: 'ca-central-1'
			});

			//console.log("Access key:", AWS.config.credentials.accessKeyId);
			//console.log("Region: ", AWS.config.region);


			this._loaded = true;
			this._ec2 = new AWS.EC2({
				apiVersion: '2016-11-15'
			});


			this.emit('load')



		});



	}


	setInstanceParams(args) {

		Object.keys(args || {}).forEach((k) => {
			//whitelist
			if ((['ImageId', 'InstanceType', 'KeyName']).indexOf(k) === -1) {
				return;
			}
			this._instanceParams[k] = args[k];
		});

		return this;
	}


	setValidInstanceOptions(args) {
		Object.keys(args || {}).forEach((k) => {
			//whitelist
			if ((['ImageId', 'InstanceType', 'KeyName']).indexOf(k) === -1) {
				return;
			}
			this._validInstanceParams[k] = args[k];
		});

		return this;
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


			return new Promise((resolve) => {

				this._ec2.describeInstances(params, (err, data) => {

					if (err) {
						throw err;
					}



					//console.log("Success");
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
							out[k] = instanceData.Instances[0][k];
						});


						return out;



					});


					resolve(instances);


				});

			});

		});


	}


	createInstance(label, options) {


		options = options || {};


		// AMI is ami-06c3426233c180fef
		var instanceParams = JSON.parse(JSON.stringify(this._instanceParams));


		Object.keys(options || {}).forEach((k) => {
			//whitelist
			if ((Object.keys(this._validInstanceParams)).indexOf(k) === -1) {
				return;
			}

			if (this._validInstanceParams[k].indexOf(options[k]) === -1) {
				throw 'Invalid option for: ' + k + ' ' + options[k];
			}

			instanceParams[k] = options[k];
		});


		var tags = [{
				Key: 'Name',
				Value: 'ProcessRunner ' + (new Date()).getTime()
			}, {
				Key: 'Owner',
				Value: 'hello-world'
			}, {
				Key: 'Label',
				Value: label
			}

		];

		if (options.tags) {
			Object.keys(options.tags).forEach((n) => {

				//blacklist 
				if ((['Name', 'Owner', 'Label']).indexOf(k) >= 0) {
					return;
				}

				tags.push({
					Key: n,
					Value: options.tags[n]
				});

			});
		}


		return this._init().then(() => {



			return this._ec2.runInstances(instanceParams).promise();



		}).then((data) => {

			var instanceId = data.Instances[0].InstanceId;

			var tagParams = {
				Resources: [instanceId],
				Tags: tags
			};

			return this._ec2.createTags(tagParams).promise();

		});



	}

	hasInstance(instanceId) {
		return this.listInstances().then((instances) => {

			if (instances.filter((instance) => {
					return instance.InstanceId === instanceId
				}).length === 0) {
				return false;
			}
			return true;

		});
	}


	stopInstance(instanceId) {

		return this.hasInstance(instanceId).then((exists) => {

			if (!exists) {
				throw 'instance: ' + instanceId + ', not found';
			}

			var params = {
				InstanceIds: [
					instanceId
				]
			}

			return this._ec2.stopInstances(params).promise();


		});

	}

	terminateInstance(instanceId) {

		return this.hasInstance(instanceId).then((exists) => {

			if (!exists) {
				throw 'instance: ' + instanceId + ', not found';
			}

			var params = {
				InstanceIds: [
					instanceId
				]
			}

			return this._ec2.terminateInstances(params).promise();


		});

	}



}