# Validation Summary: How to Configure Calico on Windows Nodes with Rancher for a New Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes Windows nodes
- Calico CNI
- Tigera Operator
- Calico IPPool, Installation, FelixConfiguration, IPAMConfiguration, and TigeraStatus resources
- kubectl
- calicoctl

## Sources Consulted
- Rancher documentation: Launching Kubernetes on Windows Clusters - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher documentation: RKE2 Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- RKE2 documentation: Network Options - https://docs.rke2.io/networking/basic_network_options
- RKE2 documentation: Requirements - https://docs.rke2.io/install/requirements
- Calico documentation: Windows Calico requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Create multiple IP pools - https://docs.tigera.io/calico/latest/networking/ipam/ippools
- Calico documentation: calicoctl patch - https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/

## Issues Found
- The post used `calicoctl patch ippool ... {"spec":{"encapsulation":"VXLAN"}}`, but `encapsulation` is an operator `Installation` IP pool field, not a direct `projectcalico.org/v3` `IPPool` field. Updated the command to patch `installation default` through `kubectl`, matching Tigera Operator-managed pools.
- The post did not include Calico IPAM strict affinity, which Calico documents as required when using Calico IPAM with Windows. Added the `kubectl patch ipamconfigurations default` command.
- The Windows-specific IP pool overlapped the default `192.168.0.0/16` pool. Updated the example to split the pod CIDR into separate Linux and Windows pools under the operator-managed `Installation` resource.
- The Windows pool example mixed direct IPPool syntax with operator syntax. Replaced it with an `Installation` patch using `encapsulation: VXLAN` and `natOutgoing: Enabled`, which are valid operator fields.
- The conclusion and introduction said ongoing configuration was managed through `calicoctl`. Adjusted the wording to refer to Calico CRDs because the corrected pool configuration uses `kubectl` against operator-managed resources.
- The test pod used `mcr.microsoft.com/windows/nanoserver:1809`, which is tied to Windows Server 2019-era base images. Updated it to `ltsc2022` to align with current Kubernetes Windows support guidance; users still need to match the image tag to their Windows node OS version.

## Review Notes
The corrected pool-splitting example is best applied before production workloads are scheduled, because changing Calico IP pools after workloads have already received addresses can require an IP pool migration plan. The post remains technically relevant and was validated after the corrections above.
