# Validation Summary: How to Handle Privileged Init Container Requirements in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and Istio CNI
- Kubernetes Pod Security Standards and Pod Security Admission
- Kubernetes PodSecurityPolicy
- Kyverno policy validation
- OPA Gatekeeper policy exceptions
- OpenShift Security Context Constraints
- Linux capabilities

## Sources Consulted
- Istio documentation: Install Istio with Pod Security Admission, https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio documentation: Install the Istio CNI node agent, https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio documentation: Application Requirements, https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio documentation: Security Model, https://istio.io/latest/docs/ops/deployment/security-model/
- Kubernetes documentation: Pod Security Standards, https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes documentation: PodSecurityPolicy to Pod Security Standards mapping, https://kubernetes.io/docs/reference/access-authn-authz/psp-to-pod-security-standards/
- Kyverno documentation: Validate Rules, https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno documentation: Policy Exceptions, https://release-1-15-0.kyverno.io/docs/exceptions/
- Red Hat OpenShift documentation: Managing Security Context Constraints, https://docs.redhat.com/en/documentation/openshift_container_platform/4.3/html/authentication/managing-pod-security-policies
- Red Hat OpenShift Service Mesh documentation, https://docs.redhat.com/en/documentation/openshift_container_platform/4.9/html-single/service_mesh/

## Issues Found
- The post incorrectly said `istio-init` requires at least the Kubernetes Pod Security `Baseline` level. Kubernetes Baseline does not allow adding `NET_ADMIN` or `NET_RAW`, so I changed the text to state that built-in Baseline and Restricted both reject this init container and that Privileged, CNI, or a targeted policy exception is required.
- The namespace relaxation example used `pod-security.kubernetes.io/enforce: baseline`, which would still reject pods with `istio-init`. I changed it to `privileged` and added a note that this is a broad exception.
- The Istio CNI section implied CNI automatically makes every injected pod Restricted-compatible. I narrowed the claim to the init-container capability requirement, because application containers must still satisfy the rest of the Restricted profile.
- The Kyverno example used the deprecated top-level `spec.validationFailureAction`. I moved the setting to `validate.failureAction`, matching current Kyverno documentation.
- The PodSecurityPolicy section did not state that PSP was removed in Kubernetes 1.25. I added the version caveat.
- The OpenShift section implied granting `anyuid` was enough for Istio init-container requirements. I changed it to recommend CNI first and, if CNI is not available, use a custom SCC that explicitly allows `NET_ADMIN`, `NET_RAW`, and UID 0.

## Review Notes
The post remains version-sensitive because Istio injection templates and security defaults can vary by Istio release and installation profile. The core guidance is now aligned with current Kubernetes Pod Security Admission and Istio CNI documentation.
