# Validation Summary: How to Configure Memcached to Bind to IPv6

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Memcached (in-memory caching daemon)
- IPv6 networking
- systemd service configuration
- Debian/Ubuntu memcached.conf format
- RHEL/CentOS sysconfig format
- pymemcache (Python client)
- pylibmc (Python client backed by libmemcached)
- libmemcached-tools (memcstat utility)
- ss / netcat networking tools

## Sources Consulted
- Memcached man page and `--help` output for CLI flags (`-l`, `-p`, `-m`, `-c`, `-t`, `-d`, `-u`)
- Memcached source / docs confirming `-l` accepts comma-separated addresses (https://github.com/memcached/memcached/wiki/ConfiguringServer)
- Debian memcached package docs for `/etc/memcached.conf` format
- RHEL/CentOS sysconfig conventions for `/etc/sysconfig/memcached` (PORT, USER, MAXCONN, CACHESIZE, OPTIONS)
- pymemcache documentation: https://pymemcache.readthedocs.io/ — `Client(server, ...)` constructor accepts `(host, port)` tuple; `set(key, value, expire=...)` signature
- pylibmc documentation: http://sendapatch.se/projects/pylibmc/ — accepts list of server strings, supports `[ipv6]:port` notation, `binary`, `behaviors` (tcp_nodelay, ketama)
- libmemcached-tools package contents (memcstat, memcat, memcping etc., renamed from older mem* names in libmemcached 1.0+)
- IPv6 address representation conventions (RFC 3986 — bracketed `[addr]:port` form)
- ss(8) man page for `-6 -tlnp` flags
- nc(1) — `-6` flag for forcing IPv6

## Issues Found
- **Incorrect package reference for `memcstat`**: The original comment said `# Test with memcstat (memcache-tools)`. The `memcstat` binary is shipped by the `libmemcached-tools` package (renamed from `memstat` in libmemcached 1.0+), not `memcache-tools` (which provides only `memcache-tool`, a Perl script). Updated the comment to `(libmemcached-tools)` and added the explicit `:11211` port to the `--servers` argument so the IPv6 host:port format is unambiguous.

## Review Notes
- The `import pymemcache.client.base as memcache` alias is unusual and could be confused with the legacy `python-memcached` library, which exposes a similarly-named `memcache` top-level module with a different API. It works as written, but `from pymemcache.client.base import Client` would be cleaner. Left as-is — not technically incorrect.
- `socket_module=__import__('socket')` is functionally equivalent to passing the imported `socket` module and matches pymemcache's default. Verbose but correct.
- The `-l 0.0.0.0,::` form relies on Memcached's comma-separated listen-address support (multiple `-l` flags also work). Confirmed supported by current Memcached versions.
- Behavior of binding to `::` w.r.t. IPv4-mapped sockets depends on the system's `IPV6_V6ONLY` default and how Memcached sets the socket option; readers should verify with `ss -tlnp` whether dual-stack binding actually occurred.
- Example IPv6 addresses (`2001:db8::/32`) are from the documentation prefix per RFC 3849 — appropriate.
