# Validation Summary: How to Configure RDS IAM Authentication with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS RDS
- AWS IAM database authentication
- AWS IAM policies
- Python
- Boto3
- psycopg2
- PostgreSQL
- MySQL

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider docs for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS User Guide, IAM database authentication overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon RDS User Guide, supported engines and Regions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.IamDatabaseAuthentication.html
- Amazon RDS User Guide, IAM policy for DB access: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html
- Amazon RDS User Guide, creating database accounts for IAM auth: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html
- Amazon RDS User Guide, connecting to PostgreSQL with IAM auth from the command line: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html
- Amazon RDS User Guide, SSL with PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- Boto3 RDS client `generate_db_auth_token`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/generate_db_auth_token.html
- Psycopg2 docs for `psycopg2.connect`: https://www.psycopg.org/docs/module.html

## Issues Found
- The prerequisites stated MySQL 8.0+ only. Current AWS documentation shows IAM database authentication is also available for RDS for MySQL 5.7, so the prerequisite was corrected to MySQL 5.7+.
- The IAM policy snippet referenced `data.aws_caller_identity.current.account_id` without declaring the data source. I added the missing `aws_caller_identity` data block so the OpenTofu example is valid as written.
- The policy comment said the IAM policy grants permission to generate auth tokens. The documented permission is `rds-db:connect`, which authorizes database connection via IAM authentication, so the comment was corrected.
- The PostgreSQL connection examples used an Aurora-style `.cluster.` hostname while the infrastructure example creates an `aws_db_instance`. I changed the placeholders to standard RDS DB instance endpoints.
- Step 3 used a `bash` code fence for a mixed shell-and-SQL example. I changed it to `text` so the example is no longer mislabeled as executable shell syntax.
- The Python example used psycopg2's deprecated `database` alias. I updated it to `dbname` per the psycopg2 documentation.
- The Python example used `sslmode='require'` together with a CA bundle path and an outdated bundle filename. I updated it to `sslmode='verify-full'` and `global-bundle.pem` to match current AWS SSL guidance for PostgreSQL examples.
- The conclusion referred to restricting access by instance IDs. IAM DB auth policies use DB resource IDs in the `rds-db` ARN, so that wording was corrected.
- The conclusion implied the master user always requires a password. I clarified that the master user is created with a password and that this credential should still be managed securely for administrative access.

## Review Notes
- The exact orderable minor engine version for RDS PostgreSQL can vary over time and by Region; the example's `16.2` value is plausible, but production configurations should use a currently orderable version in the target Region.
- The post does not pin an AWS provider version. The `aws_db_instance` arguments and exported attributes used here are valid in the current provider documentation I checked.
- The MySQL example is technically valid, but AWS also documents `ALTER USER ... REQUIRE SSL` when configuring IAM-authenticated MySQL users. That could be added later if the post expands the MySQL path.
