# Validation Summary: Private RDS via SSM Remote-Host Port Forwarding: Localhost and TLS

## Status
validated

## Post Type
Tutorial / operational troubleshooting guide.

## Technologies Covered
- AWS Systems Manager, Session Manager, SSM Agent, and the Session Manager plugin
- AWS CLI v2, EC2 relay instances, IAM, VPC networking, and security groups
- Amazon RDS for PostgreSQL and regional CA certificate bundles
- PostgreSQL psql, libpq, TLS hostname verification, and GSSAPI encryption
- Bash, curl, SQL, and AWS CloudTrail

## Sources Consulted
- [AWS remote-host port-forwarding walkthrough](https://aws.amazon.com/blogs/mt/use-port-forwarding-in-aws-systems-manager-session-manager-to-connect-to-remote-hosts/)
- [Session Manager session types and remote-host prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
- [Session Manager node IAM permissions](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-create-iam-instance-profile.html)
- [Session Manager PrivateLink and outbound endpoint connectivity](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-privatelink.html)
- [Session Manager caller IAM policies](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [RDS security groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html)
- [AWS CLI start-session reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/start-session.html)
- [AWS CLI terminate-session reference](https://docs.aws.amazon.com/cli/latest/reference/ssm/terminate-session.html)
- [RDS TLS and regional certificate downloads](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)
- [US East (N. Virginia) CA bundle](https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem)
- [RDS PostgreSQL TLS support](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html)
- [PostgreSQL 18 libpq connection parameters](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [PostgreSQL 18 certificate verification](https://www.postgresql.org/docs/18/libpq-ssl.html)
- [PostgreSQL 18 psql options](https://www.postgresql.org/docs/18/app-psql.html)
- [PostgreSQL 18 SSL statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#PG-STAT-SSL-VIEW)
- [Session Manager API auditing](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-auditing.html)
- [Session Manager logging limitations](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
- [curl command-line reference](https://curl.se/docs/manpage.html)

## Issues Found
No technical issues found.

## Review Notes
- Reviewed on 2026-11-20. README.md required no changes.
- Confirmed the remote-host document name, SSM Agent minimum version 3.1.1374.0, local plugin requirement, and relay-side DNS and database connectivity requirements. The distinction from forwarding to a service on the managed node is correct.
- Checked the separation between caller permissions, relay instance-profile permissions, and PostgreSQL authentication. The security-group source correctly refers to the relay for the stated same-VPC topology.
- Confirmed that hostaddr selects loopback while host preserves the RDS certificate identity. The combination of verify-full, the regional CA bundle, and gssencmode=disable correctly requires verified TLS in this example.
- Verified the psql password-prompt behavior and the pg_stat_ssl column names and meanings. The SQL checks encryption for the current backend; it does not independently establish client hostname verification.
- Checked all four Bash examples with bash -n; all passed. Parsed the start-session parameter JSON and confirmed the expected string-array values. CLI flags and connection parameters match the official references.
- Retrieved the regional CA bundle successfully with HTTP 200 and confirmed that it contains three PEM certificate blocks. The linked technical documentation resolves to the relevant official resources.
- Confirmed termination semantics and the distinction between CloudTrail API records and unavailable port-forwarding session transcripts.
- Validation consisted of documentation review, shell syntax checks, JSON parsing, and a public certificate download. No live AWS forwarding session or database login was attempted; the examples require deployment-specific resources and credentials.
