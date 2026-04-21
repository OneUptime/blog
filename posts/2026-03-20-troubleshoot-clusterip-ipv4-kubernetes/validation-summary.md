# Validation Summary: How to Troubleshoot ClusterIP Service IPv4 Connectivity in Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Services and ClusterIP
- EndpointSlices
- kube-proxy
- iptables, IPVS, and nftables service proxy modes
- Kubernetes DNS and CoreDNS
- Kubernetes NetworkPolicy
- kubectl CLI
- BusyBox/Alpine debug utilities

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Virtual IPs and Service Proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl rollout restart reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Local BusyBox 1.36.1 command help for `wget` and `nslookup`.

## Issues Found
- The post used the legacy `Endpoints` API as the primary backend check. Kubernetes v1.33 marks `Endpoints` as deprecated and recommends `EndpointSlice`, so the check was changed to `kubectl get endpointslices -n my-namespace -l kubernetes.io/service-name=my-service`.
- The introduction said ClusterIP failures produce only silent timeouts. That was too absolute because application or port mismatches can return connection refused, so the wording now allows both timeout and refused-connection failure modes.
- The debug pod commands were not scoped to the example namespace. They now use `-n my-namespace` for `kubectl run` and `kubectl exec` so the test matches the namespace used by the Service examples.
- The Alpine debug `wget` examples now use BusyBox's documented `-T 5` timeout flag instead of the less portable long option.
- The iptables inspection step implied all kube-proxy clusters expose iptables rules. Kubernetes supports multiple service proxy modes, including iptables, IPVS, nftables, and Windows kernelspace, so the step now states that the command applies to iptables mode only.
- The connection-refused table entry pointed readers to `containerPort`. The relevant Service routing field is `targetPort`, and the application must actually listen there, so the fix now says to check `targetPort` and the app listener.
- The quick reset section said restarting kube-proxy fixes corrupted rules. This was changed to say it forces a resync, which is accurate without implying it fixes every underlying cause.
- The final sentence made an unsupported "over 80%" effectiveness claim and referenced deprecated `kubectl get endpoints`. It now uses `kubectl get endpointslices` and avoids the unverifiable percentage.

## Review Notes
The examples assume the common `cluster.local` DNS suffix, CoreDNS deployment, and a kube-proxy-based cluster. Some modern clusters use alternative service proxy implementations or custom DNS settings, so those environments may require provider-specific checks.
