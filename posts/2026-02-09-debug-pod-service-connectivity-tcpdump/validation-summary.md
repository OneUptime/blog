# Validation Summary: How to Debug Pod-to-Service Connectivity Failures with tcpdump and nslookup

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes Services
- Kubernetes DNS and CoreDNS
- Kubernetes EndpointSlices
- Kubernetes NetworkPolicy
- kubectl debug and ephemeral containers
- kube-proxy
- tcpdump
- nslookup, dig, nc, curl
- iptables, IPVS, conntrack

## Sources Consulted
- Kubernetes documentation: Debug Services, https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes documentation: Debugging DNS Resolution, https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes documentation: DNS for Services and Pods, https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Service, including EndpointSlices and deprecated Endpoints API, https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices, https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes documentation: kubectl debug reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Ephemeral Containers, https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Virtual IPs and Service Proxies, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Local command help: tcpdump 4.99.4 `tcpdump --help`
- Local command help: OpenBSD netcat 1.226 `nc -h`

## Issues Found
- The post used the legacy `Endpoints` resource for endpoint checks. Kubernetes documentation now recommends EndpointSlices, and the Endpoints API is deprecated as of Kubernetes v1.33. Updated the endpoint checks and troubleshooting script to use `kubectl get endpointslice -l kubernetes.io/service-name=...`.
- The DNS SRV lookup queried the service FQDN directly. Kubernetes creates SRV records only for named service ports, using `_port-name._protocol.service.namespace.svc.cluster-domain`. Updated the example to use `_http._tcp.my-service.production.svc.cluster.local`.
- The debug pod and ephemeral container examples did not account for tcpdump capabilities. Added `NET_ADMIN` and `NET_RAW` to the debug pod example and `--profile=netadmin --target=container-name` to the `kubectl debug` example.
- The CoreDNS connectivity check only tested TCP port 53. Added a UDP `nc` example as well, while keeping `dig` as the primary DNS test.
- The pod veth capture example depended on Docker-specific runtime inspection and is not generally correct for current Kubernetes clusters that commonly use containerd or CRI-O. Replaced it with an ephemeral-container tcpdump example inside the target pod network namespace.
- The service traffic capture example reused `$SERVICE_IP` on the node without showing how to define it there. Added the `kubectl get svc ... jsonpath` assignment in the node-shell example.
- Temporary `kubectl run` test pod examples omitted `--restart=Never`. Added it to the interactive namespace test and troubleshooting script commands.

## Review Notes
- `kubectl` is not installed in the local review environment, so kubectl behavior was checked against official Kubernetes documentation rather than local `kubectl --help`.
- The article still uses example cluster IPs such as `10.96.0.10` and `cluster.local`; the post now notes that these values vary by cluster.
- IPVS inspection remains technically valid for clusters still using IPVS mode, but Kubernetes documentation now marks IPVS proxy mode deprecated in newer versions and recommends nftables as its replacement where supported.
