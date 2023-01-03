import AWS from 'aws-sdk';
import {
	EventEmitter
} from 'node:events';

import {
	EC2Manager
} from './EC2Manager.js';


import {
	generateKeyPair
} from 'node:crypto';

import sshpk from 'sshpk';

import fs from 'fs';

import {
	Client
} from 'ssh2';


export class SSHConsole extends EventEmitter {



	constructor(manager) {

		super();

		this._manager = manager;

	}


	generateKeys() {


		return new Promise((resolve, reject) => {

			generateKeyPair('rsa', {
				modulusLength: 4096,
				publicKeyEncoding: {
					type: 'pkcs1',
					format: 'pem'
				},
				privateKeyEncoding: {
					type: 'pkcs1',
					format: 'pem',
					// cipher: 'aes-256-cbc',
					// passphrase: 'top secret'
				}
			}, (err, publicKey, privateKey) => {
				// Handle errors and use the generated key pair.

				if (err) {
					reject(err);
					return;
				}

				const pemKey = sshpk.parseKey(publicKey, 'pem');
				const sshRsa = pemKey.toString('ssh');


				const pemPrivKey = sshpk.parsePrivateKey(privateKey, 'pem', {
					//passphrase:'top secret'
				});
				const sshRsaPriv = pemPrivKey.toString('pkcs1');

				resolve({
					publicKey: sshRsa,
					privateKey: sshRsaPriv
				});
			});

		});


	}


	sendPublicKey(instance, publicKey) {

		return this._manager.getInstance(instance).then((instanceData) => {

			return new Promise((resolve, reject) => {

				var params = {
					InstanceId: instance,
					AvailabilityZone: instanceData.Placement.AvailabilityZone,
					/* required */
					SSHPublicKey: publicKey,
					InstanceOSUser: 'ec2-user'
				};

				var ec2instanceconnect = new AWS.EC2InstanceConnect({
					apiVersion: '2018-04-02',
					region: "ca-central-1"
				});

				ec2instanceconnect.sendSSHPublicKey(params, (err, data) => {

					if (err) {
						reject(err);
						return;
					}

					resolve(data);

				});



			});

		});



	}



	sendFile(source, dest) {


		return new Promise((resolve, reject)=>{


		

			this._conn.sftp(function(err, sftp) {
				if (err) {
					reject(err);
					return;
				}

				console.log("- SFTP started");

				// upload file
				var readStream = fs.createReadStream(source);
				var writeStream = sftp.createWriteStream(dest);

				// what to do when transfer finishes
				writeStream.on('close', function() {
					console.log("- file transferred");
					sftp.end();
					resolve(this)
				});

				// initiate transfer of file
				readStream.pipe(writeStream);
			});

		});


	}


	connect(instance) {

		return this.generateKeys().then(({
			privateKey,
			publicKey
		}) => {


			return this.sendPublicKey(instance, publicKey).then((data) => {

				console.log(data);

				return new Promise((resolve) => {


					this._manager.getInstance(instance).then((instanceData) => {

						console.log(instanceData);

						const conn = new Client();

						conn.on('banner', (data) => {
							console.log(data);
						})

						conn.on('ready', () => {

							console.log('Client :: ready');

							this._conn = conn;
							resolve(this);



						}).connect({
							host: instanceData.PublicDnsName,
							port: 22,
							username: 'ec2-user',
							privateKey: privateKey,
							authHandler: ['publickey', 'hostbased']
						});

					})



				})


			});



		})

	}

	close() {
		if (this._conn) {
			this._conn.end();
			this._conn = null;
		}

	}

	exec(cmd, stdout, stderr, input) {

		if (!this._conn) {
			return Promise.reject('connection closed');
		}


		if (typeof cmd != 'string' && cmd.length > 0) {


			return this.exec(cmd.shift(), stdout, stderr, input).then((code) => {

				if (code != 0 || cmd.length == 0) {
					console.log(code);
					return code;
				}

				return this.exec(cmd, stdout, stderr, input);

			}).catch((e) => {
				console.log('error');
				console.error('error');
			})
		}


		if (typeof cmd == 'string') {

			return new Promise((resolve, reject) => {

				if (input) {
					input(cmd);
				} else {
					stdout(cmd);
				}

				this._conn.exec(cmd, {
					pty: true
				}, (err, stream) => {

					if (err) throw err;

					stream.on('close', (code, signal) => {

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