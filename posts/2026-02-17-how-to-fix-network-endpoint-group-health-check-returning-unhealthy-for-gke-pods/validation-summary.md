# Validation Summary: How to Fix Network Endpoint Group Health Check Returning Unhealthy for GKE Pods

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud Load Balancing
- Network Endpoint Groups (NEGs)
- Kubernetes Services and Ingress
- Kubernetes NetworkPolicy
- GKE BackendConfig
- Google Cloud CLI

## Sources Consulted
- Google Cloud: GKE Ingress for Application Load Balancers: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Google Cloud: Container-native load balancing through Ingress: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/container-native-load-balancing
- Google Cloud: Container-native load balancing through standalone zonal NEGs: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/standalone-neg
- Google Cloud: Troubleshoot Ingress health checks: https://docs.cloud.google.com/kubernetes-engine/docs/troubleshooting/ingress-health-checks
- Google Cloud: Ingress configuration and BackendConfig: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- Google Cloud Load Balancing firewall rules: https://docs.cloud.google.com/load-balancing/docs/firewall-rules
- Google Cloud health check concepts: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- Google Cloud SDK reference for firewall rules and network endpoint group commands: https://docs.cloud.google.com/sdk/gcloud/reference
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/

## Issues Found
- Corrected the firewall rule guidance around target tags. Compute Engine firewall target tags apply to GKE node VMs, not Pods, so the rule must target the node network tags or otherwise apply to the relevant nodes.
- Clarified that GKE Ingress health checks are created from BackendConfig first, then inferred from readiness probes when possible, otherwise default values are used. The original wording overstated readiness probes as the default source in all cases.
- Replaced the NEG controller log command with supported troubleshooting commands for `ServiceNetworkEndpointGroup` (`svcneg`) resources and Service events. GKE's controller components are not always exposed as readable pods in `kube-system`.
- Corrected the Ingress Service type gotcha. `ClusterIP` is recommended for container-native load balancing, but `NodePort` can also be used when explicitly needed.
- Corrected the health check path update gotcha. Readiness probe changes after Ingress creation do not update the existing load balancer health check; BackendConfig should be used for explicit control, or the pods and Ingress should be redeployed so GKE recreates the health check.

## Review Notes
The post is technically relevant and the examples now align with current GKE and Google Cloud Load Balancing documentation as of 2026-05-28. The local environment did not have `gcloud` installed, so CLI syntax was checked against official Google Cloud SDK reference documentation instead of local `--help` output.
