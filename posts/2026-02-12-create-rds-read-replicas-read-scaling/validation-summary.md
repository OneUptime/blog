# Validation Summary: How to Create RDS Read Replicas for Read Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS read replicas
- AWS CLI
- Amazon CloudWatch metrics
- Amazon RDS Proxy
- SQLAlchemy
- node-postgres
- PostgreSQL

## Sources Consulted
- AWS CLI Command Reference: create-db-instance-read-replica - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Amazon RDS User Guide: Working with DB instance read replicas - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- Amazon RDS User Guide: Quotas and constraints for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Amazon RDS User Guide: Amazon CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS User Guide: Amazon RDS Proxy - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- Amazon RDS User Guide: Working with Amazon RDS Proxy endpoints - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-endpoints.html
- SQLAlchemy 2.0 Documentation: Session API - https://docs.sqlalchemy.org/en/20/orm/session_api.html
- SQLAlchemy 2.0 Documentation: Legacy Query API - https://docs.sqlalchemy.org/en/20/orm/queryguide/query.html
- node-postgres Documentation: Pool API - https://node-postgres.com/apis/pool

## Issues Found
- The read replica quota statement incorrectly said PostgreSQL supports only 5 read replicas. AWS documentation currently allows up to 15 read replicas per DB instance for MySQL, MariaDB, PostgreSQL, and Oracle, while SQL Server is limited to 5. Updated the quota bullet accordingly.
- The SQLAlchemy `RoutingSession.get_bind()` example called `self.is_modified()` without the required instance argument, so it would raise a `TypeError`. Updated the condition to route writes when the session is flushing or has pending, dirty, or deleted objects, and updated the `get_bind()` signature to match SQLAlchemy 2.x keyword-only `clause` usage.
- The post used `write_session.query(Order).get(order.id)`, but `Query.get()` is legacy in SQLAlchemy 2.x. Replaced it with `write_session.get(Order, order.id)`.
- The post suggested RDS Proxy reader endpoints for automatic load balancing across standard RDS DB instance read replicas. AWS documents reader endpoints for Aurora and RDS Multi-AZ DB clusters, and states that proxies for RDS DB instance replication configurations can be associated only with the writer DB instance, not a read replica. Updated the sentence to limit the recommendation to Aurora or RDS Multi-AZ DB clusters.

## Review Notes
- The AWS CLI commands use valid option names according to the AWS CLI command reference. The local environment did not have the AWS CLI installed, so command validation was performed against official AWS documentation rather than local `--help` output.
- The CloudWatch `ReplicaLag` metric name, namespace, dimensions pattern, and unit are consistent with Amazon RDS metric documentation.
- The node-postgres `Pool` usage and `pool.query(text, values)` examples are consistent with the official Pool API.
