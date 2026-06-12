# Validation Summary: How to Implement Trivy for IaC Scanning

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Trivy
- Infrastructure as Code scanning
- Terraform
- Kubernetes manifests
- Helm charts
- AWS CloudFormation
- GitHub Actions
- GitLab CI
- Rego custom policies

## Sources Consulted
- Trivy installation documentation: https://www.trivy.dev/docs/v0.51/getting-started/installation/
- Trivy Terraform misconfiguration scanning documentation: https://trivy.dev/docs/v0.52/tutorials/misconfiguration/terraform/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy config CLI reference: https://trivy.dev/docs/dev/docs/references/configuration/cli/trivy_config/
- Trivy custom checks documentation: https://trivy.dev/docs/dev/docs/scanner/misconfiguration/custom/
- aquasecurity/trivy-action documentation: https://github.com/aquasecurity/trivy-action
- GitHub CodeQL SARIF upload action documentation: https://github.com/marketplace/actions/aqua-security-trivy
- Kubernetes Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- AWS S3 Block Public Access documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- Aqua Vulnerability Database S3 public ACL check: https://avd.aquasec.com/misconfig/aws/s3/avd-aws-0086/
- Terraform AWS provider S3 bucket ACL documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl

## Issues Found
- The Debian/Ubuntu installation commands used the deprecated `apt-key` flow and distribution codename repository path. Updated the commands to use the Trivy-documented keyring flow with `signed-by=/usr/share/keyrings/trivy.gpg` and the `generic` repository.
- The Terraform S3 example used the deprecated inline `acl` argument on `aws_s3_bucket`. Replaced it with `aws_s3_bucket_public_access_block` settings that Trivy can evaluate without relying on the deprecated Terraform AWS provider pattern.
- The Kubernetes example used `runAsRoot`, which is not a valid Kubernetes `securityContext` field. Replaced it with `runAsUser: 0`, which is valid and demonstrates running as root.
- The GitHub Actions workflow uploaded `trivy-results.sarif` without generating SARIF output. Updated the Trivy action step to use SARIF format, write `trivy-results.sarif`, use a pinned current action version, add the required `security-events: write` permission, and use the current SARIF upload action version.
- The Trivy configuration file showed an invalid `misconfiguration.skip-checks` key. Replaced it with supported Trivy configuration keys: `misconfiguration.scanners`, `include-non-failures`, `ignorefile`, and `vulnerability.ignore-unfixed`.
- The custom policy command used the obsolete/incorrect `--policy` flag for Trivy config scanning. Updated it to `--config-check` and `--check-namespaces`.
- The Rego custom policy example did not follow Trivy's current custom check result shape and used an uncertain Terraform input structure. Replaced it with a Kubernetes custom check using Trivy metadata and `result.new`.

## Review Notes
- The sample Trivy output is illustrative and may vary by Trivy version, checks bundle version, and enabled checks.
- S3 encryption checks can be nuanced because AWS applies default SSE-S3 encryption to new object uploads, but explicit encryption and customer-managed key requirements may still be reported by policy checks depending on the rule.
