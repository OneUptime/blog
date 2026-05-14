# Validation Summary: Check Cilium Requirements on OpenShift

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Cilium
- Kubernetes
- OpenShift / OKD
- OVN-Kubernetes
- Red Hat CoreOS (RHCOS)
- eBPF
- Security Context Constraints (SCCs)
- Cilium CLI, Helm, and OLM

## Sources Consulted
- Cilium OpenShift OKD installation documentation: https://docs.cilium.io/en/latest/installation/k8s-install-openshift-okd/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes compatibility documentation: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.15 source documentation for OpenShift OKD installation and Kubernetes compatibility: https://github.com/cilium/cilium/tree/v1.15.0/Documentation
- Red Hat OpenShift 4.14 OVN-Kubernetes migration documentation: https://docs.redhat.com/documentation/en-us/openshift_container_platform/4.14/html/networking/ovn-kubernetes-network-plugin
- Red Hat OpenShift 4.14 SCC documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat RHCOS/OCP RHEL version mapping: https://access.redhat.com/articles/6907891

## Issues Found
- The introduction and migration steps implied that replacing OVN-Kubernetes with Cilium is a normal OpenShift network migration path. Updated the wording to say Cilium requires a supported OpenShift-specific or vendor-maintained installation path, and clarified that OpenShift's documented migration flow is for OpenShift-managed plugins such as OpenShift SDN to OVN-Kubernetes.
- The post claimed RHCOS 4.12+ uses kernel 5.14+. Corrected this because OCP/RHCOS 4.12 is RHEL 8.6-based, while later releases such as 4.13/4.14 are RHEL 9.2-based; the guide now instructs readers to check the actual node kernel.
- The Cilium kernel minimum examples were outdated and too broad. Replaced them with the current Cilium baseline wording from the official system requirements and noted that advanced features depend on the Cilium version and feature set.
- The SCC field names were Kubernetes-style rather than OpenShift SCC field names. Updated them to `allowHostNetwork`, `allowHostPID`, `allowPrivilegedContainer`, and `seLinuxContext`.
- The Step 5 installation commands used unsupported/nonexistent OpenShift Helm values such as `openshift.enabled=true`. Replaced them with validation commands that check for a supported OLM/operator installation and Cilium resources.
- The best practices and conclusion implied all CNI migrations always reboot all nodes and that `cilium status` always uses the default namespace. Updated the wording to account for supported migration behavior and distribution-specific namespaces.

## Review Notes
The OpenShift-to-Cilium installation story is distribution- and vendor-specific. The post is now accurate as a prerequisites and validation checklist, but future revisions should link to the exact supported Cilium or vendor documentation for the OpenShift distribution being used.
