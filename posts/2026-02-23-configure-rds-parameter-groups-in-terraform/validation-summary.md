# Validation Summary: How to Configure RDS Parameter Groups in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon RDS
- RDS DB parameter groups
- RDS DB cluster parameter groups
- PostgreSQL 16
- MySQL 8.0
- AWS CLI

## Sources Consulted
- Terraform AWS Provider `aws_db_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform lifecycle `create_before_destroy` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Amazon RDS parameter groups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html
- Amazon RDS `ModifyDBParameterGroup` API documentation: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ModifyDBParameterGroup.html
- Amazon RDS DB parameter formulas documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- Amazon RDS for MySQL database logs and redo log size documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html
- AWS CLI `describe-db-parameters` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-parameters.html
- PostgreSQL 16 connection settings documentation: https://www.postgresql.org/docs/16/runtime-config-connection.html
- PostgreSQL 16 resource consumption documentation: https://www.postgresql.org/docs/16/runtime-config-resource.html
- PostgreSQL 16 WAL configuration documentation: https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 logging documentation: https://www.postgresql.org/docs/16/runtime-config-logging.html
- MySQL 8.0 InnoDB system variables documentation: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html

## Issues Found
- The post said every RDS instance has both DB parameter groups and DB cluster parameter groups. Changed this to describe the two related RDS parameter group types accurately: DB parameter groups for DB instances and DB cluster parameter groups for Aurora or Multi-AZ DB clusters.
- PostgreSQL examples used `max_connections` and `shared_buffers` without `apply_method = "pending-reboot"` and described `max_connections` as dynamic. PostgreSQL documents these as startup-only settings, so the examples now mark them as pending reboot.
- The apply-method explanation said Terraform would apply `immediate` on a static parameter and the database would only use it after reboot. RDS API documentation says `immediate` is valid only for dynamic parameters, so the text now says RDS rejects that change.
- The MySQL 8.0 example used `innodb_log_file_size`. Current RDS for MySQL 8.0 minor versions, 8.0.33 and later, use `innodb_redo_log_capacity` instead, so the example now uses `innodb_redo_log_capacity`.
- The PostgreSQL 16 example set `shared_buffers` and `wal_buffers` without `pending-reboot`. Both are startup-only PostgreSQL parameters, so the example now sets `apply_method = "pending-reboot"`.
- The formula-variable list included `{DBInstanceClassHugePagesMemory}`, which is not an RDS formula variable in the current documentation. Replaced it with documented common variables including `{DBInstanceClassMemory}`, `{DBInstanceVCPU}`, `{AllocatedStorage}`, `{EndPointPort}`, `{TrueIfReplica}`, and `{DBInstanceClassHugePagesDefault}`.
- The post said the RDS instance status shows "applying" or "pending-reboot" after parameter group changes. Updated this to refer to the parameter group status, which is the relevant status shown for parameter application.

## Review Notes
The tuning values are plausible examples, but they should still be tested per workload and instance class. Some MySQL and PostgreSQL parameter apply types can vary by engine version and RDS support, so production modules should verify final values with `aws rds describe-db-parameters` for the specific parameter group family.
