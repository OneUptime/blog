# Validation Summary: How to Set Up Flagger with Istio on AKS Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes
- Istio
- Flagger
- Helm
- Prometheus
- Kubernetes NetworkPolicy
- Azure Load Balancer annotations

## Sources Consulted
- Flagger install on Kubernetes: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger Istio canary deployments: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger canary resource behavior: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- AKS network policies: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- AKS load balancer annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard

## Issues Found
- The Flagger Helm install omitted the required Canary CRD installation and `--set crd.create=false`. Added the official CRD installation command and Helm value so the `Canary` resource can be created correctly.
- The Prometheus add-on URL referenced the older Istio `release-1.22` sample while the post installs Istio without pinning that version. Updated the URL to the current Istio `release-1.29` sample used by the official Istio Prometheus documentation.
- The Flagger Canary `service.gateways` value used a Kubernetes service FQDN. Updated it to the official Flagger Istio gateway reference format, `istio-system/public-gateway`.
- The Canary `trafficPolicy.tls.mode` was set to `ISTIO_MUTUAL` even though the walkthrough does not enable strict mTLS. Changed it to `DISABLE`, matching the official Flagger Istio example for the default setup.

## Review Notes
- The Istio Prometheus sample add-on is intended for demonstrations and is not tuned for production monitoring.
- Azure Network Policy Manager for Linux is documented by Microsoft as retiring on September 30, 2028; future production guidance should prefer Azure CNI Powered by Cilium where appropriate.
