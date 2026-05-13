# Validation Summary: How to Install Calico on OpenShift Hosted Control Planes Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Calico Open Source
- OpenShift Container Platform
- OpenShift Hosted Control Planes
- HyperShift
- Kubernetes CNI networking
- Tigera Operator

## Sources Consulted
- Calico documentation: Install Calico on an OpenShift HCP cluster: https://docs.tigera.io/calico/latest/getting-started/kubernetes/openshift/hostedcontrolplanes
- Calico documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Red Hat OpenShift documentation: Hosted control planes overview: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/pdf/hosted_control_planes/hosted-control-planes-overview
- Red Hat OpenShift documentation: Managing hosted control planes and accessing hosted cluster kubeconfig secrets: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/hosted_control_planes/managing-hosted-control-planes
- Project Calico GitHub release asset check for `ocp.tgz`: https://github.com/projectcalico/calico/releases/download/v3.32.0/ocp.tgz

## Issues Found
- The post used raw GitHub URLs for `manifests/ocp/tigera-operator.yaml` and `manifests/ocp/calico-scc.yaml` at Calico v3.27.0. Those URLs return 404, and the official OpenShift HCP installation flow uses the `ocp.tgz` manifest bundle. Updated the post to download the current Calico OpenShift manifest bundle.
- The post omitted the requirement that the hosted cluster be created with `--network-type Other`, which Calico documents for HCP clusters. Added this to the prerequisites.
- The kubeconfig extraction command used `secret/admin-kubeconfig`, but Red Hat documents the hosted cluster admin kubeconfig secret name as `<hosted-cluster-name>-admin-kubeconfig` in the hosted cluster namespace. Updated the command.
- The post treated SCC application as a separate step, but the current Calico OpenShift bundle includes the required resources and must be applied in ordered groups. Replaced the standalone SCC step with the documented ordered manifest application and CRD wait.
- The Installation CR snippet did not specify the selected Linux dataplane while the current OpenShift bundle defaults to BPF. Added `linuxDataplane: Iptables` and documented the required manifest edits for the iptables dataplane.
- The connectivity check used BusyBox `wget` against the Kubernetes service over HTTP. The Kubernetes service is HTTPS, and BusyBox images commonly fail TLS validation or lack the needed options. Updated the test to use a curl image with `curl -kfsS` against `https://kubernetes.default.svc.cluster.local`.

## Review Notes
The pod CIDR `10.132.0.0/14` remains environment-specific. Readers should replace it with the hosted cluster pod network configured for their deployment.
