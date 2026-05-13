# Validation Summary: How to Install Calico on Rancher Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Calico
- Kubernetes NetworkPolicy
- Calico NetworkPolicy CRDs
- calicoctl
- Prometheus Operator ServiceMonitor
- Rancher Monitoring

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Calico install calicoctl documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico component metrics monitoring documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Prometheus Operator ServiceMonitor documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The post described installing Calico separately on imported clusters through Rancher. Rancher does not install a CNI into imported clusters; Calico must already be present or installed outside Rancher before managing Calico-specific policy resources. Updated the wording to clarify this.
- The prerequisite installed `calicoctl` from the latest GitHub release. Calico documentation recommends using a `calicoctl` version that matches the cluster's Calico version. Updated the command to use an explicit version variable.
- The RKE2 cluster configuration included `disable-network-policy: false`, but this is not a documented RKE2 server configuration option. Removed the UI instruction and API field, leaving the documented `cni: calico` setting.
- The Rancher UI policy statement implied that the UI could apply the shown Calico `projectcalico.org/v3` policy. Rancher's Network Policies UI is for Kubernetes NetworkPolicy management. Clarified that Calico-specific resources should be applied with calicoctl or kubectl.
- The DNS egress rule allowed only UDP port 53. DNS can also use TCP, so a TCP port 53 rule was added.
- The ServiceMonitor example selected Calico pod labels directly and referenced a non-existent `metrics-port` service port. Prometheus Operator ServiceMonitor resources select Services, and Calico Felix metrics are disabled by default. Added the FelixConfiguration patch, a headless Service exposing Felix metrics on port 9091, and a ServiceMonitor that selects that Service by label and uses the named service port.

## Review Notes
- The Rancher API example is still a minimal cluster spec fragment focused on the Calico CNI setting. A complete automated cluster creation request must include provider-specific machine pool and node configuration for the target infrastructure.
