import { EC2Manager}  from './src/EC2Manager.js';



const manager=new EC2Manager();


manager.listInstances().then((instances)=>{

	console.log(JSON.stringify(instances));
	return instances;

}).then(()=>{


	if(typeof process.argv[2]=='string'&&process.argv[2][0]=='{'){


		var args=JSON.parse(process.argv[2]);
		if(args.method==='stopInstance'&&typeof args.instanceId =='string'){
			return manager.stopInstance(args.instanceId);
		}

		if(args.method==='terminateInstance'&&typeof args.instanceId =='string'){
			return manager.terminateInstance(args.instanceId);
		}

		return;
	}



}).catch((e)=>{
	console.error(e);
});



// .then(()=>{

// 	console.log('Creating instances');
// 	return manager.createInstance('Python:3  Biogeme Simulation')

// }).then((newInstanceData)=>{
// 	JSON.stringify(newInstanceData);
// });