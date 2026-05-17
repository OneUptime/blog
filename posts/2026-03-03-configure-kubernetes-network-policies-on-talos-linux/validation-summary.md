# Validation Summary: How to Configure Kubernetes Network Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes NetworkPolicy API (`networking.k8s.io/v1`)
- Cilium CNI (cilium-cli and in-pod `cilium-dbg` agent binary)
- Flannel (mentioned as default; does not enforce NetworkPolicies)
- CoreDNS (referenced via the `k8s-app: kube-dns` label selector)
- kubectl, busybox for in-cluster connectivity testing

## Sources Consulted
- Kubernetes NetworkPolicy reference — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium CLI repo and command list — https://github.com/cilium/cilium-cli
- Cilium command cheatsheet (stable) — https://docs.cilium.io/en/stable/cheatsheet/
- Talos Linux configuration and CNI docs — https://www.talos.dev/v1.11/kubernetes-guides/network/deploying-cilium/
- Talos `talosctl logs` reference — https://www.talos.dev/v1.11/reference/cli/#talosctl-logs
- Talos system extensions docs — https://www.talos.dev/v1.11/talos-guides/configuration/system-extensions/
- CoreDNS Kubernetes plugin (label selector) — https://coredns.io/plugins/kubernetes/
- RFC 5737 (203.0.113.0/24 is documentation/test range — used appropriately in the CIDR example)

## Issues Found
Three Cilium/talosctl command issues were corrected; everything else (Kubernetes NetworkPolicy YAML, default-deny policy, CoreDNS label, CIDR range, `cilium install --version` flag, busybox `wget --timeout`) verified correct as written.

1. **`cilium monitor --type policy-verdict` and `cilium endpoint list`** were shown as standalone CLI commands. These subcommands do not exist in the cilium-cli (github.com/cilium/cilium-cli); they live in the in-pod agent binary, which is now named `cilium-dbg`. **Fix:** rewrapped both as `kubectl -n kube-system exec -it ds/cilium -- cilium-dbg <subcommand>` so they actually work for a reader following along.

2. **`cilium status | grep "Policy Enforcement"`** would not match against the cilium-cli's `status` output — the "Policy Enforcement" line only appears in the in-pod agent's status. **Fix:** changed to `kubectl -n kube-system exec ds/cilium -- cilium-dbg status | grep "Policy Enforcement"`.

3. **`talosctl logs -k --nodes <node-ip> | grep -i cilium`** has two problems: `talosctl logs` requires a service/container ID argument (it will not stream all logs without one), and the `-k` flag selects the Kubernetes containerd namespace — it does *not* mean "kernel logs" as the comment implied. **Fix:** replaced with `kubectl -n kube-system logs -l k8s-app=cilium --all-containers=true | grep -i error`, which is the natural way to view Cilium agent logs on Talos.

4. **`talosctl get extensions --nodes <node-ip>`** was captioned "Check the CNI configuration on a node". This command lists installed Talos system extensions (iscsi-tools, GPU drivers, etc.); it has nothing to do with CNI configuration. **Fix:** replaced with `talosctl get machineconfig --nodes <node-ip>`, which actually surfaces the `cluster.network.cni` block.

## Review Notes
- The NetworkPolicy YAML examples are syntactically valid against `networking.k8s.io/v1`. The DNS egress peer uses the standard `namespaceSelector: {}` + `podSelector` (matchLabels `k8s-app: kube-dns`) AND-combined within a single peer entry — semantically correct for CoreDNS pods, which still carry the legacy `k8s-app=kube-dns` label.
- The `wget --timeout=3` flag works under busybox `wget` (it accepts long-form options that map to `-T`), so the test commands are fine.
- The example external CIDR `203.0.113.0/24` is RFC 5737 TEST-NET-3 — appropriate for documentation.
- `cilium install --version 1.15.0` is still valid cilium-cli syntax (not renamed to `--chart-version`). Note that Cilium 1.15.x will be increasingly out of date over time; readers in mid-2026 may want to specify a more recent release.
- Talos versions released after this post may add new resources for CNI inspection, but `talosctl get machineconfig` remains the canonical way to see the configured CNI.
