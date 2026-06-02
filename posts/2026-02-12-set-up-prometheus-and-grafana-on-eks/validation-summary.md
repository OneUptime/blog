# Validation Summary: How to Set Up Prometheus and Grafana on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Kubernetes
- Helm 3
- kube-prometheus-stack
- Prometheus Operator
- Prometheus
- Grafana
- Alertmanager
- Amazon EBS CSI Driver
- PromQL

## Sources Consulted
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference for PodMonitor, ServiceMonitor, Prometheus, and PrometheusRule: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- prometheus-community kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Kubernetes kubectl create namespace documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS storage class documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Grafana Helm installation documentation: https://grafana.com/docs/grafana/latest/installation/helm/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The values file comment said the selector settings would scrape pods with `prometheus.io` annotations. kube-prometheus-stack uses Prometheus Operator resources such as ServiceMonitor and PodMonitor for this path, and those selector settings control which CRDs are selected. Changed the comment to describe ServiceMonitor, PodMonitor, and PrometheusRule selection.
- The custom PrometheusRule example would not be selected by the chart defaults unless it used the Helm release labels. Added `ruleSelectorNilUsesHelmValues: false` to match the post's unlabelled custom rule example.
- The custom metrics section instructed readers to add Prometheus annotations to pods, but the shown stack configuration did not include annotation-based scrape discovery. Reworked the example to expose a named container port and add a PodMonitor.
- The ServiceMonitor example referenced a port named `http-metrics` without explaining that the selected Service must expose that named port. Updated the surrounding text to state that requirement.
- The `PodCrashLooping` alert used `rate(...[5m]) > 0.1`, which means more than 0.1 restarts per second, not more than three restarts in five minutes as the description stated. Changed the expression to `increase(kube_pod_container_status_restarts_total[5m]) > 3`.
- The prerequisites mentioned persistent storage but did not state that the values file requires a StorageClass named `gp3`. Updated the prerequisite to make that dependency explicit.

## Review Notes
- The Helm and kubectl commands are current and syntactically valid, but the local review environment did not have `helm` or `kubectl` installed, so command verification was performed against official documentation instead of local `--help` output.
- EKS clusters may require creating the `gp3` StorageClass explicitly, especially with EKS Auto Mode.
