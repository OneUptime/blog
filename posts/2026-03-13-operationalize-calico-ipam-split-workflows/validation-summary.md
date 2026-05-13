# Validation Summary: Operationalizing Calico IPAM Split Workflows

## Status
validated

## Post Type
Operational guide / runbook (templates, runbook, rollback script, and post-change checklist for splitting a Calico IPAM pool).

## Technologies Covered
- Calico v3.x (IPAM, IPPool resources)
- `calicoctl` v3.x CLI
- Kubernetes / `kubectl`
- Bash scripting

## Sources Consulted
- Calico `calicoctl` IPAM reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- Calico `calicoctl ipam check`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam show`: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IPPool resource (incl. `disabled` field and `nodeSelector`): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico `calicoctl patch` / `apply` / `delete`: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes labels reference (`kubectl label ... key=value` and `kubectl label ... key-`): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- `kubectl` cheatsheet (jsonpath, get events): https://kubernetes.io/docs/reference/kubectl/quick-reference/

## Issues Found
No technical issues found.

## Review Notes
- The runbook text shows `Expected: "IPAM is consistent"` as the success criterion for `calicoctl ipam check`. The actual `calicoctl ipam check` output prints lines such as `Check complete; found 0 problem(s).` rather than the literal string "IPAM is consistent." The phrasing in the post is a reasonable paraphrase used as a verification criterion (look for zero problems / a clean result), so it is not technically wrong, but operators copying it as a literal grep target would be surprised. Left as-is to preserve the author's voice and because the surrounding context makes the intent clear.
- The rollback script's `kubectl label nodes --all zone-` removes the `zone` label from every node, including nodes that may not have had it. This is intentional and idempotent (the command is a no-op for nodes without the label), and the `2>/dev/null || true` guard handles any stderr — accurate as written.
- The post uses `calicoctl patch ippool ... --patch '{"spec":{"disabled":true}}'` with strategic-merge style JSON, which is the documented form for `calicoctl patch`. Confirmed against current Calico docs.
- The IPPool `disabled: true` field prevents new allocations from that pool but does not affect existing allocations — consistent with how the post describes the split (existing pods keep their IPs; new pods get IPs from the sub-pools based on node selectors). Accurate.
- Version-specific caveat: the post pins itself to "Calico v3.x" and `calicoctl` v3.x, which matches the command syntax used. If a reader is on a future major version (v4+), they should re-verify against that release.
