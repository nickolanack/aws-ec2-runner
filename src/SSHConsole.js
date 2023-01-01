import AWS from 'aws-sdk';
import {
	EventEmitter
} from 'node:events';

import {
	EC2Manager
} from './EC2Manager.js';


import {generateKeyPair} from 'node:crypto';

import sshpk from 'sshpk';

import { Client }  from 'ssh2';


export class SSHConsole extends EventEmitter {



	constructor(manager) {

		super();

		this._manager=manager;

	}

	connect(args){


			return new Promise((resolve)=>{



				var ec2instanceconnect = new AWS.EC2InstanceConnect({
					apiVersion: '2018-04-02',
					region: "ca-central-1"
				});


				generateKeyPair('rsa', {
					modulusLength: 4096,
					publicKeyEncoding: {
						type: 'spki',
						format: 'pem'
					},
					privateKeyEncoding: {
						type: 'pkcs8',
						format: 'pem',
						// cipher: 'aes-256-cbc',
						// passphrase: 'top secret'
					}
				}, (err, publicKey, privateKey) => {
					// Handle errors and use the generated key pair.

					if(err){
						throw err;
					}

					const pemKey = sshpk.parseKey(publicKey, 'pem');
	        		const sshRsa = pemKey.toString('ssh');


	        		const pemPrivKey = sshpk.parsePrivateKey(privateKey, 'pem', {
	        			//passphrase:'top secret'
	        		});
	        		const sshRsaPriv = pemPrivKey.toString('pkcs1');

					//console.log(sshRsa);
					//console.log(sshRsaPriv);

					var params = {
						InstanceId: args.instance,
						AvailabilityZone: "ca-central-1a",
						/* required */
						SSHPublicKey: sshRsa,
						InstanceOSUser:'ec2-user'
					};
					ec2instanceconnect.sendSSHPublicKey(params, (err, data) => {


						console.log(data);


						this._manager.getInstance(args.instance).then((instanceData)=>{
				
							console.log(instanceData);

							const conn = new Client();
							
							conn.on('banner', (data)=>{
								console.log(data);
							})
							
							conn.on('ready', () => {
							  
							  console.log('Client :: ready');

							  this._conn=conn;
							  resolve(this);



							}).connect({
							  host: instanceData.PublicDnsName,
							  port: 22,
							  username: 'ec2-user',
							  privateKey: sshRsaPriv,
							  authHandler:['publickey','hostbased']
							});

						})

						
					});

				});

			})

	}

	close(){
		if(this._conn){
			this._conn.end();
			this._conn=null;
		}

	}

	exec(cmd, stdout, stderr, input){

		if(!this._conn){
			return Promise.reject('connection closed');
		}


		if(typeof cmd !='string'&&cmd.length>0){


			return this.exec(cmd.shift(), stdout, stderr, input).then((code)=>{

				if(code!=0||cmd.length==0){
					console.log(code);
					return code;
				}

				return this.exec(cmd, stdout, stderr, input);

			}).catch((e)=>{
				console.log('error');
				console.error('error');
			})
		}


		if(typeof cmd =='string'){

			return new Promise((resolve, reject)=>{

				if(input){
					input(cmd);
				}else{
					stdout(cmd);
				}
				
				this._conn.exec(cmd, { pty: true }, (err, stream) => {
						
						if (err) throw err;
						
						stream.on('close', (code, signal) => {
							
							console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
							resolve(code);

						}).on('data', (data) => {
							stdout(data.toString());
						}).stderr.on('data', (data) => {
							stderr(data.toString());
						});
					});
			});

		}

		



	}


}