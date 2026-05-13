# Validation Summary: How to Configure Flagger for Canary Deployments with Multiple Ports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary custom resources
- Kubernetes Deployments and Services
- Kubernetes readiness probes
- kubectl
- Istio VirtualService and traffic routing
- Prometheus-based canary analysis metrics

## Sources Consulted
- Flagger documentation: How it works / Canary service - https://docs.flagger.app/usage/how-it-works
- Flagger FAQ: Kubernetes services and multiple ports - https://docs.flagger.app/faq
- Flagger documentation: Istio canary deployments - https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Kubernetes documentation: Liveness, readiness, and startup probes - https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes kubectl reference: set image - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Istio documentation: VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The post used `service.name: http` in the Canary example as if it were the port-name field. Flagger documents `service.portName` for the generated service port name, while `service.name` is the apex service name. Changed the YAML to `portName: http`.
- The post claimed Flagger supports `service.additionalPorts` and described listing additional ports under `service.portDiscovery`. The official Flagger docs describe `portDiscovery: true`, which scans the target workload and extracts other container ports; no `service.additionalPorts` field is documented. Reworded the explanation to remove the unsupported field and clarify that the extra ports are discovered from the Deployment.
- The post said Flagger creates ClusterIP services for each discovered port. Flagger creates the apex, primary, and canary ClusterIP services and adds discovered ports to those services. Updated the description to match the documented behavior.
- The manual VirtualService example implied users can combine the Canary resource with a custom VirtualService for port mapping. Flagger documents that it keeps generated VirtualServices and DestinationRules in sync with the Canary spec and overwrites direct modifications. Removed the misleading example and replaced it with a note about `portDiscovery` and generated-resource reconciliation.
- The introduction said all ports must be defined in both the Deployment and Canary resource. With `portDiscovery`, the additional ports are defined on the Deployment and exposed through Flagger's generated services. Reworded that claim.

## Review Notes
The remaining Deployment, readiness probe, `kubectl get`, `kubectl set image`, and `kubectl describe` examples are syntactically consistent with current Kubernetes documentation. The Flagger status value `Initialized` is a documented Canary condition reason.
