# Validation Summary: How to Create a Custom Kubernetes Cluster in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- K3s
- `kubectl`
- containerd
- CNI plugins (Canal, Calico, Cilium)
- Storage classes

## Sources Consulted
- Rancher: Launching Kubernetes on Existing Custom Nodes - https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/use-existing-nodes
- Rancher: RKE2 Cluster Configuration Reference - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher: Recommended Cluster Architecture - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/checklist-for-production-ready-clusters/recommended-cluster-architecture
- Rancher: Enable Monitoring - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher: Support Matrix - https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/rancher-v2-14-1/
- RKE2: Requirements - https://docs.rke2.io/install/requirements
- RKE2: Private Registry Configuration - https://docs.rke2.io/install/private_registry
- RKE2: Managing Packaged Components - https://docs.rke2.io/install/packaged_components
- K3s: Volumes and Storage - https://docs.k3s.io/add-ons/storage
- Rancher system-agent install script - https://github.com/rancher/system-agent/blob/main/install.sh

## Issues Found
- The prerequisites hard-coded Linux versions and required a preinstalled container runtime. I replaced that with guidance to use currently validated OS versions from the Rancher support matrix and noted that Rancher-provisioned RKE2 and K3s manage `containerd`, so Docker does not need to be preinstalled.
- The networking prerequisites listed only a subset of required ports. I updated this to include Rancher connectivity on `443/TCP` and to call out distribution- and CNI-specific ports documented for RKE2, including the supervisor and overlay-network ports.
- The prerequisites said SSH access was required. I changed this to shell or console access because Rancher only requires you to run the registration command on the node, not specifically over SSH.
- The private registry example was presented as a generic advanced-option snippet. I clarified that it is a minimal `registries.yaml` mirror example for RKE2 or K3s and normalized the YAML to match the documented format.
- The provisioning section implied a fixed `Provisioning` to `Active` state transition. I changed it to instruct readers to watch until the cluster becomes `Active`, which avoids baking in a version-specific intermediate state.
- The monitoring instructions used an imprecise UI path. I updated them to the current Rancher flow of installing Monitoring from **Cluster Tools**.
- The storage section used a `rancher.io/local-path` storage class as if it were generic. I replaced it with distribution-specific guidance because K3s includes `local-path` by default, while RKE2 typically requires a CSI driver or storage platform such as Longhorn before setting a default storage class.

## Review Notes
- The post is technically sound after the corrections above.
- Supported OS versions and some UI paths vary by Rancher release. As of 2026-05-07, the current Rancher support matrix validates Rancher-provisioned RKE2 and K3s primarily on Ubuntu 22.04 and 24.04, so hard-coded older OS examples would age poorly.
- Authorized Cluster Endpoint behavior is documented differently across Rancher versions and pages. The post's guidance to enable it is reasonable, but readers should verify the default behavior in the specific Rancher release they deploy.
