# Validation Summary: How to Test External IP Policies with Real Traffic in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico NetworkPolicy / GlobalNetworkPolicy (`projectcalico.org/v3`)
- calicoctl CLI
- kubectl CLI
- busybox / nginx test pods
- Mermaid (architecture diagram)

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico selector syntax (entity selectors): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico release notes (v3.26): https://docs.tigera.io/calico/latest/release-notes/
- kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- BusyBox wget applet documentation (long-options support): https://busybox.net/downloads/BusyBox.html

## Issues Found
No technical issues found. All commands, API references, and YAML schema fields verified against official Calico and Kubernetes documentation:
- `apiVersion: projectcalico.org/v3` and `kind: NetworkPolicy` — correct
- `spec.order`, `spec.selector: all()`, `spec.ingress[].action: Deny`, `spec.types: [Ingress]` — all are documented and valid Calico policy fields
- `kubectl run ... --restart=Never -- sleep 3600` — produces a Pod (as intended) with the busybox image
- `kubectl exec ... -- wget -qO- --timeout=5 http://...` — valid busybox wget invocation when `CONFIG_FEATURE_WGET_LONG_OPTIONS` is enabled (as in the official `busybox` Docker image)
- `calicoctl apply -f <file>` — valid command
- Calico v3.26 is a real release and supports all referenced API kinds and fields

## Review Notes
- The post's title and framing promise coverage of "External IP Policies," but the example policy in Step 3 is a generic deny-all (`selector: all()` with `action: Deny`) rather than a policy that filters on external IPs (e.g., via `source.nets` / `destination.nets` CIDR matchers, or `serviceAccounts` / `namespaceSelector`). The YAML shown is technically valid; the scope mismatch is a content/structural concern outside the scope of technical-correctness fixes, so no changes were made per the review instructions.
- Step 4 references `allow-rule.yaml` but the file's contents are not shown. The `calicoctl apply -f allow-rule.yaml` command itself is syntactically correct; the missing manifest is a documentation completeness issue, not a technical error.
- Step 1 uses the `test` namespace without explicitly creating it; readers may need to run `kubectl create namespace test` first. This is an omission rather than an error.
- The Mermaid `\n` line-break inside node labels renders correctly in GitHub-flavored Markdown (Mermaid 9.4+) and matches the convention used in other Calico posts in this repo, so no change was made.
