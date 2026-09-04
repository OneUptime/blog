# How to Fix the CloudStack UI When It Returns HTTP 503 or 500

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudStack, HTTP, MySQL, Linux, Troubleshooting

Description: Isolate CloudStack UI HTTP 503 and 500 errors across the reverse proxy, management service, JVM, database, and API, then restore service without masking the underlying failure.

---

An HTTP 503 and an HTTP 500 point to different layers. A reverse proxy normally returns 503 when it has no healthy CloudStack upstream or cannot connect to one. A 500 means a request reached an HTTP application that failed while handling it, although that application might itself be the proxy or an intermediary. The status code alone is not enough; identify who generated it.

Avoid restarting every component at once. That destroys timing evidence and can turn a database or disk problem into a restart loop.

## Compare the Public and Local Paths

Capture headers and a timestamp from the user-facing endpoint, then test the management node directly:

```bash
date -Is
curl -sS -D /tmp/cloudstack-public.headers \
  -o /tmp/cloudstack-public.body \
  https://cloud.example.net/client

curl -sS -D /tmp/cloudstack-local.headers \
  -o /tmp/cloudstack-local.body \
  http://127.0.0.1:8080/client
```

Normal certificate and hostname verification is part of the public-path test. If the endpoint uses an internal CA, trust that CA explicitly, for example `curl -sS --cacert /path/to/ca.pem https://cloud.example.net/client`. Do not disable TLS verification, because doing so can hide the fault that users actually experience.

Review `Server`, proxy request IDs, status, redirects, and a short sanitized body. Do not publish session cookies or stack traces.

| Public endpoint | Local `:8080/client` | Focus |
| --- | --- | --- |
| 503 | 200 | proxy health check, route, TLS, firewall, upstream definition |
| 503 | connection refused | management service/listener |
| 500 | 500 | CloudStack application, database, migration, filesystem/JVM |
| 500 | 200 | proxy rewrite/auth/error handler or a different backend |

The standard UI path is `/client`. Test both the static UI shell and an authenticated/API operation: cached frontend assets can load while API calls fail.

## Inspect the Management Service Before Restarting It

On the affected management server:

```bash
sudo systemctl status cloudstack-management --no-pager -l
sudo systemctl show cloudstack-management \
  -p ActiveState -p SubState -p ExecMainStatus -p NRestarts
sudo ss -ltnp | grep -E ':(8080|8250|9090)\b'
sudo journalctl -u cloudstack-management -b --no-pager -n 250
sudo tail -n 250 /var/log/cloudstack/management/management-server.log
```

Apache's troubleshooting guide identifies `/var/log/cloudstack/management/` as the source for UI, middle-tier, and database diagnostics. Search a narrow time range and correlate a request/job ID:

```bash
sudo grep -iE 'exception|unable|fail|invalid|warn|error' \
  /var/log/cloudstack/management/management-server.log | tail -n 200
```

Look earlier than the final exception for its cause. Typical categories include database connection refusal or exhaustion, schema migration failure, an unreadable keystore/configuration, JVM out-of-memory, and a full filesystem.

## Check Host Resources and Java

```bash
df -h / /var /var/log
df -i / /var /var/log
free -h
ps -o pid,etime,%cpu,%mem,rss,cmd -C java
java -version
sudo journalctl -k -b | grep -Ei 'out of memory|oom-kill|killed process'
```

CloudStack 4.23 requires Java 17. Selecting an unsupported JRE after an OS update can prevent startup. A full log volume can also cause surprising application and database failures; retain the evidence and apply a supported log4j2 rotation policy rather than deleting the active log blindly.

If the service is active but not listening, inspect its startup log. If it listens only on an unexpected address, compare the packaged service configuration and recent changes.

## Verify MySQL Without Modifying It

The management server depends on the `cloud` and `cloud_usage` databases. Check service, listener, capacity, and a read-only login using securely supplied credentials:

```bash
sudo systemctl status mysqld --no-pager -l
sudo ss -ltnp | grep ':3306\b'
mysql --defaults-extra-file=/root/.my-cloudstack-check.cnf \
  -e 'SELECT NOW(); SHOW DATABASES; SHOW STATUS LIKE "Threads_connected";'
```

