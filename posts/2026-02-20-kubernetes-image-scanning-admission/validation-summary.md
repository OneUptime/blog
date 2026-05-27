# Validation Summary: How to Block Vulnerable Container Images with Kubernetes Admission Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes admission controllers and validating webhooks
- Trivy and Trivy Operator
- Kyverno image validation policies
- Cosign image signatures and vulnerability attestations
- Helm
- Python Flask admission webhook server

## Sources Consulted
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Trivy Operator Helm installation documentation: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Trivy Operator VulnerabilityReport CRD documentation: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/vulnerability-report/
- Trivy Operator Helm values: https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/helm/values.yaml
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy Cosign vulnerability attestation documentation: https://trivy.dev/docs/latest/supply-chain/attestation/vuln/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Kyverno verify image policy documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/

## Issues Found
- The post described Trivy Operator as an admission webhook that could reject Pods directly. Trivy Operator scans workloads and creates report CRDs; it does not by itself reject admission requests. Updated the section title, explanation, and Helm comment to describe report generation accurately.
- The Kyverno Helm command used `replicaCount=3`, which is not the current documented high-availability setting. Replaced it with controller-specific replica settings from Kyverno's official installation documentation.
- The Kyverno policy examples used deprecated `kyverno.io/v1` `ClusterPolicy` image verification syntax. Replaced them with current `policies.kyverno.io/v1` `ImageValidatingPolicy` examples.
- The Trivy Operator VulnerabilityReport-based Kyverno policy could not reliably block first-time Pod admission because Trivy Operator reports are produced after workload discovery. Replaced it with a signed vulnerability scan attestation policy, which is an admission-time control supported by Kyverno and Cosign.
- The Cosign section only signed the image, but the updated Kyverno policy requires a vulnerability attestation. Added Trivy `--format cosign-vuln` and `cosign attest` / `cosign verify-attestation` commands.

## Review Notes
The custom Flask webhook is illustrative and syntactically valid, but a production implementation should add stronger AdmissionReview input validation, TLS deployment manifests, registry authentication handling, caching, and a deliberate fail-open or fail-closed policy decision.
