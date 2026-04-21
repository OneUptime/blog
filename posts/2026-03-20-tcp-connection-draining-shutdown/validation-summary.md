# Validation Summary: How to Handle TCP Connection Draining During Server Shutdown

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP
- Linux socket inspection with `ss`
- iptables
- nginx
- Node.js HTTP server shutdown
- Kubernetes lifecycle hooks and pod termination
- Load balancer connection draining

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- nginx command-line parameters: https://nginx.org/en/docs/switches.html
- nginx control signals: https://nginx.org/en/docs/control.html
- Node.js HTTP server documentation: https://nodejs.org/api/http.html
- Node.js Net server documentation: https://nodejs.org/api/net.html
- Linux `ss(8)` manual: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes pod termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination

## Issues Found
- The introduction stated that sudden shutdown sends RST packets to all active connections. RFC 9293 distinguishes normal FIN-based close from abortive RST termination, so this was changed to say abrupt shutdown can close or reset active connections.
- The nginx example used `nginx -s status`, but nginx only documents `stop`, `quit`, `reload`, and `reopen` for the `-s` signal argument. This was replaced with `ps` and `ss` inspection commands.
- The nginx socket check used `ss -tlnp`, which only lists listening TCP sockets and would not show established draining connections. This was changed to `ss -tanp`.
- The Node.js example referenced an undefined `handleRequest` function and never started listening. A minimal handler and `server.listen(8080)` were added so the snippet is runnable.
- The iptables drain script counted the `ss` header line as an active connection. The command now uses `ss -H` to suppress the header before piping to `wc -l`.
- The Kubernetes snippet placed `terminationGracePeriodSeconds` under the container item. It is a Pod spec field, so its indentation was corrected to the same level as `containers`.

## Review Notes
- The `curl` load balancer URL is an illustrative placeholder and was not treated as a real external endpoint.
- The iptables example is IPv4-only as written; IPv6 traffic would require an `ip6tables` or `nftables` equivalent.
- The local environment did not have nginx installed, so nginx behavior was verified against official nginx documentation instead of local CLI output.
