# Validation Summary: Update Cilium Requirements on OpenShift

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Red Hat OpenShift
- OpenShift Security Context Constraints
- OpenShift Cluster Network Operator
- OVN-Kubernetes
- Red Hat CoreOS
- eBPF

## Sources Consulted
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium installation on OpenShift OKD: https://docs.cilium.io/en/latest/installation/k8s-install-openshift-okd/
- Cilium Helm installation notes for OpenShift: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium mutual authentication documentation: https://docs.cilium.io/en/stable/network/servicemesh/mutual-authentication/mutual-authentication/
- Cilium Hubble TLS documentation: https://docs.cilium.io/en/stable/observability/hubble/configuration/tls.html
- Red Hat OpenShift Cluster Network Operator documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/networking_operators/cluster-network-operator
- Red Hat OpenShift 4.12 release notes: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/release_notes/ocp-4-12-release-notes
- Red Hat RHEL versions used by RHCOS and OCP: https://access.redhat.com/articles/6907891
- Red Hat SecurityContextConstraints API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/pdf/security_apis/securitycontextconstraints-security-openshift-io-v1

## Issues Found
- The post claimed OpenShift 4.12+ with RHCOS runs kernel 5.14+ and described that as the Cilium eBPF minimum. OpenShift 4.12 RHCOS uses RHEL 8.6 packages, while current Cilium documentation lists Red Hat CoreOS 4.12+ as compatible and states a Linux kernel 5.10+ or equivalent vendor kernel requirement. Updated the wording to require checking the actual node kernel instead of assuming it from the OpenShift version.
- The post implied every Cilium on OpenShift install requires a hand-written SCC. Current Cilium documentation points OpenShift users to vendor-maintained OLM images, and the Cilium Helm documentation says Cilium is best installed when an OpenShift cluster is created. Updated the SCC section to apply only when the installation method does not provide the OpenShift SCC/Operator integration.
- The SCC example omitted `supplementalGroups` and `volumes`, which are important for a practical custom SCC and are documented fields in the OpenShift SCC API. Added `supplementalGroups: RunAsAny` and `volumes: ['*']`.
- The firewall section referred to disabling OpenShift firewall management and checking for an `iptables-operator`. That is not a standard OpenShift prerequisite from the official docs. Reworded the section as a conflict check for host, cloud, and current network plugin rules.
- The API server check used a vague endpoint placeholder and `/healthz`. Updated the placeholder to OpenShift's common `api.<cluster-name>.<base-domain>` form and used `/readyz`.
- The best practices said to keep the Cluster Network Operator in sync with the Cilium version and to use OpenShift certificate rotation for Cilium mTLS. These are not supported by the cited Cilium/OpenShift docs. Replaced them with guidance to use vendor-maintained OpenShift Operator images where possible and Cilium's documented SPIRE/cert-manager certificate options.

## Review Notes
The local environment did not have `oc`, so OpenShift CLI help could not be checked locally. CLI usage and configuration fields were reviewed against official Cilium and Red Hat documentation instead.
