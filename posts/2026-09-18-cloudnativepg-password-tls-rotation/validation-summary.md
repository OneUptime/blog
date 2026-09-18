# Validation Summary: How to Rotate PostgreSQL Operator User Passwords and TLS Certificates Without Downtime

## Status
validated

## Post Type
Technical guide with Kubernetes configuration, shell commands, and SQL.

## Technologies Covered
- CloudNativePG 1.30: managed roles, password reconciliation, certificate Secrets, and kubectl plugin.
- PostgreSQL 18: role membership, default privileges, authentication, session monitoring, and TLS.
- Kubernetes: Secrets, labels, namespaces, and kubectl JSONPath.
- PgBouncer authentication and connection pooling.
- TLS certificate renewal and CA trust rotation.

## Sources Consulted
- [CloudNativePG 1.30 role management](https://cloudnative-pg.io/docs/1.30/declarative_role_management/) — inline role configuration, password Secrets, reload labels, and managed-role status.
- [CloudNativePG 1.30 certificates](https://cloudnative-pg.io/docs/1.30/certificates/) — certificate ownership, Secret requirements, internal CA verification, renewal, and reload behavior.
- [CloudNativePG 1.30 kubectl plugin](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/) — reload command and namespace usage.
- [CloudNativePG 1.30 connection pooling](https://cloudnative-pg.io/docs/1.30/connection_pooling/) — built-in authentication lookup and custom authentication responsibilities.
- [PostgreSQL 18 role membership](https://www.postgresql.org/docs/18/role-membership.html) — group roles and inherited privileges.
- [PostgreSQL 18 pg_authid](https://www.postgresql.org/docs/18/catalog-pg-authid.html) — single password verifier and login attribute.
- [PostgreSQL 18 CREATE ROLE](https://www.postgresql.org/docs/18/sql-createrole.html) and [ALTER ROLE](https://www.postgresql.org/docs/18/sql-alterrole.html) — login and password changes.
- [PostgreSQL 18 ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html) — defaults depend on the object-creating role.
- [PostgreSQL 18 monitoring statistics](https://www.postgresql.org/docs/18/monitoring-stats.html) — pg_stat_activity columns used by the session query.
- [PostgreSQL 18 server SSL configuration](https://www.postgresql.org/docs/18/ssl-tcp.html) — certificate chains, client trust, reloads, and preservation of old configuration on reload errors.
- [PostgreSQL 18 libpq SSL support](https://www.postgresql.org/docs/18/libpq-ssl.html) — CA bundles and hostname verification.
- [Kubernetes kubectl label](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/) — label syntax, overwrite, and namespace flags.
- [Kubernetes JSONPath](https://kubernetes.io/docs/reference/kubectl/jsonpath/) — field selection and newline output.
- [Kubernetes Secret consumption](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/) — environment variables require container restart to observe changed Secrets.
- [Author GitHub profile](https://github.com/nawazdhandala) — checked the author link and redirect.

## Issues Found
1. **TLS rejection was stated unconditionally.** Qualified the opening claim to clients that verify server certificates and lack trust in the issuing CA. Encryption alone does not imply certificate verification.
2. **Default privileges were tied only to the schema owner.** Changed the instruction to configure defaults for each object-creating role. PostgreSQL uses that role's defaults, even when another role owns the schema.
3. **Repeated rotations omitted re-enabling the unused login.** Added a step to restore `login: true` after its new password has reconciled and wait for reconciliation before testing. A role disabled during the preceding rotation otherwise cannot authenticate.
4. **The custom TLS Secret type was omitted.** Specified `kubernetes.io/tls` alongside the existing key requirements, matching CloudNativePG's documented interface.
5. **CA rollout omitted the cluster's own server trust source.** Added staging of the overlapping CA bundle in the user-provided `serverCASecret` and waiting for reconciliation before switching the server certificate. The operator and database instances also validate server certificates against this CA.

## Review Notes
- Reviewed every YAML fragment, shell command, and SQL query against the official interfaces. Existing code examples required no changes; corrections are limited to technical prose within existing sections.
- Inline `spec.managed.roles` remains documented in CloudNativePG 1.30, although its documentation recommends standalone `DatabaseRole` resources for new workflows. Migration is not required for this guide.
- Confirmed that reload differs from restart, managed-role status avoids printing Secret values, and failed TLS reloads can leave the prior certificate active.
- Confirmed the cautions about existing sessions, same-role password cutovers, client credential refresh, replication certificates, and pooler authentication.
- The referenced documentation URLs resolve to the intended resources. PostgreSQL references explicitly target version 18; operator examples target CloudNativePG 1.30.
- Validation is based on documentation and static review. No live Kubernetes cluster, PostgreSQL instance, application rollout, or certificate rotation was exercised; interruption-free operation still requires the fresh-connection and fleet checks described in the post.
