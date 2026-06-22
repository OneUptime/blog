# Validation Summary: How to Audit Redis Access and Commands

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis Open Source
- Redis ACLs and ACL LOG
- Redis SLOWLOG
- Redis MONITOR
- Redis Streams
- redis-py
- Python
- Elasticsearch Python client
- Grafana Loki HTTP API
- PCI-DSS-oriented audit reporting

## Sources Consulted
- Redis SLOWLOG GET command documentation: https://redis.io/docs/latest/commands/slowlog-get/
- Redis ACL LOG command documentation: https://redis.io/docs/latest/commands/acl-log/
- Redis MONITOR command documentation: https://redis.io/docs/latest/commands/monitor/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SETUSER command documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- redis-py monitor documentation: https://redis.readthedocs.io/en/stable/advanced_features.html
- Elasticsearch Python client examples: https://www.elastic.co/docs/reference/elasticsearch/clients/python/examples
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/

## Issues Found
- The MONITOR section said output shows all commands. Redis documentation notes MONITOR omits some commands and redacts sensitive AUTH data, so the wording now says it logs most/processed commands.
- The audit logger wrote `event.to_dict()` directly to `XADD`, but Redis stream fields must be scalar field/value pairs. The code now serializes nested values before calling `xadd`.
- The audit retrieval/reporting code assumed byte responses and called `.decode()` even though the client is configured with `decode_responses=True`. Added normalization helpers so snippets work with either byte or string Redis responses.
- `get_user_activity()` used `timedelta` before it was imported in the reusable class section. The import is now colocated with `datetime`.
- `delete()` executed `DEL` once per key through the audit wrapper and then executed `delete()` again, causing duplicate operations. It now executes once and logs one audit event.
- The MONITOR collector expected an `args` field that redis-py monitor events do not provide. It now parses the command string with `shlex.split()`.
- The slowlog analyzer converted byte command arguments with `str()`, producing values like `b'GET'`. It now decodes bytes before building command summaries.
- The slowlog usage example accessed average/max duration fields even when no slowlog entries exist. It now checks `summary['count']` first.
- The compliance reporter described Redis streams as immutable. Redis streams can be trimmed/deleted, so the text now describes append-only stream storage with restricted write/delete permissions.
- The compliance reporter and config checks assumed string Redis responses. They now normalize bytes/strings.
- The PCI report docstring overclaimed compliance. It now says the report is PCI-DSS-oriented.
- The Elasticsearch example used a host without a URL scheme and the older `body=` style for indexing. It now uses `http://localhost:9200` and `document=`.
- The Loki example used `json` and `datetime` without importing them in that snippet. The imports were added.
- The log retention snippet was marked as Python but contained Redis commands. It is now a bash snippet.
- The log retention snippet used `CONFIG SET maxmemory-policy volatile-ttl`, which is an eviction policy rather than an audit retention mechanism. It now shows explicit stream trimming and key expiry commands.

## Review Notes
- The examples are illustrative and still need production hardening for connection errors, long-term archival, access separation, and compliance evidence beyond code-level reporting.
- MONITOR is suitable for debugging and short collection windows, but Redis documents that it has runtime cost and does not provide a complete security audit trail.
