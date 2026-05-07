# Validation Summary: How to Set Up Image Scanning in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes
- Trivy
- Trivy Operator
- Helm
- Prometheus
- Grafana

## Sources Consulted
- Trivy Operator Helm installation docs: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Trivy Operator CRD overview: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/
- Trivy Operator private registry tutorial: https://aquasecurity.github.io/trivy-operator/latest/tutorials/private-registries/
- Trivy Operator Grafana dashboard tutorial: https://aquasecurity.github.io/trivy-operator/latest/tutorials/grafana-dashboard/
- Trivy Operator Helm chart README: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/README.md
- Trivy Operator Helm chart values: https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/helm/values.yaml
- Rancher Kubernetes resources setup docs: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-resources-setup
- Rancher monitoring enablement docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Kubernetes image documentation (`imagePullSecrets`): https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes admission controller reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- Step 2 mixed settings from two different Trivy Operator ConfigMaps. I replaced the single invalid ConfigMap example with the correct `kubectl patch` commands for `trivy-operator` and `trivy-operator-trivy-config`.
- Step 5 described a built-in Trivy admission controller and Helm values that are not present in the current Trivy Operator chart. I replaced that section with an accurate note that deployment-time blocking requires a separate Kubernetes admission policy layer.
- Step 6 used an incorrect secret pattern for private registry access. I changed it to the documented approach of using workload or ServiceAccount `imagePullSecrets` in the application namespace, which Trivy Operator can reuse by default.
- Step 7 used an unsupported Grafana dashboard ConfigMap example. I replaced it with the documented Trivy Operator metrics setup by enabling `serviceMonitor` and a non-headless service, then referenced the official Grafana dashboard ID `17813`.
- Step 8 assumed Rancher Monitoring without stating it. I clarified that the `PrometheusRule` example applies when Rancher Monitoring is installed in `cattle-monitoring-system`.
- Step 10 used `compliance.cron` as if it controlled vulnerability rescans. I corrected it to `operator.scannerReportTTL`, which is the relevant setting for expiring and regenerating reports.
- I also removed the outdated Rancher version prerequisite and made the `jq` vulnerability summary command null-safe.

## Review Notes
- The guide now aligns with current Trivy Operator chart behavior, but Trivy Operator Helm values can change between releases, so this post should be rechecked when the chart is upgraded significantly.
- The Rancher-specific UI guidance is intentionally limited to resource exploration and monitoring integration because the scanning workflow itself is implemented by Trivy Operator inside the cluster, not by a Rancher-native image scanning feature.
