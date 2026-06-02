# Validation Summary: How to Fix RDS Multi-AZ Failover Events

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon RDS Multi-AZ DB instances
- Amazon RDS events and event subscriptions
- Amazon RDS Proxy
- AWS CLI for RDS and CloudWatch
- Java JVM DNS caching settings
- Python, PyMySQL, and SQLAlchemy connection handling
- CloudWatch RDS metrics

## Sources Consulted
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS User Guide: Amazon RDS event categories and event messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon RDS User Guide: RDS Proxy concepts and terminology: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Amazon RDS User Guide: Planning where to use RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-planning.html
- AWS CLI Command Reference: create-event-subscription: https://docs.aws.amazon.com/cli/latest/reference/rds/create-event-subscription.html
- AWS CLI Command Reference: create-db-proxy: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- AWS CLI Command Reference: modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: describe-pending-maintenance-actions: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-pending-maintenance-actions.html
- AWS CLI Command Reference: reboot-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/reboot-db-instance.html
- AWS CLI Command Reference: get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- SQLAlchemy 2.0 documentation: Engine configuration and connection execution: https://docs.sqlalchemy.org/en/20/core/engines.html and https://docs.sqlalchemy.org/en/20/core/connections.html
- PyMySQL documentation: Connection constructor parameters: https://pymysql.readthedocs.io/en/latest/modules/connections.html

## Issues Found
- The post stated that RDS Multi-AZ failover usually takes 15-30 seconds. AWS currently documents typical failover time for RDS Multi-AZ DB instances as 60-120 seconds, with longer times possible for large transactions or lengthy recovery. Updated the introduction, failover explanation, and testing expectations.
- The database crash section said a crash always triggers failover. AWS documents failover for unhealthy, unreachable, unresponsive, or failed primary resources; a database crash can trigger failover but is not guaranteed to do so in every case. Changed the wording to "can trigger."
- The JVM startup options were marked as Java code. They are JVM options, not Java source. Changed the code fence to plain text.
- The SQLAlchemy retry example passed a raw string directly to `Connection.execute()`. SQLAlchemy 2.0 expects an executable object such as `text(query)` for textual SQL. Added `from sqlalchemy import text` and wrapped the query.
- The RDS Proxy section claimed failover time can be reduced to "as little as a few seconds" for this RDS Multi-AZ context. AWS documents that RDS Proxy reduces failover times by up to 66% for RDS Multi-AZ DB instances. Updated the claim and summary language.
- The CloudWatch command used `date -v-2H`, which is BSD/macOS-specific and fails in typical GNU/Linux shells. Replaced it with GNU `date -d '2 hours ago'`, matching the Linux-oriented command context in the post.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI Command Reference instead of local `--help` output. The command examples otherwise match current documented parameters and list formats.
