import { EC2Manager}  from './src/EC2Manager.js';



const manager=new EC2Manager();


manager.setInstanceParams({

	ImageId: 'ami-014b71fc78f51dec0', //my custom image
	InstanceType: 't2.micro',
	KeyName: 'ec2_rsa',

}).setValidInstanceOptions({

	ImageId:['ami-014b71fc78f51dec0'], //todo create more images 
	InstanceType: ['t2.nano', 't2.micro', 't2.small', 't2.medium', 't2.large'],

}).listInstances().then((instances)=>{

	return instances;

}).then((instances)=>{


	if(typeof process.argv[2]=='string'&&process.argv[2][0]=='{'){


		var arg=process.argv[2];
	
		if(arg.indexOf('{\\"')===0){
			arg=arg.replaceAll('\\"', '"');
		}		

		var args=JSON.parse(arg);

		if(args.method==='stopInstance'&&typeof args.instance =='string'){
			console.log('Stopping instance: '+args.instance);
			return manager.stopInstance(args.instance);

			//return;
		}

		if(args.method==='terminateInstance'&&typeof args.instance =='string'){
			console.log('Terminating instance: '+args.instance);
			return manager.terminateInstance(args.instance);

			//return;
		}


		if(args.method==='listInstances'){
			console.log(JSON.stringify(instances));
			return;
		}


		if(args.method==='createInstance'){
			var options=args.options||{}


			if(options.mem&&options.cpu){

				options.InstanceType='t2.nano'; //1,0.5

				var mem=parseFloat(options.mem);
				var cpu=parseFloat(options.cpu);

				if(mem>=1){ //1, 1
					options.InstanceType='t2.micro';
				}

				if(mem>=2){ //1, 2
					options.InstanceType='t2.small';
				}

				if(cpu>=2||mem>=2){ //2, 4
					options.InstanceType='t2.medium';
				}

				if(mem>2){ //2, 8
					options.InstanceType='t2.large';
				}

			}


			return manager.createInstance(options.title||"Untitled instance", args.options);

			//return;
		}

		console.log('Nothing to do :'+JSON.stringify(args));

		return;
	}

	console.log(JSON.stringify(instances));



}).catch((e)=>{
	console.error(e);
});



// .then(()=>{

// 	console.log('Creating instances');
// 	return manager.createInstance('Python:3  Biogeme Simulation')

// }).then((newInstanceData)=>{
// 	JSON.stringify(newInstanceData);
// });