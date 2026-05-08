# Validation Summary: Validating 32-Process Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- iperf3
- jq
- GNU awk
- netperf
- Linux CPU governor and NIC tooling

## Sources Consulted
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl drain and taint reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CNI performance benchmark documentation: https://docs.cilium.io/en/stable/operations/performance/benchmark/
- iperf3 user documentation: https://iperf.fr/iperf-doc.php
- GNU awk array sorting documentation: https://www.gnu.org/software/gawk/manual/html_node/Array-Sorting.html

## Issues Found
- The post described the tests as 32-process validation, but the iperf3 `-P` option creates parallel streams/connections, not separate OS processes. Updated the title, tags, description, introduction, table header, and conclusion to use stream terminology.
- The consistency validation script used `$SERVER_IP` without defining it. Added the same `kubectl get pod iperf-server` lookup used by the scaling script.
- The cross-node matrix script used an undefined `$DST_IP` and did not identify the iperf3 server on each destination node. Added a destination-node pod lookup using `app=iperf-server`, `spec.nodeName`, and `status.phase=Running`, plus a failure message when no destination server is found.
- The cross-node matrix used `kubectl run -it` while piping JSON into `jq`. Removed TTY allocation and kept stdin attachment with `-i` so iperf3 JSON output is not affected by terminal control behavior.
- The cross-node matrix selected dedicated nodes but did not tolerate the example `dedicated=perf-testing:NoSchedule` taint. Added a matching toleration in the `kubectl run --overrides` pod spec.
- The controlled-node example applied the taint after uncordoning, creating a scheduling window and omitting `--overwrite`. Moved the taint before uncordon and added `--overwrite`.
- The prerequisites omitted tools required by the snippets. Added `kubectl`, `bc`, GNU `awk`, and the Cilium CLI.

## Review Notes
The examples still assume the reader has already created suitable iperf client and server pods or services in the active namespace. The worker-node label selector `node-role.kubernetes.io/worker` is common but not universal across Kubernetes clusters, so users may need to adjust it for their environment.
