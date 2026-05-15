# Validation Summary: How to Provision AWS EC2 Instances Running RHEL with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Terraform
- HashiCorp AWS Provider
- AWS EC2
- AWS VPC, subnets, route tables, internet gateways, security groups, and Elastic IPs
- AWS CLI

## Sources Consulted
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- HashiCorp AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS CLI v2 Linux install documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- AWS CLI `configure` command documentation: https://docs.aws.amazon.com/cli/latest/reference/configure/
- AWS EC2 default Linux usernames documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/managing-users.html
- AWS VPC internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC subnet route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Red Hat Customer Portal RHEL AMI listing guidance for AWS: https://access.redhat.com/solutions/15356
- Red Hat Customer Portal official RHEL AMI owner guidance: https://access.redhat.com/solutions/99333

## Issues Found
- The AWS CLI installation command used `sudo dnf install -y awscli2`. AWS's official AWS CLI v2 Linux installation documentation recommends the AWS CLI v2 bundled installer or the officially supported snap package, and notes that AWS does not maintain third-party repositories other than snap. Replaced the command with the official Linux x86_64 bundled installer flow using `curl`, `unzip`, and `sudo ./aws/install`.
- The Mermaid diagram showed the internet gateway as connected under the public subnet. AWS VPC documentation describes internet gateways as attached to a VPC, with public subnet internet access controlled through a subnet-associated route table route to the internet gateway. Updated the diagram to show the internet gateway attached to the VPC and the public subnet using a route table path to it.

## Review Notes
- The Terraform snippets use valid AWS provider resources and arguments for the stated provider constraint, including `aws_ami`, `aws_vpc`, `aws_subnet`, `aws_route_table`, `aws_route_table_association`, `aws_security_group`, `aws_instance`, and `aws_eip`.
- Red Hat's AWS account ID `309956199498` is correct for official RHEL AMIs outside GovCloud, and the RHEL 9 AMI lookup pattern is consistent with Red Hat's documented guidance to filter Red Hat-owned RHEL 9 images.
- The `ec2-user` SSH username is valid for RHEL AMIs according to AWS EC2 documentation.
- `availability_zone = "${var.aws_region}a"` is valid for common regions such as `us-east-1`, but a future improvement would be to use the `aws_availability_zones` data source to select an available AZ dynamically.
