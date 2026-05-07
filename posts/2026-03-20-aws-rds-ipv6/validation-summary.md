# Validation Summary: How to Configure IPv6 for AWS RDS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS
- AWS CLI
- Terraform
- PostgreSQL
- Python
- `psycopg2`
- IPv6
- Amazon VPC
- Security groups

## Sources Consulted
- Amazon RDS User Guide, "Working with a DB instance in a VPC": https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html
- Amazon RDS User Guide, "Supported Regions and DB engines for dual-stack mode in Amazon RDS": https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.DualStackMode.html
- AWS CLI `create-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI `modify-db-instance` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- Amazon RDS User Guide, "Available PostgreSQL database versions": https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- HashiCorp Developer, "Manage AWS RDS instances": https://developer.hashicorp.com/terraform/tutorials/aws/aws-rds
- Psycopg 2 documentation, module reference: https://www.psycopg.org/docs/module.html
- PostgreSQL 16 documentation, `libpq` connection parameters: https://www.postgresql.org/docs/16/libpq-connect.html

## Issues Found
- The introduction and conclusion implied that dual-stack RDS creates separate IPv4 and IPv6 DNS endpoints and that support is universal. I changed the wording to match AWS documentation: dual-stack support depends on engine version and Region, and clients use the DB endpoint DNS name, which can resolve to both A and AAAA records.
- The AWS CLI create example referenced `my-ipv6-subnet-group`, but the subnet-group example created `ipv6-subnet-group`. I aligned the names so the examples now work together.
- The `describe-db-instances` example was labeled as getting an "IPv6 endpoint" even though RDS exposes the DB endpoint hostname and network type, not a separate IPv6-only endpoint field. I changed the query to return `Endpoint.Address` and `NetworkType`.
- The Terraform example pinned `engine_version = "15.4"`. AWS now marks PostgreSQL 15.4 as having reached end of standard support. I changed the example to use major version `15`, which matches AWS guidance that RDS can choose a current available 15.x release when only the major version is specified.
- The Terraform outputs labeled a hostname as an IPv6 address and used `endpoint` where a hostname-oriented output was more accurate. I changed the outputs to use `aws_db_instance.postgres.address` and renamed the second output to `rds_dual_stack_hostname`.
- The Python example used an Aurora cluster-style hostname (`cluster-...`) even though the post is about an RDS DB instance. I replaced it with a standard RDS instance endpoint pattern.
- The Python example claimed that `getaddrinfo` prefers IPv6. That is not guaranteed by the Python API or by libpq-based clients. I corrected the comment so it reflects that the client stack selects IPv4 or IPv6.
- The verification section used `dig AAAA "$ENDPOINT"`, which is the wrong argument order for the documented `dig` usage. I changed it to `dig "$ENDPOINT" AAAA`.
- The verification section used `curl -6 "telnet://..."`, which is not a reliable or generally documented way to validate RDS IPv6 connectivity. I removed it and kept `nc -6` plus a one-off `psql` check.
- The original `psql` example used only `host=${ENDPOINT}`, which would not ensure an IPv6 connection during verification. I changed it to resolve an AAAA record and pass it via `hostaddr` for an explicit IPv6 test while retaining the endpoint hostname.

## Review Notes
- AWS recommends using the DB endpoint hostname for normal application connections because the underlying IP address can change during failover. The Python example now follows that guidance; the `hostaddr` usage is limited to the explicit verification example.
- The Amazon RDS VPC guide currently contains a confusing note in the IPv4-to-dual-stack modification section about new-instance support, but the same guide and the AWS CLI reference both document `--network-type DUAL` for `create-db-instance`. The post now follows the documented create and modify commands.
- Live command validation was not possible in this environment because `aws` and `terraform` are not installed. Validation was completed against current vendor documentation instead.
