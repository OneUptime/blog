# Validation Summary: How to Implement Service Discovery in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services
- Kubernetes DNS service discovery
- CoreDNS
- EndpointSlices
- Kubernetes readiness and liveness probes
- Headless Services and StatefulSet DNS
- ExternalName Services
- kubectl
- Python HTTP and DNS clients
- Go HTTP clients
- Istio VirtualService and DestinationRule

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Connecting Applications with Services tutorial: https://kubernetes.io/docs/tutorials/services/connect-applications-service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
- The post described discovery with the older Endpoints API and used `kubectl get endpoints`. Kubernetes now uses EndpointSlices as the stable scalable mechanism for Service backends, so I updated the description and verification/debug commands to use `kubectl get endpointslices -l kubernetes.io/service-name=api`.
- The Go example imported `encoding/json` but did not use it, which would make `go build` fail. I removed the unused import.
- The post said Service traffic is load-balanced across "healthy" endpoints. Kubernetes readiness controls whether a Pod is included for regular Service traffic, so I changed this to "ready Pod endpoints."
- The headless Service section said DNS returns all Pod IPs. Kubernetes only creates Pod-specific records for ready Pods unless `publishNotReadyAddresses` is set, so I clarified that the DNS query returns ready Pod IPs.
- The environment-variable Pod snippet placed explanatory comments under an empty `env:` field. I moved the comments to the container level and clarified that Service environment variables are populated for active Services that exist when the Pod is created.
- The Istio examples used `networking.istio.io/v1beta1`. Istio's current reference documentation uses `networking.istio.io/v1` for VirtualService and DestinationRule, so I updated both manifests.

## Review Notes
The examples are generally accurate for the default Kubernetes cluster domain `cluster.local`. Clusters can be configured with a different DNS domain, so fully qualified examples may need adjustment in non-default clusters.
