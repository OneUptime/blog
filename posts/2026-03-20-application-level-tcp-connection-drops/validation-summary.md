# Validation Summary: How to Troubleshoot Application-Level TCP Connection Drops

## Status
validated

## Post Type
Guide / Troubleshooting article

## Technologies Covered
- TCP
- Linux networking tools (`tcpdump`, `ss`)
- systemd / `journalctl`
- Linux `/proc` and resource limits
- AWS Application Load Balancer
- NGINX proxy timeouts
- HAProxy timeouts
- Python `requests`
- Python `asyncio`
- SQLAlchemy connection pooling

## Sources Consulted
- Linux kernel `/proc` documentation: https://docs.kernel.org/filesystems/proc.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- AWS Application Load Balancer attribute documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- NGINX `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_read_timeout
- HAProxy configuration manual: https://docs.haproxy.org/2.1/configuration.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd command reference: https://www.freedesktop.org/software/systemd/man/systemctl.html
- Requests quickstart timeout documentation: https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts
- Requests advanced timeout documentation: https://requests.readthedocs.io/en/latest/user/advanced/#timeouts
- Python `asyncio` developer documentation: https://docs.python.org/3/library/asyncio-dev.html
- Python `asyncio` task/thread documentation: https://docs.python.org/3/library/asyncio-task.html#running-in-threads
- SQLAlchemy pooling documentation: https://docs.sqlalchemy.org/en/20/core/pooling.html
- Local command documentation checked in the environment: `tcpdump(8)`, `pcap-filter(7)`, `journalctl(1)`, `ss(8)`, `systemd.exec(5)`, `systemctl(1)`, and Bash `help ulimit`

## Issues Found
- The `requests.get(..., timeout=5)` explanation treated the timeout as total wall-clock request duration. I updated it to match Requests documentation: a single value applies to connect/read timeouts, and read timeout is based on socket inactivity between bytes.
- The load balancer section incorrectly stated that HAProxy has a built-in 50 second default timeout. I corrected this to note that HAProxy timeouts must be configured explicitly.
- The `time curl -v ... 2>&1 | grep ...` example did not reliably surface the shell `time` output. I replaced it with a direct `time curl -v ... -o /dev/null` example.
- The keepalive guidance was too broad. I changed it to note that TCP keepalives only help when the application enables `SO_KEEPALIVE` and the intermediary counts those probes as activity.
- The FD troubleshooting section used `FDSize` as though it were current open-FD usage, used `ls -la /proc/.../fd | wc -l` which overcounts, and suggested `/etc/security/limits.conf` as the persistent fix for a systemd-managed service. I replaced that guidance with `/proc/<pid>/fd`, `/proc/<pid>/limits`, and `LimitNOFILE=`-based systemd guidance.
- The asyncio note said blocking code "exhausts event loop threads." I corrected it to the documented behavior: blocking code stalls the event loop and delays socket handling.
- The connection-count example `ss -tn | wc -l` counted the header row. I changed it to `ss -Htn | wc -l`.
- The conclusion now scopes the RST guidance to reset-based failures and narrows the keepalive recommendation so it does not overstate when keepalives help.

## Review Notes
- The SQLAlchemy `create_engine()` pooling example is still current for SQLAlchemy 2.x; `pool_size`, `max_overflow`, `pool_timeout`, and `pool_recycle` remain valid tuning parameters.
- The post now reads accurately for a Linux + systemd troubleshooting context, but exact idle-timeout behavior still varies by intermediary and protocol, so packet captures and proxy logs remain the final authority in a live incident.
