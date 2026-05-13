# Validation Summary: How to Configure Calico VPP on Kubernetes for a New Cluster

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Calico VPP data plane
- Calico IPPool and FelixConfiguration resources
- Kubernetes ConfigMaps
- kubectl and calicoctl
- VPP startup configuration

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- VPP startup configuration reference: https://s3-docs.fd.io/vpp/21.10/gettingstarted/users/configuring/startup.html

## Issues Found
- The IPPool example used `encapsulation: VXLAN`, which is an operator Installation IP pool field, not a `projectcalico.org/v3` IPPool field. Changed it to `vxlanMode: Always`, which is the documented IPPool field for VXLAN encapsulation.
- The VPP ConfigMap example used a separate `vpp-config` ConfigMap with a `vpp.conf` key. Calico VPP uses the `calico-vpp-config` ConfigMap and the `CALICOVPP_CONFIG_TEMPLATE` data key for the startup template. Updated the snippet accordingly.
- The VPP startup example included a DPDK device stanza while the interface example used `af_packet`. This is inconsistent with Calico VPP's documented `af_packet` setup, where the DPDK plugin is disabled. Replaced the DPDK stanza with the Calico VPP template structure and plugin settings.
- The ConfigMap command used `kubectl apply` on a partial ConfigMap. That could overwrite other required keys in `calico-vpp-config`, such as `SERVICE_PREFIX`. Changed it to `kubectl patch --type merge --patch-file`.
- The interface patch used deprecated legacy keys `CALICOVPP_INTERFACE` and `CALICOVPP_NATIVE_DRIVER`. Updated it to patch `CALICOVPP_INTERFACES` with `uplinkInterfaces[0].interfaceName` and `uplinkInterfaces[0].vppDriver`.
- The verification commands targeted a placeholder `vpp-manager` pod without specifying a container. Calico VPP runs the `vpp` container in `calico-vpp-node` pods, so the commands now use `<calico-vpp-node-pod> -c vpp`.
- The VPP buffer page size example used `2m`; the VPP startup documentation shows `2M`. Updated the example to `2M`.

## Review Notes
The Felix patch fields and `calicoctl patch` syntax match Calico documentation. I could not run local `kubectl --help` because `kubectl` is not installed in this workspace, so kubectl syntax was checked against the official Kubernetes command reference instead.
