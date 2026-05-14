# Validation Summary: How to Avoid Common Mistakes with Service Load Balancer Addresses with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico IPPool
- Calico LoadBalancer IPAM
- Calico BGPConfiguration
- Calico KubeControllersConfiguration
- Kubernetes Services
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico documentation: Advertise Kubernetes service IP addresses: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: IP pool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam check: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Tigera blog: Calico 3.30 New Open Source Networking and Security Features: https://www.tigera.io/blog/introducing-calico-3-30-a-new-era-of-open-source-network-security-and-observability-for-kubernetes/
- Kubernetes documentation: Service: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: kubectl get: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The prerequisites stated Calico v3.20+, but Calico's current LoadBalancer IPAM documentation and release material place this feature in the Calico 3.30 era. Changed the prerequisite to Calico v3.30+.
- The IPPool example omitted `allowedUses: [LoadBalancer]`. Without that field, Calico IPPool defaults to workload and tunnel use, so it would not be used as a LoadBalancer IP pool. Added `allowedUses`, `assignmentMode: Automatic`, and `disabled: false`, matching the official LoadBalancer IPPool pattern.
- The configuration checks did not include the LoadBalancer kube-controller configuration. Added `kubectl get kubecontrollersconfiguration default -o yaml` because the official docs use that resource to verify the LoadBalancer controller assignment mode.
- The conclusion described the configuration as providing IP addressing for services and workloads. Updated it to Kubernetes LoadBalancer services, which is the scope of Calico LoadBalancer IPAM.
- The architecture diagram referred generically to a Service IP and pod. Updated it to show the IP pool assigning a LoadBalancer IP to the Service, which then routes to backend pods.

## Review Notes
- `calicoctl get ippools -o yaml`, `calicoctl get bgpconfiguration -o yaml`, `kubectl get svc -A`, and `calicoctl ipam check` are valid commands. `calicoctl get` resource names are case-insensitive and may be pluralized.
- Calico kube-controllers manages LoadBalancer address allocation, but LoadBalancer IP advertisement still requires BGP configuration with `serviceLoadBalancerIPs` when the addresses must be reachable outside the cluster.
