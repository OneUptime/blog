# Validation Summary: How to Deploy CRDs Before Custom Resources with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- Argo CD sync phases and sync waves
- Argo CD resource hooks
- Argo CD custom health checks
- Helm chart CRD handling in Argo CD
- cert-manager

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate documentation: https://cert-manager.io/v1.8-docs/concepts/certificate/

## Issues Found
- The post described kubectl and Argo CD apply order as "somewhat random." Argo CD documents deterministic ordering by phase, wave, kind, and name, so the wording was changed to explain that the order is not dependency-aware.
- The post said Argo CD has only three phases. Current Argo CD hook types include additional phases and hook modes, so the wording was changed to focus on the common deployment-ordering phases: PreSync, Sync, and PostSync.
- The hook caveat said hook resources are not tracked by default and implied they may be cleaned up unless a delete policy is set. Argo CD documents hook lifecycle behavior, the default `BeforeHookCreation` policy, and that hooks do not run during selective sync, so the caveat was corrected.
- The cert-manager multi-wave example was presented as a real-world setup but used abbreviated CRDs and omitted the ClusterIssuer CRD while creating a ClusterIssuer. The text now says the example is simplified, instructs readers to use full cert-manager release CRDs in production, and includes a ClusterIssuer CRD in the CRD wave.
- The cert-manager ACME HTTP-01 solver used `ingress.class`. cert-manager documents `ingressClassName` as the recommended field for most ingress controllers, so the example was updated to use `ingressClassName`.
- The separate Application example used a sync-wave annotation without explaining that this only orders the Application resources when they are managed by a parent app. A clarifying sentence was added.
- The Helm CRD troubleshooting tip referred to `--skip-crds` generically. Argo CD documents the CLI option as `--helm-skip-crds` and declarative setting as `spec.source.helm.skipCrds: true`, so the tip was corrected.
- The server-side apply troubleshooting tip implied server-side apply always handles multi-tool CRD conflicts. The wording now says to consider it when intentionally using server-side apply for that resource.

## Review Notes
The CRD snippets in the article are intentionally abbreviated examples for ordering behavior. For production cert-manager installs, the full upstream CRD manifests and the complete cert-manager deployment resources should be used.
