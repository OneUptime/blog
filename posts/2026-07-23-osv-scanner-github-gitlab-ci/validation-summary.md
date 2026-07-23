# Validation Summary: How to Run OSV-Scanner in GitHub Actions and GitLab CI with Useful Exit Codes

## Status

validated

## Post Type

Technical guide / CI configuration tutorial

## Technologies Covered

- OSV-Scanner v2.3.8
- GitHub Actions reusable workflows
- GitHub code scanning and SARIF
- GitLab CI/CD
- Docker / GitHub Container Registry
- POSIX shell exit-code handling
- JSON vulnerability reports

## Sources Consulted

- [OSV-Scanner GitHub Action documentation](https://google.github.io/osv-scanner/github-action/)
- [OSV-Scanner Action v2.3.8 pull-request reusable workflow](https://github.com/google/osv-scanner-action/blob/v2.3.8/.github/workflows/osv-scanner-reusable-pr.yml)
- [OSV-Scanner Action v2.3.8 full-scan reusable workflow](https://github.com/google/osv-scanner-action/blob/v2.3.8/.github/workflows/osv-scanner-reusable.yml)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner v2 usage and container instructions](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner v2.3.8 CLI flag definitions](https://github.com/google/osv-scanner/blob/v2.3.8/cmd/osv-scanner/internal/helper/flags.go)
- [OSV-Scanner v2.3.8 exit-code implementation](https://github.com/google/osv-scanner/blob/v2.3.8/cmd/osv-scanner/internal/cmd/run.go)
- [OSV-Scanner v2.3.8 release container Dockerfile](https://github.com/google/osv-scanner/blob/v2.3.8/goreleaser.dockerfile)
- [GitHub documentation for reusable workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [GitLab documentation for Docker images and entrypoint overrides](https://docs.gitlab.com/ci/docker/using_docker_images/)
- [GitLab CI/CD YAML reference for job artifacts](https://docs.gitlab.com/ci/yaml/)

## Issues Found

- The GitLab section said that JSON output goes to stdout even though its command uses `--output-file=osv-results.json`. In OSV-Scanner v2.3.8, that flag writes the JSON report to the named file. The sentence was corrected to say that JSON is written to `osv-results.json` while diagnostics remain on stderr in the job log.

## Review Notes

- The v2.3.8 release binary was checksum-verified and exercised directly. The documented command accepts `scan source`, `--recursive`, `--format=json`, and `--output-file`; scanning an empty directory returned exit code `128` as described.
- The GitHub workflow references, permissions, inputs, default SARIF upload behavior, default vulnerability-failure behavior, PR comparison behavior, and artifact-download support match the pinned v2.3.8 official workflows and documentation.
- The GitLab image reference and `/osv-scanner` binary path match the v2.3.8 release container. Its Dockerfile sets `/osv-scanner` as the entrypoint, and GitLab documents `entrypoint: [""]` as the supported override syntax.
- Version-specific details should be revalidated when the workflow or container pin is updated from v2.3.8.
