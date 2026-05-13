# Validation Summary: How to Configure Calico Labels for Network Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes labels, namespaces, Deployments, and service accounts
- `kubectl label`
- YAML
- Mermaid diagrams

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico namespace policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The introduction referred to "custom Calico-specific metadata" in a way that could be confused with arbitrary selector metadata. Updated it to refer specifically to Calico automatic labels such as `projectcalico.org/name`.
- The Deployment example omitted required `apps/v1` Deployment fields, including `spec.selector` and a pod template `spec.containers` list. Added a matching selector and a minimal container definition so the manifest is applyable.
- The namespace-label example put a `kubectl` command inside a YAML code fence and labeled the `production` namespace even though the policy selects source namespaces with `team == 'observability'`. Split the command into a Bash fence and changed the command to label the `observability` namespace.
- The boolean selector example used `tier == 'web' && tier != 'legacy'`, which is redundant because a single `tier` label cannot be both values. Updated it to use `tier == 'web' && has(version) && version != 'legacy'`.
- The workload example did not include the `version` label from the recommended taxonomy, even though the corrected selector example depends on it. Added `version: v2` to the Deployment labels.

## Review Notes
Calico's `!=` and `not in` selector operators also match resources where the label is absent, so the corrected version check includes `has(version)` to keep the example precise.
