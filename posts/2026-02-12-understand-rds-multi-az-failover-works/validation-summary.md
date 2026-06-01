# Validation Summary: How RDS Multi-AZ Failover Works

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon RDS Multi-AZ DB instance deployments
- Amazon RDS Multi-AZ DB cluster deployments
- AWS CLI for RDS event subscriptions and failover testing
- Boto3 RDS client
- Node.js and node-postgres
- Java DNS cache configuration
- Python, psycopg2, and SQLAlchemy connection pooling

## Sources Consulted
- Amazon RDS User Guide: Multi-AZ DB instance deployments - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS User Guide: Multi-AZ DB cluster deployments - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB cluster - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts-failover.html
- Amazon RDS User Guide: Amazon RDS event categories and event messages - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- AWS CLI Command Reference: create-event-subscription - https://docs.aws.amazon.com/cli/latest/reference/rds/create-event-subscription.html
- AWS CLI Command Reference: reboot-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/reboot-db-instance.html
- Boto3 RDS client documentation: reboot_db_instance - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/reboot_db_instance.html
- node-postgres Pool API - https://node-postgres.com/apis/pool
- Node.js net API custom lookup option - https://nodejs.org/api/net.html
- SQLAlchemy pooling documentation for pool_pre_ping - https://docs.sqlalchemy.org/en/21/core/pooling.html
- PostgreSQL libpq connection parameter documentation - https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The post gave a fixed "2-5ms" write-latency impact for Multi-AZ DB instance deployments. AWS documents increased write and commit latency but does not guarantee a fixed range, so this was changed to a workload- and environment-dependent statement.
- The post said the RDS endpoint update is a CNAME update with a typical 5-second TTL. AWS documents that RDS changes the DNS record and that applications must re-establish connections, but current docs do not state that exact CNAME/TTL behavior. The wording was changed to focus on DNS refresh and reconnect behavior.
- The planned maintenance wording implied the standby-first/failover/old-primary sequence applies uniformly to all planned operations. AWS documents different sequences depending on engine and operation, so the statement was softened.
- The listed RDS event messages did not exactly match the current AWS RDS event catalog. They were updated to current Multi-AZ DB instance and Multi-AZ DB cluster failover messages.
- The Boto3 failover test snippet uses `reboot_db_instance(..., ForceFailover=True)`, which is correct for Multi-AZ DB instance deployments but not Multi-AZ DB clusters. The surrounding text now scopes the script to DB instances and notes that DB clusters use `failover_db_cluster`.

## Review Notes
The examples are illustrative and omit production concerns such as idempotency for retried writes, transaction-level retry boundaries, and credential handling. The AWS CLI was not installed locally in the review environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `--help` output.
