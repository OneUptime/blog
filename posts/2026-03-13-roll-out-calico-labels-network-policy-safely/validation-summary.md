# Validation Summary: How to Roll Out Calico Label-Based Network Policies Safely

## Status
validated

## Post Type
Tutorial / Guide (phased rollout playbook)

## Technologies Covered
- Calico (NetworkPolicy CRD, `projectcalico.org/v3`)
- Kubernetes (`kubectl`, Deployments, Pods, labels, events)
- `calicoctl`
- Bash, `jq`, Python 3
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector / EntityRule syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule
- Calico rule actions (Allow / Deny / Log / Pass): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#rule
- `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- `kubectl patch` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#patch
- `kubectl get ... -o jsonpath` reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Bash redirection (heredoc precedence over pipe): https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- Python CLI behavior when stdin is the script source: https://docs.python.org/3/using/cmdline.html

## Issues Found
1. **Phase 1 — broken `kubectl ... | python3 << 'EOF'` pattern.**
   The pipe makes `kubectl`'s JSON output the initial stdin of `python3`, but the `<<'EOF'` heredoc is then applied as a later redirection and overrides stdin with the heredoc body. Python (invoked with no script argument) consumes that heredoc as the *script*, leaving `sys.stdin` at EOF — so `json.load(sys.stdin)` would fail with an empty-input error and no pods would ever be reported. Verified locally: `echo test | python3 << 'EOF' ... print(sys.stdin.read()) EOF` prints an empty string.
   **Fix:** rewrote the snippet to `kubectl ... | python3 -c '...'`, which leaves stdin connected to the pipe. Switched the inline string quoting from `'...'` to `"..."` to remain valid inside the single-quoted `-c` argument.

2. **Phase 2 — comment did not match the command's actual behavior.**
   The comment claimed the script would "add missing labels," but the patch unconditionally sets `tier: unknown` on every Deployment regardless of existing labels, and `--dry-run=client` means nothing is written. Updated the surrounding comments to describe the snippet for what it is — a dry-run preview of the patch — and noted how to convert it into a real apply.

3. **Phase 5 — misleading variable name and comment.**
   The comment said "Count unlabeled pods first," but `kubectl get pods ... | grep -v "Running"` counts pods that are not in the `Running` phase, which has nothing to do with labels. Renamed `UNLABELED` to `NOT_RUNNING` and corrected the comment/echo to describe what is actually being measured (a baseline of non-running pods so policy-induced failures are easier to spot afterwards).

## Review Notes
- The Calico NetworkPolicy in Phase 3 is correct: `apiVersion: projectcalico.org/v3`, the `tier == 'api'` selector syntax, and the use of `Log` followed by `Allow` are all valid. `Log` does not terminate evaluation, so the subsequent `Allow` rule is still consulted — exactly the audit-then-allow behavior the post describes.
- Calico v3.26 (the stated minimum) is from 2023; current releases are several minors ahead, but nothing used here is version-gated above v3.26, so the prerequisite remains accurate.
- The Phase 5 `grep -i "network\|denied"` event filter is best-effort — Kubernetes core does not emit `NetworkPolicy`-specific events for denies; operators usually need Calico flow logs / `calico-node` logs (or Calico Enterprise) for authoritative drop visibility. Out of scope for this fix, but worth noting for a future revision.
- The Phase 2 `kubectl patch` only touches `spec.template.metadata.labels`, which updates the pod template (and triggers a rollout) but does not change the Deployment's own labels or its `spec.selector.matchLabels`. That is the right surface for Calico pod-selector policies, but readers who also want the Deployment object itself labeled would need a second patch on `metadata.labels`.
