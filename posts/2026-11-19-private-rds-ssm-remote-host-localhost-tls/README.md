# How to Reach Private RDS Through SSM Remote-Host Port Forwarding—and Why Your Client Must Use `localhost`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Session Manager, RDS, PostgreSQL

Description: Connect to private RDS through an SSM relay while separating the local tunnel address from PostgreSQL authentication and TLS hostname verification.

A forwarding session can start successfully while your database client still times out. Often, the client is connecting directly to the private RDS endpoint instead of entering the tunnel on your workstation. Session Manager creates a local listener; it does not install a route from your laptop to the database subnet. [AWS remote-host walkthrough](https://aws.amazon.com/blogs/mt/use-port-forwarding-in-aws-systems-manager-session-manager-to-connect-to-remote-hosts/)

Here, “use `localhost`” means **send the TCP connection to local loopback**. It does not mean replacing the database's TLS identity with `localhost`. For PostgreSQL's `psql`, use `hostaddr=127.0.0.1` for the connection address and keep `host` set to the real RDS endpoint. [libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS)

## Prepare the relay and its two connections

This walkthrough assumes an existing private RDS for PostgreSQL instance, an approved EC2 relay in the same VPC, and a database account using password authentication. Run the workstation examples in Bash on Linux or macOS, using AWS CLI v2 and a current `psql` client with TLS support.

Install the Session Manager plugin locally. The EC2 relay needs SSM Agent **3.1.1374.0 or later** for remote-host forwarding; RDS itself does not need to be managed by Systems Manager. [Remote-host prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-remote-port-forwarding)

This walkthrough uses a relay IAM instance profile with Session Manager permissions, independently of your workstation's identity. The relay also needs outbound HTTPS connectivity to Systems Manager's regional services, including `ssmmessages`, through internet egress or appropriate VPC endpoints. [Node permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html), [endpoint connectivity](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)

The second connection is relay-to-database. Confirm that the relay resolves the RDS endpoint and can reach its configured database port. For this same-VPC example, allow TCP 5432 into the RDS security group from the relay's security group. Check relay egress, routes, and any restrictive network ACLs too. Adding your laptop's public IP to the database security group does not authorize this connection: it originates at the relay. [RDS security group model](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html), [remote-host connectivity requirements](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-remote-port-forwarding)

Your caller needs `ssm:StartSession` permission for the approved relay and the `AWS-StartPortForwardingSessionToRemoteHost` document, plus `ssmmessages:OpenDataChannel` for its session. Grant termination access to its own sessions; grant resume access only if needed. Permission to start a default shell does not establish permission to use this forwarding document. [Session Manager caller policies](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)

## Start the forwarding session

Replace the profile, Region, instance ID, and endpoint below. The endpoint must match your database; use its actual configured port if different from 5432.

```bash
aws --profile database-ops --region us-east-1 ssm start-session \
  --target i-0123456789abcdef0 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["mydb.abcdefghijkl.us-east-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["15432"]}'
```

The settings describe different ends of the connection:

| Setting | Meaning here |
| --- | --- |
| `--target` | Managed EC2 relay running SSM Agent |
| `host` | RDS destination resolved and reached by that relay |
| `portNumber` | Database's TCP port, 5432 |
| `localPortNumber` | Workstation listener, 15432 |

Use the remote-host document shown above. `AWS-StartPortForwardingSession` instead forwards to a service on the managed node itself. [Forwarding document semantics](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)

Keep this terminal running and retain the session ID it prints. Port 15432 is an example chosen to avoid a common local PostgreSQL port collision; choose another unused port if necessary. A message announcing an open local port does not prove database authentication or TLS verification will succeed. [AWS forwarding workflow](https://aws.amazon.com/blogs/mt/use-port-forwarding-in-aws-systems-manager-session-manager-to-connect-to-remote-hosts/)

## Connect through loopback while verifying RDS

In a second workstation terminal, download the RDS CA bundle for the database's Region. This command uses the official US East (N. Virginia) bundle; select the corresponding bundle for another Region. [RDS certificate downloads](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html#UsingWithRDS.SSL.RegionCertificates)

```bash
curl --fail --silent --show-error --location \
  --output rds-us-east-1-bundle.pem \
  https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
```

After the download succeeds, run this from the directory containing the bundle. Replace the endpoint, database, and database user:

```bash
psql --password \
  "host=mydb.abcdefghijkl.us-east-1.rds.amazonaws.com \
   hostaddr=127.0.0.1 port=15432 dbname=appdb user=analyst \
   sslmode=verify-full sslrootcert=rds-us-east-1-bundle.pem \
   gssencmode=disable connect_timeout=10"
```

`hostaddr` selects the socket address without resolving `host` locally. `host` supplies the hostname for certificate verification. `gssencmode=disable` explicitly selects TLS instead of GSSAPI encryption if Kerberos credentials are present. [libpq parameter behavior](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS)

`sslmode=verify-full` verifies both certificate trust and hostname. An RDS certificate identifies the RDS endpoint, so `host=localhost` can produce a hostname mismatch. Preserve verification and separate the address from the identity as above. The database TLS connection also protects the relay-to-RDS leg. [PostgreSQL certificate verification](https://www.postgresql.org/docs/18/libpq-ssl.html), [RDS PostgreSQL TLS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)

The password prompt is for the database user. Session Manager authorization provides the transport, not a PostgreSQL login or SQL privileges. `--password` prompts before connecting, so seeing the prompt alone proves no connectivity. [psql password option](https://www.postgresql.org/docs/18/app-psql.html)

After connecting, inspect this session's encryption:

```sql
SELECT ssl, version, cipher
FROM pg_stat_ssl
WHERE pid = pg_backend_pid();
```

Expect `ssl` to be true. This server-side view reports encryption; hostname verification is enforced by the client's `verify-full` configuration. [PostgreSQL SSL statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#PG-STAT-SSL-VIEW)

## Diagnose the failing boundary

Use the error to choose the next check:

- **Local connection refused:** confirm the forwarding process is still running and the client uses 15432. If a tool resolves `localhost` to IPv6 `::1` while the listener accepts only IPv4, use `127.0.0.1` for its connection address. Keep the RDS name for TLS verification.
- **Address already in use:** select another unused local port and change both `localPortNumber` and the client's port.
- **Timeout after opening the tunnel:** inspect relay-side DNS and connectivity to the RDS endpoint and port. A working SSM channel does not establish that second connection.
- **Certificate failure:** check the endpoint, CA bundle, and client hostname setting. Do not weaken verification to make the error disappear.
- **Database authentication error:** check the database user, password, and database name separately from AWS credentials.

These checks follow the two connection legs and the separate TLS/authentication stages; they are not proof that every timeout has the same cause.

## Close the tunnel and retain the right audit evidence

Exit `psql` with `\q`. Terminate the recorded forwarding session explicitly, replacing its ID:

```bash
aws --profile database-ops --region us-east-1 ssm terminate-session \
  --session-id 'replace-with-session-id'
```

Termination closes the session's data connection and prevents resumption. [TerminateSession behavior](https://docs.aws.amazon.com/cli/latest/reference/ssm/terminate-session.html)

CloudTrail records Session Manager API activity, but Session Manager does **not** record port-forwarded SQL or results as a shell transcript. Configure database auditing separately when query-level evidence is required. [Session API auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html), [port-forwarding logging limitation](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
