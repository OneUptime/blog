# Validation Summary: How to Set Up Image Scanning Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes ImagePolicyWebhook admission controller
- Kyverno policies and image verification
- Trivy Operator VulnerabilityReport resources
- OPA Gatekeeper ConstraintTemplates
- Cosign and Sigstore image signatures
- Kubernetes policy reporting

## Sources Consulted
- Kubernetes admission controller documentation, including ImagePolicyWebhook configuration and runtime API requirement: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes webhook admission configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-webhookadmission.v1/
- Talos Linux MachineConfig reference for `cluster.apiServer.extraArgs`, `extraVolumes`, and admission configuration: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Kyverno installation documentation for current Helm high-availability values: https://kyverno.io/docs/installation/installation/
- Kyverno validate rule documentation for `validate.failureAction`: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno policy settings documentation for deprecated `validationFailureAction` and `webhookTimeoutSeconds`: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Kyverno variables and foreach/API call documentation: https://kyverno.io/docs/policy-types/cluster-policy/variables/ and https://kyverno.io/docs/policy-types/cluster-policy/external-data-sources/
- Kyverno verifyImages Sigstore documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Trivy Operator CRD documentation for namespaced `VulnerabilityReport` and report fields: https://aquasecurity.github.io/trivy-operator/latest/docs/crds/
- Trivy Operator installation and usage documentation: https://aquasecurity.github.io/trivy-operator/latest/
- Gatekeeper installation and ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/ and https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The ImagePolicyWebhook Talos example omitted the required `imagepolicy.k8s.io/v1alpha1` runtime API enablement and did not provide the kubeconfig file required by Kubernetes to reach the TLS webhook backend. Added `runtime-config`, mounted the kubeconfig, and included a kubeconfig skeleton with certificate placeholders.
- The Kyverno Helm install used the older `replicaCount` chart value. Updated it to the current per-controller replica settings for admission, background, cleanup, and reports controllers.
- The Kyverno policies used deprecated top-level `spec.validationFailureAction`. Updated validation policies to use `validate.failureAction: Enforce`.
- The scan requirement policy referenced `images.containers.*.registry_url`, which is not a Kyverno image variable and did not prove that Trivy had scanned the image. Replaced it with a CI scan marker policy that accurately requires `scan.myorg.io/trivy-status=passed`.
- The digest requirement policy only checked regular containers. Updated it to check init, regular, and ephemeral containers.
- The Trivy Operator policy compared a full image reference to `report.artifact.repository`, which is not the same field shape in Trivy Operator reports. Updated it to query namespaced `VulnerabilityReport` objects and match against the report's registry, repository, and digest fields.
- The Trivy Operator policy used `background: true` even though it depends on admission request context and API calls. Set it to `background: false`.
- The Kyverno signature verification example used deprecated `webhookTimeoutSeconds` and lacked per-image `failureAction`. Updated it to `webhookConfiguration.timeoutSeconds` and `verifyImages[].failureAction`.
- The Gatekeeper registry policy only checked regular containers. Updated the Rego to evaluate regular, init, and ephemeral containers.

## Review Notes
- The ImagePolicyWebhook example still requires an actual HTTPS backend service and real certificate data; Kubernetes does not perform vulnerability scanning by itself.
- The Trivy Operator admission policy can only make decisions from reports that already exist. New images may need to be scanned in CI first or deployed through a controlled pre-scan workflow before strict enforcement is enabled.
