# Validation Summary: How to Use Ansible to Create AWS RDS Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- AWS RDS
- PostgreSQL on Amazon RDS
- MySQL on Amazon RDS
- Ansible Vault
- AWS VPC security groups and DB subnet groups
- RDS Multi-AZ, automated backups, snapshots, read replicas, and parameter groups

## Sources Consulted
- Ansible amazon.aws collection index: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible amazon.aws.rds_instance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_instance_module.html
- Ansible amazon.aws.rds_subnet_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_subnet_group_module.html
- Ansible amazon.aws.rds_param_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_param_group_module.html
- Ansible amazon.aws.rds_instance_snapshot module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_instance_snapshot_module.html
- AWS RDS Multi-AZ DB instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- AWS RDS storage autoscaling: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- AWS RDS for PostgreSQL versions: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS RDS for MySQL versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html

## Issues Found
- The prerequisites listed "Ansible 2.14+" and only "Python boto3". The current amazon.aws 10.3.1 documentation supports ansible-core 2.16.0 or newer, and the RDS modules require boto3 and botocore 1.34.0 or newer. Updated the prerequisite bullets accordingly.
- The DB subnet group example used placeholder strings such as `subnet-private-az-a`, but the module requires subnet IDs. Replaced them with ID-shaped placeholders.
- The PostgreSQL example pinned `engine_version: "15.4"`, which AWS documents as having reached the end of standard support. Changed it to the major version `15`, allowing RDS to select a current minor version for that major release.
- The MySQL example pinned `engine_version: "8.0.35"`, which is no longer in AWS's current supported minor version list. Changed it to the major version `8.0`, allowing RDS to select a current supported minor version.
- The manual snapshot example used `amazon.aws.rds_snapshot`, while the current amazon.aws collection documents `amazon.aws.rds_instance_snapshot` for RDS instance snapshots. Updated the module name.

## Review Notes
The remaining RDS and Ansible examples use documented module parameters and align with AWS behavior. The examples still use placeholder resource IDs and sample KMS/security group values, so readers must replace them with resources from their own AWS account.
