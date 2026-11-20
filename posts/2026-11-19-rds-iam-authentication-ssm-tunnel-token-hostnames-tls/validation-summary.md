# Validation Summary: RDS IAM Auth Through SSM Tunnels: Token Hostnames and TLS Validation

## Status
validated

## Post Type
Technical guide and troubleshooting tutorial with AWS CLI, SQL, IAM policy JSON, and Python examples.

## Technologies Covered
- Amazon RDS for PostgreSQL and IAM database authentication
- AWS Systems Manager Session Manager remote-host port forwarding
- AWS IAM policies, STS caller identity, and AWS CLI
- Python 3, Boto3, and Psycopg 2 (psycopg2 2.9.x)
- PostgreSQL libpq, SQL roles and privileges, and TLS certificate verification

## Sources Consulted
- [AWS: Connecting with IAM authentication using Python](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.Python.html)
- [AWS: Connecting with IAM authentication using AWS CLI and psql](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html)
- [AWS: IAM database authentication, limitations, token lifetime, and recommendations](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)
- [AWS: Creating database accounts for IAM authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html)
- [AWS: IAM database access policy format](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html)
- [AWS: Enabling and disabling IAM database authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Enabling.html)
- [AWS: IAM authentication troubleshooting](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Troubleshooting.html)
- [AWS CLI: describe-db-instances](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html)
- [AWS: RDS TLS and certificate bundles](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.RegionCertificates)
- [AWS Systems Manager: Starting remote-host port-forwarding sessions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-remote-port-forwarding)
- [Boto3: generate_db_auth_token](https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/generate_db_auth_token.html)
- [Boto3: Credentials and profiles](https://docs.aws.amazon.com/boto3/latest/guide/credentials.html)
- [Boto3: STS get_caller_identity](https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/get_caller_identity.html)
- [PostgreSQL 18: libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [PostgreSQL 18: TLS certificate verification](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18: CREATE USER](https://www.postgresql.org/docs/18/sql-createuser.html)
- [PostgreSQL 18: GRANT](https://www.postgresql.org/docs/18/sql-grant.html)
- [Psycopg 2: Connection API and keyword arguments](https://www.psycopg.org/docs/module.html)
- [Python: contextlib.closing](https://docs.python.org/3/library/contextlib.html#contextlib.closing)

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The post correctly separates the actual RDS endpoint and database port used for token signing from the local tunnel address and listener port.
- Confirmed that libpq uses hostaddr for the network address and preserves host for verify-full hostname verification. The combination of sslmode=verify-full, sslrootcert, and gssencmode=disable requires verified TLS even when GSSAPI encryption is available. Psycopg 2 accepts these libpq options as keyword arguments.
- Confirmed the CLI command options and response fields, including Endpoint.Address, Endpoint.Port, DbiResourceId, and IAMDatabaseAuthenticationEnabled. The documented modify-db-instance flag is correct.
- Confirmed the IAM policy action and database-user ARN format, case-sensitive username matching, rds_iam membership, and the distinction between IAM connection authorization and SQL privileges. The dedicated PostgreSQL user avoids changing an existing administrator's password authentication behavior.
- Confirmed that the selected Boto3 profile supplies credentials to both STS and RDS clients. The relay role does not replace the workstation's token-signing identity. Successful token generation alone does not establish database authorization.
- Confirmed the 15-minute token lifetime, temporary credential validity requirement, absence of an effect on established sessions after token expiration, and token truncation guidance. Generating a token inside the connection function correctly refreshes it for each new physical connection.
- Parsed the Python example with Python's AST parser, parsed the IAM policy with the JSON parser, and checked the Bash example with bash -n; all passed. Reviewed SQL syntax against PostgreSQL and AWS documentation. No live AWS commands, database modifications, or end-to-end RDS authentication tests were performed; these require configured credentials, an RDS instance, and an active SSM tunnel.
- The Psycopg 2.9.x API and PostgreSQL 18 parameters used here remain documented. The guide requires a current TLS-capable libpq client; the server need not be PostgreSQL 18 solely because the client documentation links use that version.
- Official documentation links resolved to the intended resources, and the author link resolved to the expected GitHub profile. The published companion OneUptime tunnel URL could not be retrieved by the web tool. Its matching local README exists and contains the expected remote-host forwarding setup on local port 15432 to database port 5432; public availability remains unverified.
