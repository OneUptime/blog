# Rotate Database Credentials Without Breaking Connection Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Java, Reliability

Description: Rotate database credentials with a staged pool transition, atomic username/password updates, fresh-login checks, and controlled retirement of old connections.

A password rotation can look successful for twenty minutes and then cause an outage. The database accepted the new password, the secret store published it, and application health checks stayed green. Later, the connection pool needed another connection and tried the old password cached at startup.

The missing step was updating the component that creates physical database connections. Changing a secret does not automatically change every running pool. A reliable rotation must coordinate the database, secret publication, application refresh, and connection retirement.

This guide uses **Java 17 and HikariCP 6.3.0** for the application example. It discusses password credentials; automatic IAM token refresh has a different lifecycle and should use the provider's supported connector.

## Choose a rotation strategy before touching the pool

With a single database user, changing its password creates a transition during which consumers holding the previous password may fail to open connections. Existing connections can conceal that failure. With alternating users, the next credential belongs to another login whose privileges must match the application's requirements.

AWS Secrets Manager documents both strategies. Alternating users can provide an overlap where both credential sets work, but their permissions must remain aligned. The strategy requires additional privileges for the rotation implementation and is not interchangeable with changing one user's password twice. See [Secrets Manager rotation strategies](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotation-strategy.html).

| Strategy | Application consequence | Operational concern |
| --- | --- | --- |
| Single user, new password | Refresh all connection creators promptly | A stale process can fail its next login immediately after the database change |
| Alternating users | Refresh username and password as one versioned pair | Both users need correct grants; old credentials must eventually leave circulation |
| Replace application instances | New processes initialize pools with the selected version | Rollout capacity, long transactions, and old instances still need management |

Choose based on your database's supported rotation mechanism and availability requirements. Do not invent password overlap if the server only accepts one password for that login.

## Track a credential version through the application

Record a non-secret version identifier alongside the loaded credential. Useful evidence includes which version a process loaded, when it last refreshed, whether a new physical connection succeeded, and how many requests are waiting for a connection. Never log the password or full connection string if it contains credentials.

Secret rotation commonly has separate preparation, database-update, testing, and publication stages. AWS's [Lambda rotation workflow](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html) describes those stages. Publication is a handoff to consumers, not proof that those consumers applied the version.

Also inspect caching between the secret store and pool. For example, the documented Secrets Manager Java cache refreshes hourly by default. An application using a cache must deliberately align its refresh behavior with the rotation plan; querying a cache is not the same as forcing a current read from the service. See the [Java caching documentation](https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_cache-java.html).

```mermaid
flowchart LR
    D[Prepare database credential] --> T[Test fresh login]
    T --> S[Publish credential version]
    S --> A[Refresh one application cohort]
    A --> P[Update pool credential pair]
    P --> E[Retire old connections gradually]
    E --> V[Verify fresh logins and transactions]
    V --> N[Proceed to next cohort]
```

## Update the pair together in HikariCP

When usernames alternate, separate `setUsername` and `setPassword` calls introduce an intermediate combination. HikariCP 6.3.0 provides `setCredentials` to replace the pair atomically. Its [configuration implementation](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.0/src/main/java/com/zaxxer/hikari/HikariConfig.java) stores the pair in an atomic reference.

This helper assumes a running pool whose underlying data source honors the username and password supplied by HikariCP. The caller must retrieve and validate the complete secret version first, serialize rotation updates, and invoke this once for the selected application cohort. It does not fetch secrets or implement deployment coordination.

```java
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import com.zaxxer.hikari.util.Credentials;
import java.util.Objects;

public final class PoolCredentialRotation {
    private PoolCredentialRotation() {}

    public static void apply(HikariDataSource pool,
                             String username,
                             String password) {
        Objects.requireNonNull(pool, "pool");
        Objects.requireNonNull(username, "username");
        Objects.requireNonNull(password, "password");
        HikariPoolMXBean control = pool.getHikariPoolMXBean();
        if (!pool.isRunning() || control == null) {
            throw new IllegalStateException("Pool must be running");
        }
        pool.getHikariConfigMXBean()
            .setCredentials(Credentials.of(username, password));
        control.softEvictConnections();
    }
}
```

The helper updates the pair, then requests soft eviction. HikariCP's [pool management interface](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.0/src/main/java/com/zaxxer/hikari/HikariPoolMXBean.java) defines this as closing idle connections and marking borrowed connections for retirement when returned. It does not forcibly end their active transactions.

The [connection creation code](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.0/src/main/java/com/zaxxer/hikari/pool/PoolBase.java) reads the configured pair when creating a connection. However, a creation attempt already in progress may have captured the previous credentials. The helper is therefore not a global barrier proving that every session now uses the new version.

Do not apply this blindly to a custom data source that ignores supplied credentials or independently caches them. Verify that integration first. Keep existing verified TLS configuration unchanged throughout the credential transition.

## Run the transition in small cohorts

Before updating a production cohort, establish a genuinely new connection with the selected credential in an isolated probe or canary pool. Confirm the database identity and an approved operation. A query borrowed from the existing main pool is insufficient evidence.

Then update a small cohort. Soft eviction can generate a burst of new connections, so avoid invoking it across the fleet simultaneously. Observe connection creation failures, waiting requests, database connection count, and transaction outcomes before advancing.

If the application needs a strict drain, implement admission control around its work: stop accepting new work for that cohort, wait for tracked transactions to finish, then transition. Hikari's active-connection count is a momentary observation, not a concurrency barrier. Do not assume a brief zero reading prevents another thread from borrowing immediately afterward.

Hikari's `maxLifetime` also does not forcibly retire a borrowed connection; it is retired after return. That matters when planning how long old sessions may remain. See the [6.3.0 configuration reference](https://github.com/brettwooldridge/HikariCP/blob/HikariCP-6.3.0/README.md).

## Rehearse failure before retiring the old path

A useful staging rehearsal includes a borrowed connection spanning the refresh, a fresh connection after refresh, a cold application restart, and an intentionally unavailable secret service. The application should report refresh failure without publishing an incomplete pair or leaking the secret into logs.

For alternating users, verify the canary has the expected permissions, including sequence access and row policies where applicable. A successful login alone cannot reveal privilege drift between the two users.

Keep rollback tied to credentials that the database still accepts. Repointing a secret label or restoring an old application configuration does not restore an old database password. Confirm a fresh login before using a previous version as recovery, and do not repeatedly switch versions while transactions are failing.

Finally, retire the old credential only after every consumer has transitioned and the planned overlap has ended. Track long-running jobs separately from web replicas. The acceptance evidence is successful fresh authentication throughout the rollout, correct application behavior, and an accounted-for old credential, not simply a successful secret-store rotation event.

The Java helper was compiled against HikariCP 6.3.0 using Java 17. It was not run against a database, and no live rotation or transaction-draining test is claimed.
