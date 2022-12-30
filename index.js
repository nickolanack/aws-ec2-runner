import { EC2Manager}  from './src/EC2Manager.js';



const manager=new EC2Manager();


manager.listInstances().then((instances)=>{

	console.log(JSON.stringify(instances));
	return instances;

}).catch((e)=>{
	console.error(e);
})



// .then(()=>{

// 	console.log('Creating instances');
// 	return manager.createInstance('Python:3  Biogeme Simulation')

// }).then((newInstanceData)=>{
// 	JSON.stringify(newInstanceData);
// });