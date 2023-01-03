import {
	EC2Manager
} from './src/EC2Manager.js';

import {
	SSHConsole
} from './src/SSHConsole.js';


import AWS from 'aws-sdk';

import { SocketIOClient } from 'push-node-socket-io-client';
import fs from 'fs';

const manager = new EC2Manager();


manager.setInstanceParams({

	ImageId: 'ami-06c3426233c180fef',
	InstanceType: 't2.micro',
	KeyName: 'ec2_rsa',

}).setValidInstanceOptions({

	ImageId: ['ami-014b71fc78f51dec0', 'ami-06c3426233c180fef'], //todo create more images 
	InstanceType: ['t2.nano', 't2.micro', 't2.small', 't2.medium', 't2.large', 't2.xlarge', 't2.2xlarge', 'm5a.4xlarge', 'm5a.8xlarge', 'm5a.12xlarge'],

}).listInstances().then((instances) => {

	return instances;

}).then((instances) => {


	if (typeof process.argv[2] == 'string' && process.argv[2][0] == '{') {


		var arg = process.argv[2];

		if (arg.indexOf('{\\"') === 0) {
			arg = arg.replaceAll('\\"', '"');
		}

		var args = JSON.parse(arg);


		if (args.method === 'listInstances') {
			console.log(JSON.stringify(instances));
			return;
		}


		if (args.method === 'createInstance') {
			var options = args.options || {}


			if (options.mem && options.cpu) {

				options.InstanceType = 't2.nano'; //1,0.5

				var mem = parseFloat(options.mem);
				var cpu = parseFloat(options.cpu);

				if (mem >= 1) { //1, 1
					options.InstanceType = 't2.micro';
				}

				if (mem >= 2) { //1, 2
					options.InstanceType = 't2.small';
				}

				if (cpu >= 2 || mem >= 2) { //2, 4
					options.InstanceType = 't2.medium';
				}

				if (mem > 2) { //2, 8
					options.InstanceType = 't2.large';
				}

				if (cpu > 2 || mem > 8) { //4, 16
					options.InstanceType = 't2.xlarge';
				}

				if (cpu > 4 || mem > 16) { //8, 32
					options.InstanceType = 't2.2xlarge';
				}


				if (cpu > 8 || mem > 32) { //16, 64
					options.InstanceType = 'm5a.4xlarge';
				}

				if(cpu > 16 || mem > 64){
					options.InstanceType = 'm5a.8xlarge';
				}

				if(cpu > 32 || mem > 128){
					options.InstanceType = 'm5a.12xlarge';
				}


			}

			if(options.ttl){
				//add tag
				options.tags={TTL:options.ttl};
			}


			return manager.createInstance(options.title || "Untitled instance", args.options).then((instance)=>{
				console.log(JSON.stringify(instance));
			});

			//return;
		}



		if (args.method === 'stopInstance' && typeof args.instance == 'string') {
			console.log('Stopping instance: ' + args.instance);
			return manager.stopInstance(args.instance);

			//return;
		}

		if (args.method === 'terminateInstance' && typeof args.instance == 'string') {
			console.log('Terminating instance: ' + args.instance);
			return manager.terminateInstance(args.instance);

			//return;
		}


		if (args.method === 'uploadFile') {

			var options = args.options || {}
		
			return (new SSHConsole(manager)).connect(args.instance).then((conn) => {
				return conn.sendFile(options.file.replaceAll("\\/",'/'), '~/'+options.name);
			}).then((conn)=>{
				conn.close();
			});


		}


		if (args.method === 'connectSSH') {




			const config= JSON.parse(fs.readFileSync('./.socket.json'));
			console.log(config);


			const client = new SocketIOClient(config.server);

			console.log(Object.keys(client));

			client.connect(config.auth, (success) => {

				if(!success){
					console.log("Failed to connect");
					return;
				}
			



				(new SSHConsole(manager)).connect(args.instance).then((conn) => {


					console.log('[');


					return conn.exec(args.command, (out)=>{

						client.emit(args.instance, 'terminal', {out:out});
						console.log(JSON.stringify({out:out})+',');
					
					}, (err)=>{
					
						client.emit(args.instance, 'terminal', {err:err});
						console.log(JSON.stringify({err:err})+',');
					
					}, (mirror)=>{
					
						client.emit(args.instance, 'terminal', {in:mirror});
						console.log(JSON.stringify({in:mirror})+',');
					
					}).then((code)=>{
						
						client.emit(args.instance, 'terminal', {code:code});
						console.log({code:code});

						console.log(']')
						conn.close();
						client.close();

					});		

				})

			});

		}

		console.log('Nothing to do :' + JSON.stringify(args));

		return;
	}

	console.log(JSON.stringify(instances));



}).catch((e) => {
	console.error(e);
});



// .then(()=>{

// 	console.log('Creating instances');
// 	return manager.createInstance('Python:3  Biogeme Simulation')

// }).then((newInstanceData)=>{
// 	JSON.stringify(newInstanceData);
// });