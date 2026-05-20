# Validation Summary: How to Upgrade ArgoCD from 2.9 to 2.10

## Status
validated

## Post Type
Tutorial / Upgrade guide

## Technologies Covered
- Argo CD 2.9 and 2.10
- Kubernetes
- Helm and the argo-helm chart
- Argo CD RBAC
- Argo CD Applications and ApplicationSets
- Argo CD resource tracking

## Sources Consulted
- Argo CD official v2.9 to v2.10 upgrade notes: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/upgrading/2.9-2.10/
- Argo CD 2.10 installation and tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/installation/
- Argo CD 2.10 resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/resource_tracking/
- Argo CD 2.10 RBAC documentation: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/rbac/
- Argo CD 2.10 server-side diff documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/diff-strategies/
- Argo CD 2.10 multiple sources documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/multiple_sources/
- Argo CD 2.10 dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/dynamic-cluster-distribution/
- argo-helm chart 6.7.0 Chart.yaml and values.yaml: https://github.com/argoproj/argo-helm/tree/argo-cd-6.7.0/charts/argo-cd
- Argo CD v2.10.0 install manifests and CRD URLs: https://github.com/argoproj/argo-cd/tree/v2.10.0/manifests

## Issues Found
- Corrected the summary and feature list. The original post said 2.10 introduced multi-source GA, enhanced RBAC, and resource tracking changes. Official 2.10 docs show multi-source applications were still beta, resource tracking still defaulted to label-based tracking, and the documented upgrade notes focus on `managedNamespaceMetadata`, kubectl 1.26, and Helm 3.14.3.
- Corrected Kubernetes compatibility from 1.26-1.30 to the official tested range of 1.25-1.28 for Argo CD 2.10.
- Replaced `kubectl version --short` with `kubectl version` to avoid relying on a removed/deprecated kubectl flag in newer Kubernetes clients.
- Added backup coverage for repository credential template secrets labeled `argocd.argoproj.io/secret-type=repo-creds`.
- Corrected resource tracking guidance to state that 2.10 defaults to label tracking and supports `label`, `annotation+label`, and `annotation`.
- Replaced the CRD verification command that read the `last-applied-configuration` annotation. The post applies CRDs with server-side apply, which does not depend on that client-side annotation.
- Corrected RBAC comments that described `exec` and granular application permissions as new in 2.10. The example remains valid, but the comments now describe the permissions generically.
- Corrected Helm values guidance: server-side diff is an optional beta feature, `controller.replicas` is enough for standard chart sharding configuration, and Redis HA is framed as HA-installation guidance rather than a universal 2.10 requirement.
- Corrected rollout and log commands for the default Argo CD application controller from `deploy/argocd-application-controller` to `sts/argocd-application-controller`.
- Corrected the multi-source application label from GA to beta.
- Corrected the summary to focus on `managedNamespaceMetadata`, Helm upgrade, and optional server-side diff rather than resource tracking and multi-source GA.

## Review Notes
The post is now technically accurate for Argo CD 2.10. The examples assume the default upstream manifest or argo-helm resource names; installations with custom Helm release names, fullname overrides, or dynamic cluster distribution enabled may need adjusted Kubernetes resource names.
