# Validation Summary: How to Configure Calico VPP on OpenShift for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico Open Source
- Calico VPP dataplane
- OpenShift Container Platform
- Kubernetes
- Calico IPPool, GlobalNetworkPolicy, and FelixConfiguration resources
- OpenShift Machine Config Operator
- Linux hugepages
- VPP uplink interface configuration

## Sources Consulted
- Calico documentation: Install an OpenShift 4 cluster with Calico VPP: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico documentation: Get started with VPP networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: Primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: Details of VPP implementation and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/specifics
- Calico documentation: IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico documentation: FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico VPP OpenShift ConfigMap manifest: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-configmap-calico-vpp-resources.yaml
- Project Calico IPPool CRD schema: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/crds.yaml
- Red Hat OpenShift documentation: Machine configuration with kernel arguments: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/pdf/machine_configuration/OpenShift_Container_Platform-4.18-Machine_configuration-en-US.pdf
- Red Hat OpenShift documentation: CIDR range definitions: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/networking/cidr-range-definitions
- Red Hat OpenShift documentation: Huge pages configuration: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html-single/scalability_and_performance/index

## Issues Found
- The IPPool patch used `spec.encapsulation`, which is not an IPPool field. Calico IPPool resources use `vxlanMode` or `ipipMode`; `encapsulation` is used in the Tigera operator Installation API. I changed the patch to use `vxlanMode: Always` and explicitly set `ipipMode: Never`, because Calico does not allow IPIP and VXLAN to both be enabled on one pool.
- The IPPool patch attempted to change `spec.cidr`. The current Calico CRD marks IPPool `cidr` as immutable, so changing it in place can fail and should be handled during initial pool creation or through pool migration. I removed `cidr` from the patch and added a short note that the OpenShift pod CIDR must be set before the pool is created.
- The VPP ConfigMap patch used `CALICOVPP_INTERFACE` and `CALICOVPP_NATIVE_DRIVER`. Current Calico VPP documentation and OpenShift manifests use `CALICOVPP_INTERFACES` with an `uplinkInterfaces` array and `vppDriver`. I updated the patch command to use the current ConfigMap data key and JSON shape.
- The hugepages MachineConfig included a `dev-hugepages.mount` systemd unit without unit contents. OpenShift MachineConfig examples for kernel arguments do not require that unit stanza, and hugepage reservation is controlled by the boot arguments. I removed the unnecessary systemd unit block.
- The hugepages step implied hugepages were generally required for the shown setup. Calico VPP documentation states that `af_packet` works broadly without hugepages, while DPDK and some native drivers require them. I added a caveat to distinguish those cases.

## Review Notes
The guide is now technically consistent with the current Calico VPP and OpenShift documentation for the configuration examples it shows. Future improvements could expand the install-time workflow for setting the IPPool CIDR and `SERVICE_PREFIX`, because those values must match the OpenShift cluster network and service network selected during cluster installation.
