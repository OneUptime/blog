# Validation Summary: How to Configure Istio CNI Plugin

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Istio CNI node agent
- IstioOperator
- Kubernetes CNI
- Kubernetes Pod Security Admission / Pod Security Standards
- OpenShift / Red Hat OpenShift Service Mesh
- kubectl and istioctl

## Sources Consulted
- Istio official documentation: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio official documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio official documentation: Install Istio with Pod Security Admission - https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio official documentation: OpenShift platform setup - https://istio.io/latest/docs/setup/platform-setup/openshift/
- Istio official documentation: In-place upgrades - https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio official documentation: Canary upgrades - https://istio.io/latest/docs/setup/upgrade/canary/
- Istio upstream chart values: istio-cni values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/istio-cni/values.yaml
- Istio upstream chart values: istio-discovery values.yaml - https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio upstream OpenShift profile - https://github.com/istio/istio/blob/master/manifests/profiles/openshift.yaml
- Red Hat OpenShift Service Mesh documentation: Updating the Istio CNI - https://docs.redhat.com/en/documentation/red_hat_openshift_service_mesh/3.3/html/updating/ossm-updating-istio-cni
- Kubernetes official documentation: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes official documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/

## Issues Found
- The introduction referred to strict PodSecurityPolicies as if they were current Kubernetes behavior. Updated the wording to distinguish legacy PodSecurityPolicies from current Pod Security Standards.
- The `logLevel` CNI value is not the current chart value. Updated it to `values.cni.logging.level`, which matches the upstream Istio CNI chart.
- The `excludeNamespaces` guidance said to always exclude both `kube-system` and `istio-system`. Updated it to always exclude `kube-system` and exclude `istio-system` when that namespace hosts the Istio control plane.
- The custom traffic redirection example included `values.cni.psp_cluster_role`, which is not present in current upstream Istio CNI values. Removed that field.
- The post said the CNI plugin only runs when pods are created or deleted. Clarified that the CNI plugin path is invoked during pod create/delete while the `istio-cni-node` DaemonSet runs continuously for node-agent duties.
- The OpenShift section used manual Multus `NetworkAttachmentDefinition` instructions that do not match current upstream Istio OpenShift guidance or Red Hat OpenShift Service Mesh 3 CNI installation. Replaced that with the upstream OpenShift profile values and the Red Hat `IstioCNI` resource example.
- The test section said no init container should be injected. Updated it to specifically check that the privileged `istio-init` container is absent, because Istio CNI may still inject the non-privileged `istio-validation` init container for race-condition mitigation.
- The upgrade section used a fixed, old Istio version (`1.21.0`) and asserted that CNI must always be upgraded first. Updated the guidance to match Istio's documented in-place and canary upgrade behavior.

## Review Notes
The remaining verification commands are generic examples and may need namespace, CNI config filename, or host path adjustments on clusters that install Istio CNI outside `istio-system`, use a non-Calico primary CNI, or use OpenShift-specific packaging.
