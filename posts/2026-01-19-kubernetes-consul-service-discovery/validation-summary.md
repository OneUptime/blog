# Validation Summary: How to Set Up Kubernetes Service Discovery with Consul

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- HashiCorp Consul
- Consul on Kubernetes Helm chart
- Consul service discovery and DNS
- Consul service mesh / Connect
- Consul Kubernetes CRDs
- CoreDNS
- Prometheus / ServiceMonitor
- Python Consul client usage

## Sources Consulted
- HashiCorp Consul on Kubernetes Helm Chart Reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul on Kubernetes annotations and labels reference: https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- HashiCorp Consul DNS forwarding for Kubernetes: https://developer.hashicorp.com/consul/docs/manage/dns/forwarding/k8s
- HashiCorp Consul DNS proxy for Kubernetes: https://developer.hashicorp.com/consul/docs/manage/dns/views/enable
- HashiCorp Consul Kubernetes health checks: https://developer.hashicorp.com/consul/docs/register/health-check/k8s
- HashiCorp Consul health checks for service definitions: https://developer.hashicorp.com/consul/docs/register/health-check/vm
- HashiCorp Consul ServiceIntentions config entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul ServiceDefaults config entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-defaults
- HashiCorp Consul ProxyDefaults config entry reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/proxy-defaults
- Kubernetes DNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/

## Issues Found
- The Helm values placed `metrics` at the chart top level, but the current HashiCorp chart documents these settings under `global.metrics`. Moved the metrics block under `global`.
- The manual registration ConfigMap implied that creating the ConfigMap registers the service. Clarified that the JSON must be mounted into a Consul agent config directory or registered with the Consul API/CLI.
- The DNS pod example labeled `10.96.0.10` as the Consul DNS service, but that address is commonly the Kubernetes DNS service. Updated the example to use an explicit Consul DNS service ClusterIP and `dnsPolicy: None` for direct Consul DNS querying.
- The CoreDNS forwarding example used `consul-dns.consul.svc:8600`, while HashiCorp's Kubernetes DNS forwarding docs instruct forwarding the `consul` zone to the static ClusterIP of the Consul DNS service. Updated the block accordingly.
- The application health-check example used unsupported Consul Kubernetes annotations (`health-check-http`, `health-check-interval`, `health-check-timeout`). Replaced them with a note that Consul syncs Kubernetes readiness status for connect-injected pods.
- The custom health-check snippet was fenced as JSON but included a JavaScript-style comment, making it invalid JSON. Removed the comment.
- The custom health-check snippet used the deprecated `script` check field. Replaced it with the current `args` array form.

## Review Notes
The examples are now aligned with current Consul documentation. Some snippets still require environment-specific values, such as the actual `consul-dns` ClusterIP, storage class name, ingress host, ACL tokens, and TLS setup.
