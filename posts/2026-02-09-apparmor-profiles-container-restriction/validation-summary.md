# Validation Summary: How to implement AppArmor profiles for container process restriction

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- AppArmor
- Linux security modules
- Container security contexts
- Kubernetes admission webhooks
- Prometheus alerting

## Sources Consulted
- Kubernetes documentation: Restrict a Container's Access to Resources with AppArmor, https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes documentation: Configure a Security Context for a Pod or Container, https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: ValidatingWebhookConfiguration v1, https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes API reference: Pod SecurityContext AppArmorProfile, https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- AppArmor documentation: Profiles basics, https://apparmor.net/profiles/profile-types-and-syntax/
- AppArmor documentation: Troubleshooting / AppArmor failures, https://apparmor.net/monitoring/AppArmor_Failures/
- Local command help and parser checks: `apparmor_parser --help`, `aa-status --help`, and `apparmor_parser -Q -K -T /dev/stdin`

## Issues Found
- The Kubernetes pod examples used the deprecated `container.apparmor.security.beta.kubernetes.io/...` annotation. Updated the examples to use the stable `securityContext.appArmorProfile` API with `type: RuntimeDefault` and `type: Localhost`.
- The default profile section referred to a Docker AppArmor profile. Updated it to refer to the container runtime default profile, which is the current Kubernetes terminology.
- The AppArmor availability section said annotations are ignored when AppArmor is unavailable. Updated this to reflect current Kubernetes behavior: explicitly configured AppArmor profiles cause pod rejection when AppArmor is unavailable, while omitted profiles only receive the runtime default on AppArmor-enabled nodes.
- The custom profile explanation used the old `localhost/<profile>` annotation syntax. Updated it to explain `type: Localhost` and `localhostProfile`.
- The PostgreSQL pod example used the deprecated annotation API. Updated it to use `securityContext.appArmorProfile`.
- The `ValidatingWebhookConfiguration` example omitted required `admissionReviewVersions` and `sideEffects` fields for `admissionregistration.k8s.io/v1`. Added both fields.
- The monitoring section implied the example metrics were generally available Kubernetes metrics. Updated the text and alert expression to clarify that AppArmor metrics require node or audit exporters.
- The best-practices and conclusion sections used the old `runtime/default` annotation value. Updated them to `RuntimeDefault`.

## Review Notes
The AppArmor profile snippets parsed successfully with the local AppArmor parser in no-kernel-load mode. The Kubernetes YAML blocks parsed successfully as YAML. The Prometheus metrics remain illustrative because Kubernetes and kube-state-metrics do not provide a universal built-in AppArmor violation metric; production use requires an exporter or log-derived metric pipeline.
