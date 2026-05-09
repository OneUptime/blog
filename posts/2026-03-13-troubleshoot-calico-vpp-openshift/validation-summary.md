# Validation Summary: How to Troubleshoot Installation Issues with Calico VPP on OpenShift

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico VPP data plane
- OpenShift 4
- Kubernetes
- OpenShift CLI (`oc`)
- Machine Config Operator and MachineConfigPool
- Red Hat Enterprise Linux CoreOS
- OpenShift Security Context Constraints
- Linux hugepages

## Sources Consulted
- Calico documentation: Install an OpenShift 4 cluster with Calico VPP, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico documentation: Get started with VPP networking, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP OpenShift manifests, https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0/yaml/platforms/openshift
- Red Hat OpenShift documentation: Machine configuration, https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/machine_configuration/index
- Red Hat OpenShift documentation: Diagnosing OpenShift CLI issues, https://docs.openshift.com/container-platform/4.18/support/troubleshooting/diagnosing-oc-issues.html
- Red Hat OpenShift documentation: Huge pages, https://docs.redhat.com/documentation/en-us/openshift_container_platform/4.13/html-single/scalability_and_performance/index

## Issues Found
- The post referred to a `vpp-manager` pod placeholder, but the OpenShift VPP manifest creates `calico-vpp-node` pods. Updated pod placeholders to `<calico-vpp-node-pod>` and logged the `vpp` container explicitly.
- The post stated that VPP fails if hugepages are not configured. Calico provides no-hugepages manifests, while specific drivers such as DPDK and other hugepage-enabled modes require hugepages. Qualified the claim accordingly.
- The post checked for a hard-coded `99-worker-hugepages` MachineConfig. That name is environment-specific and not guaranteed. Replaced it with a broader MachineConfig lookup.
- The SCC command targeted service account `calico-vpp-node`, but the OpenShift manifest uses `calico-vpp-node-sa`. Updated the command.
- The post read `/var/log/vpp/vpp.log` from the node, but the OpenShift manifest runs VPP in the `vpp` container and does not guarantee that host log path. Updated the step to use `oc logs` for the VPP container.
- The post used `CALICOVPP_INTERFACE`, but the current Calico VPP ConfigMap uses `CALICOVPP_INTERFACES` with an `uplinkInterfaces` list. Updated the explanation and patch command.

## Review Notes
The post is now technically aligned with the current Calico OpenShift VPP manifest structure and OpenShift MCO/SCC troubleshooting workflow. In a future revision, the post could mention that Calico's OpenShift VPP support is currently documented for AWS with OpenShift 4.13 or later, but that was not added because the post is focused on troubleshooting an attempted installation rather than installation prerequisites.
