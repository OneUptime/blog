# Validation Summary: How to Use HashiCorp Consul for Service Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul
- Consul service discovery
- Consul service mesh / Connect
- Kubernetes
- Helm
- Consul DNS
- Consul HTTP API
- Consul Kubernetes CRDs
- Python requests

## Sources Consulted
- HashiCorp Consul Helm chart reference: https://developer.hashicorp.com/consul/docs/reference/k8s/helm
- HashiCorp Consul Kubernetes service mesh injection docs: https://developer.hashicorp.com/consul/docs/connect/k8s/inject
- HashiCorp Consul Kubernetes health check docs: https://developer.hashicorp.com/consul/docs/register/health-check/k8s
- HashiCorp Consul Kubernetes CRD docs: https://developer.hashicorp.com/consul/docs/connect/k8s/crds
- HashiCorp Consul service defaults reference: https://developer.hashicorp.com/consul/docs/connect/config-entries/service-defaults
- HashiCorp Consul DNS reference: https://developer.hashicorp.com/consul/docs/reference/dns
- HashiCorp Consul static DNS lookup docs: https://developer.hashicorp.com/consul/docs/discover/service/static
- HashiCorp Consul health HTTP API docs: https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul service intentions reference: https://developer.hashicorp.com/consul/docs/reference/config-entry/service-intentions
- HashiCorp Consul WAN federation overview: https://developer.hashicorp.com/consul/docs/east-west/wan-federation
- HashiCorp Consul releases: https://releases.hashicorp.com/consul/

## Issues Found
- The Helm install comments said the command installed the default configuration and deployed Consul servers and clients as a DaemonSet. The command uses a values file, and Consul servers are deployed as a StatefulSet. Updated the comments to match the Helm chart behavior.
- The Helm values placed `ui.enabled` under `server`, but the Consul Helm chart defines `ui` as a top-level stanza. Moved the UI configuration to the correct top-level location.
- The values file called `hashicorp/consul:1.18.0` the latest stable Consul image, which is outdated as of 2026-05-27. Updated the example to pin `hashicorp/consul:2.0.0` and changed the comment to recommend using a version supported by the selected Helm chart.
- The health check section implied that `ServiceDefaults.expose` defines health check behavior and that unhealthy instances are removed from the registry. Consul on Kubernetes syncs Kubernetes pod readiness for connect-injected pods, and unhealthy instances are omitted from healthy discovery results and service mesh traffic rather than necessarily removed from the catalog. Added a Kubernetes `readinessProbe` and revised the wording and diagram text.

## Review Notes
- The Python HTTP API example is syntactically valid and uses the documented `/v1/health/service/:service` endpoint with `passing=true`.
- The DNS examples match Consul standard service lookup patterns for SRV records.
- The ServiceIntentions example uses valid Kubernetes CRD syntax for L4 intentions, including a wildcard source deny rule.
- The multi-datacenter example is conceptually correct, but production Kubernetes federation usually requires more complete mesh gateway, TLS, ACL, and network exposure configuration than the short example shows.
