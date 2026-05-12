# Validation Summary: How to Test BGP to Workload Connectivity in Calico with Live Workloads

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Calico (BGP networking, direct pod connectivity mode)
- Kubernetes (kubectl, Deployments, Services, pod lifecycle, node drain)
- BGP (route advertisement, convergence, withdrawal/re-advertisement)
- curl (HTTP client for connectivity testing, timing format strings)
- wrk (HTTP load testing tool)
- hey (HTTP load generator)
- nginx (test workload, access logs)
- Mermaid (diagram rendering)

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/ (verified `--ignore-daemonsets` and `--delete-emptydir-data` flags; the older `--delete-local-data` was deprecated in K8s 1.20 and removed in later versions)
- Kubernetes `kubectl create deployment` and `kubectl expose` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands (verified default `app=<name>` label on pods created via `kubectl create deployment`)
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs (verified `--follow` flag)
- Calico documentation on BGP and pod connectivity: https://docs.tigera.io/calico/latest/networking/configuring/bgp (verified BGP-to-workload model preserves source IP when pods are directly routable)
- curl manual: https://curl.se/docs/manpage.html (verified `-s`, `-v`, `-o`, `-w` flags and write-out variables `%{time_connect}`, `%{time_total}`, `%{http_code}`, `--connect-timeout`)
- wrk GitHub: https://github.com/wg/wrk (verified `-t`, `-c`, `-d` flags)
- hey GitHub: https://github.com/rakyll/hey (verified `-n`, `-c` flags)
- Mermaid syntax: https://mermaid.js.org/syntax/flowchart.html (verified `graph LR`, `subgraph`, node label syntax)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly relies on Calico's direct pod connectivity (where pod IPs are advertised via BGP and routable from outside the cluster). In this model, traffic from an external client goes directly to the pod IP without SNAT, so source IP is naturally preserved — the post's source IP verification step is accurate for this scenario.
- The `kubectl expose ... --type=ClusterIP` step is somewhat extraneous since the tests connect directly to pod IPs rather than to the Service, but it is not incorrect and may be useful for completeness.
- `kubectl create deployment` automatically labels pods with `app=<deployment-name>`, so the `-l app=bgp-test-app` selector in subsequent commands works as expected.
- `curl -sv` combines silent (`-s`) and verbose (`-v`); verbose still emits headers/connection info to stderr while silent suppresses the progress meter — this is a valid and common combination.
- The 5-second recovery target during node drain depends on BGP timers (hold time, graceful restart) and pod rescheduling speed; it is a plausible expectation but workloads with tighter SLAs may need tuning.
- The Mermaid diagram uses `\n` for line breaks inside node labels, which is supported by current Mermaid versions; `<br/>` would be an alternative but `\n` renders correctly in modern renderers (including GitHub-flavored Mermaid).
