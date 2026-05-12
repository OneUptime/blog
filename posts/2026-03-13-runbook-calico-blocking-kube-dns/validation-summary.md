# Validation Summary: Runbook: Calico Blocking kube-dns

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico GlobalNetworkPolicy (CRD via `calicoctl`)
- CoreDNS / kube-dns (in `kube-system`)
- `kubectl` CLI
- `calicoctl` CLI
- BusyBox image (`nslookup`)
- Mermaid (diagram syntax)

## Sources Consulted
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- kubectl source for the `run` subcommand (registers `--pod-running-timeout` via `cmdutil.AddPodRunningTimeoutFlag`, no `--timeout`): https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/run/run.go
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl `get` reference (no `--sort-by` flag registered): https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Consistency cross-check against the sibling runbook `2026-03-13-runbook-calico-policy-blocking-dns/` (already validated, uses `--pod-running-timeout`)

## Issues Found
- **Invalid `kubectl run` flag `--timeout=10s`** (appeared in four code blocks: the initial diagnosis command, the Option A verify command, and twice more in the cluster-wide verify loop). `kubectl run` does not register a `--timeout` flag — only `--pod-running-timeout` is wired up. Running the command as written produces `error: unknown flag: --timeout`.
  - **Fix:** Replaced `--timeout=10s` with `--pod-running-timeout=10s` in all four locations.
- **Invalid `calicoctl get` flag `--sort-by`**. `calicoctl get` does not implement `--sort-by`; the flag is a `kubectl get` flag and is not registered on the calicoctl command. Because the original line redirects stderr to `/dev/null` and pipes to `head`, the silent failure would have produced no output, defeating the purpose of the diagnosis step.
  - **Fix:** Dropped the `--sort-by='.metadata.creationTimestamp'` flag and the `| head` pipe; the command now simply runs `calicoctl get globalnetworkpolicy 2>/dev/null`, which lists all GlobalNetworkPolicies so the responder can inspect for the recently added blocker.

## Review Notes
- The emergency `NetworkPolicy` YAML is correct. `k8s-app: kube-dns` is the standard label on CoreDNS pods deployed through the upstream `kube-dns` Service in `kube-system`, and the empty `namespaceSelector: {}` matches all namespaces (as the rule intends, to allow DNS queries cluster-wide into kube-dns). Both UDP 53 and TCP 53 are correctly listed for resolver compatibility.
- The `kubectl get networkpolicy -n kube-system --sort-by='.metadata.creationTimestamp' | tail -3` line is valid; `--sort-by` is a real `kubectl get` flag.
- The mermaid `flowchart TD` syntax (including the `E & F --> G` multi-source edge) is valid mermaid syntax.
- The verification `grep -c "Address" && echo PASS || echo FAIL` idiom is functional: `grep -c` exits 0 when at least one match is found and 1 otherwise, so a failed nslookup correctly falls through to the FAIL branch.
- The pod name `test` is reused inside the for-loop across namespaces — collision is avoided here only because `--rm` removes the pod before the next iteration; if a prior debug pod were stuck in a non-terminating state in the same namespace, the loop could fail. This is a minor robustness issue, not a correctness defect, and was not changed.
- The reference to "order-1 GlobalNetworkPolicy" in the Conclusion correctly aligns with Calico's policy ordering semantics (lower `order` values evaluated first), so an "order: 1" policy will preempt later policies attempting to block DNS.
