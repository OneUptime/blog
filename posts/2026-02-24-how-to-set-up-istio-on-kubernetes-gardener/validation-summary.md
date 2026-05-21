# Validation Summary: How to Set Up Istio on Kubernetes Gardener

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Gardener Shoot clusters
- Kubernetes
- Istio and istioctl
- Kubernetes NetworkPolicy
- AWS, GCP, and Azure cloud load balancers
- Gardener DNS extension
- Prometheus, Grafana, and Kiali Istio addons

## Sources Consulted
- Gardener core API reference: https://gardener.cloud/docs/gardener/api-reference/core/
- Gardener AWS provider extension usage and Shoot examples: https://gardener.cloud/docs/extensions/infrastructure-extensions/gardener-extension-provider-aws/usage/
- Gardener dashboard kubectl connection guide: https://gardener.cloud/docs/dashboard/connect-kubectl/
- gardenctl v2 documentation: https://gardener.cloud/docs/gardenctl-v2/
- Gardener kube-apiserver load balancing / Istio usage: https://gardener.cloud/docs/gardener/kube_apiserver_loadbalancing/
- Gardener DNS extension guide: https://gardener.cloud/docs/guides/networking/dns-extension/
- Istio download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio getting started without Gateway API / Bookinfo guide: https://istio.io/latest/docs/setup/additional-setup/getting-started-istio-apis/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Azure Load Balancer health probe annotation behavior: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard

## Issues Found
- The Shoot manifest used deprecated `cloudProfileName` and `secretBindingName` fields. Updated the example to use `spec.cloudProfile.name` and `credentialsBindingName`, matching current Gardener examples and API guidance.
- The Shoot manifest pinned a specific GardenLinux image version. Removed the version so Gardener can default to a CloudProfile-supported image version, avoiding a stale or landscape-specific value.
- The sample Kubernetes version was `1.30.2`, while the current Istio 1.30 documentation lists Kubernetes 1.32 and newer as supported. Updated the example to `1.32.0`.
- The gardenctl kubeconfig command used `export KUBECONFIG=$(gardenctl kubectl-env)`, but current gardenctl documentation generates a shell script and uses `eval "$(gardenctl kubectl-env bash)"`. Updated the command.
- The Istio install step downloaded the latest Istio release but changed into `istio-1.24.0`, which would fail with current downloads and used an outdated Istio release. Updated the directory to `istio-1.30.0`.
- The AWS NLB annotation example used `service.beta.kubernetes.io/aws-load-balancer-type: nlb`. For the AWS Load Balancer Controller path documented by Gardener, the current value is `external`, with `aws-load-balancer-nlb-target-type: instance`; Gardener notes IP target mode is not supported. Updated the AWS annotation snippet and added the internet-facing scheme annotation.
- The NetworkPolicy section said Gardener shoots come with default restrictive NetworkPolicies. Gardener behavior can be landscape- or template-specific, so the wording was narrowed to avoid implying every shoot has default application NetworkPolicies.

## Review Notes
- The post uses Istio's legacy Gateway and VirtualService Bookinfo sample rather than the newer Kubernetes Gateway API path. This remains documented by Istio as "Getting Started without the Gateway API", so it is technically valid.
- Resource sizing numbers are rough planning estimates rather than guaranteed requirements. Actual Istio memory and CPU usage depends on mesh size, traffic, telemetry, and proxy configuration.
