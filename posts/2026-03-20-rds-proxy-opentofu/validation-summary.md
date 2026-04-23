# Validation Summary: How to Create RDS Proxy with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS RDS Proxy
- AWS IAM
- AWS Secrets Manager
- AWS security groups
- PostgreSQL `psql`

## Sources Consulted
- OpenTofu CLI `output` command: https://opentofu.org/docs/cli/commands/output/
- Amazon RDS Proxy overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- Creating a proxy for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Connecting to a database through RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-connecting.html
- RDS Proxy concepts and terminology: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Connecting to your DB instance using IAM authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html
- Moving from standard IAM authentication to end-to-end IAM authentication for RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-iam-migration.html
- AWS provider `aws_db_proxy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_proxy.html.markdown
- AWS provider `aws_db_proxy_default_target_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_proxy_default_target_group.html.markdown
- AWS provider `aws_db_proxy_target` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_proxy_target.html.markdown
- AWS provider `aws_security_group` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- PostgreSQL libpq environment variables: https://www.postgresql.org/docs/current/libpq-envars.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/16/app-psql.html

## Issues Found
- The introduction claimed RDS Proxy provides failover in "under 30 seconds". AWS documentation supports improved failover resilience and faster failovers, but not that exact guarantee in the general RDS Proxy docs. I changed the wording to "improves resilience during failovers".
- The prerequisites omitted the Secrets Manager secret and related permissions required by the posted HCL. I added the missing prerequisite for a database-credentials secret and updated the permissions bullet to include Secrets Manager.
- The `aws_db_proxy_target` example used `aws_db_instance.main.id`. The provider documentation uses the DB instance identifier for `db_instance_identifier`, so I changed it to `aws_db_instance.main.identifier`.
- The deployment test command was incorrect for IAM authentication. `psql --password` only prompts for a password and does not generate an IAM token automatically. I changed the example to generate a token with `aws rds generate-db-auth-token`, pass it through `PGPASSWORD`, and require TLS with `sslmode=require`.
- The post described IAM authentication in a way that could be read as end-to-end IAM auth to the database. The posted proxy configuration actually uses standard IAM auth for client-to-proxy connections while the proxy authenticates to the database with Secrets Manager credentials. I clarified that in the description, inline comment, and conclusion.

## Review Notes
- The post now accurately describes standard IAM authentication to RDS Proxy. If the author wants to cover end-to-end IAM authentication in the future, that requires a different proxy configuration, including `default_auth_scheme = "IAM_AUTH"`, database-side IAM auth enablement, and additional `rds-db:connect` permissions for the proxy role.
- The review validated the snippets against current official documentation, but did not deploy the infrastructure to a live AWS account during this pass.
