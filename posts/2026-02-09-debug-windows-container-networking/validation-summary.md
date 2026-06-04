# Validation Summary: How to Debug Windows Container Networking Issues in Kubernetes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- Windows containers
- Windows container networking
- Host Networking Service (HNS)
- CNI plugins
- Flannel
- Calico
- kube-proxy
- CoreDNS / Kubernetes DNS
- PowerShell networking cmdlets
- CRI runtimes such as containerd

## Sources Consulted
- Kubernetes: Networking on Windows: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes: Windows containers in Kubernetes: https://kubernetes.io/docs/setup/windows/intro-windows-in-kubernetes/
- Kubernetes: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Services and EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: Dockershim removal and CRI runtimes: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/check-if-dockershim-removal-affects-you/
- Kubernetes: Debugging Kubernetes nodes with crictl: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Microsoft Learn: Windows container networking architecture: https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/architecture
- Microsoft Learn: Windows container network drivers and topologies: https://learn.microsoft.com/en-us/virtualization/windowscontainers/container-networking/network-drivers-topologies
- Microsoft Learn: HostNetworkingService PowerShell module: https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/
- Microsoft Learn: Test-NetConnection: https://learn.microsoft.com/powershell/module/nettcpip/test-netconnection
- Microsoft Learn: DnsClient module: https://learn.microsoft.com/powershell/module/dnsclient/
- Microsoft Learn: NetTCPIP module: https://learn.microsoft.com/powershell/module/nettcpip/
- Calico documentation: Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico documentation: Windows requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements

## Issues Found
- The metadata tag used "Window" instead of "Windows"; corrected the tag.
- The Windows networking mode summary was too imprecise for Kubernetes CNI usage; clarified win-overlay, Flannel VXLAN, Calico VXLAN, win-bridge, Flannel host-gateway, and Azure CNI examples.
- The DNS connectivity command hard-coded `10.96.0.10`, which is not guaranteed to be the cluster DNS service IP; changed it to use the service IP returned by `kubectl get svc -n kube-system kube-dns`.
- The DNS interface example assumed a fixed Windows interface alias; added `Get-NetAdapter` and changed the DNS command to use the discovered interface name.
- The HNS endpoint lookup used `docker ps`, which is outdated for modern Kubernetes clusters because Kubernetes removed dockershim in v1.24; replaced it with `crictl ps` for CRI runtimes such as containerd.
- The Calico Windows service check assumed exact service names; changed it to enumerate Calico services by name or display name.
- The service backend checks used the deprecated Endpoints API; replaced them with EndpointSlice queries.
- The kube-proxy HNS load balancer example used `Get-HnsLoadBalancer`, which is not listed in the current Microsoft HostNetworkingService module documentation; replaced it with `Get-HnsPolicyList`.
- The image-pull troubleshooting section used Docker network commands; replaced them with CRI runtime checks using `crictl info` and `crictl images`.

## Review Notes
The guide remains version-sensitive because Windows networking behavior depends on the Windows Server build, Kubernetes version, container runtime, and CNI plugin. Some paths and service names can still vary by installation method, but the updated examples avoid the main deprecated or overly environment-specific assumptions.
