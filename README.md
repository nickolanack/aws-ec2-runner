# aws-ec2-runner
Run large processing jobs by instantiating ec2 instances

This application is a work in progress...

Creates a simple user interface for creating ephemeral vms on aws for running jobs

Benifits of creating single use instances for running processes
 - Consistency. Install scripts work consistently accross all machines 
 - Scalable. Any number of instances can be created and run in parallel. Configurable cpus 
 - Start up speed. Can quickly create and run simulations on 
 - Cost. No need to buy hardware
 
 
Drawbacks
 - cost of larger vms can be prohibitive
 - environment setup required on all instances


