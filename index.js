import { EC2Manager}  from './src/EC2Manager.js';



const manager=new EC2Manager();


manager.listInstances().then((instances)=>{

	
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

			return;
		}

		if(args.method==='terminateInstance'&&typeof args.instance =='string'){
			console.log('Terminating instance: '+args.instance);
			return manager.terminateInstance(args.instance);

			return;
		}


		if(args.method==='listInstances'){
			console.log(JSON.stringify(instances));
			return;
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