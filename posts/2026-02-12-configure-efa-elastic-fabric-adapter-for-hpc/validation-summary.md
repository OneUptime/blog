# Validation Summary: How to Configure EFA (Elastic Fabric Adapter) for HPC

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- AWS Elastic Fabric Adapter (EFA)
- Amazon EC2
- AWS CLI
- Security groups
- EC2 placement groups
- libfabric / OFI
- Open MPI
- OSU Micro-Benchmarks
- AWS OFI NCCL
- PyTorch distributed training
- AWS ParallelCluster

## Sources Consulted
- AWS EC2 User Guide: Elastic Fabric Adapter for AI/ML and HPC workloads on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- AWS EC2 User Guide: Get started with EFA and MPI for HPC workloads on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html
- AWS EC2 User Guide: Create and attach an Elastic Fabric Adapter to an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html
- AWS EC2 User Guide: Get started with EFA and NCCL for ML workloads on Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start-nccl.html
- AWS EC2 User Guide: Maximize network bandwidth on Amazon EC2 instances with multiple network cards - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-acc-inst-types.html
- AWS ParallelCluster User Guide: Scheduling section / Efa settings - https://docs.aws.amazon.com/parallelcluster/latest/ug/Scheduling-v3.html
- AWS EC2 Hpc6a instance page - https://aws.amazon.com/ec2/instance-types/hpc6a/
- AWS EC2 Hpc7g instance page - https://aws.amazon.com/ec2/instance-types/hpc7g/
- AWS EC2 P4 instance page - https://aws.amazon.com/ec2/instance-types/p4/
- AWS EC2 Accelerated Computing instance page - https://aws.amazon.com/ec2/instance-types/accelerated-computing/
- Open MPI documentation: OpenFabrics Interfaces (OFI) / Libfabric support - https://docs.open-mpi.org/en/v5.0.0/tuning-apps/networking/ofi.html
- OSU Micro-Benchmarks upstream download site - https://mvapich.cse.ohio-state.edu/benchmarks/

## Issues Found
- The introduction claimed that EFA generally drops latency to single-digit microseconds. AWS documentation describes EFA as lower and more consistent latency than TCP, but does not support that blanket numeric claim, and the post's own benchmark section expected 15-20 microseconds on hpc6a. Changed the wording to avoid the unsupported numeric guarantee.
- The security group example only added the inbound self-referencing all-traffic rule. AWS EFA documentation requires all inbound and outbound traffic to and from the security group itself. Added the outbound self-referencing rule and updated the explanation.
- The benchmark commands assumed OSU Micro-Benchmarks existed under `/opt/amazon/openmpi/tests/...`. AWS EFA installer documentation states the installer provides libfabric and Open MPI under `/opt/amazon/...`, but does not document that OSU benchmark path. Updated the example to download, build, and install OSU Micro-Benchmarks with `/opt/amazon/openmpi/bin/mpicc`, then run `osu_latency` and `osu_bw` from the installed benchmark path.

## Review Notes
- The AWS EFA installer now installs both Open MPI 4.1 and Open MPI 5 by default; the post uses the Open MPI 4.1 path `/opt/amazon/openmpi`, which remains valid.
- `FI_EFA_USE_DEVICE_RDMA=1` is appropriate only on instance types that support EFA RDMA. The post states this caveat in the flag description.
- Multi-card accelerated instances such as P5 can require additional EFA-only interfaces to reach maximum EFA bandwidth; the post's single-interface launch example is valid for the hpc6a example but is not a complete maximum-bandwidth P5 launch pattern.
