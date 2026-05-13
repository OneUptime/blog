# Validation Summary: How to Validate Kubernetes Networking for Calico Users in a Lab Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico
- CNI networking
- kubectl
- calicoctl
- Kubernetes NetworkPolicy
- Kubernetes Services and DNS

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico WorkloadEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/

## Issues Found
- The `kubectl run --overrides` examples omitted `apiVersion`. Kubernetes' generated kubectl reference documents override examples with `apiVersion` and notes that the override object must supply a valid API version, so the examples were updated to include `"apiVersion":"v1"`.
- The netshoot test pod used `-- sleep 3600`, which passes arguments rather than setting the container command. The example was changed to `--command -- sleep 3600` so the pod reliably runs the intended long-lived command.
- The `calicoctl node status` section described the command as a cluster-wide Felix health check and incorrectly mentioned a dataplane `Ready` state. The official Calico reference shows this command must be run on the compute host and checks the Calico process and BGP peer state, so the description and expected output were corrected.
- The WorkloadEndpoint expected output said there is one endpoint for every pod in the cluster. Calico WorkloadEndpoint resources represent Calico-networked workload interfaces, so the expectation was narrowed to Calico-networked pods with workload endpoints.
- The IPPool command was normalized from the plural resource spelling to the documented singular `ippool` resource name. Calico accepts pluralized resource types, but the singular form matches the official command reference.

## Review Notes
The examples assume node names such as `worker-1` and `worker-2` exist in the lab cluster and that the test namespace is `default`. ICMP behavior is CNI-dependent under Kubernetes NetworkPolicy, but the policy validation in this post uses `wget` over TCP, which is within the NetworkPolicy API's defined scope.
