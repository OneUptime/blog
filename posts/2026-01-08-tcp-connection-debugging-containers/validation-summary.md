# Validation Summary: How to Debug TCP Connection Issues in Containerized Applications

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- TCP/IP connection states and lifecycle
- `ss` (iproute2 socket statistics)
- `netcat` / `nc`
- `tcpdump`
- `nsenter`
- Docker (networks, `docker inspect`, `docker exec`, docker-compose)
- Kubernetes (`kubectl debug`, ephemeral/debug containers, services, endpoints, network policies)
- nicolaka/netshoot debug container
- Linux sysctl / `/proc/sys/net` TCP tuning
- Python `requests` connection pooling
- Prometheus ServiceMonitor (Prometheus Operator)

## Sources Consulted
- iproute2 `ss(8)` man page — https://man7.org/linux/man-pages/man8/ss.8.html
- `tcpdump` man page and pcap-filter syntax — https://www.tcpdump.org/manpages/tcpdump.1.html / https://www.tcpdump.org/manpages/pcap-filter.7.html
- OpenBSD / traditional `nc(1)` man pages — https://man.openbsd.org/nc.1
- Kubernetes "Debug Running Pods" (ephemeral containers, `kubectl debug`) — https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes "Debug Services" — https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Linux kernel networking sysctl docs (`ip_local_port_range`, `tcp_tw_reuse`, `tcp_fin_timeout`) — https://docs.kernel.org/networking/ip-sysctl.html
- Docker networking docs — https://docs.docker.com/network/
- nicolaka/netshoot — https://github.com/nicolaka/netshoot
- Python Requests `HTTPAdapter` / urllib3 `Retry` docs — https://requests.readthedocs.io/
- RFC 9293 (TCP) for connection-state lifecycle

## Issues Found
1. **`ss -tlnp` mislabeled comment** — The comment read "View all TCP connections with process information," but the `-l` flag restricts output to *listening* sockets only. Changed the comment to "View listening TCP sockets with process information" to accurately describe the command's behavior.
2. **`echo` with `\r\n` escapes** — `echo "GET / HTTP/1.1\r\n..."` does not interpret backslash escapes under bash (the default login shell), so literal `\r\n` characters would be sent instead of CRLF terminators, producing a malformed HTTP request. Replaced with `printf 'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n'`, which portably emits the correct CRLF line endings.

## Review Notes
- The TCP state diagram is a deliberate simplification (it omits simultaneous-close paths such as `FIN_WAIT_1 → CLOSING` and `SYN_SENT → SYN_RECEIVED`). This is acceptable for an introductory overview and is not technically incorrect for the common active/passive close flows shown.
- `nc -l -p 8080` and `nc -zv hostname 80-443` rely on netcat features whose flag semantics vary between the OpenBSD, traditional/GNU, and Nmap `ncat` implementations. They work as written in the traditional/GNU netcat commonly bundled in debug images (and netshoot), so no change was made, but readers on a strict OpenBSD `nc` may need `nc -l 8080`.
- The sysctl recommendations are sound. The post correctly avoids the removed-in-4.12 `tcp_tw_recycle` knob and appropriately flags `tcp_tw_reuse` and reduced `tcp_fin_timeout` as use-with-caution / not-recommended-for-production.
- All Kubernetes (`kubectl debug --target`, ephemeral containers), Docker, `nsenter`, and `tcpdump` BPF-filter commands verified as current and correct.
- The AWS load balancer annotation, Prometheus ServiceMonitor manifest, and Python Requests pooling example are all valid for current versions.
