# How to Run `postgres_exporter` Without Superuser Using `pg_monitor` and File-Based Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, postgres_exporter, Prometheus, Least Privilege, Secret Management

Description: Deploy postgres_exporter with PostgreSQL's predefined monitoring role and mounted credential files instead of a superuser account or password-bearing environment variable.

---

`postgres_exporter` needs to read PostgreSQL statistics; it does not need to own application data or administer the cluster. The exporter project's official instructions support a non-superuser role on PostgreSQL 10 and later and provide `*_FILE` environment variables so secrets do not have to appear in a connection URI or ordinary environment variable.

Use both controls. A file-based password does not compensate for an overprivileged database role, and a least-privilege role does not protect a password embedded in process configuration.

## Create a dedicated login

As an administrator, create a login with no administrative attributes:

```sql
CREATE ROLE postgres_exporter
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE postgres TO postgres_exporter;
GRANT pg_monitor TO postgres_exporter;
```

Because the HBA rule below requires SCRAM, ensure `password_encryption` is `scram-sha-256` when the password is set. PostgreSQL 10 through 13 defaulted this setting to `md5`; an MD5-stored verifier cannot authenticate against a `scram-sha-256` record. Use a secret-management workflow or, in an interactive administrator `psql` session, run `SET password_encryption = 'scram-sha-256';` and then `\password postgres_exporter` rather than putting a literal into a checked-in migration or shell history.

`CONNECT` is granted to `PUBLIC` by default on a database, so the explicit grant above is often redundant and does not deny this role access to other databases. Effective database scope depends on the database ACLs and the complete HBA policy.

`pg_monitor` is a predefined role and is itself a member of `pg_read_all_settings`, `pg_read_all_stats`, and `pg_stat_scan_tables`. That supplies broad monitoring visibility, including normally restricted activity fields. It does not grant superuser, table write, role administration, or replication privileges.

This grant is intentionally powerful within the monitoring domain. PostgreSQL warns that predefined roles can change as capabilities are added, and `pg_stat_scan_tables` permits monitoring functions that can take `ACCESS SHARE` locks for a long time. Review release notes and enable only exporter collectors you need. The exporter README also permits `pg_read_all_stats` as a narrower alternative, but collectors that read settings may then need additional access.

For PostgreSQL 9.6 and older, `pg_monitor` does not exist. The exporter documents a compatibility design based on carefully owned `SECURITY DEFINER` functions and views. Do not copy that legacy pattern into a modern cluster, and do not improvise security-definer functions without fixing ownership and `search_path`.

## Restrict connection scope

Add a narrowly scoped rule for the intended exporter path and require modern password authentication and TLS as appropriate:

```text
# pg_hba.conf
hostssl  postgres  postgres_exporter  10.30.4.18/32  scram-sha-256
```

`pg_hba.conf` uses the first matching record. Place this rule before broader records, audit the full file including included and `local` records, and add per-role `reject` records where necessary so another rule cannot admit this role from a different address or to a different database. Reload PostgreSQL after editing `pg_hba.conf`. Use the exporter service's stable address or a tightly scoped subnet rather than a broad public range. The TLS mode must match your certificate design; `sslmode=require` encrypts but does not verify server identity, while `verify-full` verifies the chain and hostname when the client trust material is configured.

Confirm the effective grant without using the exporter process:

```sql
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb,
       rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = 'postgres_exporter';

SELECT pg_has_role('postgres_exporter', 'pg_monitor', 'USAGE');
```

## Use the exporter's password-file interface

The current exporter accepts a host-only `DATA_SOURCE_URI`, a separate `DATA_SOURCE_USER`, and `DATA_SOURCE_PASS_FILE` containing the password:

```yaml
services:
  postgres-exporter:
    image: quay.io/prometheuscommunity/postgres-exporter:v0.19.1
    environment:
      DATA_SOURCE_URI: "postgres:5432/postgres?sslmode=require"
      DATA_SOURCE_USER: "postgres_exporter"
      DATA_SOURCE_PASS_FILE: "/run/secrets/postgres_exporter_password"
    secrets:
      - postgres_exporter_password
    ports:
      - "127.0.0.1:9187:9187"

secrets:
  postgres_exporter_password:
    file: ./secrets/postgres_exporter_password
```

