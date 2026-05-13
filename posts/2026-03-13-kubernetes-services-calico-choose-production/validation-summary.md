# Validation Summary: How to Choose Kubernetes Services with Calico for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Calico eBPF data plane
- kube-proxy
- Direct Server Return (DSR)
- Service types: ClusterIP, NodePort, LoadBalancer, Headless
- externalTrafficPolicy
- sessionAffinity
- Service CIDR allocation

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: About Calico eBPF - https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Kubernetes documentation: Service - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes documentation: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes documentation: kubeadm configuration v1beta4 - https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes documentation: Extend Service IP Ranges - https://kubernetes.io/docs/tasks/network/extend-service-ip-ranges/
- Kubernetes documentation: Service ClusterIP allocation - https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/

## Issues Found
- The post stated that Calico eBPF requires Linux kernel 5.3+ and 5.8+ for DSR. Current Calico documentation lists supported generic distributions with Linux kernel 5.10+ and notes RHEL 8.4's 4.18 kernel as a supported vendor-backport exception. DSR depends on compatible underlying network fabric rather than a separate 5.8+ requirement. Updated the prerequisite and decision table.
- The post used fixed 50-service and 100-service thresholds for choosing Calico eBPF. Official Calico documentation discusses large clusters and significant service churn but does not define those numeric thresholds. Replaced them with scale/churn-based wording.
- The post said Calico eBPF with DSR preserves client source IP for all service types. This was too broad; source IP preservation applies to external service traffic when the load balancer and network path forward the original packets. Updated the wording.
- The post stated that the service CIDR cannot be changed without cluster recreation. Kubernetes now documents ServiceCIDR expansion for clusters using the MultiCIDRServiceAllocator feature, while service range changes remain distribution-specific. Updated the wording to reflect this nuance.

## Review Notes
The Kubernetes Service `sessionAffinity: ClientIP` snippet uses valid ServiceSpec fields, and the `timeoutSeconds` value is within the documented valid range. The headless Service `clusterIP: None`, `externalTrafficPolicy: Cluster` and `Local`, and kubeadm default service subnet statements are consistent with official Kubernetes documentation.
