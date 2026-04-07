# Validation Summary: How to Simulate Network Partitions for Ceph Testing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- iptables (Linux firewall/packet filtering)
- tc / netem (Linux traffic control)
- Chaos Mesh (Kubernetes chaos engineering platform)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes debugging profiles (`--profile=sysadmin`): https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/#debugging-profiles
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Ceph monitor quorum documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Linux tc netem man page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- nicolaka/netshoot container image: https://github.com/nicolaka/netshoot

## Issues Found

1. **`kubectl debug node/` used `--image=busybox` for iptables commands**: The `busybox` image does not include `iptables`. Changed to `nicolaka/netshoot` which includes iptables and other network tools. Also added `--profile=sysadmin` flag which is required to gain host network namespace access and sufficient privileges to manipulate the node's iptables rules.

2. **Chaos Mesh `partition` action missing `target` field**: The `NetworkChaos` resource with `action: partition` requires a `target` field to specify which pods the selected pods should be partitioned from. Without it, Chaos Mesh doesn't know what to partition between. Added a `target` selector targeting all other rook-ceph-mon pods.

3. **Restore section also used `busybox` for iptables flush**: Same issue as #1 — changed to `nicolaka/netshoot` with `--profile=sysadmin`.

## Review Notes
- The `iptables -F INPUT; iptables -F OUTPUT` restore command flushes ALL rules in those chains, not just the ones added by the test script. This is acceptable for a test environment but users should be aware it will remove any pre-existing rules.
- The monitoring script uses `-it` flags with `kubectl exec` inside a non-interactive script loop, which could cause TTY-related warnings. Using `-i` alone or no TTY flag would be cleaner, but this is a minor style issue that won't prevent the script from working.
- The `tc qdisc add` command in Method 2 will fail if a qdisc already exists on the interface. In production testing, `tc qdisc replace` may be more robust, but `add` is correct for a clean starting state.
