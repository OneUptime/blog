# Validation Summary: How to Manage Kubernetes Services in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes Services
- kubectl
- YAML
- Kubernetes DNS and EndpointSlice networking

## Sources Consulted
- Portainer documentation: Services - https://docs.portainer.io/sts/user/kubernetes/networking/services
- Portainer documentation: Add a new application using a form - https://docs.portainer.io/sts/user/kubernetes/applications/add
- Portainer documentation: Edit an application - https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Portainer documentation: kubectl shell - https://docs.portainer.io/user/kubernetes/kubectl
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes documentation: Debugging DNS Resolution - https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes documentation: kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Portainer navigation path for viewing services was incorrect. Updated `Applications → Services` to `Networking → Services` to match current Portainer documentation.
- The Portainer application form workflow was outdated. Updated `Add application` and `Add port` to the current `Add with form` and `Create service` flow, and aligned the described fields with the documented publishing section.
- The post referred to `KubeShell`, while current Portainer documentation uses `kubectl shell`. Updated the terminology and clarified that the manifest must be saved before `kubectl apply -f ...` is run.
- The NodePort example implied `30000-32767` is always required. Clarified that this is the default range and that clusters can configure a different `--service-node-port-range`.
- The editing section described a service-specific Portainer edit flow that does not match current Portainer docs. Rewrote it to use the documented application editing flow.
- The connectivity verification section used the legacy `Endpoints` API. Updated it to `EndpointSlice`-based verification because `Endpoints` is deprecated in Kubernetes v1.33+.
- The temporary `kubectl run` DNS test command did not specify `--restart=Never`. Added it so the disposable pod behavior is explicit and consistent with current `kubectl` guidance.
- The LoadBalancer description overstated behavior as guaranteed cloud load balancer provisioning. Clarified that an external load balancer is created only when supported by the underlying cluster environment.

## Review Notes
- `ExternalName` is a valid Kubernetes Service type, but Portainer's documented application form specifically covers `ClusterIP`, `NodePort`, and `LoadBalancer`; `ExternalName` is typically managed via manifest.
- The article now reflects current Kubernetes guidance by using `EndpointSlice` terminology for backend endpoint verification.
