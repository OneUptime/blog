# Validation Summary: How to Implement Image Scanning in ArgoCD Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD Image Updater
- Kubernetes Jobs, ConfigMaps, and Services
- GitHub Actions
- Docker registry authentication
- Trivy container image scanning
- Kyverno admission policies and image verification
- Cosign vulnerability attestations
- Redis-backed Trivy caching
- AWS S3 report storage

## Sources Consulted
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Image Updater application configuration: https://argocd-image-updater.readthedocs.io/en/latest/configuration/applications/
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/latest/configuration/images/
- Trivy CLI image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy cache configuration: https://trivy.dev/v0.50/docs/configuration/cache/
- Trivy vulnerability attestation tutorial: https://trivy.dev/docs/v0.52/tutorials/signing/vuln-attestation/
- Trivy Kyverno tutorial: https://trivy.dev/docs/dev/tutorials/kubernetes/kyverno/
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Docker login-action README: https://github.com/docker/login-action
- GitHub Actions Docker image publishing guide: https://docs.github.com/actions/guides/publishing-docker-images
- Kyverno ImageValidatingPolicy documentation: https://kyverno.io/docs/policy-types/image-validating-policy/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno Require Image Vulnerability Scans sample policy: https://kyverno.io/policies/other/require-vulnerability-scan/require-vulnerability-scan/
- Sigstore Cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/

## Issues Found
- The Argo CD Image Updater example used legacy Application annotations as the primary configuration. Updated it to the current `ImageUpdater` custom resource format with `applicationRefs`, `commonUpdateSettings`, `allowTags`, and `pullSecret`.
- The CI workflow built and pushed `${{ github.sha }}` tags while Image Updater was configured to allow only semantic version tags. Changed the workflow to run on `v*.*.*` tags and use `${{ github.ref_name }}`, so pushed tags match the updater policy.
- The CI workflow pushed to a private registry without authenticating and used `aquasecurity/trivy-action@master`. Added `docker/login-action@v3` and changed Trivy Action to a versioned tag shown in the official action documentation.
- The "dynamic image extraction" PreSync hook queried live Kubernetes Deployments, StatefulSets, and DaemonSets. During PreSync this reads the current cluster state, not the desired manifests Argo CD is about to apply. Replaced it with a PreSync ConfigMap from Git and a scan Job that reads that desired image list.
- The Kyverno policy used the deprecated `ClusterPolicy` style for image verification and attempted to check a non-documented `result` expression. Updated it to the stable `policies.kyverno.io/v1` `ImageValidatingPolicy` API with `matchImageReferences`, a Cosign attestor, an in-toto vulnerability attestation, and `verifyAttestationSignatures`.
- The Kyverno description and explanatory text claimed the policy directly proved zero critical vulnerabilities. Adjusted the wording to state that Kyverno verifies a signed vulnerability attestation, and that the zero-critical gate comes from signing attestations only after the CI Trivy severity gate passes.
- The scan report Job used `aquasec/trivy:latest` but also ran `aws s3 cp`, which requires the AWS CLI. Changed the image to an explicit custom image that includes both Trivy and AWS CLI.

## Review Notes
- The Trivy server Redis cache example assumes a Redis service named `redis` is already deployed and reachable in the `security` namespace.
- For production CI security, pinning GitHub Actions to immutable commit SHAs would be stronger than version tags.
