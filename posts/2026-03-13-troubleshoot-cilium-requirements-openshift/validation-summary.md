# Validation Summary: Troubleshoot Cilium Requirements on OpenShift

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Red Hat OpenShift
- Red Hat CoreOS
- eBPF
- OpenShift Security Context Constraints
- OpenShift Cluster Network Operator

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Installation using Helm, OpenShift tab: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Installation on OpenShift OKD: https://docs.cilium.io/en/stable/installation/k8s-install-openshift-okd/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Red Hat OpenShift 4.18 Cluster Network Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/networking_operators/cluster-network-operator
- Red Hat OpenShift 4.18 Network config API documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/config_apis/network-config-openshift-io-v1
- Red Hat OpenShift 4.18 SecurityContextConstraints API documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/security_apis/securitycontextconstraints-security-openshift-io-v1
- Red Hat OpenShift 4.18 CLI documentation for `oc adm policy add-scc-to-user`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html-single/cli_tools/index

## Issues Found
- The post claimed replacing OVN-Kubernetes with Cilium is a generally supported CNO operation. Updated this to say current Cilium documentation has no community-maintained OpenShift install path and points to vendor-maintained OLM images.
- The post instructed users to patch `spec.defaultNetwork.type` to `Raw` after installation. Removed that command because current OpenShift documentation says the default network type is immutable after installation and `OVNKubernetes` is the supported default plugin.
- The post claimed the standard RHCOS kernel is required because the RT kernel disables several eBPF program types. Replaced this with Cilium's documented kernel version and feature requirements and a vendor-guidance caveat for RT kernels.
- The SCC example omitted required and practically necessary fields for OpenShift SCC admission, including `readOnlyRootFilesystem`, filesystem/group strategies, and allowed volumes. Added the missing fields and additional Cilium agent capabilities reflected in current Cilium Helm defaults.
- The SELinux audit command was shown as a local workstation command. Updated it to use `oc debug node/<node-name> -- chroot /host ...` so it runs against a node filesystem.
- The OpenShift prerequisite was pinned to 4.10 or later without tying it to Cilium's current kernel requirements. Updated it to OpenShift 4.x with nodes that satisfy the selected Cilium version's kernel requirements.

## Review Notes
The guide is now accurate as a preflight and troubleshooting checklist, but OpenShift Cilium installation remains vendor-specific. Future revisions should link to the exact vendor-supported Cilium distribution and version being installed, because namespace, service account, SCC, and Helm or OLM details can differ by distribution.
