# How to Rotate PostgreSQL Operator User Passwords and TLS Certificates Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Security, TLS, Certificate Rotation

Description: Coordinate CloudNativePG password and certificate rotation with overlapping identities, Secret reconciliation, client trust, and fresh-connection tests.

CloudNativePG can apply password changes and reload certificates without restarting PostgreSQL. That does not automatically make an application rotation interruption-free. A client using an old password will fail its next authentication after that password is replaced, and a client missing a new CA will reject the renewed server certificate.

For a rotation with continuous application service, use overlapping login identities where possible and stage trust changes before certificate replacement. The examples follow CloudNativePG 1.30. Read the matching [role-management documentation](https://cloudnative-pg.io/docs/1.30/declarative_role_management/) before adapting an older operator installation.

## Separate privileges from the rotating login

PostgreSQL stores one password for a role; there is no built-in period when two different passwords authenticate as the same role. Existing sessions do not reauthenticate for each query, which can hide a failed rotation until a pool creates a new connection.

A practical design uses a non-login role for application privileges and two login roles that can temporarily coexist. PostgreSQL documents this [role-membership model](https://www.postgresql.org/docs/18/role-membership.html).

The following fragment belongs in an existing Cluster manifest. Preserve any other managed roles when merging it:

```yaml
spec:
  managed:
    roles:
      - name: app_access
        login: false
      - name: app_login_a
        login: true
        inRoles:
          - app_access
        passwordSecret:
          name: app-login-a
      - name: app_login_b
        login: true
        inRoles:
          - app_access
        passwordSecret:
          name: app-login-b
```

Grant only the required database, schema, table, and sequence privileges to `app_access`. Include default privileges for objects created later by the actual schema owner. Membership alone does not grant access to objects that the group role cannot use.

Each referenced Secret must use type `kubernetes.io/basic-auth`, with `username` matching its login and a `password` value managed through your secret-management system. Label the Secrets so changes trigger prompt reconciliation:

```bash
kubectl label secret app-login-a app-login-b -n database \
  cnpg.io/reload=true --overwrite
```

## Rotate through the unused identity

Suppose production currently uses `app_login_a`. Generate a fresh password for `app_login_b`, update its Secret through the normal delivery system, and wait for the operator to reconcile it. Inspect managed-role status and errors without printing Secret values:

```bash
kubectl get cluster app-db -n database \
  -o jsonpath='{.status.managedRolesStatus}{"\n"}'
```

Open a new connection as `app_login_b` from the application network. Test the actual operations the application needs, including sequences and schema-qualified queries. A superuser test does not validate runtime privileges.

Deploy the new username and password to a subset of application instances, then roll the remaining instances. Account for whether clients read credentials only at startup and whether PgBouncer has a separate authentication source. Kubernetes Secret updates do not magically refresh every application's environment variables or connection pool.

After all instances use the new identity, check remaining sessions:

```sql
SELECT usename, application_name, count(*)
FROM pg_stat_activity
WHERE usename IN ('app_login_a', 'app_login_b')
GROUP BY usename, application_name;
```

Drain the old sessions according to the application's transaction policy. Change the old managed role to `login: false` to prevent new sessions once it is no longer needed. That does not terminate existing sessions; handle any remaining connections deliberately. Avoid removing a role that still owns objects. The next rotation can reverse the two identities.

If the username cannot change, coordinate a same-role Secret change with client credential refresh and bounded retries. Be explicit that this approach has an authentication-failure window unless the application supplies its own overlap mechanism.

## Renew a server certificate under the existing CA

CloudNativePG automatically renews its managed certificates and reloads PostgreSQL. With user-provided certificates, the issuer and renewal workflow remain your responsibility. The [certificate documentation](https://cloudnative-pg.io/docs/1.30/certificates/) describes the required Secret keys and reload behavior.

For an existing custom-certificate configuration, confirm these references:

```yaml
spec:
  certificates:
    serverCASecret: app-server-ca
    serverTLSSecret: app-server-tls
```

The CA Secret contains `ca.crt`; the TLS Secret contains `tls.crt` and `tls.key`. Verify the new certificate's validity dates, matching private key, full chain, and the DNS names used by clients before replacing the Secret.

```bash
kubectl label secret app-server-tls app-server-ca -n database \
  cnpg.io/reload=true --overwrite
kubectl cnpg reload app-db -n database
```

An explicit reload is useful when the update was not watched. Check PostgreSQL logs for certificate-loading errors. PostgreSQL documents how [SSL configuration is reloaded](https://www.postgresql.org/docs/18/ssl-tcp.html), including failures that can leave the previous certificate active.

## Treat a CA change as a trust rollout

Distribute a trust bundle containing both old and new server CAs to clients before switching the server certificate. Confirm new connections succeed with that bundle, replace the server certificate and chain, and test every connection path using hostname verification. Remove the old CA only after all endpoints and clients have migrated.

Client-certificate authentication has the reverse dependency: the server must trust the new client CA before clients present new certificates. Include the replication identity and any pooler connections in the plan; they are separate from the application's password.

Finish with fresh-connection tests, certificate-expiry monitoring, and checks for authentication or TLS failures. Keep the previous working credential or certificate available for the agreed rollback period, then retire it through the same controlled mechanism. Success means new sessions work across the fleet, not merely that old pooled sessions continue returning queries.
