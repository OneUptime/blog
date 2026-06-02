# Validation Summary: How to Set Up AWS ParallelCluster for HPC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS ParallelCluster
- AWS CloudFormation
- Amazon EC2
- Slurm
- Amazon EBS
- Amazon FSx for Lustre
- Amazon EFS
- Amazon S3
- Elastic Fabric Adapter
- Amazon CloudWatch
- AWS Cloud Development Kit
- Python and pip
- Node.js

## Sources Consulted
- AWS ParallelCluster documentation: Installing the AWS ParallelCluster CLI - https://docs.aws.amazon.com/parallelcluster/latest/ug/install-v3-parallelcluster.html
- AWS ParallelCluster documentation: Installing AWS ParallelCluster in a non-virtual environment using pip - https://docs.aws.amazon.com/parallelcluster/latest/ug/install-v3-pip.html
- AWS ParallelCluster documentation: Scheduling section - https://docs.aws.amazon.com/parallelcluster/latest/ug/Scheduling-v3.html
- AWS ParallelCluster documentation: SharedStorage section - https://docs.aws.amazon.com/parallelcluster/latest/ug/SharedStorage-v3.html
- AWS ParallelCluster documentation: Elastic Fabric Adapter - https://docs.aws.amazon.com/parallelcluster/latest/ug/efa-v3.html
- AWS ParallelCluster documentation: pcluster update-compute-fleet - https://docs.aws.amazon.com/parallelcluster/latest/ug/pcluster.update-compute-fleet-v3.html
- AWS ParallelCluster documentation: Monitoring AWS ParallelCluster and logs - https://docs.aws.amazon.com/parallelcluster/latest/ug/monitoring-overview.html
- AWS ParallelCluster documentation: Integration with Amazon CloudWatch Logs - https://docs.aws.amazon.com/parallelcluster/latest/ug/cloudwatch-logs-v3.html
- Amazon FSx for Lustre documentation: Exporting files using HSM commands - https://docs.aws.amazon.com/fsx/latest/LustreGuide/exporting-files-hsm.html
- Amazon EC2 documentation: Specifications for Amazon EC2 high-performance computing instances - https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html

## Issues Found
- The ParallelCluster CLI install command used a bare `pip3 install aws-parallelcluster`. Updated it to the current AWS-documented `python3 -m pip install "aws-parallelcluster" --upgrade --user` form.
- The Node.js installation example pinned Node.js 18 on Amazon Linux 2, which is no longer an appropriate LTS choice. Replaced it with the AWS-documented NVM flow for installing the latest LTS Node.js.
- The FSx for Lustre S3 integration example used different buckets for `ImportPath` and `ExportPath`. AWS requires the export path to use the same S3 bucket as the import path, so the example now uses separate prefixes in the same bucket.
- The FSx for Lustre HSM export sentence omitted that `hsm_archive` must run as root or with `sudo`. Updated the command reference to `sudo lfs hsm_archive`.
- The EFA configuration example selected an EFA-capable instance type but did not enable EFA in the ParallelCluster config. Added `Efa: Enabled: true` under the Slurm compute resource.
- The Spot Instance tip said to add `CapacityType: SPOT` to compute resources, but in ParallelCluster v3 it belongs at the Slurm queue level. Updated the wording.
- The deletion section implied that all networking components are deleted. Clarified that ParallelCluster deletes cluster-managed resources, while existing resources referenced in the configuration, such as the subnet, are not deleted.

## Review Notes
The post is accurate after these corrections. Some examples still use placeholder subnet IDs, key names, buckets, and application commands, which is appropriate for a tutorial but requires readers to substitute their own AWS resources and verify regional instance availability.
