# Validation Summary: How to Configure Atlantis with GitLab for Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Atlantis
- Terraform
- GitLab merge requests
- GitLab webhooks
- GitLab CI/CD
- Kubernetes
- Trivy

## Sources Consulted
- Atlantis server configuration: https://www.runatlantis.io/docs/server-configuration
- Atlantis Git host access credentials: https://www.runatlantis.io/docs/access-credentials.html
- Atlantis webhook configuration: https://www.runatlantis.io/docs/configuring-webhooks.html
- Atlantis repo-level atlantis.yaml configuration: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html
- Atlantis server-side repo configuration: https://www.runatlantis.io/docs/server-side-repo-config
- Atlantis command requirements: https://www.runatlantis.io/docs/command-requirements
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab webhook events: https://docs.gitlab.com/user/project/integrations/webhook_events/
- GitLab group webhooks API: https://docs.gitlab.com/api/group_webhooks/
- GitLab merge request pipelines: https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
- GitLab merge request approvals: https://docs.gitlab.com/user/project/merge_requests/approvals/
- GitLab Kubernetes cluster integration documentation: https://docs.gitlab.com/user/infrastructure/clusters/
- Aqua Security tfsec repository and migration guidance: https://github.com/aquasecurity/tfsec
- Trivy config command documentation: https://trivy.dev/latest/docs/references/configuration/cli/trivy_config/
- Trivy Docker image documentation: https://hub.docker.com/r/aquasec/trivy

## Issues Found
- Corrected GitLab token scope guidance from `api`, `read_repository`, and `write_repository` to the Atlantis-documented `api` scope. The previous description also incorrectly described `write_repository` as being used for status updates; Atlantis updates GitLab commit statuses through the API.
- Fixed the merge request workflow Markdown code fence so the nested Terraform plan fence renders correctly.
- Clarified that Atlantis creates GitLab commit statuses and added the `--pending-apply-status` caveat for blocking merges until all planned changes are applied.
- Replaced tfsec examples with Trivy because tfsec has been folded into Trivy and Aqua recommends migration to Trivy for configuration scanning.
- Fixed invalid `repos.yaml` syntax by changing `id: "/.*/""` to `id: /.*/`.
- Updated the deprecated "GitLab-Managed Kubernetes" wording to a generic Kubernetes deployment, since GitLab's certificate-based managed cluster feature is deprecated.
- Removed `--ssl-cert-file` from the self-managed GitLab client-trust example. That flag is for Atlantis' web TLS certificate, not for trusting a self-signed GitLab CA; the article already correctly instructs adding the CA certificate to the container trust store.
- Updated troubleshooting guidance so clone failures point to the `api` scope and project membership, matching Atlantis' GitLab credential documentation.

## Review Notes
The post uses Terraform `1.7.0` examples. The Atlantis configuration syntax remains valid, but future revisions could update the example Terraform version and pin container images instead of using `latest` for more reproducible deployments.
