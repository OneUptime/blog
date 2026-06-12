# Validation Summary: How to Build Container Scanning Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Trivy
- Grype
- Syft and SBOM generation
- GitHub Actions
- GitLab CI
- AWS ECR image scanning
- Harbor registry vulnerability scanning
- Kubernetes CronJobs
- Docker base images, Distroless images, and Chainguard Containers
- Prometheus alerting
- Express.js webhook handling

## Sources Consulted
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy GitLab CI integration guide: https://trivy.dev/docs/v0.51/tutorials/integrations/gitlab-ci/
- Aqua Security Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Anchore Grype configuration reference: https://oss.anchore.com/docs/reference/grype/configuration/
- Anchore Grype filtering guide: https://oss.anchore.com/docs/guides/vulnerability/filter-results/
- Anchore scan-action README: https://github.com/anchore/scan-action
- Anchore sbom-action README: https://github.com/anchore/sbom-action
- Amazon ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR enhanced scanning configuration: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced-enabling.html
- Harbor vulnerability scanning documentation: https://goharbor.io/docs/2.6.0/administration/vulnerability-scanning/
- Harbor Scanner Adapter for Trivy: https://github.com/aquasecurity/harbor-scanner-trivy
- GoogleContainerTools Distroless README: https://github.com/GoogleContainerTools/distroless
- Chainguard Containers overview: https://edu.chainguard.dev/chainguard/chainguard-images/overview/
- Chainguard static image documentation: https://images.chainguard.dev/directory/image/static/overview
- GitHub CodeQL upload-sarif action metadata: https://github.com/github/codeql-action/blob/main/upload-sarif/action.yml
- GitHub attest-sbom action metadata: https://github.com/actions/attest-sbom/blob/master/action.yml

## Issues Found
- The Grype `--scope all-layers` example was described as scanning specific file types. Updated the comment to state that it includes vulnerabilities from all image layers, matching Grype's image scope behavior.
- The Trivy GitHub Action examples used `aquasecurity/trivy-action@master`. Updated them to the current documented release tag `v0.36.0`.
- The Grype GitHub Action example used `anchore/scan-action@v4`. Updated it to the current documented major version `v7`.
- The GitHub Actions examples uploading SARIF and creating attestations omitted required token permissions. Added `security-events: write` for SARIF upload and added `id-token: write` plus `attestations: write` in the complete pipeline.
- The AWS ECR basic scanning comment said it uses Clair. Current AWS documentation describes ECR basic scanning as AWS native scanning, so the comment was updated.
- The Harbor API snippet was fenced as YAML even though it contained HTTP requests with JSON bodies. Updated the code fence to `http` and removed YAML-style comments.
- The `.trivy.yaml` example used outdated or incorrect config structure for `ignore-unfixed` and package type filtering. Updated it to use `vulnerability.ignore-unfixed` and `pkg.types`.
- The `.grype.yaml` example used scalar `output: table`, while current Grype configuration documents `output` as a list. Updated it to `output: [table]` in YAML list form.
- The base image comparison table used exact image sizes and CVE counts that are time-sensitive and not stable. Replaced them with relative size and scanner-noise guidance.
- The Distroless examples used Debian 12 Node/Java tags that are no longer listed in the current Distroless README. Updated Distroless examples and table entries to Debian 13 tags.
- The Chainguard section claimed a "Zero CVE Base". Updated the heading to "Low-CVE Bases" to avoid an absolute claim that can change as vulnerability databases update.

## Review Notes
- YAML snippets were parsed after editing with PyYAML and passed.
- Some examples still use floating tags such as `latest` for scanner container images and Chainguard images. This is common for short tutorials, but production pipelines should pin versions or digests for reproducibility.
