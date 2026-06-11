# Validation Summary: How to Implement Deployment Gates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions
- GitHub deployment environments and protection rules
- GitHub CodeQL code scanning
- GitLab CI/CD
- Azure DevOps YAML pipelines, environments, approvals, and checks
- npm audit
- Trivy
- Bash
- Python datetime
- Mermaid diagrams

## Sources Consulted
- GitHub Docs: Managing environments for deployment - https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub CodeQL Action documentation - https://github.com/github/codeql-action
- GitHub Docs: Workflow configuration options for CodeQL code scanning - https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options
- GitHub Changelog: Upcoming deprecation of CodeQL Action v3 - https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Control how jobs run - https://docs.gitlab.com/ci/jobs/job_control/
- Microsoft Learn: Pipeline deployment approvals and checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Microsoft Learn: Invoke Azure Function / REST API checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/invoke-checks
- Microsoft Learn: Deployment gates concepts for classic release pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/approvals/gates
- npm Docs: npm audit - https://docs.npmjs.com/cli/v8/commands/npm-audit/
- Trivy Docs: trivy image CLI reference - https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Python Docs: datetime - https://docs.python.org/3/library/datetime.html

## Issues Found
- The GitHub Actions coverage gate used `[ "$COVERAGE" -lt 80 ]`, which only supports integers and can mishandle decimal coverage values. Changed it to an `awk` numeric comparison.
- The GitHub Actions CodeQL example called `github/codeql-action/analyze@v3` without initializing CodeQL first. Added `github/codeql-action/init@v4`, updated `analyze` to `@v4`, and added the required `contents: read` and `security-events: write` workflow permissions for advanced setup.
- The Azure DevOps section described YAML environment settings as "gates" and included "Query work items" as a common environment check. Updated the wording to distinguish classic release gates from YAML approvals/checks, and replaced that item with Business Hours, which is an environment check.
- The incident gate used `curl -s`, which would not fail on HTTP error responses. Changed it to `curl -sf` so API failures fail the gate.
- The Python deployment window gate used `datetime.utcnow()`, which is deprecated in Python 3.12+. Changed it to `datetime.now(timezone.utc)`.

## Review Notes
The examples are still illustrative and assume project-specific scripts, coverage output, CI runner images, and tools such as `jq`, `bc`, and `trivy` are available in the execution environment. Future improvements could pin action versions by SHA for higher supply-chain assurance, but the current major-version examples are technically valid.
