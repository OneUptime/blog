# Validation Summary: How to Operationalize Calico ImageSet Management

## Status
validated

## Post Type
Guide / Runbook templates (operational playbook for production Calico ImageSet management)

## Technologies Covered
- Calico (Project Calico)
- Tigera Operator (operator.tigera.io)
- Kubernetes (kubectl)
- Flux (GitOps)
- ArgoCD (mentioned)
- Mermaid (diagrams)
- Bash scripting

## Sources Consulted
- Tigera Operator API reference (Installation CRD): https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera operator source — `api/v1/installation_types.go`: https://github.com/tigera/operator/blob/master/api/v1/installation_types.go
- ImageSet documentation (naming convention `calico-<version>`): https://docs.tigera.io/calico/latest/operations/image-options/imageset
- TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Operator troubleshooting checklist (confirms `tigera-operator` deployment in `tigera-operator` namespace, `calico-node` DaemonSet in `calico-system`): https://docs.tigera.io/calico-cloud/get-started/operator-checklist
- Flux CLI reference (`flux reconcile kustomization ... --with-source`): https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
1. **Incorrect rollback mechanism in Runbook 2.** The original script patched `installation.spec.version`:
   ```
   kubectl patch installation default --type=merge -p '{"spec":{"version":"v3.26.0"}}'
   ```
   The Installation CRD (operator.tigera.io/v1) has no `spec.version` field — the `InstallationSpec` Go struct in the Tigera operator source does not include `Version`. The Calico version installed is determined by the operator binary itself, which then looks up an ImageSet named `calico-<version>`. The accompanying comment ("The operator picks the ImageSet matching the version in the Installation") was also incorrect.

   **Fix applied:** Replaced the patch with a Tigera operator deployment image rollback (`kubectl set image deployment/tigera-operator -n tigera-operator tigera-operator=quay.io/tigera/operator:<version>`), which is the documented way to roll back to a Calico version whose matching ImageSet already exists in the cluster. Updated the comment to reflect that the operator binary, not Installation.spec, drives ImageSet selection.

## Review Notes
- `kubectl get installation default -o jsonpath='{.status.imageSet}'` is valid — `InstallationStatus.ImageSet` is a real field on the CRD.
- `tigerastatus` is a real cluster-scoped CRD; `kubectl get tigerastatus -w` is the documented troubleshooting command.
- `imageset` is used informally; the canonical resource name is `imagesets.operator.tigera.io`. kubectl typically resolves the singular form, so `kubectl get imageset <name>` is functional, but operators may prefer the fully-qualified name for clarity.
- The DaemonSet `calico-node` in namespace `calico-system` is correct for operator-managed installs (note: manifest-based installs put it in `kube-system`).
- The Flux CLI command syntax is correct.
- The script's `${PREVIOUS_VERSION:-v3.26.0}` default and the change-management example referring to v3.26→v3.27 are version-illustrative; readers must substitute the versions and operator image tags appropriate to their environment.
- The post is primarily process-oriented (runbooks, RACI, change management); the embedded scripts use placeholder wrapper script names (`./scripts/mirror-calico-images.sh`, etc.) that are intentionally generic templates.
