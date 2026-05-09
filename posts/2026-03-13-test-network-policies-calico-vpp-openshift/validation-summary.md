# Validation Summary: How to Test Network Policies with Calico VPP on OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenShift
- Kubernetes NetworkPolicy
- Calico VPP data plane
- Calico GlobalNetworkPolicy
- VPP policy inspection
- OpenShift `oc` CLI
- `calicoctl`

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- OpenShift Container Platform 4.20 Routes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/ingress_and_load_balancing/routes
- Calico VPP networking documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP OpenShift installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico `calicoctl get` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- VPP ACL CLI reference: https://s3-docs.fd.io/vpp/23.02/cli-reference/clis/clicmd_src_plugins_acl.html

## Issues Found
- The original examples used the default `nginx` image on OpenShift. That image commonly fails under OpenShift's restricted security defaults because it expects root-oriented filesystem and port behavior. Replaced it with `quay.io/openshift/origin-hello-openshift` and updated the service and direct pod tests to use port 8080.
- The first `oc expose pod web` command did not specify a port. Added `--port=8080` so service creation does not depend on port inference from an `oc run` pod.
- The BusyBox `wget` examples used `--timeout=5`, which is not portable across BusyBox builds. Changed it to `-T 5`.
- The post described Calico VPP policy enforcement as ACL-table based, referred to VPP manager pods, and inspected `show acl-plugin acl`. Current Calico VPP documentation describes `calico-vpp-node` pods with a Calico-specific VPP policy plugin, and troubleshooting uses `npol` state. Updated the wording and command to inspect `show npol policies verbose` in the `vpp` container on the server node.
- The GlobalNetworkPolicy step assumed a policy named `allow-openshift-system` existed. Official Calico OpenShift/VPP installation materials do not define that policy by default. Changed the step to list GlobalNetworkPolicies and inspect the actual cluster-specific policy name.
- The conclusion overstated the router test as proof of ACL enforcement. Softened it to accurately describe the route-to-service path and VPP policy inspection.

## Review Notes
The post is technically relevant and includes runnable commands and Kubernetes policy YAML. The router check is useful as a smoke test, but it should not be treated as a substitute for explicit pod-to-pod policy tests because ingress source identity and policy timing can vary by CNI and service implementation.
