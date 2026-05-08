# Validation Summary: How to Verify Pod Networking with Calico VPP on OpenShift

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico VPP data plane
- OpenShift Container Platform
- Kubernetes
- OpenShift CLI (`oc`)
- VPP CLI (`vppctl`)
- OpenShift Routes
- OpenShift DNS, ingress, monitoring, and etcd system namespaces

## Sources Consulted
- Calico VPP getting started guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP OpenShift installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/openshift
- Calico VPP troubleshooting guide: https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico troubleshooting commands and TigeraStatus usage: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- TigeraStatus API reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/api
- OpenShift route creation documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html-single/ingress_and_load_balancing/
- OpenShift DNS Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/networking/dns-operator
- OpenShift monitoring stack documentation: https://docs.redhat.com/documentation/en-us/openshift_container_platform/4.7/html/monitoring/cluster-monitoring
- OpenShift Image Registry Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/registry/registry
- FD.io VPP basic interface CLI reference: https://docs.fd.io/vpp/22.10/cli-reference/interface/basic.html
- FD.io VPP ACL CLI reference: https://docs.fd.io/vpp/22.10.1/cli-reference/clis/clicmd_src_plugins_acl.html

## Issues Found
- The post referred to "VPP manager pods" as the target for `vppctl` commands. Calico VPP runs `vpp-manager` and `calico-vpp-agent` in `calico-vpp-node` pods, and the documented exec examples target the `vpp` container. Updated the prerequisite and `oc exec` examples to use `<calico-vpp-node-pod> -c vpp`.
- The Step 5 route test used the generic Docker Hub `nginx` image and did not declare a container port before exposing the pod. This can fail or create an incomplete service on OpenShift. Replaced it with the OpenShift-documented `hello-openshift` pod, service, and route flow.
- The DNS test still referenced the old `server` service after correcting the route example. Updated it to resolve `hello-openshift.vpp-verify.svc.cluster.local`.
- The VPP command `show interface statistics` is not the documented VPP interface counter command. Updated the command to `vppctl show interface`, which shows interface state and counters.
- The system pod health section implied that non-ready OpenShift system pods after VPP installation should be diagnosed first through VPP ACL tables. Updated it to start with pod events and logs, then inspect VPP ACL plugin state only when symptoms point to blocked traffic.
- The introduction and conclusion overstated what VPP CLI counters prove and implied that ACL tables directly confirm OpenShift system pod policy enforcement. Revised those statements to say counters show traffic on VPP interfaces and ACL plugin state can be checked when troubleshooting policies.
- The introduction listed registry pods as one of the most important universal OpenShift system checks, but the internal registry can be removed or unmanaged on some platforms. Changed the example set to ingress router, DNS, monitoring, and etcd, matching the commands in the post.

## Review Notes
The guide remains version-neutral. Future improvements could add cleanup commands for the `vpp-verify` project and optional examples for inspecting specific VPP ACL plugin output when network policy behavior is the focus.
