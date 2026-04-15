# Validation Summary: How to Configure ClickHouse TCP Keep-Alive Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (native TCP protocol, server configuration)
- Linux kernel TCP keep-alive (sysctl parameters)
- Python clickhouse-driver (mymarilyn/clickhouse-driver)
- Go clickhouse-go v2 (ClickHouse/clickhouse-go)
- Linux ss utility

## Sources Consulted
- clickhouse-driver Python library source code (mymarilyn/clickhouse-driver on GitHub) — `connection.py` constructor and `_set_keepalive()` method
- clickhouse-go v2 source code (ClickHouse/clickhouse-go on GitHub) — `clickhouse_options.go` Options struct definition
- ClickHouse server source code — `src/Core/Settings.cpp` for `tcp_keep_alive_timeout`, `src/Client/Connection.cpp` for client-side SO_KEEPALIVE behavior, `src/Server/TCPHandler.cpp` for server-side socket handling
- Go standard library `net.Dialer` documentation — KeepAlive field semantics
- Linux `sysctl` and TCP keep-alive kernel parameter documentation (`net.ipv4.tcp_keepalive_time`, `net.ipv4.tcp_keepalive_intvl`, `net.ipv4.tcp_keepalive_probes`)

## Issues Found

### Issue 1: Python clickhouse-driver `tcp_keep_alive` incorrectly placed in `settings` dict
- **What was wrong:** The Python example passed `'tcp_keep_alive': True` inside the `settings={}` dict. The `settings` dict in clickhouse-driver is for ClickHouse server-side settings (e.g., `max_threads`, `max_memory_usage`) sent over the native protocol. `tcp_keep_alive` is not a recognized ClickHouse server setting and would either be silently ignored or cause an error.
- **What was changed:** Moved TCP keep-alive configuration out of the `settings` dict and used `tcp_keepalive=True` as a direct constructor parameter to `Client()`. Also added an example showing the tuple form `(idle_time_sec, interval_sec, probes)` for fine-grained control.
- **Why:** The `tcp_keepalive` constructor parameter (note: no underscore between "keep" and "alive") is the correct way to enable `SO_KEEPALIVE` on the socket in clickhouse-driver. It is handled in `Connection._set_keepalive()` which calls `socket.setsockopt()` directly.

### Issue 2: Misleading ClickHouse Server Configuration section
- **What was wrong:** The section stated "you can also set socket options explicitly" but then showed `<tcp_port>9000</tcp_port>`, which is just the port configuration and has nothing to do with keep-alive or socket options. The claim "ClickHouse does not expose direct XML settings for TCP keep-alive timing" was also an oversimplification — ClickHouse has a user-level `tcp_keep_alive_timeout` setting (default 290 seconds) that applies to outbound connections.
- **What was changed:** Removed the misleading introductory sentence and the irrelevant `<tcp_port>` XML snippet. Clarified that the server does not set SO_KEEPALIVE on inbound TCP sockets, making OS-level sysctl the primary method for server-side keep-alive. Added mention of the `tcp_keep_alive_timeout` user-level setting for outbound connections.
- **Why:** The original text was self-contradictory (claiming you can set socket options explicitly while simultaneously saying ClickHouse doesn't expose such settings) and the XML example was unrelated to keep-alive.

## Review Notes
- The Linux sysctl commands, parameter names, and values are all correct.
- The Go clickhouse-go v2 example is correct: the `Options.DialContext` field signature matches `func(ctx context.Context, addr string) (net.Conn, error)` and `net.Dialer{KeepAlive: 30 * time.Second}` is valid Go stdlib usage.
- The `ss -ti` command for verifying keep-alive on connections is correct.
- The firewall timeout alignment advice (keep-alive time significantly shorter than firewall idle timeout) is sound.
- The ClickHouse server does NOT set SO_KEEPALIVE on accepted inbound TCP connections, so the OS-level sysctl approach is indeed the correct primary method for server-side configuration.
