# Validation Summary: How to Configure Name Resolution for Multi-Cluster Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (name resolution components: kubernetes, consul, nameformat)
- Kubernetes (CoreDNS, ConfigMap)
- HashiCorp Consul (WAN federation, Helm chart)
- Istio (ServiceEntry)
- Dapr Resiliency policies

## Sources Consulted
- Dapr Kubernetes DNS Name Resolution docs — https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Supported Name Resolution Providers — https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Consul Name Resolution docs — https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr NameFormat Name Resolution docs — https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-nameformat/
- Dapr Service Invocation API Reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Resiliency Retry Policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Schema Spec — https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- CoreDNS Corefile documentation — https://coredns.io/2017/07/23/corefile-explained/
- CoreDNS forward plugin — https://coredns.io/plugins/forward/
- Kubernetes Customizing DNS Service — https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- HashiCorp Consul Helm chart values.yaml — https://github.com/hashicorp/consul-k8s/blob/main/charts/consul/values.yaml
- Consul agent configuration reference — https://developer.hashicorp.com/consul/docs/reference/agent/configuration-file/general
- Istio ServiceEntry reference — https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio v1 APIs blog post — https://istio.io/latest/blog/2024/v1-apis/

## Issues Found

### 1. Dapr name resolution configured as Component instead of Configuration (all three approaches)
**What was wrong:** All three name resolution YAML blocks used `kind: Component` with `type: nameresolution.*` and `metadata` fields. Dapr name resolution is configured within a `Configuration` resource under `spec.nameResolution`, not as a standalone `Component` resource.
**What was changed:** Replaced all three Component resources with the correct Configuration resource format using `spec.nameResolution.component` and `spec.nameResolution.configuration`.

### 2. Fabricated `@` (`%40`) syntax in service invocation URL (Approach 1)
**What was wrong:** The invocation URL `order-service.default\%40cluster2.local` used a `%40` (URL-encoded `@`) syntax to specify an alternate cluster domain. This syntax does not exist in Dapr's service invocation API. Cross-cluster resolution is handled by the name resolution component configuration, not by per-request URL syntax.
**What was changed:** Replaced with standard Dapr invocation URL (`/v1.0/invoke/order-service/method/orders`) and added a note explaining that the Configuration's `template` field controls address resolution. Also changed the Kubernetes name resolution config to use the `template` field instead of `clusterDomain`, which is the correct mechanism for constructing addresses pointing to a remote cluster's DNS domain.

### 3. NameFormat component used wrong field name and placeholder syntax (Approach 3)
**What was wrong:** The nameformat configuration used `nameFormat` as the metadata field name with Go template syntax (`{{ .ID }}`). The correct field name is `format` and it uses `{appid}` as the placeholder syntax.
**What was changed:** Updated to use `format: "{appid}.cluster2.internal"` within the correct Configuration resource structure.

### 4. Istio ServiceEntry used outdated API version (Approach 3)
**What was wrong:** The ServiceEntry used `apiVersion: networking.istio.io/v1alpha3`. Since Istio 1.22, the networking APIs have been promoted to v1 and `networking.istio.io/v1` is the recommended version.
**What was changed:** Updated to `apiVersion: networking.istio.io/v1`.

## Review Notes
- The CoreDNS Corefile configuration is correct and follows documented patterns for cross-cluster DNS forwarding.
- The Consul Helm chart values (`server.extraConfig`, `datacenter`, `primary_datacenter`, `retry_join_wan`) are all valid.
- The Dapr Resiliency spec is correct: `policy: exponential` with `maxRetries: 3` is valid. The `maxInterval` field (which defaults to 60s) is optional and its omission is acceptable.
- The Consul name resolution `client.datacenter` and `queryOptions.datacenter` fields are supported by the underlying Go structs (`api.Config` and `api.QueryOptions`) but are not prominently shown in official Dapr YAML examples. They are technically correct.
- Istio's `v1alpha3` still works but is deprecated in favor of `v1` — updated for forward compatibility.
- The approach of using the Kubernetes name resolution `template` field for cross-cluster DNS means all invocations from that Dapr sidecar resolve to the remote cluster. The post now notes this limitation. For production use, services needing to invoke both local and remote services would require more sophisticated routing (e.g., separate sidecar configs or gateway-based approaches).
