# Validation Summary: How to Upgrade RDS Engine Versions

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Amazon RDS
- AWS CLI for RDS
- PostgreSQL on Amazon RDS
- MySQL on Amazon RDS
- MySQL Shell upgrade checker utility
- RDS DB parameter groups
- RDS snapshots and restores
- RDS Blue/Green Deployments

## Sources Consulted
- Amazon RDS User Guide: Upgrading a DB instance engine version: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html
- Amazon RDS User Guide: Major version upgrades for RDS for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.MySQL.Major.html
- Amazon RDS User Guide: Testing an RDS for MySQL upgrade: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.MySQL.UpgradeTesting.html
- Amazon RDS User Guide: How to perform a major version upgrade for RDS for PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.MajorVersion.Process.html
- Amazon RDS User Guide: Upgrading PostgreSQL extensions in RDS for PostgreSQL databases: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.ExtensionUpgrades.html
- AWS CLI Command Reference: modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: describe-db-engine-versions: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-engine-versions.html
- AWS CLI Command Reference: create-db-snapshot: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-snapshot.html
- AWS CLI Command Reference: restore-db-instance-from-db-snapshot: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- AWS CLI Command Reference: describe-events: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- MySQL Shell Reference Manual: Upgrade Checker Utility: https://dev.mysql.com/doc/mysql-shell/en/mysql-shell-utilities-upgrade.html
- MySQL Installation Guide: Upgrade Paths: https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/upgrade-paths.html
- Amazon RDS User Guide: Supported Regions and DB engines for Amazon RDS Blue/Green Deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.BlueGreenDeployments.html

## Issues Found
- The manual minor version upgrade example used PostgreSQL `16.3` after earlier examples showed the instance on PostgreSQL `15.4`. That would be a major upgrade, not a minor upgrade. Changed the target to `15.5`.
- The MySQL 5.7 to 8.0 compatibility check described the "upgrade checker utility" but used `mysqlcheck --check-upgrade`. MySQL's documented upgrade checker utility is provided by MySQL Shell as `util.checkForServerUpgrade` / `check-for-server-upgrade`. Replaced the command with `mysqlsh -- util check-for-server-upgrade ... --target-version=8.0.36`.
- The pre-upgrade snapshot example generated the date-based snapshot identifier separately for create and wait commands. That can fail if the date changes between commands. Added a `SNAPSHOT_ID` variable and reused it for both commands.

## Review Notes
- The AWS CLI command names and flags used for RDS version checks, instance modification, snapshots, snapshot restore, waiters, and event inspection match the documented AWS CLI interfaces.
- The RDS upgrade behavior described in the post is broadly consistent with AWS documentation: major upgrades require explicit action, minor upgrades can be manual or automatic, and engine upgrades require downtime. Actual downtime varies by engine, configuration, database size, and workload.
- PostgreSQL extension versions are not automatically upgraded by RDS engine upgrades. The post correctly checks installed extensions, but a future improvement could explicitly mention `ALTER EXTENSION ... UPDATE` for extensions that need post-upgrade updates.
