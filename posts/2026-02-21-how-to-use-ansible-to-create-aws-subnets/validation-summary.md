# Validation Summary: How to Use Ansible to Create AWS Subnets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS VPC subnets
- AWS route tables
- Amazon RDS DB subnet groups
- Amazon EKS networking
- AWS Load Balancer Controller subnet tags
- Network ACLs
- IPv4 and IPv6 CIDR planning

## Sources Consulted
- Ansible `amazon.aws.ec2_vpc_subnet` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- Ansible `amazon.aws.ec2_vpc_subnet_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_info_module.html
- Ansible `amazon.aws.ec2_vpc_route_table` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_route_table_module.html
- Ansible `amazon.aws.ec2_vpc_route_table` module source: https://github.com/ansible-collections/amazon.aws/blob/main/plugins/modules/ec2_vpc_route_table.py
- Ansible `amazon.aws.rds_subnet_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_subnet_group_module.html
- Ansible `amazon.aws.ec2_vpc_nacl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_nacl_module.html
- Amazon VPC subnet sizing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- Amazon VPC subnet route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC delete subnet documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-deleting.html
- Amazon RDS `CreateDBSubnetGroup` API documentation: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBSubnetGroup.html
- Amazon EKS VPC CNI documentation: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- AWS Load Balancer Controller subnet discovery documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/

## Issues Found
- Clarified the route table explanation. The post said a subnet without an explicit association uses the VPC main route table "which only has local routing." AWS documents that a new nondefault VPC's main route table has only local routes by default, but users can add routes later, so the wording now includes that caveat.
- Clarified the EKS pod IP statement. The post said each EKS pod can get its own VPC IP address. AWS documents that this behavior comes from the default Amazon VPC CNI, so the statement now names the CNI explicitly.
- Clarified subnet deletion prerequisites. The post only called out running instances and "other resources." AWS documents that network interfaces and other associated resources must also be removed, so the deletion note now calls out network interfaces directly.

## Review Notes
The Ansible examples use current fully qualified collection module names and parameters that align with the official `amazon.aws` collection documentation. The route table example's `nat_gateway_id` route key is accepted by the module implementation, although the public docs primarily describe route targets using `gateway_id` and related target keys. The IPv6 example assumes the provided `vpc_ipv6_cidr` value is an AWS-assigned `/56` whose derived `/64` remains inside that range.
