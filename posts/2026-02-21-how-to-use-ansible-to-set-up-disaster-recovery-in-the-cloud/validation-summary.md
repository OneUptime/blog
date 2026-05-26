# Validation Summary: How to Use Ansible to Set Up Disaster Recovery in the Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Amazon Web Services
- Amazon RDS
- Amazon EC2 and AMIs
- Amazon S3 replication
- Amazon Route 53
- Elastic Load Balancing target groups
- Disaster recovery, RTO, and RPO

## Sources Consulted
- Ansible `amazon.aws.rds_instance_snapshot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_instance_snapshot_module.html
- Ansible `amazon.aws.rds_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/rds_instance_module.html
- Ansible `community.aws.ec2_ami_copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ec2_ami_copy_module.html
- Ansible `amazon.aws.s3_bucket_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_info_module.html
- Ansible `community.aws.elb_target` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elb_target_module.html
- Ansible `community.aws.elb_target_group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/elb_target_group_module.html
- Ansible `amazon.aws.route53` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/route53_module.html
- AWS RDS read replica promotion documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- AWS RDS read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- AWS S3 replication status documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-status.html
- AWS S3 replication documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html
- AWS disaster recovery options whitepaper: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- AWS Route 53 DNS best practices: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/best-practices-dns.html

## Issues Found
- Replaced `amazon.aws.rds_snapshot` with the current `amazon.aws.rds_instance_snapshot` module. The current Amazon AWS collection documents RDS instance snapshot management under `rds_instance_snapshot`, including snapshot copy via `id`, `source_id`, and `source_region`.
- Updated RDS snapshot copy tasks to use `id` and `source_id` instead of `db_snapshot_identifier` and `source_db_snapshot_identifier`, matching the current module documentation.
- Replaced `amazon.aws.ec2_ami_copy` with `community.aws.ec2_ami_copy`, because AMI copy is documented in the `community.aws` collection, not the `amazon.aws` collection.
- Changed the S3 task from checking replication "status" to checking replication "configuration" and corrected `s3_bucket_info` usage to `name_filter` plus `bucket_facts.bucket_replication`. S3 object replication status is exposed per object, while this Ansible task retrieves bucket replication configuration.
- Added `primary_region` and `source_region` to the cross-region RDS read replica example so the source region is explicit for a source DB in another AWS Region.
- Fixed failover EC2 launch tasks to reference registered subnet IDs through `dr_public_subnets.results[...].subnet.id` and `dr_private_subnets.results[...].subnet.id`, rather than indexing the whole registered result object directly.
- Replaced the load balancer registration task with `community.aws.elb_target`, which directly registers instances with an existing target group. The previous `community.aws.elb_target_group` example omitted target group creation parameters such as protocol, port, and VPC ID.
- Changed the failback playbook to `gather_facts: true` because it uses `ansible_date_time`.
- Added `creation_source: snapshot` to RDS restore examples, as the `amazon.aws.rds_instance` module documents snapshot restores using `creation_source=snapshot`.
- Changed the failback restore target to `myapp-prod-db-restored` and renamed the task to "Restore replacement primary database" so the example does not imply that RDS can restore a snapshot over an existing DB instance in place.

## Review Notes
The examples remain illustrative and still require environment-specific variables such as AMI IDs, subnet IDs, ALB DNS names, hosted zone IDs, security groups, and database subnet groups. In production, teams should also add explicit replication lag checks, target group health waits, Route 53 change waits, database subnet group configuration, and application-level data consistency checks.
