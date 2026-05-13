# Validation Summary: How to Install Calico VPP on OpenShift Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico VPP data plane
- OpenShift 4
- Kubernetes manifests
- OpenShift Node Tuning Operator
- Machine Config Operator
- RHEL CoreOS
- `oc` CLI
- `openshift-install`

## Sources Consulted
- Calico documentation: Install an OpenShift 4 cluster with Calico VPP: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico documentation: Get started with VPP networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: Primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: OpenShift system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Red Hat OpenShift documentation: Configuring huge pages: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html-single/postinstallation_configuration/index
- Project Calico VPP OpenShift manifests: https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0/yaml/platforms/openshift

## Issues Found
- The prerequisites described an existing self-managed OpenShift 4.x cluster with Calico already installed. The official Calico OpenShift VPP documentation covers installing an OpenShift 4 cluster with Calico VPP at install time, currently on AWS with OpenShift 4.13 or later, so the prerequisite was corrected.
- The post treated DPDK-compatible NICs and hugepages as universal requirements. Calico VPP can run with the OpenShift `nohuge` manifest and `af_packet`; hugepages and DPDK are optional acceleration-related configuration. The wording was changed to make this distinction.
- The hugepage example used a direct `MachineConfig` with kernel arguments. Red Hat's OpenShift hugepage documentation recommends using the Node Tuning Operator for boot-time hugepage allocation on RHCOS worker nodes, so the example was replaced with a `Tuned` resource.
- The SCC example used the wrong service account name and did not match the official OpenShift VPP manifest flow. The upstream OpenShift manifests create `calico-vpp-node-sa` and use OpenShift-specific namespace/RBAC/DaemonSet resources, so the SCC section was replaced with instructions to add the official OpenShift manifests.
- The install command referenced `yaml/calico-vpp.yaml`, which is not the documented OpenShift manifest path, and changed `CALICOVPP_INTERFACE`, which is not the current configuration key. The commands now download the official OpenShift manifests and update `CALICOVPP_INTERFACES` in `02-configmap-calico-vpp-resources.yaml`.
- The verification commands used `<vpp-manager-pod>`, but the documented VPP components run as containers in the `calico-vpp-node` pod. The commands now target `<calico-vpp-node-pod>` and the `vpp` container.

## Review Notes
The corrected article remains a concise installation guide, but the official Calico OpenShift VPP flow assumes generated OpenShift install manifests and cluster creation with `openshift-install create cluster`. Future improvements could add the preceding OpenShift installer and Calico OpenShift manifest-generation steps for a fully standalone tutorial.
