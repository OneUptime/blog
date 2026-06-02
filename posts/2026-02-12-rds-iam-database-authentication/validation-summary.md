# Validation Summary: How to Use RDS IAM Database Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS IAM database authentication
- Amazon Aurora IAM database authentication
- AWS IAM policies and `rds-db:connect`
- AWS CLI
- PostgreSQL and MySQL/MariaDB database users
- Python with Boto3, psycopg2, and SQLAlchemy
- Node.js with AWS SDK for JavaScript v3 and mysql2
- Java with AWS SDK for Java v2 and PostgreSQL JDBC

## Sources Consulted
- Amazon RDS User Guide: IAM database authentication for MariaDB, MySQL, and PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon RDS User Guide: Supported Regions and DB engines for IAM database authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.IamDatabaseAuthentication.html
- Amazon RDS User Guide: Enabling and disabling IAM database authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Enabling.html
- Amazon RDS User Guide: Creating a database account using IAM authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html
- Amazon RDS User Guide: Creating and using an IAM policy for IAM database access: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html
- Amazon RDS User Guide: Connecting to your DB instance using IAM authentication: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html
- Amazon Aurora User Guide: IAM database authentication: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon Aurora User Guide: Supported Regions and Aurora DB engines for IAM database authentication: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.IAMdbauth.html
- AWS SDK for JavaScript v3 `@aws-sdk/rds-signer` Signer documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-rds-signer/Class/Signer/
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- Boto3 RDS `generate_db_auth_token` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/generate_db_auth_token.html
- mysql2 authentication switch documentation: https://sidorares.github.io/node-mysql2/docs/documentation/authentication-switch
- PostgreSQL libpq connection parameter documentation: https://www.postgresql.org/docs/current/libpq-connect.html
- SQLAlchemy `do_connect` event documentation: https://docs.sqlalchemy.org/en/21/core/events.html

## Issues Found
- The post described token generation as a direct RDS API call and showed IAM returning the token. Updated the explanation and diagram to say the AWS CLI or SDK generates a signed token using IAM credentials, and RDS validates the signature and `rds-db:connect` authorization during connection.
- The prerequisites listed outdated/over-broad engine versions, including RDS MySQL 5.6+ and MariaDB 10.6+. Updated the supported-version wording to match current AWS documentation and added a note to check the Region/version matrix.
- The connection-rate limit was listed as 256 connections per second. AWS currently recommends IAM database authentication for workloads creating fewer than 200 new IAM-authenticated connections per second, so the post now uses the 200 connections/sec guidance and mentions RDS Proxy.
- The IAM policy section said the policy allows generating authentication tokens. Updated it to clarify that `rds-db:connect` authorizes connecting as the database user, and noted that Aurora uses the cluster resource ID.
- The Node.js example used AWS SDK for JavaScript v2, which reached end-of-support on September 8, 2025. Replaced it with the AWS SDK for JavaScript v3 `@aws-sdk/rds-signer` package.
- The Node.js MySQL example omitted explicit cleartext authentication support for `AWSAuthenticationPlugin`. Added `enableCleartextPlugin: true` while keeping TLS configured.
- The new-instance AWS CLI example pinned PostgreSQL `--engine-version 16.2`, which can become invalid as RDS minor versions age out. Removed the explicit minor version so RDS can use the current default PostgreSQL version, while leaving IAM authentication enabled.
- The token-size statement said tokens are about 2KB. AWS documents the minimum as generally about 1KB and potentially larger, so the limitation was corrected.
- The post stated that the master user account cannot use IAM authentication and always uses password authentication. Updated this to a safer limitation: use a separate least-privilege application user, and for PostgreSQL `rds_iam` takes precedence over password authentication if granted to a user, including the master user.

## Review Notes
- The Python, SQLAlchemy, AWS CLI, PostgreSQL, MySQL/MariaDB user setup, IAM policy shape, and Java examples are broadly consistent with official documentation after the corrections above.
- For production PostgreSQL clients, `sslmode=verify-full` provides stronger hostname verification than `sslmode=require`; the post uses `require`, which satisfies the IAM-auth TLS requirement but could be tightened in a future security-focused edit.
