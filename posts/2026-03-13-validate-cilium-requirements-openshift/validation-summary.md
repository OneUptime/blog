# Validation Summary: Validate Cilium Requirements on OpenShift

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Red Hat OpenShift
- OpenShift Security Context Constraints
- Operator Lifecycle Manager
- eBPF

## Sources Consulted
- Cilium documentation: Installation on OpenShift OKD, https://docs.cilium.io/en/latest/installation/k8s-install-openshift-okd/
- Cilium documentation: Installation using Helm, OpenShift notes, https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium documentation: System Requirements, https://docs.cilium.io/en/stable/operations/system_requirements/
- Red Hat Customer Portal: Certified OpenShift CNI Plug-ins, https://access.redhat.com/articles/5436171
- Red Hat OpenShift documentation: Network config.openshift.io/v1 API, https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/config_apis/network-config-openshift-io-v1
- Red Hat OpenShift documentation: Understanding and managing pod security admission, https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/authentication_and_authorization/understanding-and-managing-pod-security-admission
- Isovalent OLM for Cilium manifests, https://github.com/isovalent/olm-for-cilium

## Issues Found
- The introduction said OpenShift uses SCCs instead of PodSecurityAdmission. OpenShift includes Kubernetes pod security admission while still using SCCs, so the wording was corrected.
- The post implied Cilium could simply replace or supplement OVN-Kubernetes. Cilium's current documentation says it is best installed when the OpenShift cluster is created, and OpenShift's Network `spec.networkType` is immutable after installation. The wording and validation command were corrected to check `.status.networkType` and mention installer or vendor-supported migration paths.
- The prerequisites and version comments used broad version claims. These were replaced with examples from Red Hat's certified CNI matrix, including Cilium Community 1.13 and Isovalent Enterprise for Cilium 1.14 and 1.15 support ranges.
- The kernel note claimed OpenShift 4.14+ with kernel 5.14+ fully supports Cilium eBPF. Cilium documents a baseline of Linux kernel 5.10 or equivalent and notes that newer kernels are needed for some advanced features, so the statement was corrected.
- The SCC section expected SCCs named `cilium-admin` and `cilium-node`. The reviewed Isovalent OLM manifests do not support those as universal expected SCC names. The commands now validate access to the standard `privileged` and `hostnetwork` SCCs and inspect Cilium RBAC and service accounts.
- The OLM checks assumed resources only in the `cilium` namespace. The commands now search cluster-wide first because OperatorHub subscriptions and CSVs may be installed in different namespaces depending on the operator installation mode.
- The prerequisites listed the `cilium` CLI, but the guide only uses `oc` commands. The unused prerequisite was removed.
- A JSONPath command attempted to pipe a Kubernetes object directly to `python3 -m json.tool`, which is not reliable JSON output. It now checks the explicit `securityContext.privileged` field.
- The best-practices wording referred to SCC creation and version alignment too broadly. It now focuses on SCC/RBAC validation and the certified OpenShift support matrix.

## Review Notes
The post remains a requirements-validation guide rather than a complete installation guide. Future improvements could include separating community Cilium, Isovalent Enterprise for Cilium, and Isovalent Networking for Kubernetes into distinct support matrices because their certified OpenShift ranges differ.
