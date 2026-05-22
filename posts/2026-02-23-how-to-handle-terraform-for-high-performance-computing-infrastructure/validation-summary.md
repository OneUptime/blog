# Validation Summary: How to Handle Terraform for High-Performance Computing Infrastructure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS EC2
- EC2 placement groups
- Elastic Fabric Adapter (EFA)
- Amazon FSx for Lustre
- Amazon EFS
- AWS Auto Scaling
- Amazon CloudWatch alarms
- AWS Budgets
- Slurm

## Sources Consulted
- Terraform AWS provider documentation for `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider documentation for `aws_network_interface`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface
- Terraform AWS provider documentation for `aws_fsx_lustre_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_lustre_file_system
- Terraform AWS provider documentation for `aws_fsx_data_repository_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/fsx_data_repository_association
- Terraform AWS provider documentation for `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider documentation for `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- AWS EC2 Elastic Fabric Adapter documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- AWS EC2 EFA network bandwidth and multi-network-card guidance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-acc-inst-types.html
- AWS EC2 block device mapping documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/block-device-mapping-concepts.html
- AWS FSx for Lustre deployment and throughput documentation: https://docs.aws.amazon.com/fsx/latest/LustreGuide/using-fsx-lustre.html
- AWS EFS throughput mode documentation: https://docs.aws.amazon.com/efs/latest/ug/throughput-modes.html
- AWS Spot Instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html

## Issues Found
- The EC2 example used the deprecated `network_interface` block while also setting `subnet_id` on the instance. Updated it to use the current `primary_network_interface` block and rely on the subnet from the `aws_network_interface` resource.
- The p4d example manually declared an `ephemeral_block_device` for NVMe instance store. AWS documents that NVMe instance store volumes are automatically enumerated and block device mappings have no effect, so the snippet now instructs users to format and mount the automatically exposed volumes in user data.
- The FSx for Lustre example used `import_path` and `export_path` with `PERSISTENT_2`. Terraform AWS provider documentation states those arguments are not supported for `PERSISTENT_2`; the post now uses `aws_fsx_data_repository_association`.
- The Auto Scaling group referenced `aws_launch_template.hpc_worker`, but the later launch template snippet was named `hpc_spot`. Renamed the launch template resource to `hpc_worker` so the examples are consistent.
- The EFA bandwidth claim said EFA provides bandwidth up to 400 Gbps. Updated it to clarify that bandwidth depends on the supported instance type, with p4d at 400 Gbps and newer accelerated instances supporting higher bandwidth.
- The Spot Instance savings claim said 60-90% savings. Updated it to the AWS-documented "up to 90%" framing.

## Review Notes
The snippets remain illustrative and omit surrounding variables, data sources, IAM roles, security group rules, AMI filters, and scheduler bootstrap scripts. A production HPC Terraform module should also account for quota checks, capacity reservations or allocation strategies, cluster placement group capacity constraints, EFA-compatible AMIs and drivers, Slurm node registration behavior, and FSx mount-name handling.
