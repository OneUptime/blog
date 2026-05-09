# Validation Summary: How to Troubleshoot Installation Issues with Calico on OpenShift

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- OpenShift Container Platform
- Kubernetes
- Tigera Operator
- Security Context Constraints
- Cluster Network Operator
- calicoctl

## Sources Consulted
- Calico documentation: Install an OpenShift 4 cluster with Calico: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/installation
- Calico documentation: Install Calico on an OpenShift HCP cluster: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: System requirements for OpenShift: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/requirements
- Project Calico v3.27.0 OpenShift manifest bundle: https://github.com/projectcalico/calico/releases/download/v3.27.0/ocp.tgz
- Project Calico v3.32.0 OpenShift manifest bundle: https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz
- Red Hat OpenShift documentation: Cluster Network Operator: https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/networking_operators/cluster-network-operator
- Red Hat OpenShift documentation: Support policy for unmanaged Operators: https://docs.redhat.com/zh-cn/documentation/openshift_container_platform/4.5/html/architecture/unmanaged-operators_architecture-installation
- Red Hat OpenShift documentation: Viewing cluster network configuration: https://docs.redhat.com/documentation/en-us/openshift_container_platform/4.8/html-single/networking/index

## Issues Found
- The SCC remediation referenced `https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml`, but that URL returns 404 and the v3.27 OpenShift bundle does not contain a standalone `calico-scc.yaml`. Updated the guidance to verify the Tigera operator ClusterRole has `securitycontextconstraints` permissions and to re-apply the OpenShift manifest bundle role for the selected Calico version.
- The network-operator section said the Cluster Network Operator should return `Unmanaged` and advised patching it unconditionally. Current Calico OpenShift guidance selects Calico through install-time manifests and Hosted Control Planes use network type `Other`; Red Hat also documents unmanaged operators as unsupported. Updated the section to verify the OpenShift network type and operator configuration, and to treat `Unmanaged` as version-specific rather than a generic fix.

## Review Notes
The post remains a concise troubleshooting guide rather than a full installation procedure. Future improvements could make the Calico version explicit throughout the article, because OpenShift manifest names differ between Calico v3.27 and current v3.32 releases.
