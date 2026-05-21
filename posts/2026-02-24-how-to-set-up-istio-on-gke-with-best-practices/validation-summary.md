# Validation Summary: How to Set Up Istio on GKE with Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Google Kubernetes Engine
- Google Cloud CLI
- Kubernetes
- Google Cloud Workload Identity Federation for GKE
- Cloud DNS
- Cloud Monitoring
- Google Cloud Managed Service for Prometheus
- Istio Gateway, PeerAuthentication, IstioOperator, and Telemetry/tracing configuration

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig and tracing reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API and tracing docs: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio application requirements and port reference: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio canary upgrade docs: https://istio.io/latest/docs/setup/upgrade/canary/
- GKE Workload Identity Federation docs: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE VPC-native cluster docs: https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- GKE firewall rules docs: https://cloud.google.com/kubernetes-engine/docs/concepts/firewall-rules
- GKE metrics collection docs: https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics
- Google Cloud Managed Service for Prometheus docs: https://cloud.google.com/stackdriver/docs/managed-prometheus
- Cloud Service Mesh overview: https://cloud.google.com/service-mesh/docs/overview
- gcloud container clusters create reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- gcloud dns record-sets create reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create

## Issues Found
- The post referred to Google's managed Istio option as Anthos Service Mesh. Updated this to Cloud Service Mesh, formerly Anthos Service Mesh, and adjusted the description to match Google's current managed service mesh terminology.
- The Istio Gateway example used `selector.matchLabels`, but `networking.istio.io/v1` Gateway uses `selector` as a direct map of labels. Changed it to `selector: { istio: ingressgateway }`.
- The GKE firewall section implied custom VPC firewall rules are always required. Updated the wording to reflect that GKE creates essential firewall rules by default, while manually managed or higher-priority firewall policies must still allow the required Istio ports.
- The Cloud Monitoring section incorrectly described a tracing sampling snippet as metrics export. Clarified that the snippet configures trace sampling and that Istio metrics can be collected through Prometheus or Google Cloud Managed Service for Prometheus.
- The Istio sample addons were presented as a general production metrics deployment. Clarified that the sample addons are suitable for evaluation.
- The tracing section described the Zipkin configuration as Cloud Trace setup. Reworded it as Zipkin-compatible tracing configuration.
- The conclusion called revision-based upgrades a GKE feature. Updated it to describe them as Istio revision-based upgrades.

## Review Notes
The post is now technically valid as an open-source Istio on GKE guide. Future improvements could add version pinning for Istio and GKE, use the Telemetry API and `extensionProviders` for modern tracing configuration, and show Google Cloud Managed Service for Prometheus `PodMonitoring` resources for a production GKE monitoring setup.
