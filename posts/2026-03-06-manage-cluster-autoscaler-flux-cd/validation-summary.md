# Validation Summary: How to Manage Cluster Autoscaler with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Cluster Autoscaler
- Kubernetes
- Helm and HelmRelease
- Kustomize and Flux Kustomization
- AWS EKS IAM Roles for Service Accounts
- Google Kubernetes Engine / GCE Managed Instance Groups
- Prometheus Operator ServiceMonitor and PrometheusRule

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kubernetes Cluster Autoscaler Helm chart repository index: https://kubernetes.github.io/autoscaler/index.yaml
- Kubernetes Cluster Autoscaler Helm chart values and templates: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler/charts/cluster-autoscaler
- Kubernetes Cluster Autoscaler 9.37.0 chart values and templates: https://github.com/kubernetes/autoscaler/releases/tag/cluster-autoscaler-chart-9.37.0
- Kubernetes Cluster Autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md
- Kubernetes Cluster Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- Kubernetes Cluster Autoscaler metrics proposal: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/proposals/metrics.md
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The HelmRelease examples pinned `version: "9.37.x"`, which targets Cluster Autoscaler chart 9.37.0 / appVersion 1.30.0. Updated the examples to `version: "9.57.x"`, the current chart series in the official chart repository index on 2026-05-14.
- The GKE/GCE example set `node-group-auto-discovery` directly under `extraArgs`. The Cluster Autoscaler chart expects GCE MIG prefix discovery through `autoscalingGroupsnamePrefix` and also needs `autoDiscovery.clusterName` so the deployment is rendered. Updated the example to use those chart values.
- The priority expander section created the required `cluster-autoscaler-priority-expander` ConfigMap but did not state that the autoscaler must run with `extraArgs.expander: priority`. Clarified that requirement.
- The Prometheus alert for failed scale-ups compared a monotonically increasing counter directly with `> 0`, which would continue firing after any historical failure. Changed it to use `increase(cluster_autoscaler_failed_scale_ups_total[5m]) > 0` with the existing `for: 15m`.
- The Flux notification Alert used `apiVersion: notification.toolkit.fluxcd.io/v1`, but the current Flux Notification API v1 reference only covers Receiver while Alerts are documented with `v1beta3`. Updated the Alert manifest to `notification.toolkit.fluxcd.io/v1beta3`.

## Review Notes
- The AWS Helm values, IRSA service account annotation, Flux HelmRepository, Flux HelmRelease remediation fields, Flux Kustomization health check structure, ServiceMonitor shape, and verification commands are consistent with the consulted documentation.
- The ServiceMonitor and PrometheusRule examples require Prometheus Operator CRDs to be installed in the cluster.
