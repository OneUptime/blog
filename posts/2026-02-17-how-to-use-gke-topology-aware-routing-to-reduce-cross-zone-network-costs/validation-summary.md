# Validation Summary: How to Use GKE Topology-Aware Routing to Reduce Cross-Zone Network Costs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Services
- Kubernetes EndpointSlices
- Kubernetes topology-aware routing / traffic distribution
- kube-proxy
- Google Cloud VPC networking and pricing
- Cloud Monitoring
- VPC Flow Logs
- kubectl
- gcloud

## Sources Consulted
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Google Cloud VPC network pricing: https://cloud.google.com/vpc/network-pricing
- Google Cloud metrics list for networking metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Cloud Monitoring timeSeries.list API documentation: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- gcloud compute networks subnets update reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud VPC Flow Logs documentation: https://cloud.google.com/vpc/docs/using-flow-logs

## Issues Found
- The post described same-zone routing too absolutely in a few places. Updated the wording to say Kubernetes prefers same-zone endpoints, because topology-aware routing and traffic distribution are preferences and can fall back to cluster-wide routing.
- The Google Cloud pricing section said intra-zone traffic is free without qualifying the internal IP condition and used GB instead of GiB. Updated the wording to match Google Cloud's VM-to-VM pricing documentation.
- The service example used only `service.kubernetes.io/topology-mode: Auto` and called it the current way to enable the feature. Updated the example to use `spec.trafficDistribution: PreferSameZone`, and noted that `service.kubernetes.io/topology-mode: Auto` remains the fallback for clusters that do not support the newer field.
- The existing-service command used `kubectl annotate` for the older annotation. Updated it to `kubectl patch` the Service spec with `trafficDistribution: PreferSameZone`.
- The activation requirements claimed a specific "one endpoint in each zone that has pods consuming the service" rule and a 150% threshold. Replaced this with the documented safeguards: sufficient endpoints, node topology and allocatable CPU information, and a balanced allocation below the controller overload threshold.
- The Cloud Monitoring example used `gcloud monitoring time-series list`, which is not available in the current GA gcloud monitoring command group. Replaced it with a Cloud Monitoring `timeSeries.list` API call using `curl` and `gcloud auth print-access-token`.
- The all-services rollout script annotated Services with the older topology-mode annotation. Updated it to patch `spec.trafficDistribution`.

## Review Notes
The post is technically valid after the fixes. For older GKE clusters that do not yet support `spec.trafficDistribution`, the annotation-based examples remain relevant, but teams should verify the Kubernetes minor version before applying the newer field broadly.
