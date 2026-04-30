# Validation Summary: How to Manage Harvester from Rancher Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher
- Kubernetes
- KubeVirt
- RKE2
- K3s
- Rancher Monitoring / Prometheus / Grafana
- Rancher RBAC

## Sources Consulted
- Harvester Virtualization Management: https://docs.harvesterhci.io/v1.7/rancher/virtualization-management/
- Harvester UI Extension: https://docs.harvesterhci.io/v1.7/rancher/harvester-ui-extension/
- Rancher Harvester Overview: https://ranchermanager.docs.rancher.com/v2.12/integrations-in-rancher/harvester/overview
- Harvester VM Network: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester Host Management: https://docs.harvesterhci.io/v1.7/host
- Harvester Monitoring: https://docs.harvesterhci.io/v1.6/monitoring/harvester-monitoring/
- Harvester Add-ons: https://docs.harvesterhci.io/v1.5/advanced/addons
- Harvester Cloud Provider: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester CSI Driver: https://docs.harvesterhci.io/v1.7/rancher/csi-driver/
- Harvester Upload Images: https://docs.harvesterhci.io/v1.7/image/upload-image/
- Harvester Rancher RBAC: https://docs.harvesterhci.io/v1.8/rancher/rancher-rbac/
- KubeVirt user guide, VirtualMachineInstances: https://kubevirt.io/user-guide/user_workloads/virtual_machine_instances/
- KubeVirt user guide, Guest Agent information: https://kubevirt.io/user-guide/user_workloads/guest_agent_information/
- Kubernetes `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/

## Issues Found
- The Rancher navigation path was inaccurate. The post originally described selecting the Harvester cluster from the cluster selector or from Cluster Management as the default flow. I changed it to the documented Virtualization Management flow and added the Harvester UI Extension prerequisite for Rancher 2.10+.
- The Cluster Management fallback path was presented as unconditional. I corrected it to note that Harvester clusters appear there only when the Harvester feature flag is disabled.
- The "View All VMs" CLI example used `virtualmachineinstances`, which only represents running VM instances and would not show stopped VMs. I replaced it with `kubectl get vm -A` for all VMs and kept `kubectl get vmi -A -o wide` as the runtime view for running instances and node placement.
- The VM metrics section implied metrics are always present. I added the required condition that the `rancher-monitoring` add-on must be enabled.
- The image watch command was adjusted to the documented Harvester resource alias `vmimages`.
- The image lifecycle list included an undocumented `Copy URL` action. I trimmed the list to the documented image-management actions.
- The volume creation steps were incomplete because Harvester requires selecting a source. I added `source` to the list of required fields.
- The VM networks section incorrectly described the screen as listing NetworkAttachmentDefinitions with VLAN IDs. I corrected it to refer to Harvester VM networks and clarified that VLAN IDs apply to VLAN networks.
- The node status navigation was tightened to the documented Harvester `Hosts` view instead of mixing it with Rancher’s generic Kubernetes node navigation.
- The downstream cluster provisioning section conflated the Harvester node driver with the Harvester cloud provider and overstated automation. I corrected the flow to distinguish node driver selection from cloud provider selection, added the cloud image and VLAN network requirements, and clarified that automatic CSI/CCM deployment applies to RKE2 with the Harvester cloud provider.
- The K3s guidance was too broad. I added the version-specific caveat that Harvester cloud provider integration for K3s requires additional manual steps and is documented as experimental.
- The monitoring section was outdated. I replaced the generic Rancher Apps/Charts and Helm installation workflow with the supported `rancher-monitoring` add-on flow from the Harvester UI, plus the documented `kubectl edit addons.harvesterhci.io` command for configuration.
- The RBAC section contained an unsupported and misleading custom `GlobalRole` YAML example. I replaced it with the documented Rancher/Harvester RBAC model, including the built-in virtualization role templates and the note that the Harvester Rancher RBAC integration is experimental in Rancher 2.14.1+.

## Review Notes
- The post is now technically correct for current Rancher/Harvester guidance, but several behaviors are version-sensitive.
- Rancher 2.10 and later rely on the Harvester UI Extension for in-dashboard Harvester management.
- Harvester Rancher RBAC integration is experimental in Rancher 2.14.1 and later, and the UI may still expose controls that read-only users cannot execute.
- Large image uploads through the Rancher multi-cluster UI can still be affected by ingress buffering or body-size limits; Harvester documents that as a known operational caveat.
