# Validation Summary: How to Implement Security Scanning in GitOps Pipeline with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository resources
- Flux Kustomization resources
- Flux notification Alerts and Providers
- Kyverno ClusterPolicy validation policies
- Trivy Operator
- SOPS and Sealed Secrets workflows
- Kubernetes CronJob resources

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux notification Alerts and API reference: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kyverno installation documentation: https://main.kyverno.io/docs/installation/installation/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno condition operator documentation: https://kyverno.io/docs/policy-types/cluster-policy/preconditions/
- Trivy Operator Helm installation documentation: https://aquasecurity.github.io/trivy-operator/latest/getting-started/installation/helm/
- Trivy Operator Helm chart values: https://raw.githubusercontent.com/aquasecurity/trivy-operator/v0.30.1/deploy/helm/values.yaml
- Trivy Operator VulnerabilityReport documentation: https://aquasecurity.github.io/trivy-operator/v0.18.3/docs/crds/vulnerability-report/

## Issues Found
- The introduction and architecture described policy checks as happening before resources reach the cluster. Kyverno admission policies run when resources are admitted to the Kubernetes API, so the wording and diagram were changed to "admitted to your cluster" and "Admission Policy Check."
- The Kyverno and Trivy HelmRelease examples placed the HelmRelease in the same namespace that `install.createNamespace` was expected to create. Flux still needs the HelmRelease object's namespace to exist before it can reconcile the object, so the examples now place HelmRelease resources in `flux-system` and use `targetNamespace` for `kyverno` and `trivy-system`.
- Kyverno policies used the deprecated top-level `spec.validationFailureAction`. The examples now use `validate.failureAction`, which is the current documented field.
- The Flux Kustomization dependency comment implied a dependency on Kyverno generally. Flux `dependsOn` references another Flux Kustomization, so the comment now states that the dependency is on a Flux Kustomization named `kyverno`.
- The plaintext Secret policy checked a non-documented `kustomize.toolkit.fluxcd.io/decryptor` annotation. Flux SOPS decryption does not rely on that annotation, so the policy was changed to an admission-time rule that restricts direct Secret writes to the Flux kustomize-controller and common Sealed Secrets controller service accounts.
- The Secret policy uses admission request user information, which is not suitable for background scans. `background: false` was added.
- Flux notification Alert and Provider examples used `notification.toolkit.fluxcd.io/v1`, but Alert and Provider are currently documented under `notification.toolkit.fluxcd.io/v1beta3`. The API versions were corrected.
- The Alert example used the deprecated `summary` field. It now uses `eventMetadata.summary`.
- The best-practices section referenced the deprecated Kyverno `validationFailureAction` field. It now refers to `failureAction`.

## Review Notes
- The Trivy Operator values shown in the post are present in the current chart values reviewed. The broad chart version constraint `0.x` is valid as a semver-style constraint but may allow future breaking chart changes within the major-zero release line; pinning an exact chart version is safer for production.
- The CronJob report example is syntactically valid, but a real deployment also needs RBAC granting the `security-reporter` service account permission to list Trivy and policy report CRDs.
- The post mentions kubeaudit in the title metadata and introduction but does not include a kubeaudit integration example.
