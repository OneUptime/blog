# Validation Summary: How to Implement Cluster Upgrades with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD and ApplicationSet
- Kubernetes cluster upgrades
- Amazon EKS and eksctl
- GitOps deployment patterns
- Pluto deprecated API detection
- PodDisruptionBudgets
- Prometheus Operator PrometheusRule alerts

## Sources Consulted
- Kubernetes version skew and supported versions: https://kubernetes.io/releases/version-skew-policy/
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks update-cluster-version`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-version.html
- AWS CLI `eks update-nodegroup-version`: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- eksctl creating and managing clusters: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html
- Argo CD resource hooks: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD declarative cluster secrets: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#clusters
- Pluto quickstart and advanced usage: https://pluto.docs.fairwinds.com/quickstart/ and https://pluto.docs.fairwinds.com/advanced/
- Pluto installation and container image verification: https://pluto.docs.fairwinds.com/installation/
- Kubernetes Pod disruptions and PDBs: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
- The post used Kubernetes `1.30` throughout the examples. As of May 20, 2026, EKS lists `1.30` under extended support, while `1.34` is still in standard support. Updated examples, labels, cluster names, and Pluto target versions to `1.34`.
- The opening support-window claim said every Kubernetes version is supported for about 14 months. That is accurate for EKS standard support, but upstream Kubernetes maintains the latest three minor releases with approximately one year of patch support. Updated the wording to distinguish upstream Kubernetes from managed provider support.
- The Pluto validation Job used the `registry.k8s.io/kube-apiserver` image and assumed Pluto and shell tooling were present. Replaced it with a Git checkout init container and the official Fairwinds Pluto container image.
- The PDB check compared PDB selector label values to the Deployment name, which does not reflect how PDB selectors match pods. Updated it to compare PDB `matchLabels` against the Deployment pod template labels.
- The post recommended `argocd app sync --force` for picking up API version changes. Removed `--force` and clarified that syncing should happen after committing API version changes.
- The Argo CD cluster Secret used `config: '...'`, which is not a valid Argo CD cluster config payload. Replaced it with a JSON-shaped placeholder matching Argo CD's declarative setup format.
- The ApplicationSet examples omitted required `template` sections. Added minimal templates so the examples match the ApplicationSet structure.
- The RollingSync section implied RollingSync upgrades clusters directly. Clarified that RollingSync sequences generated Application updates and noted that Progressive Syncs must be enabled.
- The post described blue-green replacement as "zero-risk" and described upgrades as "zero-downtime" in the description. Reworded those claims to "lower-risk" because traffic shifting and workload compatibility still carry operational risk.
- The self-healing summary implied drift is always reconciled automatically. Clarified that Argo CD self-heal reconciles drift when it is enabled.

## Review Notes
- The EKS examples are still illustrative and omit production details such as update IDs, upgrade policies, add-on upgrades, IAM access setup, and rollback procedures.
- The PDB check handles common `matchLabels` selectors. PDBs that rely only on `matchExpressions` would need a more complete selector evaluation.
