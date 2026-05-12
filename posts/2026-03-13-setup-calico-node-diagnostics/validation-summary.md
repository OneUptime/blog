# Validation Summary: How to Set Up Calico Node Diagnostics Step by Step

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (Project Calico CNI for Kubernetes)
- `calicoctl` CLI (node diags, node status subcommands)
- Felix (Calico's per-node dataplane agent) liveness/readiness probes
- BIRD / `birdcl` (BGP daemon used by Calico)
- Kubernetes `kubectl` (get, exec, logs, cp, debug)
- iptables (standard Calico Linux dataplane)
- Tigera Operator install layout (`calico-system` namespace)

## Sources Consulted
- Tigera docs — `calicoctl node diags`: https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags
- Tigera docs — `calicoctl node status`: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Tigera docs — Troubleshooting commands (birdcl, etc.): https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Tigera docs — Operator migration / namespace layout: https://docs.tigera.io/calico/latest/operations/operator-migration
- Tigera docs — calico/node install (hardway): https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico source — `node/pkg/health/health.go` (liveness/readiness flags): https://github.com/projectcalico/calico/blob/master/node/pkg/health/health.go
- Kubernetes docs — `kubectl debug node`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
1. **Incorrect `calicoctl node diags` output path.** The post claimed the tarball is written to `/tmp/calico-diags.tar.gz` and copied it from that exact path. The actual command writes to a randomly-generated temp directory with a timestamped filename — Tigera's documentation gives an example of `/tmp/calico676127473/diags-20170522_151219.tar.gz`. Fix: replaced the hardcoded path with a small `ls -t /tmp/calico*/diags-*.tar.gz | head -1` lookup, and added a comment noting that the command prints the real path on completion.

2. **Step 5 `kubectl debug` command would fail.** The post used `kubectl debug node/... --image=alpine -it -- nsenter -t 1 -n -- iptables -L ...`. The Alpine base image ships neither `nsenter` (it is in `util-linux`) nor `iptables` by default, so `nsenter: not found` would result. Since the `calico-node` DaemonSet already runs with `hostNetwork: true` and ships `iptables` inside the container, the host's iptables rules are directly visible from a normal `kubectl exec` into `calico-node`. Fix: replaced the `kubectl debug` + `nsenter` invocation with a `kubectl exec -n calico-system "${CALICO_POD}" -c calico-node -- iptables -L cali-FORWARD -n` call.

## Review Notes
- The `calico-system` namespace and `k8s-app=calico-node` label assume a Tigera Operator install. Clusters installed from the classic `calico.yaml` manifest place the DaemonSet in `kube-system` (with the same label). This is not technically wrong — the post is consistent — but users on a manifest install will need to substitute the namespace.
- `calico-node -felix-live` and `-felix-ready` are valid CLI flags on the calico-node binary; the post's usage of both as separate calls is correct. (The standard liveness probe pairs them with `-bird-live`; readiness for BIRD uses `-bird` rather than `-bird-ready`, but the post does not claim otherwise.)
- `birdcl` (with the trailing "l") is indeed the BIRD client binary shipped inside the calico-node container; the command targets the IPv4 BIRD instance by default.
- Minor wording: "liveliness" in Step 2 is informal for "liveness"; left unchanged as it doesn't affect technical accuracy.
