# Validation Summary: How to Prevent Calico from Blocking kube-dns

## Status
validated

## Post Type
Guide / Prevention playbook (operational hardening + change management for Calico + CoreDNS)

## Technologies Covered
- Calico (`projectcalico.org/v3` GlobalNetworkPolicy)
- Kubernetes NetworkPolicy and kube-system namespace
- CoreDNS (the kube-dns Service backend, with `k8s-app: kube-dns` label)
- kubectl CLI (`kubectl get`, `kubectl run`)
- calicoctl CLI
- Bash scripting

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy ordering (lower `order` value takes precedence): https://docs.tigera.io/calico/latest/network-policy/policy-rules/policy-rules-overview
- CoreDNS `health` plugin (default port 8080): https://coredns.io/plugins/health/
- CoreDNS `ready` plugin (default port 8181): https://coredns.io/plugins/ready/
- Kubernetes DNS spec — `k8s-app: kube-dns` label convention used by CoreDNS for backwards compatibility: https://github.com/kubernetes/dns/blob/master/docs/specification.md
- kubectl run reference (flags include `--pod-running-timeout`, not `--timeout`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- kubectl run source (flag registration): https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/run/run.go

## Issues Found
1. **Invalid `kubectl run` flag `--timeout=10s`** — `kubectl run` does not expose a `--timeout` flag in any current release; the closest valid flag for limiting how long kubectl waits on the pod is `--pod-running-timeout`. Running the original command would error out with an unknown-flag message and the DNS regression script would fail across every namespace. Replaced `--timeout=10s` with `--pod-running-timeout=10s` in the `test-cluster-dns.sh` snippet so the script actually executes.

## Review Notes
- The Calico GlobalNetworkPolicy YAML is structurally correct: `apiVersion: projectcalico.org/v3`, `kind: GlobalNetworkPolicy`, `selector: k8s-app == 'kube-dns'`, `types: [Ingress]`, and the `destination.ports` lists are all valid. CoreDNS pods do carry the `k8s-app: kube-dns` label (preserved for backwards compatibility), so the selector matches.
- The DNS port (53 UDP/TCP), CoreDNS `health` plugin port (8080), and CoreDNS `ready` plugin port (8181) are accurate defaults. The post does not allow the metrics port 9153 — that is a deliberate scoping choice, not an error, since the policy is specifically about keeping DNS resolvable.
- The comment "Absolute highest priority" next to `order: 1` is a minor simplification: Calico's `order` accepts any float and lower values take precedence (you could use `order: 0` or negative values). `order: 1` is effectively a very high priority in typical deployments and the practical advice is still correct, so I did not change it.
- The bash script's `kubectl run ... --restart=Never --rm -i` form is valid; `-i` (`--stdin`) implies attach when `--rm` is used, which is the documented requirement.
- The `grep -q "Address"` check on `nslookup` output is a reasonable heuristic but will also match `Address` lines for the DNS server itself, not only the resolved answer — this is a minor robustness concern rather than a correctness bug, so I left it alone per the "only fix technical errors" rule.
- `kubectl run dns-test-$RANDOM` may collide across very fast iterations or be rejected if `$RANDOM` produces a value that, combined with the namespace, exceeds DNS-1123 limits — extremely unlikely in practice, so left as-is.
