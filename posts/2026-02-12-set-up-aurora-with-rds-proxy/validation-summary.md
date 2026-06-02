# Validation Summary: How to Set Up Aurora with RDS Proxy

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Aurora MySQL and PostgreSQL
- Amazon RDS Proxy
- AWS Secrets Manager
- AWS IAM
- AWS CLI
- Amazon CloudWatch metrics
- Terraform AWS provider
- Python and PyMySQL

## Sources Consulted
- AWS CLI Command Reference: create-db-proxy - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- Amazon RDS User Guide: Creating a proxy for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Amazon Aurora User Guide: RDS Proxy endpoints - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html
- Amazon Aurora User Guide: Creating a proxy endpoint - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.CreatingEndpoint.html
- Amazon Aurora User Guide: RDS Proxy concepts and terminology - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.howitworks.html
- Amazon RDS User Guide: Avoiding pinning an RDS Proxy - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html
- Amazon RDS User Guide: RDS Proxy configuration guidelines - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-best-practices.configuration.html
- Amazon Aurora User Guide: Monitoring RDS Proxy metrics with CloudWatch - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.monitoring.html
- PyMySQL documentation: Connection Object - https://pymysql.readthedocs.io/en/latest/modules/connections.html
- Terraform Registry: aws_db_proxy, aws_db_proxy_default_target_group, and aws_db_proxy_target - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy

## Issues Found
- The architecture diagram implied the default RDS Proxy endpoint sends traffic to Aurora reader instances. Updated the diagram and added a note clarifying that the default read/write endpoint routes to the writer, and reader traffic requires a read-only proxy endpoint.
- The Lambda benefits list said connections survive Lambda cold starts and function recycling. Reworded it to clarify that database connections in the proxy pool can be reused across those events.
- The PyMySQL examples used `ssl={'ssl': True}`, which relies on deprecated dict-style SSL parameters. Updated the examples to use `ssl_verify_identity=True`.
- The monitoring section described `QueryDatabaseResponseLatency` as latency added by the proxy. Updated it to match AWS documentation and added `QueryResponseLatency` for proxy request-to-response latency.
- The session pinning example implied `EXCLUDE_VARIABLE_SETS` is broadly appropriate whenever variables must be set. Added the AWS-documented caveat that it should only be used when those `SET` statements are safe to ignore for pinning.

## Review Notes
The AWS CLI and Terraform snippets use current option and field names. The examples are MySQL-specific even though the prerequisites mention Aurora PostgreSQL as well; this is acceptable because the commands explicitly use `MYSQL` and the SQL/PyMySQL snippets are clearly MySQL-oriented.
