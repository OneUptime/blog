# Validation Summary: How to Configure Calico on OpenShift for a New Cluster

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- OpenShift
- Kubernetes
- Tigera Operator
- Calico IPPool
- Calico FelixConfiguration
- Calico GlobalNetworkPolicy
- Prometheus metrics

## Sources Consulted
- Calico documentation: Configure default IP pools - https://docs.tigera.io/calico-cloud/networking/ipam/initial-ippool
- Calico documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico documentation: Migrate from one IP pool to another - https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Global network policy - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Calico automatic labels - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- OpenShift documentation: Cluster Network Operator configuration and cluster network fields - https://docs.openshift.com/container-platform/4.7/installing/installing_aws/installing-aws-government-region.html
- OpenShift documentation: Configuring ingress cluster traffic - https://docs.openshift.com/container-platform/4.15/networking/configuring_ingress_cluster_traffic/configuring-ingress-cluster-patch-fields.html

## Issues Found
- The post instructed readers to patch `spec.cidr` on the existing `default-ipv4-ippool`. Calico IP pool CIDR selection should be done through the operator `Installation` resource for new clusters, and running clusters should migrate to a replacement IP pool instead of patching the existing pool CIDR. Updated the command and added a migration caveat.
- The post stated that "OpenShift uses iptables by default." This is imprecise because the relevant setting is Calico's standard Linux dataplane, not OpenShift's default CNI implementation. Reworded the explanation to tie the Felix configuration to Calico's dataplane and eBPF choice.
- The post stated "Routes (not Ingress)" for OpenShift external access. OpenShift supports Routes and also has an Ingress Controller implementation. Reworded this to say Routes are commonly used and implemented by the cluster Ingress Controller.
- The post referenced `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-prometheus.yaml`, which returned 404. Replaced it with the official Calico service manifest pattern for exposing Felix metrics on port 9091.

## Review Notes
The Calico GlobalNetworkPolicy syntax, `projectcalico.org/name` namespace selector usage, Felix Prometheus fields, and `oc get tigerastatus` validation command match official documentation. The example IP pool CIDR remains an example and should be adjusted to the actual OpenShift `spec.clusterNetwork` value for a real cluster.
