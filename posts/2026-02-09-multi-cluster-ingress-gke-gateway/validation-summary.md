# Validation Summary: How to Set Up Multi-Cluster Ingress with GKE Multi-Cluster Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- GKE Multi-Cluster Gateway
- GKE Multi-Cluster Services
- Kubernetes Gateway API
- HTTPRoute, Gateway, ServiceExport, and ServiceImport resources
- Google Cloud Load Balancing
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud: About multi-cluster Gateways: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/multi-cluster-gateways
- Google Cloud: Prepare your environment for multi-cluster Gateways: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/prepare-environment-multi-cluster-gateways
- Google Cloud: Deploy an external multi-cluster Gateway: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/deploy-external-multi-cluster-gateway
- Google Cloud: Configuring multi-cluster Services: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/multi-cluster-services
- Google Cloud: GatewayClass capabilities: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/gatewayclass-capabilities
- Google Cloud: Configure Gateway resources using Policies: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-gateway-resources
- Google Cloud SDK: gcloud container fleet ingress enable: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/ingress/enable
- Google Cloud SDK: gcloud compute backend-services get-health: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health

## Issues Found
- The required API list was incomplete for MCS setup. Added Resource Manager, Cloud DNS, and Connect Gateway APIs, and included the project flag.
- The cluster creation examples did not enable the GKE Gateway API. Added `--gateway-api=standard` and replaced the upstream Gateway API CRD installation step with the supported GKE cluster update command for existing clusters.
- The fleet setup omitted enabling Multi-Cluster Services and the MCS importer IAM binding. Added the `gcloud container fleet multi-cluster-services enable` command and the required `roles/compute.networkViewer` IAM binding.
- The Gateway used the single-cluster GatewayClass `gke-l7-global-external-managed`. Changed it to the multi-cluster GatewayClass `gke-l7-global-external-managed-mc`.
- The first HTTPRoute example referenced a regular Kubernetes `Service` for multi-cluster routing. Reworked the section so it exports the Service first and routes to the `net.gke.io` `ServiceImport`.
- The application Service included the single-cluster NEG annotation. Removed it because multi-cluster Gateway discovers exported Services through MCS and ServiceImport resources.
- The health check example used `BackendConfig`, which is for Ingress and not Gateway. Replaced it with `networking.gke.io/v1` `HealthCheckPolicy` targeting the `ServiceImport`.
- The backend health command used `backend-services describe` with a non-existent `backends[].healthStatus` field path. Replaced it with `gcloud compute backend-services get-health`.
- The PrometheusRule example used a non-standard `backend_unhealthy` metric without an exporter. Replaced it with a note to create Cloud Monitoring alert policies or export Google Cloud metrics into Prometheus first.

## Review Notes
The post is technically valid after the corrections. Production deployments should still add project, network, DNS, certificate, and namespace details specific to the target environment.
