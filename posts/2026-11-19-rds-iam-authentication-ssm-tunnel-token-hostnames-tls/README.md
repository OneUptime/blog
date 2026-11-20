# RDS IAM Auth Through SSM Tunnels: Token Hostnames and TLS Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, RDS, IAM, PostgreSQL, Systems Manager, TLS

Description: Connect to RDS PostgreSQL through an SSM tunnel with the correct IAM token endpoint, database permissions, and verified TLS identity.

An SSM tunnel can accept connections while RDS rejects your IAM login. The tunnel changes where your client opens its socket; the authentication token still identifies the actual database endpoint and database port. Replacing those values with `localhost:15432` signs the wrong destination. [AWS token parameters](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html)

This guide assumes the [SSM remote-host tunnel](https://oneuptime.com/blog/post/2026-11-19-private-rds-ssm-remote-host-localhost-tls/view) already forwards workstation port **15432** to an RDS for PostgreSQL instance on **5432**. Keep that session running. The example uses Python, Boto3, and psycopg2 on your workstation, connecting directly through the relay to the DB instance.

## Keep the signed destination separate from the socket

Use the endpoint returned by RDS, without a URL scheme or appended port. Match the database username exactly, including case, and specify the database's Region. AWS does not support substituting a custom Route 53 record when generating this token. A friendly alias that resolves correctly is insufficient. [AWS endpoint requirements](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.Python.html), [username matching](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html)

| Purpose | Host | Port |
| --- | --- | --- |
| IAM token generation | Actual RDS endpoint | Actual DB port: 5432 |
| Client TCP connection | `127.0.0.1` | Local tunnel port: 15432 |
| TLS hostname verification | Actual RDS endpoint | Uses the forwarded connection |

The SDK's `Port` argument is the port on which the database listens. Changing your local listener to 25432 changes only the client's connection port. It does not change the token's destination. [Boto3 token API](https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/generate_db_auth_token.html)

## Check instance configuration and the database account

With a profile permitted to describe the instance, retrieve its endpoint, configured port, resource ID, and IAM setting:

```bash
aws --profile database-ops --region us-east-1 rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].{Host:Endpoint.Address,Port:Endpoint.Port,ResourceId:DbiResourceId,IAM:IAMDatabaseAuthenticationEnabled}' \
  --output json
```

Use the returned values throughout the example. `IAMDatabaseAuthenticationEnabled` must be true. If it is false, enable IAM authentication through your normal instance modification process; the CLI option is `--enable-iam-database-authentication` on `modify-db-instance`. Check engine and Region support first. [Instance fields](https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html), [enabling IAM authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Enabling.html)

An administrator must also create or configure the PostgreSQL account. For a new account:

```sql
CREATE USER tunnel_reader WITH LOGIN;
GRANT rds_iam TO tunnel_reader;
GRANT CONNECT ON DATABASE appdb TO tunnel_reader;
```

For an existing account, apply the grants without recreating it. Grant only the schema and table privileges the work requires separately. IAM authorization does not assign SQL permissions. [AWS database account setup](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html), [PostgreSQL grants](https://www.postgresql.org/docs/18/sql-grant.html)

Once `rds_iam` is granted, IAM authentication takes precedence over password authentication for that user, including the master user. Use a dedicated account so an existing administrative password workflow is not unexpectedly changed. [PostgreSQL IAM precedence](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

## Authorize the identity that signs the token

The workstation's selected AWS identity signs the token. The relay's instance role does not become your database identity simply because traffic passes through it. The script below prints the caller ARN using the same Boto3 session that generates the token; check that ARN against the intended role. [Boto3 profile credentials](https://docs.aws.amazon.com/boto3/latest/guide/credentials.html), [STS caller identity](https://docs.aws.amazon.com/boto3/latest/reference/services/sts/client/get_caller_identity.html)

That identity needs an effective allow for `rds-db:connect`. Replace the account, Region, and `db-...` value in this policy with the DB instance's details:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "rds-db:connect",
    "Resource": "arn:aws:rds-db:us-east-1:123456789012:dbuser:db-ABCDEFGHIJKL01234/tunnel_reader"
  }]
}
```

The ARN contains **DbiResourceId**, not the instance identifier `mydb` or its ordinary `arn:aws:rds:...:db:...` ARN. Its username must match the token and PostgreSQL login. SSM access and RDS management permissions do not replace this database connection permission. [AWS IAM database policy format](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html)

Generating a token does not prove connection authorization. RDS can still reject the signed connection for insufficient permissions or an incorrect role. [AWS authentication troubleshooting](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Troubleshooting.html)

## Connect with verified TLS and an intact token

Use Python 3 with Boto3 and psycopg2 2.9.x (Psycopg 2), and download the appropriate [official RDS CA bundle](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.RegionCertificates). Replace the endpoint and absolute bundle path below. Use a current psycopg2 installation with a TLS-capable libpq client.

```python
from contextlib import closing

import boto3
import psycopg2

REGION = "us-east-1"
ENDPOINT = "mydb.abcdefghijkl.us-east-1.rds.amazonaws.com"
REMOTE_PORT = 5432
LOCAL_PORT = 15432
DB_USER = "tunnel_reader"
CA_BUNDLE = "/absolute/path/to/rds-us-east-1-bundle.pem"

session = boto3.Session(profile_name="database-ops", region_name=REGION)
print("AWS caller:", session.client("sts").get_caller_identity()["Arn"])
rds = session.client("rds")


def connect():
    token = rds.generate_db_auth_token(
        DBHostname=ENDPOINT,
        Port=REMOTE_PORT,
        DBUsername=DB_USER,
        Region=REGION,
    )
    return psycopg2.connect(
        host=ENDPOINT,
        hostaddr="127.0.0.1",
        port=LOCAL_PORT,
        dbname="appdb",
        user=DB_USER,
        password=token,
        sslmode="verify-full",
        sslrootcert=CA_BUNDLE,
        gssencmode="disable",
        connect_timeout=10,
    )


with closing(connect()) as conn:
    with conn.cursor() as cursor:
        cursor.execute("SELECT current_user, current_database()")
        print(cursor.fetchone())
```

`hostaddr` routes the socket through loopback without a local DNS lookup for the endpoint. `host` preserves the name checked by `verify-full`; `gssencmode=disable` selects TLS even when GSSAPI encryption is available. Psycopg2 accepts these libpq parameters as keyword arguments. [libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS), [psycopg2 parameters](https://www.psycopg.org/docs/module.html)

`verify-full` checks both the certificate chain and hostname. If verification fails, correct the endpoint or CA bundle. Setting `host=localhost` changes the expected certificate identity; reducing verification hides that mistake. [PostgreSQL certificate verification](https://www.postgresql.org/docs/18/libpq-ssl.html)

The example passes the token directly as a password value without printing it, embedding it in a URL, or exporting it to the shell. Keep credentials and connection parameters out of debug logs. Preserve it verbatim: do not URL-decode it or build a connection URL around it. Tokens can exceed 1 KB; GUI password limits, truncation, or string transformations can invalidate them. [AWS token size guidance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

## Refresh new connections and diagnose failures

Tokens last 15 minutes, but expiration does not terminate an established database session. Temporary AWS credentials must also remain valid when the token is used. The function generates a fresh token for each new connection; use that pattern when a pool opens a physical connection, while reusing healthy existing connections. [AWS token lifetime](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html)

For an authentication failure, compare the endpoint, remote port, Region, and username first. Then verify the signer ARN, resource-ID policy, IAM enablement, and database grants. If reconnection fails after idle time, refresh AWS credentials and generate a new token. Keep timeout and certificate errors separate: an IAM policy change cannot repair an unreachable tunnel or a hostname mismatch.
