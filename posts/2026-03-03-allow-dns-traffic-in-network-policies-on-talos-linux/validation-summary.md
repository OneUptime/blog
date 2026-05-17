# Validation Summary: How to Allow DNS Traffic in Network Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- CoreDNS
- NodeLocal DNSCache
- Cilium / Hubble
- kubectl
- talosctl
- busybox

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces (kubernetes.io/metadata.name label, GA in 1.22): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Well-Known Labels: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Debugging DNS Resolution (CoreDNS `k8s-app=kube-dns` label): https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Using NodeLocal DNSCache (169.254.20.10 default link-local IP): https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- NodeLocal DNSCache addon README: https://github.com/kubernetes/kubernetes/blob/master/cluster/addons/dns/nodelocaldns/README.md
- Cilium `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Hubble CLI reference (`hubble observe --type policy-verdict -n <ns>`): https://docs.cilium.io/en/stable/observability/hubble/
- Talos Linux `talosctl` reference: https://www.talos.dev/latest/reference/cli/

## Issues Found
- **Cilium debugging command was incorrect.** The original post used `cilium monitor --type policy-verdict -n production`. `cilium monitor` runs at the node level (must be exec'd inside a specific Cilium agent pod) and has no namespace flag — its `-n` flag means `--numeric` (display security identities numerically), not namespace. Replaced with `hubble observe --type policy-verdict -n production`, which is the correct cluster-wide, namespace-filtered way to observe Cilium policy verdicts, and updated the comment accordingly.

## Review Notes
- All NetworkPolicy YAML manifests are syntactically correct for `networking.k8s.io/v1` and use current field names (`podSelector`, `namespaceSelector`, `policyTypes`, `egress.to`, `ports`).
- The combined `namespaceSelector` + `podSelector` under a single `to` list item correctly expresses logical AND (pods matching the pod selector inside namespaces matching the namespace selector), which is the intended behavior for targeting CoreDNS specifically.
- CoreDNS label `k8s-app: kube-dns` is correct — kept for backward compatibility with the older kube-dns deployment.
- `kubernetes.io/metadata.name` is the correct auto-injected immutable namespace label (stable since Kubernetes 1.22).
- NodeLocal DNSCache default link-local IP `169.254.20.10` is confirmed in the upstream addon manifest.
- The claim that DNS uses TCP for large responses (>512 byte UDP limit per the original DNS RFC) and zone transfers is accurate.
- `talosctl get addresses --nodes <node-ip>` and `talosctl dmesg --nodes <node-ip>` are valid commands.
- `kubectl run dns-test --image=busybox:1.36 -n production --rm -it --restart=Never -- sh` is valid kubectl syntax and `busybox:1.36` is a real tag.
