# Validation Summary: How to Use Ansible to Create GCP Cloud SQL Instances

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- `google.cloud` Ansible collection
- Google Cloud SQL
- PostgreSQL
- MySQL
- Google Cloud CLI
- Google Cloud private services access

## Sources Consulted
- Ansible `google.cloud` collection index: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/index.html
- Ansible `google.cloud.gcp_sql_instance` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_sql_instance_module.html
- Ansible `google.cloud.gcp_sql_database` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_sql_database_module.html
- Ansible `google.cloud.gcp_sql_user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_sql_user_module.html
- Google Cloud SQL for PostgreSQL private IP documentation: https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud SQL private services access documentation: https://cloud.google.com/sql/docs/postgres/configure-private-services-access
- Google Cloud SQL for PostgreSQL high availability documentation: https://cloud.google.com/sql/docs/postgres/high-availability
- Google Cloud SQL for PostgreSQL replication documentation: https://docs.cloud.google.com/sql/docs/postgres/replication
- Google Cloud SQL for PostgreSQL read replica documentation: https://docs.cloud.google.com/sql/docs/postgres/replication/create-replica
- Google Cloud SQL for PostgreSQL database flags documentation: https://docs.cloud.google.com/sql/docs/postgres/flags
- Google Cloud SQL for MySQL database flags documentation: https://docs.cloud.google.com/sql/docs/mysql/flags
- Google Cloud SQL Admin API users resource documentation: https://docs.cloud.google.com/sql/docs/postgres/admin-api/rest/v1/users

## Issues Found
- Updated the prerequisite from Ansible 2.9+ to Ansible Core 2.16+ because the current `google.cloud` collection documents support for ansible-core 2.16.0 or newer.
- Removed `google-api-python-client` from the pip install command because the documented requirements for the reviewed modules are `requests` and `google-auth`.
- Clarified that private services access must be configured for the VPC, not just that the Service Networking API must be enabled.
- Removed unsupported `gcp_sql_instance` settings from the Ansible examples: `disk_type`, `disk_size`, `disk_autoresize`, `disk_autoresize_limit`, `maintenance_window`, `point_in_time_recovery_enabled`, `transaction_log_retention_days`, and `backup_retention_settings`. These are Cloud SQL settings, but they are not exposed by the documented Ansible module parameters.
- Changed `private_network` values to the resource-link form shown by the Ansible module documentation.
- Corrected the PostgreSQL `shared_buffers` example from `4096` to `524288` because Cloud SQL expects this flag in 8 KB units.
- Added `log_output: FILE` to the MySQL flags because Cloud SQL documents that slow query logs require both `slow_query_log=on` and `log_output=FILE` for logs to be available in Google Cloud logging.
- Updated `gcp_sql_user` examples to pass `instance` as a dictionary with a `name` key and added the required `host` parameter in the complete setup example.
- Removed `replica_configuration.failover_target: false` from the standard PostgreSQL read replica example to avoid implying that a regular read replica should be configured as a failover target.
- Made the debug output for instance IP addresses tolerate a missing or empty `ipAddresses` list.
- Adjusted the summary wording to avoid claiming that the Ansible module examples configure point-in-time recovery.

## Review Notes
The post is now accurate for the documented `google.cloud` Ansible collection module surface. Cloud SQL supports additional settings such as disk sizing, PITR retention, backup retention, and maintenance windows through the Cloud SQL Admin API, gcloud, Terraform, and other tooling, but those settings are not currently documented as parameters of `google.cloud.gcp_sql_instance`.
