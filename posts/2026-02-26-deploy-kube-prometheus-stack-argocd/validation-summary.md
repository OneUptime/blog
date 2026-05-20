# Validation Summary: How to Deploy kube-prometheus-stack with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- Argo CD
- Helm
- kube-prometheus-stack
- Prometheus Operator
- Prometheus
- Grafana
- Alertmanager
- Sealed Secrets

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.0/operator-manual/metrics/
- kube-prometheus-stack chart 62.7.0 Chart.yaml: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-62.7.0/charts/kube-prometheus-stack/Chart.yaml
- kube-prometheus-stack chart 62.7.0 values.yaml: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-62.7.0/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator CRD manifests for v0.76.1: https://github.com/prometheus-operator/prometheus-operator/tree/v0.76.1/example/prometheus-operator-crd
- Grafana Helm chart values and templates for the 8.5.x series used by kube-prometheus-stack 62.7.0: https://github.com/grafana/helm-charts/releases/tag/grafana-8.5.12
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The CRD-disable values snippet used `prometheus-operator.crds.enabled`, which is not a valid kube-prometheus-stack 62.7.0 values path. Changed it to `crds.enabled: false` under the wrapper chart dependency key.
- The separate CRD Argo CD Application used Prometheus Operator `v0.77.1`, but kube-prometheus-stack chart `62.7.0` declares app version `v0.76.1`. Changed the CRD app target revision to `v0.76.1` so the separately managed CRDs match the pinned chart.
- The separate CRD Argo CD Application omitted `destination.namespace`, while the example AppProject restricts destinations to the `monitoring` namespace. Added `namespace: monitoring` to keep the Application compatible with the project example.
- The CRD Application combined `ServerSideApply=true` and `Replace=true`. Argo CD documents `Replace=true` as using replace/create semantics and taking precedence over server-side apply, so it contradicted the stated server-side apply approach. Removed `Replace=true`.
- The Helm hook sync issue text said to add annotations, but the example used `ignoreDifferences`, not annotations. Updated the wording to accurately describe ignoring harmless field-level drift for completed hook Jobs.

## Review Notes
The remaining examples are syntactically valid for the pinned chart and current Argo CD Application patterns. The chart version in the post is older than the current kube-prometheus-stack release, so future maintenance should update the chart version and re-check values paths and Prometheus Operator CRD versions together.
