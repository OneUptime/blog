# Validation Summary: How to Deploy Thanos with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Thanos
- ArgoCD
- Kubernetes
- Helm
- Bitnami Thanos Helm chart
- kube-prometheus-stack
- Prometheus Operator
- Grafana
- AWS S3 / IRSA

## Sources Consulted
- Thanos object storage documentation: https://thanos.io/tip/thanos/storage.md/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator Thanos guide: https://prometheus-operator.dev/docs/platform/thanos/
- Bitnami Thanos chart metadata and values: https://artifacthub.io/packages/helm/bitnami/thanos and https://charts.bitnami.com/bitnami/thanos-15.7.25.tgz
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The repository structure placed `objstore-secret.yaml` at the Helm chart root. Helm charts render manifests from `templates/`, so the Secret would not be deployed by the ArgoCD Helm application. Updated the path to `metrics/thanos/templates/objstore-secret.yaml`.
- The object storage Secret was only created in the `thanos` namespace, but the Prometheus sidecar configured by kube-prometheus-stack needs to read the Secret from the Prometheus namespace. Added a second Secret manifest for the `monitoring` namespace using the same `objstore.yml` key.
- The S3/IRSA example said to leave `access_key` and `secret_key` empty, but Thanos requires `aws_sdk_auth: true` to use the AWS SDK credential chain. Replaced the empty static credentials with `aws_sdk_auth: true`.
- The compactor comment said it deduplicates and downsamples. Thanos compactor is responsible for compaction, downsampling, and retention; query-time deduplication is handled by Query. Changed the comment to "compacts and downsamples."

## Review Notes
The chart version `15.7.25` is valid and maps to Thanos `0.36.1`, but newer Bitnami chart versions are available. The guide pins a specific chart version, which is acceptable for reproducibility, though future updates should retest the values against the chosen chart version.
