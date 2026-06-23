# Validation Summary: How to Configure Consul for Kubernetes

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- HashiCorp Consul
- Consul on Kubernetes
- Kubernetes
- Helm
- Consul service mesh / Connect
- Consul API Gateway
- Consul terminating gateways
- Consul service sync
- CoreDNS
- Prometheus metrics

## Sources Consulted
- HashiCorp Consul Kubernetes Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul service sync documentation: https://developer.hashicorp.com/consul/docs/register/service/k8s/service-sync
- HashiCorp Consul DNS forwarding on Kubernetes documentation: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding/k8s
- HashiCorp Consul Kubernetes telemetry documentation: https://developer.hashicorp.com/consul/docs/observe/telemetry/k8s
- HashiCorp Consul API Gateway enablement documentation: https://developer.hashicorp.com/consul/docs/north-south/api-gateway/k8s/enable
- HashiCorp Consul API Gateway listener documentation: https://developer.hashicorp.com/consul/docs/north-south/api-gateway/k8s/listener
- HashiCorp Consul API Gateway route documentation: https://developer.hashicorp.com/consul/docs/north-south/api-gateway/k8s/route
- HashiCorp Consul terminating gateway documentation: https://developer.hashicorp.com/consul/docs/register/external/terminating-gateway/k8s
- HashiCorp consul-k8s Helm chart values and CRD schemas: https://github.com/hashicorp/consul-k8s

## Issues Found
- The Helm values used `connectInject.consulDNS.enabled`, which is not a current chart value. Replaced it with `dns.enableRedirection: true`, which is the chart-supported option for service mesh DNS redirection.
- The Helm values enabled Consul agent metrics while also enabling TLS. HashiCorp documents that Prometheus agent metrics are unsupported when TLS is enabled, so `global.metrics.enableAgentMetrics` was changed to `false`.
- Catalog sync was enabled with its default behavior while the post also injects service mesh sidecars. HashiCorp documents that service sync and service mesh should not both manage the same Kubernetes services, so `syncCatalog.default: false` was added and the later service-sync example remains explicitly annotated.
- The post used deprecated Consul `IngressGateway` configuration. Replaced that section and the Helm gateway values with current Consul API Gateway configuration using Gateway API `Gateway` and `HTTPRoute`.
- The terminating gateway external-service example used a Kubernetes `ExternalName` service with service sync disabled, which would not register a routable external Consul service. Replaced it with the documented `ServiceDefaults.spec.destination` pattern for external services with transparent proxy.
- The Consul DNS deployment example was not a valid `apps/v1` Deployment because it omitted `spec.selector` and matching pod labels. Added the required selector and labels.
- The CoreDNS example used a nonstandard `coredns-custom` shape and did not match HashiCorp's documented CoreDNS forwarding configuration. Updated it to edit the `coredns` ConfigMap `Corefile` with a `consul` forwarding block.
- The monitoring commands used plain HTTP against a TLS/ACL-enabled installation. Updated them to port-forward the Consul server HTTPS port and export the Consul API environment variables needed for TLS and ACLs.
- The Prometheus `ServiceMonitor` example targeted Consul agent metrics in a TLS-enabled setup and used labels/ports that may not match the Helm chart. Replaced it with the Prometheus scrape annotations documented for mesh sidecar metrics.
- The upgrade verification command used `consul members` without a local Consul agent/API environment. Replaced it with `kubectl exec` into a Consul server pod.

## Review Notes
- Helm was not installed in the review environment, so `helm template` could not be run locally. The review used the current official chart source and HashiCorp documentation, and the parseable YAML snippets were checked with a YAML parser.
- Some examples remain illustrative and still require environment-specific details, such as a real StorageClass, Gateway TLS Secret, CoreDNS service ClusterIP, and service intentions suitable for the deployed applications.
