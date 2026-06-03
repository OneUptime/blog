# Validation Summary: How to Use Elastic Fabric Adapter (EFA) for HPC on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Fabric Adapter (EFA)
- Amazon EC2
- AWS CLI
- EC2 security groups
- EC2 cluster placement groups
- Libfabric
- Open MPI
- OSU Micro-Benchmarks
- AWS ParallelCluster
- Amazon CloudWatch / EFA monitoring

## Sources Consulted
- Amazon EC2 User Guide: Elastic Fabric Adapter for AI/ML and HPC workloads on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- Amazon EC2 User Guide: Get started with EFA and MPI for HPC workloads on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html
- Amazon EC2 User Guide: Create and attach an Elastic Fabric Adapter to an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html
- Amazon EC2 User Guide: Monitor an Elastic Fabric Adapter on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-working-monitor.html
- AWS ParallelCluster User Guide: Scheduling section - https://docs.aws.amazon.com/parallelcluster/latest/ug/Scheduling-v3.html
- AWS ParallelCluster User Guide: Elastic Fabric Adapter - https://docs.aws.amazon.com/parallelcluster/latest/ug/efa-v3.html
- OSU Micro-Benchmarks download endpoint - https://mvapich.cse.ohio-state.edu/download/mvapich/osu-micro-benchmarks-7.3.tar.gz

## Issues Found
- Security group guidance only showed an inbound self-referencing rule. AWS documents that EFA-enabled instances need security group rules allowing all inbound and outbound traffic to and from the security group itself. I clarified the outbound requirement and noted that a new security group allows outbound traffic by default unless outbound rules are restricted.
- The `run-instances` EFA example omitted `NetworkCardIndex=0`. AWS documentation shows `NetworkCardIndex=0,DeviceIndex=0,InterfaceType=efa` for a new primary EFA interface, so I added `NetworkCardIndex=0`.
- The placement group section appeared after a launch command that referenced the placement group. I clarified that the placement group must be created before running the earlier launch command.
- The EFA verification command used `fi_info -p efa`. AWS documentation recommends `fi_info -p efa -t FI_EP_RDM` to confirm Libfabric EFA RDM endpoints, so I updated the command and explanatory text.

## Review Notes
- AWS documentation now states that EFA installer 1.30.0 and later installs both Open MPI 4.1 and Open MPI 5 by default; the post's `/opt/amazon/openmpi` examples remain correct for Open MPI 4.1.
- The ParallelCluster YAML is a valid minimal snippet for enabling EFA on Slurm compute resources, but a complete cluster configuration also needs required sections such as `HeadNode` and an image/OS selection.
- EFA has limitations not covered in detail here, including that EFA traffic cannot cross Availability Zones or VPCs and RDMA write support varies by instance type. The post's supported-instance query is the right way to check current regional support.
