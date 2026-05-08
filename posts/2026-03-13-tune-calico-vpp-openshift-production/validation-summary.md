# Validation Summary: How to Tune Calico VPP on OpenShift for Production

## Status
validated

## Post Type
Tutorial / production tuning guide

## Technologies Covered
- Calico VPP data plane
- OpenShift
- Kubernetes ConfigMaps and DaemonSets
- OpenShift Machine Config Operator
- VPP startup configuration
- DPDK
- Prometheus metrics for Calico Felix

## Sources Consulted
- Calico Open Source documentation, Install an OpenShift 4 cluster with Calico VPP: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico Open Source documentation, Get started with VPP networking: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico Open Source documentation, Primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico Open Source documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation, FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Red Hat OpenShift documentation, Machine configuration / adding kernel arguments with MachineConfig: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/machine_configuration/machine-configs-configure
- FD.io VPP documentation, startup.conf CPU, buffers, and DPDK sections: https://s3-docs.fd.io/vpp/21.10/gettingstarted/users/configuring/startup.html
- Project Calico VPP dataplane OpenShift ConfigMap manifest: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/platforms/openshift/03-configmap-calico-vpp-resources.yaml
- Project Calico VPP dataplane generated manifest: https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.31.0/yaml/generated/calico-vpp.yaml

## Issues Found
- The post patched a ConfigMap named `vpp-config` with a `vpp.conf` key. Current Calico VPP manifests use the `calico-vpp-config` ConfigMap and `CALICOVPP_CONFIG_TEMPLATE` for VPP startup configuration, so the Step 2 command was corrected.
- The post implied VPP ConfigMap tuning takes effect without restarting anything. Because Calico VPP consumes the ConfigMap through pod environment/config startup data, the Calico VPP DaemonSet must be restarted for the rendered VPP startup configuration to take effect. The text and commands now state this while preserving that no node restart is required.
- The DPDK section only showed a raw VPP `dpdk` stanza. Calico VPP documents uplink driver selection and queue sizing through `CALICOVPP_INTERFACES`, so Step 3 now patches `CALICOVPP_INTERFACES` with `vppDriver: "dpdk"` and queue sizing.
- The metrics step was titled as VPP metrics, but the documented `prometheusMetricsEnabled` setting is a Calico Felix metric setting. The title and scrape description were corrected to Felix metrics.

## Review Notes
The MachineConfig example is syntactically valid for applying kernel arguments to worker nodes, but production OpenShift performance tuning often uses the Performance Addon Operator or Node Tuning Operator for more complete CPU and hugepage policy management. The post remains focused on the MCO approach described by the author.
