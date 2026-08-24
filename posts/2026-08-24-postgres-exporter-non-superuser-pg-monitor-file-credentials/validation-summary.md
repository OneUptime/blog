# Validation Summary: Run `postgres_exporter` Without Superuser Using `pg_monitor`

## Status

validated

## Post Type

Deployment and least-privilege security guide

## Technologies Covered

- PostgreSQL roles, predefined monitoring roles, database privileges, and host-based authentication
- `postgres_exporter` v0.19.1 and Prometheus collector health metrics
- Docker Compose secrets and container file permissions
- Kubernetes Secret volumes
- systemd service credentials
- PostgreSQL SCRAM-SHA-256 authentication and TLS client modes
- Credential rotation

## Sources Consulted

- [`postgres_exporter` v0.19.1 README](https://github.com/prometheus-community/postgres_exporter/blob/v0.19.1/README.md)
- [`postgres_exporter` v0.19.1 data-source implementation](https://github.com/prometheus-community/postgres_exporter/blob/v0.19.1/exporter/datasource.go)
- [`postgres_exporter` v0.19.1 startup path](https://github.com/prometheus-community/postgres_exporter/blob/v0.19.1/cmd/postgres_exporter/main.go)
- [`postgres_exporter` v0.19.1 collector implementation](https://github.com/prometheus-community/postgres_exporter/blob/v0.19.1/collector/collector.go)
- [`postgres_exporter` v0.19.1 Dockerfile](https://github.com/prometheus-community/postgres_exporter/blob/v0.19.1/Dockerfile)
- [`postgres_exporter` v0.19.1 release](https://github.com/prometheus-community/postgres_exporter/releases/tag/v0.19.1)
- [`postgres_exporter` v0.20.0 release and breaking collector changes](https://github.com/prometheus-community/postgres_exporter/releases/tag/v0.20.0)
- [`postgres_exporter` v0.20.1 release](https://github.com/prometheus-community/postgres_exporter/releases/tag/v0.20.1)
- [PostgreSQL `CREATE ROLE`](https://www.postgresql.org/docs/current/sql-createrole.html)
- [PostgreSQL predefined roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL role and privilege inquiry functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL database privileges and default `PUBLIC` grants](https://www.postgresql.org/docs/current/ddl-priv.html)
- [PostgreSQL password authentication](https://www.postgresql.org/docs/current/auth-password.html)
- [PostgreSQL 13 `password_encryption` setting](https://www.postgresql.org/docs/13/runtime-config-connection.html)
- [PostgreSQL 14 release notes](https://www.postgresql.org/docs/14/release-14.html)
- [PostgreSQL `pg_hba.conf`](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [PostgreSQL libpq SSL modes](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [PostgreSQL `pg_authid` catalog](https://www.postgresql.org/docs/current/catalog-pg-authid.html)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/)
- [Docker Compose service secrets](https://docs.docker.com/reference/compose-file/services/#secrets)
- [Docker Compose secret management](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker Compose restart behavior](https://docs.docker.com/reference/cli/docker/compose/restart/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes Secret volume and environment-variable examples](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/)
- [systemd system and service credentials](https://systemd.io/CREDENTIALS/)
- [Prometheus jobs and instances (`up` metric)](https://prometheus.io/docs/concepts/jobs_instances/)

## Issues Found

- The post paired a `scram-sha-256` HBA rule with password-setting advice that did not ensure a SCRAM verifier. PostgreSQL 10 through 13 defaulted `password_encryption` to `md5`, and an MD5 verifier cannot authenticate through that HBA method. Added an instruction to select `scram-sha-256` when setting the password.
- The explicit `GRANT CONNECT` could imply that it limits the role to the `postgres` database, but databases grant `CONNECT` to `PUBLIC` by default. Clarified that the grant is commonly redundant and that effective scope is determined by database ACLs together with the complete HBA policy.
- One narrow `pg_hba.conf` allow record does not by itself make access exclusive: an earlier broad rule can preempt it, and another rule can admit unmatched addresses or databases. Added first-match ordering, included-file, local-record, and explicit-reject guidance.
- The effective-role check used `pg_has_role(..., 'MEMBER')`, which confirms membership without proving that privileges are immediately inherited. Changed it to `USAGE`, which tests the privilege state the exporter actually needs without `SET ROLE`.
- The systemd text left the required version unspecified. Clarified that `LoadCredential=` and the `%d` credential-directory specifier require systemd 247 or later.
- The validation advice could leave readers relying on Prometheus's `up`, which only proves that Prometheus scraped the exporter endpoint. Added `pg_up`, `pg_exporter_last_scrape_error`, and `pg_scrape_collector_success` so database connectivity and collector failures are checked explicitly.
- The rotation section treated file reload behavior as release-dependent and suggested revoking an old password after validating the new one. In v0.19.1, all `DATA_SOURCE_*_FILE` values are read once at process startup and never reread, even for later connections; a normal PostgreSQL role also stores only one password verifier. Replaced the sequence with coordinated database/secret updates, an explicit Compose recreation, Kubernetes rollout, or systemd restart, and qualified old/new overlap as requiring a two-role or equivalent design.

## Review Notes

- The pinned v0.19.1 image and tag are valid. v0.20.1 was the latest release on the validation date, but retaining an explicitly audited older pin is technically sound. The post correctly tells readers to inspect `--help` for their exact release; v0.20.0 introduced breaking collector flag changes.
- PostgreSQL 10 through 13 and 9.6 are end-of-life. Their role behavior is described correctly for compatibility, but supported PostgreSQL majors on the validation date are 14 through 18.
- `PG_EXPORTER_COLLECTION_TIMEOUT` is implemented for the normal single-target collection path used by the post. The beta multi-target `/probe` path in v0.19.1 and v0.20.1 does not apply that timeout.
- Docker Compose file-backed secrets are bind mounts, and Compose cannot apply `uid`, `gid`, or `mode` overrides to a `file:` secret source. The post's instruction to verify effective in-container readability by UID/GID 65534 is correct.
- The Compose YAML, SQL role definition, HBA record syntax, exporter environment-variable names, collector defaults, Kubernetes Secret-volume guidance, systemd unit syntax, TLS explanation, curl command, and documentation links were otherwise verified as correct.
