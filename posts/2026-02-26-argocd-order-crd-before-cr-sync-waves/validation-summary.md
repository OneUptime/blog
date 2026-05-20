# Validation Summary: How to Order CRD Installation Before CR Creation with Sync Waves in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes CustomResourceDefinitions and Custom Resources
- Argo CD sync waves and sync options
- Helm charts in Argo CD
- kubectl
- jq

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API deprecation guide for CRDs: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- MongoDB Controllers for Kubernetes Operator documentation: https://www.mongodb.com/docs/kubernetes/current/reference/k8s-operator-specification/
- Prometheus Community Helm chart repository index: https://prometheus-community.github.io/helm-charts/index.yaml

## Issues Found
- The post said same-wave resource order is not guaranteed. Argo CD documents deterministic ordering by phase, wave, kind, and name, so the text and opening sequence diagram were corrected to describe the real failure mode more accurately.
- The post said Argo CD waits for CRDs to become `Established` by default. Argo CD's built-in health documentation does not list CRDs as built-in health-checked resources, so the section was corrected to recommend custom health checks when CRD condition gating is required.
- The `SkipDryRunOnMissingResource` section implied the option is always required on first deployment. Argo CD documents automatic dry-run skipping when the CRD is part of the same sync, so the text now limits the option to cases where the CRD is not part of the same sync.
- The Helm split-application example implied sync-wave annotations on standalone `Application` resources globally guarantee ordering. The text now clarifies that this ordering applies when the Applications are managed by a parent app-of-apps sync.
- The Helm split-application example did not prevent the main chart from also managing CRDs. Added `helm.skipCrds: true`, which Argo CD documents as the declarative equivalent of Helm `--skip-crds`.
- The operator wave comments mentioned RBAC in a wave that did not include RBAC manifests. The comment was narrowed to match the shown YAML.

## Review Notes
The Argo CD CLI was not installed in the local environment, so `argocd app resources --help` could not be checked locally. CLI behavior was reviewed against official Argo CD documentation instead.
