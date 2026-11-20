# Scale Azure MySQL with Safe Connection Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Reliability, Performance

Description: Plan Azure MySQL compute and storage changes, drain application traffic, retry fresh connections safely, and verify recovery without replaying uncertain writes.

A database can finish scaling while the application remains unhealthy. Old connections may still be in the pool, workers may reconnect together, or a checkout service may retry a payment that already committed.

Treat scaling as a coordinated application change. The goal is to control which work runs during the transition and prove that normal work can resume. This walkthrough separates the infrastructure operation from connection recovery and transaction recovery.

## Decide which resource needs changing

Azure Database for MySQL Flexible Server treats compute and storage differently:

| Change | Expected database behavior | Planning consequence |
|---|---|---|
| Compute tier or size | Requires a restart; existing connections are disrupted | Schedule a controlled interruption and test reconnection |
| Storage capacity increase | Online scaling without the compute restart | Monitor application health, but do not restart clients unnecessarily |
| Storage capacity decrease | Unsupported | Review the long-term cost before increasing capacity |

Microsoft describes the compute switchover as usually taking 60–120 seconds, with new connections unavailable and uncommitted transactions rolled back. That is a typical window, not an application recovery deadline or a guarantee. See [compute and storage scaling behavior](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage).

Choose a target from evidence: sustained CPU demand, memory pressure, available storage, and the selected size's I/O limits. More disk space does not establish that CPU contention will disappear. Before a compute reduction, also compare the application's total connection budget with the smaller server's capacity. Azure documents connection limits and their relationship to server size in its [server parameter reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters).

## Prepare a maintenance boundary

Record the current configuration, desired configuration, cost, change owner, and acceptance thresholds. Confirm backup health and the recovery procedure, but do not make a database restore the default response to a slow restart.

For a production compute change, rehearse the following sequence on a representative staging server:

```mermaid
flowchart LR
    A[Pause new work] --> B[Drain active transactions]
    B --> C[Change compute]
    C --> D[Open fresh connections]
    D --> E[Run controlled checks]
    E --> F[Resume traffic gradually]
```

Pause scheduled jobs and queue consumers as well as incoming requests. A maintenance page alone does not stop background writers. Let active transactions finish within a defined drain period; investigate work that exceeds it instead of assuming every long transaction is safe to interrupt.

During the interruption, return a clear temporary-unavailability response or retain work in an already designed durable queue. Do not create an unbounded in-memory backlog. Assign one layer responsibility for retries so the API gateway, service, and database library do not multiply attempts independently. This follows the considerations in Microsoft's [transient fault guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults).

## Retry opening a connection, not a whole transaction

Here is a deliberately small connection helper for **Python 3.11 and MySQL Connector/Python 9.1.0**. This is a pinned example, not a recommendation to remain on that release indefinitely. Install your reviewed package in an isolated environment; the release is documented in the [9.1.0 notes](https://dev.mysql.com/doc/relnotes/connector-python/en/news-9-1-0.html).

Provide `MYSQL_HOST` as the server's full DNS name, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, and `MYSQL_CA_FILE` through your approved runtime configuration and secret injection. The CA file must contain the trusted certificate authorities for your Azure endpoint. Do not paste a password into the script or logs.

```python
import os
import random
import time

import mysql.connector
from mysql.connector import Error, errorcode

RETRYABLE_CONNECT_ERRORS = {
    errorcode.CR_CONN_HOST_ERROR,
    errorcode.CR_SERVER_GONE_ERROR,
    errorcode.CR_SERVER_LOST,
}


def open_connection():
    options = {
        "host": os.environ["MYSQL_HOST"],
        "user": os.environ["MYSQL_USER"],
        "password": os.environ["MYSQL_PASSWORD"],
        "database": os.environ["MYSQL_DATABASE"],
        "ssl_ca": os.environ["MYSQL_CA_FILE"],
        "ssl_verify_cert": True,
        "ssl_verify_identity": True,
        "connection_timeout": 5,
        "use_pure": True,
    }
    for attempt in range(4):
        try:
            return mysql.connector.connect(**options)
        except Error as exc:
            if exc.errno not in RETRYABLE_CONNECT_ERRORS or attempt == 3:
                raise
            # Spread reconnect attempts across clients; never log credentials.
            time.sleep(random.uniform(0.5, min(8.0, 2.0 ** (attempt + 1))))
```

The helper attempts a new connection at most four times. Its delays grow and include randomness, called jitter, so clients are less likely to reconnect simultaneously. It returns the connection to its caller or raises the final error. The caller owns closing it.

The [connection options](https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html) enable certificate and hostname verification. `connection_timeout` limits connection establishment; it is not an overall request deadline or a query timeout. The four attempts and sleeps do not promise a fixed maximum wall-clock duration, particularly when name resolution is involved. Keep request deadlines and worker cancellation policies outside this small helper.

The selected error numbers come from the [9.1.0 error constants](https://github.com/mysql/mysql-connector-python/blob/9.1.0/mysql-connector-python/lib/mysql/connector/errorcode.py). Its [pure-Python network implementation](https://github.com/mysql/mysql-connector-python/blob/9.1.0/mysql-connector-python/lib/mysql/connector/network.py) also reports some name-resolution and socket failures as error 2003. Therefore, retry eligibility does not prove a failure is temporary. A wrong hostname can consume all four attempts without improving.

Authentication failures, certificate errors, and exhausted connection capacity should trigger diagnosis rather than this helper's automatic retry. Do not expand the error set simply to make an incident look quieter. Azure's [connectivity troubleshooting guide](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-troubleshoot-connectivity-issues) distinguishes these failure classes.

This helper contains no SQL and is not a connection pool implementation. Integrate its policy with your pool's supported connection creation and eviction behavior; do not nest it inside another uncontrolled retry loop. In staging, verify that broken pooled connections are discarded and replacements are limited by pool capacity.

## Preserve uncertain write outcomes

Suppose an application sends `COMMIT`, the database commits, and the connection drops before the reply reaches the application. Reconnecting tells you nothing about whether that transaction completed.

For business operations that may be retried, use a durable operation identifier and a database uniqueness constraint, with the operation record and business changes committed together. On an uncertain outcome, reconcile that identifier before deciding whether another attempt is appropriate. External side effects such as payments need their own coordination and idempotency design.

A read-only connection probe can be repeated safely; a transaction that charges a customer cannot be treated the same way. Microsoft's [retry pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) explicitly discusses the risk of an operation succeeding before its response fails. Keep this distinction in the application runbook.

## Apply the change and admit controlled traffic

In the Azure portal, open the server's **Compute + Storage** settings, select the approved target, review it, and save. Use the [documented management workflow](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/how-to-manage-server-portal). For a storage-only change, verify that the compute selection has not changed accidentally.

After the operation finishes, establish a fresh connection from the actual application network. Check authentication, verified TLS, a simple read, and access to an application table. Then allow a designated test client to perform an approved write/read check using a unique test identifier while ordinary writers remain paused.

Record these separate milestones: infrastructure operation finished, first successful connection, first successful application check, and normal traffic restored. Resume workers and user traffic in stages while watching connection creation, errors, latency, and queue age. A successful administrative connection is insufficient evidence that every application pool recovered.

If checks fail, hold traffic at the maintenance boundary. Diagnose DNS, trust, credentials, pool behavior, and capacity before making another infrastructure change. Reverting compute requires another planned operation; increased storage cannot simply be shrunk back. Finish the change only when the application meets its agreed thresholds under normal traffic.
