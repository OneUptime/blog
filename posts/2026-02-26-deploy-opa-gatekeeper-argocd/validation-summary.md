# Validation Summary: How to Deploy OPA Gatekeeper with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- OPA Gatekeeper
- Rego
- Helm
- kubectl
- yq

## Sources Consulted
- Gatekeeper Helm chart `3.17.1` values and chart metadata: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.17.1/charts/gatekeeper/values.yaml and https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.17.1/charts/gatekeeper/Chart.yaml
- Gatekeeper Helm chart `3.17.1` controller-manager and audit templates: https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.17.1/charts/gatekeeper/templates/gatekeeper-controller-manager-deployment.yaml and https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.17.1/charts/gatekeeper/templates/gatekeeper-audit-deployment.yaml
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper constraint violation and enforcement action documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper how-to documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/

## Issues Found
- The Gatekeeper Helm values block used several keys that do not match the official `gatekeeper` chart `3.17.1` values. Moved `auditInterval`, `constraintViolationsLimit`, `auditFromCache`, and `auditChunkSize` to the chart value root, changed validating webhook settings to `validatingWebhookFailurePolicy` and `validatingWebhookTimeoutSeconds`, replaced `mutatingWebhookEnabled` with `disableMutation: false`, moved namespace exemptions under `controllerManager`, and changed the PDB configuration to `pdb.controllerManager.minAvailable`.
- Removed the `serviceMonitor` example from the Gatekeeper values block because the official Gatekeeper Helm chart `3.17.1` does not define a `serviceMonitor` value.
- Removed `audit.replicas` from the values block because the official chart's audit deployment is rendered as a singleton and does not consume that value.
- Fixed a Rego typo in the container-limits template: `_matches_exemption` referenced undefined variable `googimg`. It now compares the image to the exemption for exact matches.
- Fixed the privileged-container template so the documented `exemptImages` parameter is actually used during evaluation, including exact matches and prefix wildcard matches.

## Review Notes
- The post uses Gatekeeper chart `3.17.1`, while newer Gatekeeper versions exist. The version-specific examples are now accurate for `3.17.1`; future updates should re-check Helm values before bumping the chart version.
- The post intentionally starts constraints with `warn`, which is a supported Gatekeeper enforcement action.
