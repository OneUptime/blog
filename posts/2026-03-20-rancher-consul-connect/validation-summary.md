# Validation Summary: How to Configure Consul Connect with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- HashiCorp Consul
- Consul service mesh / Connect
- Consul on Kubernetes
- Helm
- consul-k8s CLI
- Envoy / Consul Dataplane

## Sources Consulted
- HashiCorp Consul on Kubernetes version compatibility: https://developer.hashicorp.com/consul/docs/upgrade/k8s/compatibility
- HashiCorp Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- Connect Kubernetes service mesh with Consul: https://developer.hashicorp.com/consul/docs/connect/k8s
- Custom Consul injection behavior: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- Consul on Kubernetes annotations and labels reference: https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- Custom Resource Definitions (CRDs) for Consul on Kubernetes: https://developer.hashicorp.com/consul/docs/connect/k8s/crds
- Kubernetes service mesh workload scenarios: https://developer.hashicorp.com/consul/docs/connect/k8s/workload
- Enable transparent proxy mode on Kubernetes: https://developer.hashicorp.com/consul/docs/connect/proxy/transparent-proxy/k8s
- Service intentions configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- Service resolver configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-resolver
- Service splitter configuration entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-splitter
- Install Consul on Kubernetes with Helm: https://developer.hashicorp.com/consul/docs/deploy/server/k8s/helm
- Consul on Kubernetes CLI reference: https://developer.hashicorp.com/consul/docs/k8s/k8s-cli
- Troubleshoot service-to-service communication: https://developer.hashicorp.com/consul/docs/connect/troubleshoot/service-to-service

## Issues Found
- The prerequisites were too loose for current supported releases. I changed the Kubernetes requirement to reference the Consul on Kubernetes compatibility matrix, updated Helm from `3.x` to `3.6+`, and added `consul-k8s` because the fixed troubleshooting step uses the official Kubernetes CLI.
- The Helm values example used an unsupported `global.connectInject` block. I removed that block and kept Connect injector settings under the supported top-level `connectInject` stanza from the Helm chart reference.
- The injection step used a namespace label to enable sidecar injection, which is not the supported current workflow. I replaced it with the documented pod-template annotation approach.
- The workload example did not include a Kubernetes `Service`, but Consul on Kubernetes requires a Kubernetes Service to register workloads into the mesh. I added a `Service` resource for `backend-service`.
- The deployment example mixed transparent proxy with an explicit upstream annotation, which changes how applications address upstreams and conflicted with the surrounding explanation. I removed the explicit upstream annotation and added service metadata used later by the traffic-splitting example.
- The traffic-management examples defined two separate `ServiceResolver` resources for the same service, which would overwrite each other. I updated the later resolver example so it preserves the failover configuration while adding subsets and the default subset.
- Several config-entry examples omitted the Kubernetes namespace, which would cause them to land in the current namespace rather than the `production` namespace shown elsewhere. I added `metadata.namespace: production` where needed.
- The UI access example used HTTP ports even though the Helm values enabled TLS. I corrected the port-forward command to use HTTPS and made the bootstrap token command conditional on ACLs being enabled.
- The mTLS verification step relied on ad hoc commands that are not the supported Kubernetes troubleshooting workflow. I replaced them with the official `consul-k8s troubleshoot upstreams` and `consul-k8s troubleshoot proxy` commands, which validate certificates and proxy connectivity.
- The troubleshooting commands against `consul-server-0` did not specify the `consul` container. I updated them to the documented `kubectl exec ... -c consul -- ...` form.

## Review Notes
- The post is now technically correct, but readers should still pin a Consul and `consul-k8s` version that matches their Rancher cluster's Kubernetes version before installing the chart.
- In Consul Community Edition, config entries are effectively global by service name even when the Kubernetes YAML includes a namespace. Reusing the same service names across multiple Kubernetes namespaces can still create conflicts.
