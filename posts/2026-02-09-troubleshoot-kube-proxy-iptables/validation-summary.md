# Validation Summary: How to Troubleshoot kube-proxy iptables Rules Not Updating

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Services
- kube-proxy
- EndpointSlice
- iptables
- IPVS
- nftables
- kubectl
- Linux kernel networking modules

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes documentation: EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes documentation: Service, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kube-proxy Configuration API, https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes documentation: kubectl debug, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Local iptables help output from iptables v1.8.10.

## Issues Found
- The post described kube-proxy as watching Services and Endpoints. Kubernetes uses EndpointSlices as the scalable backend endpoint API, and the Endpoints API is deprecated in current Kubernetes releases. Updated the explanation and troubleshooting commands to use EndpointSlices.
- The post said kube-proxy can run in iptables or IPVS mode. Current Linux kube-proxy also supports nftables mode. Updated the proxy mode descriptions and configuration comments while preserving the iptables focus of the guide.
- The service connectivity examples showed direct `curl` commands against ClusterIP and pod IP targets without making the execution location explicit. Updated those examples to run from an in-cluster test pod so the commands match Kubernetes networking behavior.
- The post said kube-proxy only creates rules when Services have valid endpoints. This was too broad because kube-proxy behavior also includes handling Services without ready backends. Updated the wording to say kube-proxy only routes Service traffic to ready backend endpoints.
- The conclusion stated that most issues resolve by restarting kube-proxy. This was overstated. Updated it to say many transient issues resolve that way.

## Review Notes
The remaining commands are valid troubleshooting patterns, but several node-level commands require sufficient privileges and depend on the debug image having the necessary tools installed. The post already uses a netshoot image, which is appropriate for this type of investigation.
