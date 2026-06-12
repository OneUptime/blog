# Validation Summary: How to Debug Locust Test Issues

## Status
validated

## Post Type
Tutorial / Guide — practical debugging recipes for Locust load tests.

## Technologies Covered
- Locust (Python load testing framework)
- Python (logging, socket, ssl, urllib.parse, psutil, threading, subprocess)
- requests library (HTTPAdapter, sessions)
- urllib3 (PoolManager)
- jsonschema (response validation)
- Bash / shell (ulimit, lsof, nc, curl)
- Linux /proc filesystem for FD monitoring

## Sources Consulted
- Locust official documentation: https://docs.locust.io/en/stable/
- Locust API reference (events): https://docs.locust.io/en/stable/api.html#events
- Locust GitHub source — `locust/event.py` (event hook definitions)
- Locust GitHub source — `locust/web.py` (web UI endpoints, including `/stats/requests`)
- Locust GitHub source — `locust/argument_parser.py` (CLI flags: `--loglevel`, `--master`, port 5557)
- Locust GitHub source — `locust/main.py` (parsed_options handling)
- Python `ssl` module docs (create_default_context, getpeercert, version)
- Python `socket` module docs (gethostbyname, create_connection)
- requests library `HTTPAdapter` docs (pool_connections, pool_maxsize, max_retries)
- urllib3 `PoolManager` docs (num_pools, maxsize, block)
- psutil docs (Process.cpu_percent, memory_info)
- jsonschema docs (validate, ValidationError)

## Issues Found
1. **Non-existent `events.worker_disconnect` listener.** The distributed-mode debugging snippet registered an `@events.worker_disconnect.add_listener`, but no such event exists in Locust. Locust's `event.py` defines `worker_connect`, `worker_report`, `report_to_master`, `heartbeat_sent`, `heartbeat_received`, etc., but not `worker_disconnect`. Importing the locustfile would raise `AttributeError` at startup. **Fix:** Removed the `worker_disconnect` listener block entirely.
2. **Incorrect `worker_connect` listener signature.** The original snippet included a `message` positional argument: `def on_worker_connect(client_id, message, **kwargs)`. Locust fires `worker_connect` with only `client_id` (the event is `EventHook[str]`). **Fix:** Removed the `message` parameter so the signature is `def on_worker_connect(client_id, **kwargs)`.

## Review Notes
- The `events.request` listener signature includes `start_time` and `url` — these are passed by modern Locust 2.x and the post is up to date.
- `events.spawning_complete` correctly receives `user_count`.
- `events.report_to_master` correctly receives `client_id` and `data`.
- `--loglevel=DEBUG` and `LOCUST_LOGLEVEL=DEBUG` are both valid (Locust auto-derives env-var names from CLI flags with a `LOCUST_` prefix).
- Default master/worker port `5557` and web UI endpoint `/stats/requests` (port 8089) are correct.
- `environment.parsed_options.master` is a valid way to check if Locust was launched with `--master`; an alternative idiomatic check is `isinstance(environment.runner, MasterRunner)`, which is more robust in programmatic embedded uses where parsed_options may not reflect runtime state.
- The `PoolConfigUser.pool_manager` class attribute (urllib3.PoolManager) is never referenced by Locust's HTTP client — the actual pool configuration is done in `on_start` via `HTTPAdapter.mount`. The class attribute is harmless but vestigial; left as-is since it doesn't break correctness.
- `os.listdir('/proc/<pid>/fd')` is Linux-only; the comment says "Linux/Mac" but `/proc` is not present on macOS. The fallback to `lsof` correctly handles macOS, so behavior is fine — wording is slightly imprecise but not technically incorrect.
- The SSL verification disabling comment is appropriately marked as "not for production."
