# Validation Summary: How to Monitor GKE Cluster Performance with Datadog on Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Monitoring
- Datadog Agent and Cluster Agent
- Datadog Google Cloud integration
- Kubernetes
- Helm
- Terraform Datadog provider
- Datadog monitors and metrics

## Sources Consulted
- Datadog Kubernetes Agent configuration documentation: https://docs.datadoghq.com/containers/kubernetes/configuration/
- Datadog Helm chart values: https://github.com/DataDog/helm-charts/blob/main/charts/datadog/values.yaml
- Datadog Kubernetes data collected documentation: https://docs.datadoghq.com/containers/kubernetes/data_collected/
- Datadog Kubernetes State Core integration documentation: https://docs.datadoghq.com/integrations/kubernetes_state_core/
- Datadog Autodiscovery documentation: https://docs.datadoghq.com/getting_started/containers/autodiscovery/
- Datadog GCP integration API documentation: https://docs.datadoghq.com/api/latest/gcp-integration/
- Datadog Terraform dashboard resource documentation: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/dashboard
- Google Cloud GKE control plane metrics documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/control-plane-metrics

## Issues Found
- The Datadog values file did not set `datadog.clusterName`, while later examples scoped dashboard and monitor queries to `my-gke-cluster`. Added `clusterName: "my-gke-cluster"` so the queries have a configured cluster tag to match.
- The GCP integration API example omitted required service-account fields such as `private_key`, `client_id`, OAuth/token URLs, and certificate URL fields. Added the missing fields based on Datadog's GCP integration API example.
- The post implied GKE control plane metrics were available through the GCP integration alone. Clarified that GKE control plane metrics must first be enabled in Cloud Monitoring.
- The OOMKilled metric guidance used `kubernetes.containers.state.waiting`, but `OOMKilled` is a termination reason rather than a waiting state. Replaced it with `kubernetes_state.container.status_report.count.terminated` with reason `OOMKilled`.
- Dashboard and monitor examples used the deprecated `cluster_name` tag. Updated them to use `kube_cluster_name`, matching current Kubernetes State Core tag guidance.
- The crash-loop monitor message referenced `kube_namespace`, but the query grouped only by `pod_name`. Added `kube_namespace` to the monitor group-by clause so the template variable resolves.
- The Datadog Agent pod can include multiple containers when APM, process monitoring, or other features are enabled. Added `-c agent` to the `kubectl logs` command so it targets the Agent container explicitly.

## Review Notes
The Helm, kubectl, Autodiscovery, Terraform dashboard, and Datadog monitor examples are otherwise syntactically consistent with the referenced documentation. In production, the API and application keys should be provided through Kubernetes Secrets rather than committed in a values file.
