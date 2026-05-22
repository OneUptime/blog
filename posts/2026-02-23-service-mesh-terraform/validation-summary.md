# Validation Summary: How to Deploy Service Mesh with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Helm provider
- HashiCorp Kubernetes provider
- HashiCorp TLS provider
- Kubernetes
- Istio
- Linkerd
- Helm
- Service mesh traffic management
- Mutual TLS

## Sources Consulted
- Istio official Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio official Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official PeerAuthentication API reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio official sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio official Helm chart index: https://istio-release.storage.googleapis.com/charts/index.yaml
- Istio 1.30.0 Helm chart source: https://github.com/istio/istio/tree/1.30.0/manifests/charts
- Linkerd official Helm installation documentation: https://linkerd.io/2.16/tasks/install-helm/
- Linkerd official certificate generation documentation: https://linkerd.io/2.16/tasks/generate-certificates/
- Linkerd official proxy injection documentation: https://linkerd.io/2/features/proxy-injection/
- Linkerd official stable Helm chart index: https://helm.linkerd.io/stable/index.yaml
- Terraform Helm provider `helm_release` documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform TLS provider documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs

## Issues Found
- The Istio Helm chart examples used version `1.20.0`, which is old relative to the current official Istio release. Updated the Istio `base`, `istiod`, and `gateway` chart versions to `1.30.0`, which is present in the official Istio chart index.
- The Istio custom resources used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated the Gateway, VirtualService, DestinationRule, and PeerAuthentication examples to the current `v1` API versions used by the official Istio documentation.
- The Istio `meshConfig.defaultConfig.holdApplicationUntilProxyStarts` comment incorrectly said it enabled mTLS by default. Changed the comment to describe what the setting actually does: holding application startup until the proxy starts.
- The Linkerd control plane Helm chart version `1.16.0` was not present in the official stable Helm chart index. Updated it to `1.16.11`, which is available and maps to the latest open-source stable 2.14 control-plane chart in that index.
- The best-practice note described Kiali and Linkerd Viz as built-in dashboards. Adjusted the wording because these are dashboards/extensions commonly used with the meshes, not built into the core installs shown.

## Review Notes
- Terraform and Helm CLIs were not installed in the local environment, so I could not run `terraform validate` or render the Helm charts locally. The snippets were reviewed against official provider documentation, official chart indexes, and upstream chart source.
- The examples deploy Istio and Linkerd independently. In a real cluster, avoid enabling multiple sidecar-injecting meshes on the same application namespace unless you have a deliberate migration design.
