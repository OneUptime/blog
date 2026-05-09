# Validation Summary: How to Troubleshoot Calico on OpenShift Upgrades

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Calico Enterprise
- Tigera Operator
- OpenShift Container Platform
- Kubernetes
- OpenShift Security Context Constraints
- OpenShift Cluster Network Operator
- OpenShift MachineConfigPool
- Operator Lifecycle Manager

## Sources Consulted
- Calico Open Source documentation: Install an OpenShift 4 cluster with Calico - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico Open Source documentation: OpenShift system requirements - https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Calico Enterprise documentation: Install Calico Enterprise on OpenShift - https://docs.tigera.io/calico-enterprise/latest/getting-started/install-on-clusters/openshift/installation
- Calico Enterprise documentation: Upgrade Calico Enterprise installed with OpenShift - https://docs.tigera.io/calico-enterprise/latest/getting-started/upgrading/upgrading-enterprise/openshift-upgrade
- Calico Enterprise documentation: TigeraStatus - https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Red Hat OpenShift documentation: Cluster Network Operator - https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/networking/cluster-network-operator
- Red Hat OpenShift documentation: Machine configuration and MachineConfigPool status - https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/machine_configuration/index
- Red Hat OpenShift documentation: Operator Lifecycle Manager resources and subscriptions - https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/operators/operators
- Red Hat OpenShift CLI documentation: `oc adm policy add-scc-to-user` examples - https://docs.redhat.com/en-us/documentation/openshift_container_platform/4.9/pdf/cli_tools/OpenShift_Container_Platform-4.9-CLI_tools-en-US.pdf
- Tigera Operator source: OpenShift SCC RBAC for calico-node - https://github.com/tigera/operator/blob/v1.41.1/pkg/render/node.go

## Issues Found
- The SCC troubleshooting commands referenced an SCC named `calico-node`. Tigera Operator grants `calico-node` permission to use OpenShift's built-in `privileged` SCC, so the commands were changed to inspect and grant `privileged`.
- The network operator check said OpenShift might have tried to change the CNI after upgrade. OpenShift's Cluster Network Operator stores the selected network configuration in the `network.operator.openshift.io/cluster` resource and key fields are inherited during installation, so the wording was changed to verify the configured default network instead.
- The OLM troubleshooting commands used the `calico-system` namespace for CSVs, subscriptions, and operator groups. Tigera's OpenShift OLM integration uses the `tigera-operator` namespace, so those commands were corrected.

## Review Notes
The post is technically relevant and command-focused. The remaining commands are general troubleshooting commands and may still need small namespace or resource-name adjustments on highly customized installations, but they align with the documented Tigera/OpenShift defaults.
