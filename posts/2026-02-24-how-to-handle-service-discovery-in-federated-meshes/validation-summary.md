# Validation Summary: How to Handle Service Discovery in Federated Meshes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy xDS
- CoreDNS
- Multi-cluster service discovery
- Istio ServiceEntry and DestinationRule resources

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio multicluster installation and remote secrets: https://istio.io/latest/docs/setup/install/multicluster/
- Istio deployment models and endpoint discovery: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio multicluster troubleshooting: https://istio.io/latest/docs/ops/diagnostic-tools/multicluster/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- CoreDNS forward plugin reference: https://coredns.io/plugins/forward/
- CoreDNS Kubernetes plugin and stub domain reference: https://coredns.io/plugins/kubernetes/
- Kubernetes CoreDNS customization documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers
- AKS CoreDNS custom ConfigMap documentation: https://learn.microsoft.com/en-us/azure/aks/coredns-custom

## Issues Found
- The Istio custom resources used `networking.istio.io/v1beta1`. Updated ServiceEntry and DestinationRule snippets to `networking.istio.io/v1`, which is the current API version shown in the Istio 1.30 networking references.
- The remote-secret section said every remote service becomes visible. Adjusted the wording to match Istio's namespace sameness and endpoint discovery model: matching services are merged into the shared mesh view for cross-cluster load balancing.
- The CoreDNS example forwarded DNS queries to an east-west gateway. Istio east-west gateways are not DNS servers by default, so the example now forwards to a remote DNS server that can resolve the remote zone.
- The CoreDNS ConfigMap wording implied one universal Kubernetes ConfigMap shape. Added a caveat that distributions differ between custom CoreDNS ConfigMaps and direct `Corefile` edits.
- The namespace aliasing ServiceEntry used a `.svc.cluster.local` hostname for a synthetic remote alias. Changed it to a `.global` hostname to avoid implying that Kubernetes DNS would automatically contain that aliased Service.
- The monitoring section referenced `pilot_k8s_endpoints_total`, which is not in the current Istio metric reference. Replaced it with current istiod metrics relevant to service discovery and remote-cluster synchronization.

## Review Notes
The examples are still illustrative and assume the surrounding multicluster prerequisites are already configured, including shared trust, reachable remote APIs or DNS, and appropriate east-west connectivity where networks differ.
