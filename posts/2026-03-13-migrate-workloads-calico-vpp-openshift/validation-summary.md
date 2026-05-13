# Validation Summary: How to Migrate Existing Workloads to Calico VPP on OpenShift

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico VPP dataplane
- OpenShift 4
- Kubernetes NetworkPolicy and Calico policy resources
- OpenShift Machine Config Operator
- OpenShift Routes
- iperf3 workload testing

## Sources Consulted
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP OpenShift installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico VPP uplink configuration documentation: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Project Calico VPP OpenShift manifests: https://github.com/projectcalico/vpp-dataplane/tree/v3.31.0/yaml/platforms/openshift
- OpenShift Network API documentation for `spec.serviceNetwork`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/networking/cluster-network-operator

## Issues Found
1. The post described hugepages as mandatory for OpenShift Calico VPP. Current Calico documentation treats hugepages as optional and required only for drivers such as DPDK or native device drivers. Updated the introduction, prerequisites, Step 2, and conclusion to make hugepages conditional.

2. The post referenced applying a standalone `calico-vpp-scc.yaml`. The current OpenShift VPP manifest set does not include that file; it uses an OpenShift-specific namespace manifest with privileged pod security labels plus RBAC and service account resources. Replaced the SCC step with downloading and applying the official OpenShift VPP manifests.

3. The post used `yaml/calico-vpp.yaml`, but current Calico VPP releases place generated manifests under `yaml/generated/` and OpenShift-specific manifests under `yaml/platforms/openshift/`. Updated the commands to use the OpenShift manifest paths.

4. The post configured `CALICOVPP_INTERFACE`, which Calico documentation marks as a deprecated legacy option. Updated the command to edit `CALICOVPP_INTERFACES` in the OpenShift ConfigMap manifest instead.

5. The post did not set `SERVICE_PREFIX`, which Calico VPP requires to match the Kubernetes service CIDR. Added a command that reads OpenShift's `network.config.openshift.io/cluster` `spec.serviceNetwork[0]` and patches the VPP ConfigMap manifest before applying it.

6. The pre-migration backup command captured Kubernetes `NetworkPolicy` objects but omitted Calico policy CRDs. Added a backup command for Calico `GlobalNetworkPolicy`, Calico `NetworkPolicy`, `GlobalNetworkSet`, and `NetworkSet` resources.

7. The original text claimed pod IPs are preserved. Calico VPP preserves Calico IPAM as the IPAM system, but individual existing pods can still be recreated during a data plane rollout and should not be promised stable pod IPs. Adjusted the wording to say IPAM remains Calico-managed and removed the pod IP preservation guarantee.

## Review Notes
Calico documents VPP as compatible with the other Calico Linux data planes, which makes cluster migration possible, but its OpenShift guide is written primarily as an install-time workflow. Treat an existing OpenShift cluster migration as a maintenance-window operation and test the exact Calico/OpenShift version combination before production rollout.
