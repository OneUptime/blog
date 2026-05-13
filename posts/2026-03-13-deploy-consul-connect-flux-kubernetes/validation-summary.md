# Validation Summary: How to Deploy Consul Connect with Flux on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- HelmRelease and HelmRepository custom resources
- HashiCorp Consul
- Consul Connect service mesh
- Consul Helm chart
- Envoy sidecar proxies / Consul dataplane

## Sources Consulted
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- HashiCorp Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul Connect Kubernetes overview: https://developer.hashicorp.com/consul/docs/connect/k8s
- HashiCorp Consul Connect injector documentation: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- HashiCorp Consul Kubernetes workload scenarios: https://developer.hashicorp.com/consul/docs/connect/k8s/workload
- HashiCorp Consul Kubernetes annotations and labels reference: https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- HashiCorp Consul Kubernetes Helm install documentation: https://developer.hashicorp.com/consul/docs/deploy/server/k8s/helm

## Issues Found
- Namespace-level injection was shown as a Namespace label (`consul.hashicorp.com/connect-inject: "true"`), but HashiCorp documents injection opt-in as a pod template annotation and namespace eligibility as `connectInject.k8sAllowNamespaces` / `connectInject.k8sDenyNamespaces`. Updated the Helm values to restrict injection to the `production` namespace, removed the incorrect Namespace label, and adjusted the best-practice text.
- The meshed workload example did not include a Kubernetes Service, but Consul's Kubernetes workload documentation states that a Kubernetes Service is required for service mesh registration. Added a Service for `api-service`.
- ACLs were enabled in the Consul Helm values, but the workload did not set a matching ServiceAccount. HashiCorp documents that when ACLs are enabled, the pod `serviceAccountName` must match the Consul service name. Added a matching ServiceAccount and `serviceAccountName: api-service`.
- The upstream example reused port `8080`, which could conflict with the API container's own service port once the example declares the application port. Changed the local upstream listener to `9090` and updated the environment variable and validation command.
- The UI port-forward command used HTTP port 80 even though the Helm values enable TLS and Consul's chart defaults to HTTPS-only when TLS is enabled. Updated it to forward service port 443 and use `https://localhost:8501`.
- The validation command exec'd into the `consul-dataplane` container and described the curl as directly verifying mTLS. Updated it to exec into the application container and describe the check as upstream connectivity through the local service mesh proxy.

## Review Notes
The examples use current Flux v1/v2 API groups and the Consul Helm chart values checked are valid in the current HashiCorp chart reference. The chart version selector `1.4.*` pins the Helm chart series, not the Consul server version; pinning `global.image` to an explicit Consul image tag would make production upgrades more predictable.
