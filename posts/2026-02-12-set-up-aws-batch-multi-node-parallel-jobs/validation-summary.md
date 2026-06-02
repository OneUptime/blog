# Validation Summary: How to Set Up AWS Batch Multi-Node Parallel Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Batch
- AWS Batch multi-node parallel jobs
- Amazon EC2 placement groups
- Elastic Fabric Adapter
- AWS CLI
- Docker
- OpenMPI
- SSH
- Amazon S3

## Sources Consulted
- AWS Batch User Guide: Multi-node parallel jobs: https://docs.aws.amazon.com/batch/latest/userguide/multi-node-parallel-jobs.html
- AWS Batch User Guide: MNP environment variables: https://docs.aws.amazon.com/batch/latest/userguide/mnp-env-vars.html
- AWS Batch User Guide: Compute environment considerations for MNP: https://docs.aws.amazon.com/batch/latest/userguide/mnp-ce.html
- AWS Batch User Guide: Node groups: https://docs.aws.amazon.com/batch/latest/userguide/mnp-node-groups.html
- AWS Batch User Guide: Job lifecycle for MNP jobs: https://docs.aws.amazon.com/batch/latest/userguide/job-lifecycle.html
- AWS Batch User Guide: Elastic Fabric Adapter: https://docs.aws.amazon.com/batch/latest/userguide/efa.html
- AWS CLI Command Reference: register-job-definition: https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
- AWS CLI Command Reference: submit-job: https://docs.aws.amazon.com/cli/latest/reference/batch/submit-job.html
- AWS CLI Command Reference: list-jobs: https://docs.aws.amazon.com/cli/latest/reference/batch/list-jobs.html
- AWS Batch API Reference: CreateComputeEnvironment: https://docs.aws.amazon.com/batch/latest/APIReference/API_CreateComputeEnvironment.html
- Open MPI documentation: mpirun: https://docs.open-mpi.org/en/v5.0.7/man-openmpi/man1/mpirun.1.html
- Open MPI documentation: Scheduling with hostfiles: https://docs.open-mpi.org/en/v5.0.x/launching-apps/scheduling.html

## Issues Found
- The post said each node knows the IP addresses of all other nodes. AWS Batch documents only the MNP-specific node index, main node index, node count, and the main node private IPv4 address on child nodes. Updated the explanation to say child nodes get the private IP address of the main node.
- The compute environment example referenced a placement group before creating it. Moved the placement group creation command before the compute environment command so the referenced placement group exists first.
- The prerequisites described "placement-group-enabled instances," which is not how AWS Batch documents the requirement. Updated it to a managed EC2 compute environment with a cluster placement group, with EFA configured separately when needed.
- The Docker image used `aws s3` commands in the entrypoint but did not install the AWS CLI. Added `awscli` to the package list.
- The SSH daemon may fail in a minimal Ubuntu container without `/run/sshd`. Added creation of that directory in the Dockerfile.
- The entrypoint comments implied AWS Batch provides child node IP addresses through `AWS_BATCH_JOB_NODE_INDEX`. Updated the comments to reflect that child nodes know the main node IP, while the main node needs the child nodes to register their IPs or discover them through application logic.
- The OpenMPI example runs as root in the Docker container. OpenMPI refuses root execution by default, so added `--allow-run-as-root` to the `mpirun` command.

## Review Notes
The S3-based node discovery example is technically plausible, but production use should also cover IAM permissions, bucket cleanup, retry/attempt isolation, and failure timeouts. EFA requires additional setup beyond choosing supported instance types, including an EFA-capable AMI/driver, compatible security group rules, a cluster placement group, and passing `/dev/infiniband/uverbs0` through the job definition.
