# Validation Summary: How to Integrate Docker Scout into CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / CI/CD integration guide

## Technologies Covered
- Docker
- Docker Scout CLI
- Docker Scout GitHub Action
- GitHub Actions
- GitLab CI/CD
- Jenkins Pipeline
- SARIF
- GitLab container scanning reports
- Bash and jq

## Sources Consulted
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- Docker Scout CVE command reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout SBOM command reference: https://docs.docker.com/reference/cli/docker/scout/sbom/
- Docker Scout CI integration overview: https://docs.docker.com/scout/integrations/ci/
- Docker Scout GitHub Actions integration: https://docs.docker.com/scout/integrations/ci/gha/
- Docker Scout GitLab CI/CD integration: https://docs.docker.com/scout/integrations/ci/gitlab/
- Docker Scout Jenkins integration: https://docs.docker.com/scout/integrations/ci/jenkins/
- Docker Scout GitHub Action README: https://github.com/docker/scout-action
- Docker login action README/releases: https://github.com/docker/login-action
- Docker Buildx setup action README/releases: https://github.com/docker/setup-buildx-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- GitLab artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Jenkins Pipeline credentials documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/

## Issues Found
- `docker scout cves --format json` was used in the GitLab, Jenkins, and generic CI examples, but the current Docker Scout CVE command does not support a generic `json` format. I changed GitLab and the generic script to use `--format gitlab`, and changed Jenkins to generate a SARIF report with `--format sarif --output`.
- The GitLab example generated the report after the `--exit-code` gate, so a failed vulnerability gate could prevent the report artifact from being created. I moved report generation before the gated scan.
- The GitLab example used `curl` in the `docker:24` image without installing it. I added `apk add --no-cache curl` before installing the Scout CLI.
- The PR comment GitHub Actions example did not grant `pull-requests: write`, which Docker Scout requires to create PR comments when repository token permissions are restricted. I added the required job permissions.
- The GitHub Actions examples used older major versions of Docker and CodeQL actions. I updated Docker login/setup-buildx actions to v4 and the SARIF upload action to v4.
- The Jenkins Docker Hub login used Groovy interpolation for credential variables. I changed it to single-quoted shell expansion to match Jenkins credentials handling guidance and reduce accidental credential exposure risk.
- The generic script used a jq query that assumed lowercase severity values and a direct `.vulnerabilities[]` array without null safety. I updated it to match GitLab-format reports more defensively with case normalization.
- The generic script used `jq` but did not list it as a prerequisite. I added a prerequisite note.

## Review Notes
- The local Docker installation in this review environment did not include the Docker Scout CLI plugin, so CLI flags were verified against official Docker documentation rather than local `docker scout --help`.
- The examples assume CI runners have Docker daemon access. GitLab Docker-in-Docker jobs also require a runner configuration that permits Docker-in-Docker.
