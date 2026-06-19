# Validation Summary: How to Handle Service Discovery in Microservices

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Microservices service discovery
- Kubernetes Services and DNS
- Kubernetes readiness and liveness probes
- Kubernetes headless Services
- HashiCorp Consul service registration, DNS, health checks, and service mesh annotations
- Go with the HashiCorp Consul API client
- Node.js, Express.js, and Axios examples
- Python service discovery fallback pattern

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- HashiCorp Consul service definition reference: https://developer.hashicorp.com/consul/docs/reference/service
- HashiCorp Consul health check configuration reference: https://developer.hashicorp.com/consul/docs/reference/service/health-check
- HashiCorp Consul DNS overview: https://developer.hashicorp.com/consul/docs/discover/dns
- HashiCorp Consul on Kubernetes annotations and labels reference: https://developer.hashicorp.com/consul/docs/reference/k8s/annotation-label
- HashiCorp Consul Health HTTP API: https://developer.hashicorp.com/consul/api-docs/health
- HashiCorp Consul Go API package documentation: https://pkg.go.dev/github.com/hashicorp/consul/api

## Issues Found
- The headless Service DNS example showed StatefulSet-style per-pod DNS names as the direct result of looking up the Service name. Kubernetes headless Service A/AAAA records for the Service name resolve to the set of selected Pod IPs; per-pod hostnames require pod hostname/subdomain records, commonly provided by StatefulSets. Updated the example output to show multiple address records for `database-cluster.production.svc.cluster.local`.
- The Consul service definition used a singular `check` field. Current Consul service definition documentation presents service health checks under the `checks` array. Updated the JSON example to use `checks`.
- The Consul Connect Kubernetes Deployment example omitted required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the Deployment manifest is valid.
- The Python fallback example raised `ServiceDiscoveryError` without defining it and imported unused symbols. Added the exception class and removed the unused imports.

## Review Notes
The remaining examples are illustrative and omit surrounding application setup, such as real database and Redis clients in the Express health check sample, but the shown APIs and configuration patterns are technically accurate for the guide's scope.
