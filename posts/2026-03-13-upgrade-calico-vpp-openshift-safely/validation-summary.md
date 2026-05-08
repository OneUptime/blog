# Validation Summary: How to Upgrade Calico VPP on OpenShift Safely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Calico VPP dataplane
- OpenShift
- Kubernetes
- OpenShift Machine Config Operator
- Tigera Operator
- `oc` CLI

## Sources Consulted
- Calico OpenShift upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/openshift-upgrade
- Calico VPP on OpenShift documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- OpenShift Machine Config Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/machine_configuration/index
- Project Calico GitHub manifests for Calico v3.32.0: https://github.com/projectcalico/calico/tree/v3.32.0/manifests
- Project Calico VPP dataplane manifests for v3.31.0: https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0/yaml/platforms/openshift

## Issues Found
- The Step 1 command referenced `vpp-dataplane/CHANGELOG.md`, but that file is not present in the checked VPP dataplane release tree. Changed the command to retrieve the VPP dataplane release metadata from the official GitHub release API.
- The Step 4 OpenShift Tigera Operator URL returned 404 because `manifests/ocp/tigera-operator.yaml` is not a valid raw manifest path. Updated it to the official OpenShift upgrade manifest path and added the documented `--server-side --force-conflicts` apply flags.
- The Step 5 VPP manifest path `yaml/calico-vpp.yaml` does not exist in the VPP dataplane repository. Updated the commands to apply the OpenShift-specific VPP dataplane manifests from `yaml/platforms/openshift`.
- The Step 6 `oc exec` examples targeted a placeholder `vpp-manager-pod`, but VPP runs in the `vpp` container of the `calico-vpp-node` DaemonSet pods. Updated the verification commands to select a `calico-vpp-node` pod and exec into the `vpp` container.

## Review Notes
The OpenShift MCO explanation is consistent with Red Hat documentation: most MachineConfig changes are applied by draining affected nodes, applying the update, and rebooting, with some documented exceptions and node disruption policy options. The VPP dataplane versions in current Calico documentation are not lockstep with the Calico control-plane version, so future updates should re-check the Calico and VPP release versions together before publishing.
