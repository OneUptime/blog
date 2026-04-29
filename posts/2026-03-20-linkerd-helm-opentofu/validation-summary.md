# Validation Summary: How to Deploy Linkerd Service Mesh on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Linkerd
- Kubernetes
- OpenTofu / Terraform-compatible HCL
- Helm (`helm_release`)
- Kubernetes Gateway API (`HTTPRoute`)
- HashiCorp Kubernetes provider (`kubernetes_manifest`, `kubernetes_namespace`)
- HashiCorp TLS provider (`tls_private_key`, `tls_self_signed_cert`, `tls_cert_request`, `tls_locally_signed_cert`)

## Sources Consulted
- Linkerd: Installing Linkerd with Helm: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd: Generating your own mTLS root certificates: https://linkerd.io/2-edge/tasks/generate-certificates/
- Linkerd: Gateway API support: https://linkerd.io/2/features/gateway-api/
- Linkerd: HTTPRoute reference: https://linkerd.io/2/reference/httproute/
- Linkerd: Retries and Timeouts: https://linkerd.io/2/features/retries-and-timeouts/
- Linkerd: Retries reference: https://linkerd.io/2-edge/reference/retries/
- Linkerd: Timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Linkerd: Traffic Split (deprecation notice): https://linkerd.io/2/features/traffic-split/
- Linkerd: Service Profiles reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd: Automatic Proxy Injection / inject annotation behavior: https://linkerd.io/2/reference/cli/inject/
- Terraform Registry: `helm_release`: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry: `kubernetes_manifest`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform Registry: TLS provider overview: https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- Terraform Registry: `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/4.0.4/docs/resources/private_key
- Artifact Hub: `linkerd-crds` chart values (`installGatewayAPI`): https://artifacthub.io/packages/helm/linkerd2-edge/linkerd-crds
- Artifact Hub: `linkerd-control-plane` chart values (`controllerReplicas`, `proxy.resources`): https://artifacthub.io/packages/helm/linkerd2-edge/linkerd-control-plane
- Artifact Hub: `linkerd-viz` chart values (`dashboard.replicas`, `prometheus.enabled`): https://artifacthub.io/packages/helm/linkerd2-edge/linkerd-viz

## Issues Found
1. The post pinned older stable-repo chart versions and then used routing/policy patterns that no longer match current official Linkerd guidance. I updated the install examples to use the current official Linkerd edge Helm repository and explicitly enabled Gateway API CRD installation through `linkerd-crds`, which is required for the `HTTPRoute` examples used later in the post.
2. The `linkerd_viz` `helm_release` targeted the `linkerd-viz` namespace without creating it. The Helm provider's `create_namespace` argument defaults to `false`, so the example could fail on a clean cluster. I added `create_namespace = true`.
3. The canary example used SMI `TrafficSplit` with `split.smi-spec.io/v1alpha1`. That is outdated in two ways: current Linkerd docs mark TrafficSplit and the `linkerd-smi` extension as deprecated, and the post did not install the SMI extension required to make the resource work. I replaced the example with a weighted `HTTPRoute` using the Kubernetes Gateway API, which is the current Linkerd routing model.
4. The per-route policy example used a legacy `ServiceProfile`. Current Linkerd docs state that as of Linkerd 2.16, ServiceProfiles have been supplanted by Gateway API resources for per-route metrics, retries, and timeouts. The original snippet was also incomplete because a valid ServiceProfile spec requires a `retryBudget`. I replaced it with an `HTTPRoute` that applies Linkerd retry and timeout annotations to the matching route.
5. The overview and summary slightly overstated Linkerd behavior by implying blanket traffic encryption and by describing the deprecated policy objects as current. I corrected the wording to specify mTLS for meshed workloads and HTTPRoute-based routing/policy.

## Review Notes
- The certificate-generation example is syntactically valid and uses the ECDSA P-256 algorithm required by Linkerd. However, the `tls_private_key` resource stores generated private keys unencrypted in OpenTofu/Terraform state, which the TLS provider explicitly warns against for production use. That is an operational risk rather than a syntax error, so I left the tutorial structure intact and note it here.
- Current Linkerd edge charts on Artifact Hub require Kubernetes `>=1.23.0-0`. The post does not state a Kubernetes minimum version.
- I removed hard-coded chart versions rather than replacing them with a different pinned set because the original version pins were stale and conflicted with the current Gateway API-based examples. For production infrastructure, chart version pinning is still advisable once you choose a tested release set.
