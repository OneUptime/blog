# Validation Summary: How to Configure EKS Private Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS VPC endpoints and AWS PrivateLink
- OpenTofu
- AWS CLI
- EC2 Instance Connect Endpoint
- kubectl
- Terraform AWS provider syntax used with OpenTofu

## Sources Consulted
- Amazon EKS cluster endpoint documentation: https://docs.aws.amazon.com/eks/latest/userguide/cluster-endpoint.html
- Amazon EKS private clusters with limited internet access: https://docs.aws.amazon.com/eks/latest/userguide/private-clusters.html
- Amazon EKS kubeconfig setup: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- EC2 Instance Connect Endpoint overview: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-ec2-instance-connect-endpoint.html
- EC2 Instance Connect Endpoint connection methods: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-using-eice.html
- EC2 Instance Connect installation and prerequisites: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS provider `aws_eks_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- Terraform AWS provider `aws_vpc_endpoint` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- Terraform AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_ec2_instance_connect_endpoint` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_instance_connect_endpoint

## Issues Found
- The introduction overstated private-cluster behavior by implying all cluster traffic stays within the VPC. I changed it to the documented EKS behavior: private endpoint access keeps Kubernetes API traffic private and requires access from within the VPC or a connected network.
- The prerequisites omitted required admin tooling and networking assumptions. I added the AWS CLI requirement, the VPC DNS requirements (`enableDnsSupport` and `enableDnsHostnames`), and the need for private subnets in at least two Availability Zones.
- The VPC endpoint list was incomplete for a no-internet private-cluster workflow. I added the Amazon EKS interface endpoint because `aws eks update-kubeconfig` and other EKS API calls need it from inside the VPC when there is no outbound internet access.
- The post treated STS and CloudWatch Logs as universally required endpoints. I changed them to conditional endpoints, added the EKS Auth endpoint for Pod Identity, and added the note that IRSA workloads must use the regional STS endpoint to benefit from the STS VPC endpoint.
- The EC2 Instance Connect section was inaccurate as written. It created only an EC2 instance, not an EC2 Instance Connect Endpoint, and it omitted the security groups needed for the access path. I corrected the HCL to include an `aws_ec2_instance_connect_endpoint` resource and matching security groups.
- The original bastion `user_data` contradicted the post's no-internet premise and used the wrong field semantics for encoded data. It base64-encoded content into `user_data` and attempted to download `kubectl` from the public internet from a private instance. I replaced that with a source-backed note to use an AMI or internal mirror that already provides `kubectl`, AWS CLI, and EC2 Instance Connect.
- The post did not mention that the EKS cluster security group must allow TCP/443 from the bastion host or connected network when the cluster uses a private-only API endpoint. I added that requirement.

## Review Notes
- Endpoint requirements for fully private clusters are workload-dependent. Services such as Elastic Load Balancing, SSM, EFS, X-Ray, and others may require additional interface endpoints beyond the ones shown in the post.
- `tofu` was not installed in the local workspace, so OpenTofu command verification relied on official OpenTofu CLI documentation rather than local `--help` output.
