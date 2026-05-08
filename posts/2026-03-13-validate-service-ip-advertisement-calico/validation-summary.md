# Validation Summary: How to Validate Service IP Advertisement with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes Services
- Kubernetes EndpointSlices
- BGP
- kube-proxy
- Calico eBPF dataplane
- Linux routing and iptables

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses - https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: BGP configuration resource - https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Troubleshoot eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: Services - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes blog: Kubernetes v1.33 continuing the transition from Endpoints to EndpointSlices - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The BIRD route inspection commands did not specify the `calico-node` container. `kubectl exec` may default correctly, but official `kubectl exec` supports explicit container selection and Calico node pods commonly include init containers. Updated the commands to pass `-c calico-node`.
- The external reachability section mixed external-host testing with `kubectl get svc`, which normally requires Kubernetes API access. Split the flow into getting the service IP from a workstation with cluster access, then running route and curl checks from the external host.
- The LoadBalancer validation section had the same cluster-access ambiguity. Split it into retrieving the LoadBalancer IP from a workstation with cluster access and testing it from the external host.
- The endpoint check used `kubectl get endpoints`, but the Kubernetes Endpoints API is deprecated as of Kubernetes v1.33 and EndpointSlices are the stable source for service backends. Replaced it with `kubectl get endpointslice -l kubernetes.io/service-name=my-service`.
- The eBPF inspection command used `calico-bpf -d service list`, which does not match current Calico troubleshooting documentation. Replaced it with the documented `calico-node -bpf nat dump` command filtered by service IP.

## Review Notes
The core explanation is technically sound: Calico can advertise Kubernetes service IPs over BGP, and end-to-end validation needs both BGP control-plane checks and service dataplane checks. The examples assume the service CIDR includes `10.96`, which is common but cluster-specific; a future improvement would be to show how to derive the actual service CIDR from the cluster configuration.
