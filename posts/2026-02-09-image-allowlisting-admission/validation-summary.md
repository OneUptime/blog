# Validation Summary: How to Configure Image Allowlisting Policies

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes admission controllers and ValidatingWebhookConfiguration
- Kubernetes Pods, init containers, and ephemeral containers
- OPA Gatekeeper ConstraintTemplates and constraints
- Rego policy snippets
- Sigstore Cosign image signature verification
- PrometheusRule alerting
- Trivy image vulnerability scanning
- Bash, kubectl, jq, and Kubernetes ConfigMaps

## Sources Consulted
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes AdmissionReview v1 API reference: https://kubernetes.io/docs/reference/config-api/apiserver-admission.v1
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- OPA Gatekeeper ConstraintTemplates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper match field documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.13.x/howto/
- OPA Gatekeeper metrics documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- OPA Gatekeeper audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.14.x/audit/
- Sigstore Cosign verification documentation: https://github.com/sigstore/cosign
- Trivy configuration documentation for exit codes and severity filtering: https://trivy.dev/docs/latest/configuration/others/ and https://trivy.dev/docs/latest/configuration/filtering/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Gatekeeper ConstraintTemplate examples used `templates.gatekeeper.sh/v1beta1` and omitted structural schema `type: object` declarations. Updated them to `templates.gatekeeper.sh/v1` and added the required structural schema fields.
- The allowlist and digest policies checked regular and init containers but missed ephemeral containers, which can also carry images. Added ephemeral container checks and added `pods/ephemeralcontainers` to the validating webhook resources.
- The signature verification section showed a Gatekeeper Rego placeholder that always returned false and implied Rego could call an external Cosign verifier directly. Replaced that with text explaining that runtime signature verification should be done through a validation webhook.
- The Prometheus alert referenced `gatekeeper_violations_total`, but Gatekeeper documents the audit metric as `gatekeeper_violations`. Updated the alert expression accordingly.
- The Cosign webhook alert referenced `cosign_verification_failures_total`, but the sample webhook did not expose that metric. Added a Prometheus counter and `/metrics` endpoint to the Python example.
- The Trivy scan command claimed to fail on HIGH/CRITICAL findings, but Trivy exits with code 0 by default even when findings exist. Added `--exit-code 1`.

## Review Notes
- Local `kubectl`, `cosign`, `trivy`, and Ruby/YAML tooling were not installed in the workspace, so CLI validation was performed against official documentation rather than local `--help` output.
- The webhook deployment remains an illustrative example. A production deployment still needs a real image, namespace, public key secret, trusted TLS certificate, and matching `caBundle`.
