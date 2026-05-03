# Validation Summary: How to Debug Agent Connectivity with Telnet and Curl

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Portainer Agent (port 9001, HTTPS API)
- Docker (`docker ps`, `docker logs`, `docker run --network`)
- `ss` and `netstat` (socket listing)
- `telnet` and `nc` (netcat) for raw TCP testing
- `curl` for HTTPS endpoint testing
- `openssl s_client` / `openssl x509` for TLS certificate inspection
- `tcpdump` for packet capture

## Sources Consulted
- Portainer Agent source (`http/handler/ping/ping.go`) — https://github.com/portainer/agent
- Portainer Agent API Reference (DeepWiki) — https://deepwiki.com/portainer/agent/5-api-reference
- Portainer Agent HTTP Endpoints (DeepWiki) — https://deepwiki.com/portainer/agent/5.1-http-endpoints
- `nc(1)`, `ss(8)`, `tcpdump(8)`, `openssl-s_client(1)`, `curl(1)` man pages

## Issues Found
- **Step 4 — incorrect `/ping` response body.** The post claimed the Portainer Agent `/ping` endpoint returns `{"status":"OK"}`. Per the agent source (`response.Empty(rw)`) and Portainer's API reference, `/ping` is an unauthenticated health check that returns HTTP **204 No Content** with an empty body. Updated the example to use `curl -ki` (so the status line is visible) and corrected the expected output to `HTTP/2 204 (empty body)`. Also tightened the failure-mode lines: `curl: (7)` for connect failure and `curl: (35)` for TLS handshake failure, instead of the ambiguous mix of `000` (a `-w "%{http_code}"` artifact) with curl exit-code messages.

## Review Notes
- All other commands and flags verified correct: `docker ps --filter/--format`, `ss -tlnp`, `netstat -tlnp`, `nc -zv -w 5`, `openssl s_client -connect ... </dev/null` piped to `openssl x509 -noout -dates -subject`, and `tcpdump -i eth0 -n port 9001 -w <file>` are all standard, current invocations.
- The expected `ss` output line (`LISTEN  0  128  0.0.0.0:9001`) matches typical `ss -tln` formatting (State, Recv-Q, Send-Q, Local Address:Port).
- The telnet escape sequence (`Ctrl+]` then `quit`) is correct.
- Minor caveat (not changed): `tcpdump -i eth0` assumes the agent is bound to a host network interface named `eth0`. If the agent runs in a Docker bridge network without `--network host`, traffic may be observed on the `docker0` bridge or a `br-<id>` interface instead. A future revision could mention this.
- The flow diagram's final step ("Is agent secret matching?") is not actually covered by any of the seven steps; readers debugging Edge Agent secret mismatches will need to look elsewhere. Out of scope for technical validation.
