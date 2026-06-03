# Validation Summary: How to Create Lightsail Instances with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lightsail
- Terraform
- HashiCorp AWS Provider
- AWS CLI
- Linux shell commands
- DNS and TLS certificates

## Sources Consulted
- HashiCorp Terraform AWS Provider `aws_lightsail_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_instance
- HashiCorp Terraform AWS Provider `aws_lightsail_static_ip` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_static_ip
- HashiCorp Terraform AWS Provider `aws_lightsail_static_ip_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_static_ip_attachment
- HashiCorp Terraform AWS Provider `aws_lightsail_instance_public_ports` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_instance_public_ports
- HashiCorp Terraform AWS Provider `aws_lightsail_database` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_database
- HashiCorp Terraform AWS Provider `aws_lightsail_lb_certificate_attachment` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lightsail_lb_certificate_attachment
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- AWS CLI `lightsail get-blueprints` documentation: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-blueprints.html
- AWS CLI `lightsail get-bundles` documentation: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-bundles.html
- AWS CLI `lightsail get-relational-database-bundles` documentation: https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-relational-database-bundles.html
- Amazon Lightsail instance bundles documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- Amazon Lightsail firewall documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-firewall-and-port-mappings-in-amazon-lightsail.html
- Amazon Lightsail certificates documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-certificates.html
- Amazon Lightsail VPC peering documentation: https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-set-up-vpc-peering-with-aws-resources.html

## Issues Found
- The Lightsail `user_data` examples used multi-line heredocs. The Terraform AWS Provider documents Lightsail `user_data` as a single-line launch script, so both examples were changed to single-line command strings.
- The instance bundle specs and pricing were outdated. Updated the listed Linux public IPv4 bundle prices and vCPU counts to match the current Amazon Lightsail bundle documentation and AWS CLI reference.
- The `small_3_0` instance comments said 1 vCPU. Updated them to 2 vCPU.
- The Lightsail database `micro_2_0` comment said 1 vCPU. Updated it to 2 vCPU based on the current relational database bundle reference.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`. Changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))` so Terraform expands the home-directory path explicitly.
- The firewall defaults were overgeneralized. Updated the wording to distinguish base OS blueprints from application blueprints that can include HTTPS by default.
- The load balancer certificate example implied the certificate could be attached immediately. Added wording and comments that the attachment should be applied after domain validation completes.
- The Lightsail vs EC2 section implied VPC peering is not available with Lightsail. Updated it to refer to custom VPC networking instead, because Lightsail supports peering with the default VPC in a Region.

## Review Notes
Terraform CLI was not installed in the workspace, so local `terraform validate` could not be run. The snippets were checked against the current official Terraform AWS Provider and AWS documentation instead.
