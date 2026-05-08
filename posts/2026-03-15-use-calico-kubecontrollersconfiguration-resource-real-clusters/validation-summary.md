# Validation Summary: How to Use the Calico KubeControllersConfiguration Resource in Real Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico KubeControllersConfiguration
- Calico kube-controllers
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Kubernetes deployments and kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Kubernetes controllers configuration resource: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico kube-controllers configuration: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico kube-controllers Prometheus metrics: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico automatic host endpoints for Kubernetes nodes: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico HostEndpoint resource: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico GlobalNetworkPolicy resource: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico Installation API resource customization: https://docs.tigera.io/calico/latest/reference/installation/api
- Project Calico kube-controllers health check source and manifests: https://github.com/projectcalico/calico

## Issues Found
- The KubeControllersConfiguration examples omitted the current `loadBalancer` controller, which is enabled by default for Calico LoadBalancer IPAM. Added `loadBalancer.assignIPs: AllServices` to the examples and clarified that it should remain enabled when Calico LoadBalancer IPAM is in use.
- The security-focused section described automatic host endpoints as immediately enforcing deny-by-default behavior. Current Calico automatic host endpoints include the `projectcalico-default-allow` profile in the absence of matching policy, so the text now explains that restrictive GlobalNetworkPolicy rules change the enforcement behavior.
- The health-check command used `http://localhost:9094/readiness`, but port 9094 is the Prometheus metrics port. Replaced it with the current kube-controllers health command used by Calico manifests.
- The resource-limit patch directly edited the operator-managed Deployment. Updated it to patch the `Installation` resource using `spec.calicoKubeControllersDeployment`, which is the documented operator API for kube-controllers resource customization.
- The failover section claimed kube-controllers should run as a single replica with leader election and that standby pods remain idle. Current Calico manifests indicate a single active instance, and the source/manifests did not show leader election for kube-controllers. Updated the section to recommend relying on Kubernetes restart/rescheduling of the single replica.

## Review Notes
The post assumes an operator-style namespace of `calico-system`. Manifest-based installations commonly use `kube-system`, so readers may need to adjust namespace arguments for non-operator installs.
