# Validation Summary: How to Fix 'Connection timeout' RDS Errors

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- Amazon RDS (PostgreSQL)
- Amazon VPC (subnets, route tables, Network ACLs, security groups)
- AWS CLI (rds, ec2 subcommands)
- AWS CloudFormation (EC2 SecurityGroup, Lambda, RDS DBProxy/DBProxyTargetGroup, CloudWatch Alarm)
- AWS RDS Proxy
- AWS Lambda (VPC networking, connection reuse)
- Node.js `pg` library
- Python `psycopg2` (ThreadedConnectionPool)
- SSL/TLS with RDS CA bundle
- Diagnostic tooling: nslookup, dig, nc, openssl s_client, psql

## Sources Consulted
- AWS CLI Reference — `aws rds describe-db-instances`, `modify-db-instance`, `aws ec2 authorize-security-group-ingress`, `modify-vpc-attribute`, `describe-network-acls` (https://docs.aws.amazon.com/cli/latest/reference/)
- Using SSL/TLS to encrypt a connection to a DB instance — RDS CA certificate bundle / `global-bundle.pem` (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- AWS RDS Proxy documentation, including `ConnectionPoolConfig` parameters (MaxConnectionsPercent, MaxIdleConnectionsPercent, ConnectionBorrowTimeout) (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html)
- AWS::RDS::DBProxy / AWS::RDS::DBProxyTargetGroup CloudFormation reference (https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbproxy.html)
- Amazon RDS Data API — supported engines (Aurora only) (https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html)
- node-postgres (`pg`) Pool configuration (https://node-postgres.com/apis/pool)
- psycopg2 connection pooling and `connect_timeout` (https://www.psycopg.org/docs/pool.html, https://www.psycopg.org/docs/module.html)
- Python standard library `os` module (`os.environ`)

## Issues Found
1. **Outdated/inconsistent RDS CA certificate reference (SSL section).** The Node.js SSL example loaded `/path/to/rds-ca-2019-root.pem`, but the RDS CA 2019 bundle expired (August 2024) and the download command immediately below fetches `global-bundle.pem`. Changed the `ca` path to `/path/to/global-bundle.pem` so it matches the current, downloaded bundle.
2. **Incorrect RDS Proxy example (Lambda-Specific Solutions → Use RDS Proxy).** The example used `RDSDataClient` from `@aws-sdk/client-rds-data` with the comment "Connect via RDS Proxy endpoint." The RDS Data API is an HTTP-based API available only for Aurora clusters and does not route through RDS Proxy — this conflated two unrelated features. Replaced it with a standard `pg` `Pool` pointed at the proxy endpoint (`process.env.PROXY_ENDPOINT`), which is how you actually use RDS Proxy and matches the section heading.
3. **Missing `import os` in the Python `psycopg2` snippet.** The code referenced `os.environ[...]` without importing `os`, which would raise `NameError`. Added `import os`.

## Review Notes
- All AWS CLI commands, queries, and flags (`--db-instance-identifier`, `--query`, `--publicly-accessible --apply-immediately`, `modify-vpc-attribute --enable-dns-support/--enable-dns-hostnames`) are current and correct.
- RDS Proxy CloudFormation (`AWS::RDS::DBProxy`, `AWS::RDS::DBProxyTargetGroup`) and `ConnectionPoolConfig` values are valid; `ConnectionBorrowTimeout: 120` matches the default.
- The Network ACL YAML is illustrative (not literal CloudFormation resource syntax) but conceptually correct: NACLs are stateless and require explicit ephemeral-port (1024–65535) outbound/return rules.
- `openssl s_client -starttls postgres` is supported (OpenSSL 1.1.1+) and appropriate for testing the PostgreSQL TLS handshake.
- `pg` Pool options (`connectionTimeoutMillis`, `idleTimeoutMillis`, `max`) and psycopg2 `ThreadedConnectionPool` parameters are accurate.
- Minor stylistic note (not changed): port 5432 is hardcoded throughout, which is correct for PostgreSQL but worth flagging for readers using MySQL/MariaDB RDS (3306) or SQL Server (1433).
