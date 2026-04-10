# Validation Summary: How to Configure Redis TCP Keepalive

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (tcp-keepalive configuration)
- TCP keepalive (SO_KEEPALIVE, TCP_KEEPIDLE, TCP_KEEPINTVL, TCP_KEEPCNT)
- Linux kernel networking (sysctl tcp_keepalive_* parameters)
- redis-py (Python Redis client)
- Cloud load balancers (AWS NLB/ALB, GCP, Azure)

## Sources Consulted
- Official Redis configuration documentation and redis.conf comments (https://redis.io/docs/latest/develop/reference/clients/)
- Redis source code, anet.c keepalive implementation (https://github.com/redis/redis/blob/3.2/src/anet.c)
- Linux tcp(7) man page (https://man7.org/linux/man-pages/man7/tcp.7.html)
- TCP Keepalive HOWTO (https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/usingkeepalive.html)
- AWS NLB documentation (https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html)
- AWS ALB documentation (https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html)
- GCP Load Balancing documentation (https://docs.cloud.google.com/load-balancing/docs/https/request-distribution)
- Azure Load Balancer documentation (https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-tcp-idle-timeout)
- redis-py documentation (https://redis.readthedocs.io/en/stable/connections.html)

## Issues Found
1. **Incorrect claim about OS parameters controlling Redis keepalive behavior**: The post stated "Redis's `tcp-keepalive` sets `SO_KEEPALIVE` on each socket, but the probe frequency and retry count are controlled by OS parameters." This is incorrect for Redis >= 3.2 on Linux. Since Redis 3.2, Redis sets per-socket keepalive overrides: `TCP_KEEPIDLE` = tcp-keepalive value, `TCP_KEEPINTVL` = tcp-keepalive/3, and `TCP_KEEPCNT` = 3. These per-socket settings override the OS-level sysctl defaults. The section was rewritten to explain how Redis sets per-socket parameters, and clarified that OS-level sysctl tuning applies to non-Redis applications or Redis versions older than 3.2.

## Review Notes
- The Python example using `socket.TCP_KEEPIDLE` is Linux-specific. On macOS, the equivalent is `socket.TCP_KEEPALIVE`. The rest of the post is Linux-focused so this is consistent, but readers on macOS should be aware.
- Cloud load balancer timeout values were verified as correct defaults, though some (e.g., AWS NLB) are now configurable.
- The default tcp-keepalive of 300 since Redis 3.2.1 was confirmed correct.
- All Redis CLI commands (`CONFIG GET`, `CONFIG SET`) and redis.conf syntax are correct.
- The `ss` commands for verifying keepalive are correct Linux usage.
