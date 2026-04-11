# Validation Summary: How to Choose Between Self-Managed and Managed MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 8.0
- AWS EC2 (r6i.xlarge)
- AWS RDS MySQL (db.r6g.xlarge, Multi-AZ)
- Amazon Aurora
- Google Cloud SQL
- Azure Database for MySQL
- DigitalOcean Managed Databases
- Docker / Docker Compose
- Amazon EBS (gp3)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB configuration parameters: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Release Notes (8.0.30) — innodb_log_file_size deprecation: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-30.html
- AWS RDS MySQL documentation — Multi-AZ deployments and failover: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html
- AWS RDS MySQL parameter groups — modifiable parameters: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html
- AWS EC2 pricing — r6i instance family: https://aws.amazon.com/ec2/pricing/on-demand/
- AWS RDS pricing — Multi-AZ instances: https://aws.amazon.com/rds/mysql/pricing/
- AWS EBS pricing — gp3 volumes: https://aws.amazon.com/ebs/pricing/
- Docker Hub — Official MySQL image: https://hub.docker.com/_/mysql
- Docker Compose specification: https://docs.docker.com/compose/compose-file/

## Issues Found
- **Incorrect example of parameter unavailable in managed services**: The post cited `innodb_io_capacity_max` as an example of a parameter "not available in managed services." This parameter is available and modifiable in AWS RDS MySQL via parameter groups. Changed the example to "custom MySQL plugins or OS-level tuning (e.g., I/O scheduler, kernel parameters) not possible in managed services," which are genuine restrictions of all managed MySQL services.

## Review Notes
- **`innodb_log_file_size` deprecated since MySQL 8.0.30 (July 2022)**: The configuration snippet uses `innodb_log_file_size = 2G`, which is deprecated in favor of `innodb_redo_log_capacity`. The parameter still functions in MySQL 8.0.x with a deprecation warning but is removed in MySQL 8.4 LTS. Since the post explicitly targets MySQL 8.0 and the parameter still works, no change was made, but readers installing MySQL 8.4+ would encounter errors with this config.
- **RDS failover time claim**: The post states managed services offer "automatic failover (typically under 60 seconds)." Standard AWS RDS Multi-AZ failover is documented as typically 60-120 seconds. Sub-60-second failover applies to Aurora or the newer RDS Multi-AZ with readable standbys. Since the claim is made generally across managed services (some of which do achieve sub-60s), this was left as-is but is worth noting for precision.
- **Cost figures are approximate and time-sensitive**: The pricing comparison uses reasonable 2024-era figures but cloud pricing changes frequently. The relative comparison (managed costs more per unit) remains valid regardless of exact figures.