Pin an audited image version instead of `latest`. The official container process runs as UID and GID `65534`, so the mounted file must be readable by that identity without becoming writable or broadly exposed. Verify the effective mount permissions inside the deployed runtime; host-side ownership alone can be misleading with user namespaces or orchestrator secret mounts.

Kubernetes can mount a Secret as a read-only volume and point the same environment variable at the mounted key. Prefer that over `env.valueFrom.secretKeyRef`, because an environment variable still copies the secret into process environment. Keep the URI and username separate unless they too are sensitive and managed as files through `DATA_SOURCE_URI_FILE` and `DATA_SOURCE_USER_FILE`.

With systemd credentials, a service can expose the manager-created read-only credential path to the exporter:

```ini
[Service]
User=postgres-exporter
LoadCredential=postgres-password:/etc/postgres-exporter/password
Environment=DATA_SOURCE_URI=db.internal:5432/postgres?sslmode=verify-full
Environment=DATA_SOURCE_USER=postgres_exporter
Environment=DATA_SOURCE_PASS_FILE=%d/postgres-password
ExecStart=/usr/local/bin/postgres_exporter
```

`LoadCredential=` and the `%d` credential-directory specifier are available in systemd 247 and later. Protect the source credential and test the unit on the deployed systemd release.

## Avoid the common secret leaks

Do not use a URI such as this in a manifest:

```text
postgresql://postgres_exporter:plaintext@db:5432/postgres
```

It can leak through deployment diffs, environment inspection, crash reports, support bundles, and command histories. Also avoid printing all environment variables during diagnostics.

The exporter configuration file's multi-target `auth_modules` currently stores a username and password in YAML. It prevents credentials from appearing in the `/probe` URL, but the file itself remains a secret and multi-target support is documented as beta. Use strict file permissions and separate trust domains rather than sharing one credential across unrelated targets.

## Enable collectors deliberately

Current exporter releases enable core database, locks, activity, vacuum-progress, and related collectors, while some higher-cost or higher-cardinality collectors are disabled by default. For example, `collector.stat_statements` is disabled by default; query text inclusion is separately disabled, with limits available when enabled.

Review flags from the exact exporter version:

```bash
postgres_exporter --help
```

Then validate from the monitoring path:

```bash
curl --fail --silent http://127.0.0.1:9187/metrics >/dev/null
```

Check exporter logs, Prometheus's `up` metric, and the exporter health series `pg_up`, `pg_exporter_last_scrape_error`, and `pg_scrape_collector_success`. Prometheus's `up` only confirms that Prometheus scraped the exporter; a successful HTTP response can still coincide with database or collector errors or omit a family due to database permissions. Also set `PG_EXPORTER_COLLECTION_TIMEOUT` below the Prometheus scrape timeout with enough normal headroom, so slow collection does not accumulate database connections.

## Rotate without widening privileges

In v0.19.1, the `DATA_SOURCE_*_FILE` values are read once at process startup and retained in the in-memory connection string. Coordinate the PostgreSQL password change with atomically publishing the same value, then recreate the Compose container, roll the Kubernetes workload, or restart the systemd service and confirm a newly authenticated scrape. Replacing the mounted file alone does not update either existing connections or later connections opened by the same exporter process.

A PostgreSQL role stores only one password verifier, so old and new passwords cannot overlap for the same login. If your rotation design provides overlap, such as by alternating between two login roles, confirm successful collector metrics before revoking the old credential.

Credential rotation does not require granting superuser. If a collector fails after an upgrade, identify the precise view or function and compare it with official collector requirements before adding privileges.

## Official Documentation

- [Prometheus Community postgres_exporter](https://github.com/prometheus-community/postgres_exporter)
- [PostgreSQL predefined roles](https://www.postgresql.org/docs/current/predefined-roles.html)
- [PostgreSQL host-based authentication](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
- [PostgreSQL password authentication](https://www.postgresql.org/docs/current/auth-password.html)
- [PostgreSQL libpq SSL modes](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [systemd credentials](https://systemd.io/CREDENTIALS/)

## Conclusion

Run `postgres_exporter` as a dedicated non-superuser, grant `pg_monitor` only after understanding its monitoring scope, restrict the login in `pg_hba.conf`, and pass the password through `DATA_SOURCE_PASS_FILE`. Account for container UID/GID `65534`, pin versions, and add privileges only for a documented collector need.
