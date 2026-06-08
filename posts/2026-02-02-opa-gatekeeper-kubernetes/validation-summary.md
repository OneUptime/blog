# Validation Summary: How to Install OPA Gatekeeper on Kubernetes

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- OPA Gatekeeper (v3.15.0)
- Open Policy Agent (Rego)
- Kubernetes (admission controllers, CRDs, validating/mutating webhooks)
- kubectl
- Helm 3
- Kustomize
- ArgoCD (GitOps integration)
- Prometheus metrics
- Kubernetes NetworkPolicy and RBAC

## Sources Consulted
- Official Gatekeeper install docs: https://open-policy-agent.github.io/gatekeeper/website/docs/install
- Gatekeeper v3.15.0 deploy manifest: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/deploy/gatekeeper.yaml
- Gatekeeper v3.15.0 Helm chart values: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.15.0/manifest_staging/charts/gatekeeper/values.yaml
- Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics
- Kubernetes 1.28 CHANGELOG (for removal of `kubectl version --short`): https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.28.md
- Kubernetes issue tracking `--short` removal: https://github.com/kubernetes/kubernetes/issues/122455

## Issues Found

1. **`kubectl version --short` flag is removed in Kubernetes 1.28.** Replaced with `kubectl version` and adjusted the surrounding comment.

2. **Helm `--set audit.replicas=1` is not a valid value in the official chart.** The audit Deployment in v3.15.0 has 1 replica and is not configurable via this key. Removed it from the production `helm install` command and from the values file example.

3. **`auditResources` is not a valid Helm value key.** The correct path is `audit.resources`. Restructured the values file example so audit resources live under the `audit:` map.

4. **`exemptNamespaces` at the top level is not a valid Helm value.** The correct path is `controllerManager.exemptNamespaces`. Moved it under the `controllerManager:` map.

5. **`mutatingWebhookEnabled` does not exist in the chart.** Mutation is on by default; the toggle is `disableMutation: false`. Replaced the line in the values example.

6. **`podDisruptionBudget.enabled` / `podDisruptionBudget.minAvailable` are not valid Helm value keys.** The chart's PDB knob is `pdb.controllerManager.minAvailable` (setting it renders the PDB; there is no separate `enabled` flag). Fixed in both the main values file and the production-values.yaml example.

7. **Top-level `resources:` block in production-values.yaml is ignored by the chart.** Resources for the controller manager belong under `controllerManager.resources`. Restructured the production-values.yaml example accordingly.

8. **CRD list was incomplete.** Gatekeeper v3.15.0 also installs `assignimage.mutations.gatekeeper.sh`, `expansiontemplatepodstatuses.status.gatekeeper.sh`, and `syncsets.syncset.gatekeeper.sh`. Added them to the expected output.

9. **`controller_runtime_reconcile_errors_total` is not a Gatekeeper-documented metric** and is not produced by modern controller-runtime in that form (reconcile errors are surfaced via `controller_runtime_reconcile_total{result="error"}`). Replaced with the documented `gatekeeper_audit_duration_seconds` metric.

## Review Notes

- The blog pins Gatekeeper to v3.15.0 (released Feb 2024). The version is intentionally explicit and the install URL pattern is valid, but readers may want to consult the project for newer releases (the post already advises checking for the latest version).
- The "Minimum Kubernetes 1.16" floor is technically still what the project documents, even though in practice clusters should run a version still in upstream Kubernetes support. Left as-is.
- The Gatekeeper Config resource (`config.gatekeeper.sh/v1alpha1`) remains at v1alpha1 in v3.15.0; no GA version exists yet. The post is correct on this.
- Constraint instances are still served at `constraints.gatekeeper.sh/v1beta1`. ConstraintTemplate has graduated to `templates.gatekeeper.sh/v1` (since v3.6.0). The post is correct on both.
- The NetworkPolicy example uses pod port `8443`, which is the container port the webhook server listens on. This is correct for NetworkPolicy (which operates at the pod level), even though the in-cluster Service exposes port 443. The port-forward command `8888:443` is also correct (target is the Service port).
- The blog's example `kubectl run test-pod ... --labels="team=platform"` is valid; `--labels` is a real kubectl flag for `run`.
- The blog's deletion command `kubectl delete crd -l gatekeeper.sh/system=yes` is correct — every Gatekeeper-managed CRD carries that label.
