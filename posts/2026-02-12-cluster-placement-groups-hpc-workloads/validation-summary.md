# Validation Summary: How to Use Cluster Placement Groups for HPC Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2
- EC2 cluster placement groups
- Elastic Fabric Adapter (EFA)
- AWS CLI
- Open MPI
- Libfabric/OFI
- Amazon FSx for Lustre
- Terraform AWS provider

## Sources Consulted
- AWS EC2 placement group strategies: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
- AWS EC2 Elastic Fabric Adapter overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- AWS EC2 EFA and MPI getting started guide: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html
- AWS EC2 HPC instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/hpc.html
- AWS EC2 compute optimized instance specifications: https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html
- AWS CLI run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI authorize-security-group-egress reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- AWS CLI FSx create-file-system reference: https://docs.aws.amazon.com/cli/latest/reference/fsx/create-file-system.html
- Amazon FSx for Lustre getting started guide: https://docs.aws.amazon.com/fsx/latest/LustreGuide/getting-started.html
- Amazon FSx for Lustre client installation guide: https://docs.aws.amazon.com/fsx/latest/LustreGuide/install-lustre-client.html
- Terraform AWS provider aws_launch_template resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider aws_fsx_lustre_file_system resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_lustre_file_system
- Open MPI OFI/libfabric documentation: https://docs.open-mpi.org/en/v5.0.0/tuning-apps/networking/ofi.html

## Issues Found
- The placement group benefits overstated fixed bandwidth and latency numbers. Changed the wording from "up to 100 Gbps" and "single-digit microsecond latencies" to AWS-aligned language about higher per-flow throughput, high-bandwidth instance networking, and low inter-node latency.
- The instance table listed the whole `c6i` family as "latest gen compute" with 50 Gbps EFA. Updated it to `c6i.32xlarge`, because EFA support for C6i applies to the largest C6i sizes and C6i is no longer the latest compute generation.
- The EFA security group example only added the required all-protocol self-referencing ingress rule. Added the matching self-referencing egress rule and clarified that EFA requires all-protocol inbound and outbound access between nodes.
- The `aws ec2 run-instances --network-interfaces` example passed a JSON object, but the AWS CLI option expects a list. Wrapped the network interface object in a JSON array.
- The EFA verification command used `fi_info -p efa` without the installed binary path or endpoint type. Updated it to `/opt/amazon/efa/bin/fi_info -p efa -t FI_EP_RDM` and added the EFA binary/library paths to the profile snippet.
- The FSx for Lustre mount example used the legacy `lustre2.10` client and hard-coded `/fsx` as the mount name. Updated it to the current `lustre` client package and the documented mount format using `file-system-dns-name@tcp:/mountname` with `relatime,flock`.
- The Open MPI command disabled the `cm` PML with `--mca pml ^cm`, which can prevent Open MPI from using the OFI/libfabric path. Replaced it with `--mca pml cm --mca mtl ofi --mca mtl_ofi_provider_include efa`.

## Review Notes
Local `aws` and `terraform` binaries were not installed in the review environment, so command validation was performed against the current official AWS CLI, AWS service, Open MPI, and Terraform provider documentation.