Protect the option file with mode `0600` and remove it after the check. Never put production passwords directly in a shared shell history.

CloudStack's installation guide sets `max_connections` to 350 times the number of management servers and recommends `innodb_rollback_on_timeout=1`, `innodb_lock_wait_timeout=600`, binary logging, and row format. Compare effective values rather than assuming the file was loaded:

```sql
SHOW VARIABLES WHERE Variable_name IN
  ('max_connections','innodb_rollback_on_timeout',
   'innodb_lock_wait_timeout','log_bin','binlog_format');
SHOW GLOBAL STATUS LIKE 'Threads_connected';
```

Do not rerun `cloudstack-setup-databases` or use `--force-recreate` to fix a 500. Back up the database and follow the exact upgrade/rollback guide if logs show a schema-version problem.

## Diagnose a Reverse-Proxy 503

If local port 8080 works, inspect the proxy's configured upstream address, path, health check, SNI/TLS mode, timeout, and session persistence. From the proxy host itself:

```bash
getent ahosts mgmt01.internal.example
nc -vz mgmt01.internal.example 8080
curl -sS -D- -o /dev/null http://mgmt01.internal.example:8080/client
```

CloudStack's management-server HA documentation requires persistence for UI traffic to port 8080 and for agent traffic to port 8250. In a multi-node deployment, test every backend directly. Remove only the failing node from rotation; do not route around a shared database failure.

If TLS terminates at the proxy, keep the external scheme/host headers and redirect behavior consistent. A redirect loop is not repaired by accepting every status as healthy.

## Make One Scoped Repair

Choose the repair that matches the evidence:

- Start the management service if it was intentionally stopped and dependencies are healthy.
- Restore the supported Java selection or a known-good service/configuration file.
- Free space through the site's retention procedure, then correct log rotation.
- Restore database reachability or capacity; do not weaken authentication.
- Correct the proxy upstream/health path and put a proven backend back into rotation.
- For an upgrade failure, stop and follow the release-specific backup and rollback instructions.

Before restarting, preserve the relevant log interval and configuration diff. Then restart only the affected component:

```bash
sudo systemctl restart cloudstack-management
sudo journalctl -u cloudstack-management -f
```

## Verify More Than the Login Page

After recovery, require:

1. Direct and proxied `/client` requests return the expected successful response.
2. An authenticated UI session can list infrastructure and complete a harmless read.
3. A signed API read succeeds through the public endpoint.
4. KVM agents and System VMs remain connected on their separate management path.
5. Error rate, JVM memory, database connections, and proxy health remain stable.

The management server is stateless relative to its database, but an outage stops new provisioning, UI/API activity, dynamic allocation, and HA orchestration even though already-running guests continue. Treat UI recovery as control-plane recovery, not merely webpage recovery.

## Roll Back Safely

If a proxy change causes the failure, restore its last tested configuration and reload only after a syntax check. If a package or CloudStack upgrade caused it, do not downgrade binaries against a newer schema casually. Use the official release's backup/rollback procedure and a verified database backup.

Never expose ports 8096 or 8250 publicly while troubleshooting. The installation documentation explicitly warns against it.

## Conclusion

First identify whether the 503/500 came from the proxy or CloudStack. Then trace the local listener, management log, JVM and filesystem, MySQL, and each proxy backend. One evidence-matched repair plus an authenticated API check is far safer than a blanket restart and tells you the control plane is truly back.

## Official Documentation

- [Apache CloudStack: Troubleshooting and Server Logs](https://docs.cloudstack.apache.org/en/latest/adminguide/troubleshooting.html)
- [Apache CloudStack: Log In to the UI](https://docs.cloudstack.apache.org/en/latest/adminguide/ui.html)
- [Apache CloudStack: Management Server Installation](https://docs.cloudstack.apache.org/en/latest/installguide/management-server/)
- [Apache CloudStack: Management Server High Availability](https://docs.cloudstack.apache.org/en/latest/adminguide/reliability.html)
- [Apache CloudStack: Upgrade Guide](https://docs.cloudstack.apache.org/en/latest/upgrading/)
