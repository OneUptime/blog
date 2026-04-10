# Validation Summary: How to Configure Redis tcp-backlog for High Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (tcp-backlog configuration)
- Linux kernel networking (net.core.somaxconn, net.ipv4.tcp_max_syn_backlog)
- Kubernetes (initContainer for sysctl tuning)
- Linux CLI tools (ss, netstat, sysctl)

## Sources Consulted
- Redis source code (`src/config.c`) — confirms tcp-backlog is defined with `IMMUTABLE_CONFIG` flag and defaults to 511: https://github.com/redis/redis/blob/unstable/src/config.c
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Linux kernel documentation on `somaxconn` and TCP backlog behavior
- Redis GitHub issues on TCP backlog warnings: https://github.com/redis/redis/issues/6123

## Issues Found

### Issue 1: CONFIG SET tcp-backlog is not supported
- **What was wrong:** The post claimed you could set `tcp-backlog` at runtime using `CONFIG SET tcp-backlog 1024`, with a note that it would take effect on next restart. In reality, `tcp-backlog` is an immutable configuration parameter in Redis. Running `CONFIG SET tcp-backlog` returns an error — it cannot be changed at runtime at all.
- **What was changed:** Removed the `CONFIG SET` code example and replaced it with a note explaining that `tcp-backlog` is immutable and requires editing `redis.conf` and restarting Redis.
- **Why:** The `IMMUTABLE_CONFIG` flag in Redis source code prevents this parameter from being modified via CONFIG SET. Readers following the original instructions would encounter an error.

### Issue 2: Inaccurate description of queue-full behavior in mermaid diagram
- **What was wrong:** The mermaid sequence diagram note stated "If queue full, new SYNs are dropped." When the accept (backlog) queue is full, it is not specifically the initial SYN packets that are dropped. Rather, the kernel drops the final ACK of the three-way handshake or refuses to move completed connections from the SYN queue to the accept queue, effectively dropping the new connections.
- **What was changed:** Changed the note from "If queue full, new SYNs are dropped" to "If queue full, new connections are dropped" — a more accurate generalization.
- **Why:** The original wording confused the accept queue (backlog) behavior with the SYN queue behavior. The simpler phrasing is technically correct without requiring a deep dive into kernel internals.

## Review Notes
- The default `somaxconn` value of 128 mentioned in the post was accurate for older Linux kernels but changed to 4096 in Linux kernel 5.4+. The post says "typical default" which is still defensible since many container images and older systems use 128, but readers on modern kernels may see a different value. This is not incorrect but could be noted in a future update.
- The Kubernetes initContainer approach for setting sysctls works but requires privileged mode. Kubernetes also supports pod-level `securityContext.sysctls` for safe/unsafe sysctls, which is a cleaner approach. This is a valid alternative the author could mention in a future update but is not an error.
- The warning message format and all Redis INFO fields referenced are accurate.
