# Validation Summary: How to Use Ansible to Create AWS Route Tables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS VPC
- AWS route tables
- AWS Internet Gateway
- AWS NAT Gateway
- AWS VPC peering
- YAML

## Sources Consulted
- Ansible `amazon.aws.ec2_vpc_route_table` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- Ansible `amazon.aws.ec2_vpc_route_table_info` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_info_module.html
- Ansible `amazon.aws.ec2_vpc_net` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- Ansible `amazon.aws.ec2_vpc_subnet` module documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- AWS VPC subnet route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS Internet Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS NAT Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC peering route table documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html

## Issues Found
- Existing route table examples used `route_table_id` without `lookup: id`. The Ansible module defaults `lookup` to `tag`, so using `route_table_id` alone can fail to find the intended table or create a new one. Added `lookup: id` to the update, delete, and `purge_routes: false` examples, and updated the surrounding text.
- The "Full VPC Networking Stack" section described the playbook as complete, but the example creates private subnets without NAT Gateway creation or a private route table. Renamed the section and wording to accurately describe it as a VPC/subnet/public route table example.
- The post stated that private subnets route internet traffic through a NAT Gateway. Updated the wording to clarify that this applies to private subnets that need outbound internet access.

## Review Notes
The examples are illustrative and use placeholder AWS resource IDs. The Ansible module documentation lists boto3 and botocore version requirements in addition to the collection install command already shown in the post.
