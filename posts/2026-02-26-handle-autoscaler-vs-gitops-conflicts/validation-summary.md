# Validation Summary: How to Handle Autoscaler vs GitOps Conflicts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- KEDA
- Cluster Autoscaler
- Argo Rollouts
- Prometheus and Prometheus Operator alerting rules

## Sources Consulted
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD server-side diff documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/metrics/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA scaling Deployments, StatefulSets, and custom resources documentation: https://keda.sh/docs/2.19/concepts/scaling-deployments/
- Argo Rollouts HPA support documentation: https://argoproj.github.io/argo-rollouts/features/hpa-support/
- Argo Rollouts canary dynamic stable scale documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts specification documentation: https://argoproj.github.io/argo-rollouts/features/specification/

## Issues Found
- The KEDA row said KEDA modifies Deployment labels and annotations. KEDA's documented ScaledObject behavior is to create/manage an HPA for the target resource, and that HPA updates the scale target's replica count. Updated the row to reflect this.
- The `ignoreDifferences` example implied ignored fields would be left alone during sync with automated self-heal. Argo CD documents that `RespectIgnoreDifferences=true` is required when ignored fields should also be ignored during the sync stage. Added the sync option and explanatory sentence.
- The server-side diff section said Argo CD only compares fields it owns. Argo CD server-side diff computes a predicted live state using dry-run server-side apply; ownership-based ignoring comes from `managedFieldsManagers`. Reworded the explanation.
- The Argo Rollouts section said Rollouts pauses HPA during rollouts. Official Rollouts documentation says HPA targets the Rollout `/scale` subresource and Rollouts distributes the desired replica count. Updated the explanation and `dynamicStableScale` snippet.
- The global configuration section said ignore rules were set at the AppProject level. Argo CD documents global ignore-difference rules under `argocd-cm` resource customizations, while AppProjects group and constrain applications. Reworded that transition.

## Review Notes
The examples are intentionally partial in a few places, especially Argo CD Application snippets that omit fields such as `destination` for brevity. The technical guidance is now accurate, but a future revision could make those examples fully applyable manifests.
