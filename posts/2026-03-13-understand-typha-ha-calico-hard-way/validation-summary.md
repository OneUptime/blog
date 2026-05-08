# Validation Summary: How to Understand Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix
- Kubernetes
- Kubernetes Services and EndpointSlices
- High availability

## Sources Consulted
- Calico Open Source Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Open Source hard way Typha installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico Open Source hard way calico/node installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico Open Source on-premises installation guidance for Typha replica counts: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Felix configuration reference for Typha discovery and read timeout: https://docs.tigera.io/calico-cloud/reference/component-resources/node/felix/configuration
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post said Felix uses Kubernetes service DNS and service load balancing to discover Typha. Updated this to describe `FELIX_TYPHAK8SSERVICENAME`, which tells Felix to look up the endpoints for the configured Kubernetes Service.
- The endpoint inspection command used the `calico-system` namespace and the deprecated Endpoints API. Updated the hard way command to query EndpointSlices in `kube-system` with the `kubernetes.io/service-name=calico-typha` label.
- The replica recommendation table did not match current Calico guidance. Updated it to reflect at least one Typha replica per 200 nodes, a production minimum of three replicas, and a recommended maximum of 20 replicas.
- The single-replica section included unsupported fixed restart duration claims. Removed the specific timing claims and kept the technically accurate behavior: policy updates are delayed until reconnection.
- The multi-replica section said there is no policy propagation interruption. Clarified that healthy replicas continue serving existing clients, while clients connected to the failed replica resume updates after reconnecting.
- The statelessness section said each replica can handle the full Felix connection load independently. Changed this to a capacity-planning statement that remaining replicas should be sized to handle the load after a failure.
- The conclusion still referenced starting at two replicas for clusters with 200+ nodes. Updated it to align with the production minimum of three replicas.

## Review Notes
The post is technically relevant and has been validated after targeted corrections. The exact Typha replica count can still vary by deployment method and cluster load, but the updated wording now follows Tigera's current published sizing guidance.
