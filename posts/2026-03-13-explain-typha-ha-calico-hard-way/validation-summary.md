# Validation Summary: How to Explain Typha High Availability in a Calico Hard Way Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Typha
- Felix
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico hard way Typha installation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Calico on-premises Typha replica guidance: https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes EndpointSlice concept documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The post used `calico-system` commands while the Calico hard way Typha documentation installs Typha in `kube-system`. I kept the operator-style `calico-system` example but added the hard-way `kube-system` commands so the post matches its title.
- The post checked `endpoints` directly. I changed the examples to use `endpointslices` with the `kubernetes.io/service-name=calico-typha` label, which matches current Kubernetes service endpoint discovery.
- The post stated policy changes queue for up to 60 seconds and repeatedly used a fixed 60-second recovery window. I changed this to describe the more accurate behavior: updates remain in the datastore and affected Felix clients receive them after reconnecting to Typha; timing depends on pod restart and reconnect behavior.
- The post stated that three Typha replicas mean no propagation delay or zero user impact during any single failure. I changed this to say most clients continue receiving updates while clients connected to the failed Typha reconnect to a healthy replica.
- The log command inspected a deployment without `--all-pods=true` and used the operator namespace. I changed it to inspect all Typha pods in the hard-way `kube-system` namespace and limited output with `--since=10m`.

## Review Notes
The post is technically valid after the corrections. The exact Typha namespace depends on installation method: Calico hard way examples use `kube-system`, while operator-managed installations commonly use `calico-system`.
