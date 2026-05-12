# Validation Summary: How to Prevent Calico Policy from Blocking DNS

## Status
validated

## Post Type
Guide / Troubleshooting (prevention-focused)

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Calico GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- kubectl
- CoreDNS / kube-dns (kube-system DNS)
- Bash scripting (audit/CI patterns)
- busybox `nslookup`
- Mermaid (diagram)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy `order` semantics (lower number = higher priority): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes NetworkPolicy reference (policyTypes, ingress/egress ports): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- `kubectl run` CLI reference (flag list, including `--pod-running-timeout`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- CoreDNS / kube-dns service runs in `kube-system` on UDP/TCP 53: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/

## Issues Found
- **`kubectl run --timeout=15s` is not a valid flag.** `kubectl run` does not expose a `--timeout` flag; the canonical pod-readiness timeout flag is `--pod-running-timeout`. The command as written would fail with `unknown flag: --timeout`. Replaced `--timeout=15s` with `--pod-running-timeout=15s` in the namespace provisioning DNS test snippet under "Prevention 3".

## Review Notes
- The `GlobalNetworkPolicy` manifest is syntactically correct for `projectcalico.org/v3`: `selector: all()`, `types: [Egress]`, and `destination.ports: [53]` are valid fields. `order: 5` correctly represents very high priority (lower numeric order is evaluated first in Calico).
- The diagnosis loop greps for `port: 53` in `kubectl get networkpolicy -o yaml` output. This works for Kubernetes `NetworkPolicy` resources (which serialize ports as `- port: 53`) but would not match Calico's `GlobalNetworkPolicy` ports (`- 53` under `destination.ports`). Since `kubectl get networkpolicy` only returns Kubernetes-native NetworkPolicy resources (not Calico CRDs), the script is internally consistent — readers should be aware that auditing Calico-only policies would require `kubectl get globalnetworkpolicy.crd.projectcalico.org` or `calicoctl get gnp`.
- The CI audit script keys off `policyTypes`, which is the Kubernetes NetworkPolicy field name (Calico's GlobalNetworkPolicy uses `types`). Again consistent for Kubernetes NetworkPolicy manifests only.
- `grep -c` returns exit status 1 when no matches are found; the `|| true` defensive guard is correct and ensures `HAS_DNS=0` regardless of `set -e` behavior.
- The conclusion's claim that "DNS failures [are] impossible through normal policy operations" is slightly strong — a `Deny` rule in another policy with a lower (higher-priority) `order` value, or a Calico policy explicitly overriding the baseline, could still block DNS. The baseline pattern is a strong safety net but not an absolute guarantee. Not changed since the surrounding text frames it as a prevention strategy rather than a formal invariant.
