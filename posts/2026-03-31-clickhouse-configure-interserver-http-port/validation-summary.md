# Validation Summary: How to Configure ClickHouse Interserver HTTP Port

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse server configuration (config.xml)
- ReplicatedMergeTree replication
- Distributed tables
- OpenSSL / TLS for interserver traffic
- iptables firewall rules
- ClickHouse system tables (`system.replicas`, `system.replication_queue`)

## Sources Consulted
- ClickHouse server configuration parameters: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse network ports guide: https://clickhouse.com/docs/en/guides/sre/network-ports
- `system.replication_queue` reference: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- `system.replicas` reference: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ALTER PARTITION (FETCH PARTITION): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
1. **Incorrect SQL command name.** The post described manual part fetches as `SYSTEM FETCH PARTITION`. That statement does not exist; the correct form is `ALTER TABLE ... FETCH PARTITION ... FROM '<zk-path>'`. Updated the bullet in the "What Uses the Interserver Port" section accordingly.
2. **Invalid `system.replication_queue.type` value.** The example query filtered on `type = 'FETCH_PARTS'`, which is not a valid enum value. The correct value for a replica fetching a part from another replica is `GET_PART`. Replaced in the verification query.
3. **Inaccurate troubleshooting claim.** The post claimed `curl http://host:9009/` should return `OK`. The `Ok.` response is specific to the main HTTP interface (port 8123, `http_server_default_response`). The interserver HTTP port is a data-exchange endpoint and does not reliably serve that response at `/`. Replaced the `curl` command with a `nc -zv` port-reachability check, which is the intended troubleshooting outcome.

## Review Notes
- The default `interserver_http_port` = 9009 is correct.
- XML tags `<interserver_http_port>`, `<interserver_http_host>`, `<interserver_https_port>`, and `<interserver_http_credentials>` (with `<user>` / `<password>` children) match current ClickHouse documentation.
- `verificationMode>none</verificationMode>` in the OpenSSL example is fine for an illustrative snippet, but in production readers should prefer `relaxed` or `strict` with a proper CA — consider adding a cautionary note in a future revision.
- The `system.replicas` columns used in the example (`database`, `table`, `replica_name`, `queue_size`, `absolute_delay`) are all valid.
