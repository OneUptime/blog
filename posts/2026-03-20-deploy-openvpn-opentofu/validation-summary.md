# Validation Summary: How to Deploy OpenVPN with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- OpenVPN Access Server
- AWS EC2
- AWS Elastic IP
- AWS Security Groups
- AWS VPC Route Tables
- AWS Route 53
- OpenVPN `sacli`

## Sources Consulted
- OpenVPN Access Server configuration docs: https://openvpn.net/as-docs/configuration.html
- OpenVPN routing and NAT docs: https://openvpn.net/as-docs/v3/routing-and-nat.html
- OpenVPN split/full tunneling CLI docs: https://openvpn.net/as-docs/tutorials/tutorial--full-and-split-tunnel-vpn.html
- OpenVPN admin account reset docs: https://openvpn.net/as-docs/reset-admin-access.html
- OpenVPN IP addressing docs: https://openvpn.net/as-docs/ip-addressing.html
- OpenVPN system requirements docs: https://openvpn.net/as-docs/system-requirements.html
- OpenVPN cluster setup docs: https://openvpn.net/as-docs/v3/cluster-setup.html
- OpenVPN configuration database docs: https://openvpn.net/as-docs/config-database.html
- AWS Marketplace AMI alias docs: https://docs.aws.amazon.com/en_us/marketplace/latest/buyerguide/buyer-ami-aliases.html
- AWS shared AMI ownership docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sharing-amis.html
- AWS paid AMI discovery docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-paid-amis-finding-paid-ami.html
- Terraform AWS provider `aws_ami_ids` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami_ids
- Terraform implicit dependency tutorial showing `aws_eip` association: https://developer.hashicorp.com/terraform/tutorials/configuration-language/dependencies
- Terraform AWS EC2 tutorial showing `aws_instance` attributes such as `source_dest_check` and `primary_network_interface_id`: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/aws-create
- Terraform AWS provider v5 upgrade guide covering route targets via `network_interface_id` and `primary_network_interface_id`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-5-upgrade

## Issues Found
- The AMI owner comment was incorrect. The post claimed `679593333241` was the OpenVPN AWS account, but AWS documents Marketplace/verified-provider AMIs under the `aws-marketplace` owner alias. I changed the example to use `owners = ["aws-marketplace"]` and corrected the comment.
- The admin password bootstrap step used `chpasswd`, which is outdated for current Access Server defaults. OpenVPN now documents resetting the `openvpn` admin account through `sacli` as a local administrator account. I replaced the password setup commands with the documented `UserPropPut` and `SetLocalPassword` flow.
- The post used `vpn.client.routing.reroute_dns`, which does not match current documented split-tunnel CLI guidance. I changed it to the documented `vpn.client.routing.reroute_gw = false` setting so the example correctly enables split tunneling.
- The introduction claimed the example included persistent configuration storage, but the post only showed a single EC2 instance and did not configure an external database or other persistence layer. I removed that claim.
- The conclusion overstated `source_dest_check = false` as a general requirement. I clarified that it is essential when the instance is routing VPN client subnets to VPC resources.

## Review Notes
- The route-table example assumes the default Access Server client subnet `172.27.224.0/20`. If the VPN client subnet is changed in Access Server, the AWS return route must be updated to match.
- The example still injects the admin password through EC2 user data, so the secret will be exposed in instance user data and OpenTofu state unless additional secret-management controls are added.
- The AMI name filter depends on AWS Marketplace naming. If OpenVPN changes the published image name, the filter may need to be updated or replaced with a Marketplace AMI alias approach.
