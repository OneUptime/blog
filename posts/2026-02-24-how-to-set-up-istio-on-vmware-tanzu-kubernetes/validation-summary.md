# Validation Summary: How to Set Up Istio on VMware Tanzu Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio and istioctl
- VMware Tanzu Kubernetes Grid
- Kubernetes Services, namespaces, Pod Security Admission, and PodSecurityPolicy
- Antrea CNI and NodePortLocal
- NSX-T / NSX Container Plugin load balancing
- cert-manager
- Tanzu Observability / Wavefront Helm chart

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig API reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio CNI installation guide: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio Pod Security Admission guide: https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio secure ingress gateway guide: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Antrea NodePortLocal documentation: https://antrea.io/docs/main/docs/node-port-local/
- Broadcom Tanzu KB for Antrea CNI and Kubernetes NetworkPolicy support: https://knowledge.broadcom.com/external/article/298673/resourcenetworkpolicystats-feature-netwo.html
- VMware Container Networking with Antrea datasheet: https://www.vmware.com/docs/vmware-container-networking-antrea-datasheet
- cert-manager Certificate API documentation: https://cert-manager.io/docs/reference/api-docs/
- VMware Aria Operations for Applications Kubernetes documentation: https://docs.wavefront.com/wavefront_kubernetes.html
- Wavefront Helm chart reference: https://artifacthub.io/packages/helm/wavefront/wavefront

## Issues Found
- The default Istio ingress gateway configuration used an AWS NLB annotation in a VMware Tanzu guide and placed it under `k8s.service.annotations`, which is not part of IstioOperator's `ServiceSpec`. Removed the AWS-specific annotation and kept the valid `type: LoadBalancer` service configuration.
- The NSX-T example attempted to configure `ncp/internal_ip_for_policy` under `service.annotations` and included a non-verified `service.beta.kubernetes.io/nsx-lb-type` annotation. Updated the example to use a standard LoadBalancer service and verify the NCP-managed `ncp/internal_ip_for_policy` annotation after allocation.
- The Pod Security Policy section implied PSP is generally relevant for current TKG clusters. Updated it to state that PSP was removed in Kubernetes v1.25, limited PSP guidance to Kubernetes v1.24 and earlier, and added Pod Security Admission guidance for current clusters with Istio CNI.

## Review Notes
- The Wavefront Helm chart command is syntactically consistent with the legacy chart reference, but VMware's current documentation recommends the Observability for Kubernetes Operator for most non-OpenShift deployments.
- The Bookinfo sample uses Istio release 1.22 assets. This is valid for an Istio 1.22-oriented example, but future updates should either pin the installed Istio version to match or update the sample URL to the release being installed.
