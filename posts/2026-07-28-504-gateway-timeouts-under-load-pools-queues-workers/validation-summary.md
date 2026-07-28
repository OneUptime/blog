# Validation Summary: Why Do 504 Gateway Timeouts Appear Only Under Load? Checking Pools, Queues, and Worker Limits

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- HTTP 504 Gateway Timeout semantics
- NGINX reverse proxy configuration, logging, worker limits, and upstream timing
- Linux TCP listen and accept queues, process limits, and socket statistics
- Queueing theory and Little's Law
- Application worker and executor pools
- Database and outbound HTTP connection pools
- Go `net/http`
- Kubernetes Pods, Services, EndpointSlices, and resource metrics
- Retry control, deadline propagation, load shedding, and capacity planning

## Sources Consulted

- [RFC 9110: HTTP Semantics, 504 Gateway Timeout and 503 Service Unavailable](https://www.rfc-editor.org/rfc/rfc9110.html#name-504-gateway-timeout)
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [NGINX core functionality](https://nginx.org/en/docs/ngx_core_module.html)
- [NGINX HTTP log module](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [NGINX command-line parameters](https://nginx.org/en/docs/switches.html)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [Linux `listen(2)` manual page](https://man7.org/linux/man-pages/man2/listen.2.html)
- [Linux `/proc/pid/limits` manual page](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html)
- [iproute2 `nstat(8)` manual page](https://man7.org/linux/man-pages/man8/nstat.8.html)
- [GNU Grep manual](https://www.gnu.org/software/grep/manual/grep.html)
- [Kubernetes: Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes EndpointSlice API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes `kubectl top pod` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/)
- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [John D. C. Little, “Little's Law as Viewed on Its 50th Anniversary”](https://doi.org/10.1287/opre.1110.0940)

## Issues Found

- The NGINX inspection block used `pgrep -o nginx`, which selects only the oldest NGINX process, normally the master. Because `worker_rlimit_nofile` changes `RLIMIT_NOFILE` for worker processes, the master limit can differ from the limits that constrain request handling. Changed the command to list the open-file limit for every exact-name NGINX process.
- The listen-queue command used the obsolete `egrep` command name. Replaced it with the current, POSIX-specified `grep -E` form without changing the match behavior.
- The Go guidance said to “fully close/read” response bodies, which did not state the required operations or order clearly. Changed it to match `net/http` guidance: reuse clients and transports, read response bodies to EOF, and close them so persistent connections can be reused.
- The Kubernetes shell block used `<namespace>` and `<service>` placeholders. In a shell, angle brackets are redirection operators, so copying the commands would not pass those placeholders to `kubectl`. Replaced them with explicit `NAMESPACE` and `SERVICE` variables and quoted expansions.
- The overload-shedding paragraph presented 429 alongside 503 without distinguishing their semantics. Clarified that 503 represents temporary overload, while 429 is appropriate when enforcing a client request-rate limit.

## Review Notes

- NGINX upstream timing variables can contain comma- or colon-separated values when multiple upstream attempts or groups are involved; operators should align those values with `$upstream_addr` during analysis.
- `kubectl top pods` requires the Kubernetes resource metrics pipeline, typically Metrics Server, to be installed and working.
- No deprecated APIs or version-specific claims were found beyond the corrected obsolete `egrep` command name.
