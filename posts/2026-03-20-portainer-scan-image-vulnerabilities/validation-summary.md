# Validation Summary: How to Scan Docker Images for Vulnerabilities via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Trivy
- GitHub Actions
- Portainer Business Edition
- SARIF
- `.trivyignore`

## Sources Consulted
- Trivy CLI reference for `trivy image`: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy installation docs for running Trivy as a container: https://trivy.dev/docs/dev/getting-started/installation/
- Trivy filtering docs for `.trivyignore` syntax and `exp:` dates: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy Action repository README: https://github.com/aquasecurity/trivy-action
- Trivy Action releases page: https://github.com/aquasecurity/trivy-action/releases
- GitHub Docs on uploading SARIF files for code scanning: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Portainer docs for the Images view: https://docs.portainer.io/user/docker/images
- Portainer docs for stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer docs for service webhooks: https://docs.portainer.io/user/docker/services/webhooks
- Portainer reference architecture, December 2025: https://downloads.portainer.io/reference_architecture/portainer-kubernetes-management-platform-reference-architecture-dec2025.pdf

## Issues Found
- The GitHub Actions example used `aquasecurity/trivy-action@master`. I changed it to `aquasecurity/trivy-action@v0.35.0`, which is the current released tag on the official releases page, so the example is pinned to a published release instead of a moving branch.
- The SARIF example comment implied that generating a SARIF file alone populates the GitHub Security tab. I changed the wording to clarify that the SARIF file is for later upload to GitHub code scanning.
- The `.trivyignore` example used inline trailing comments after CVE IDs. I changed it to the documented `.trivyignore` format and used `exp:2026-06-01` for the review date.
- The final Portainer section incorrectly claimed that Portainer Business Edition provides built-in image vulnerability scanning from the Images view. I corrected it to reflect current Portainer documentation: deployment webhooks can integrate with Portainer workflows, but vulnerability scanning remains external to Portainer.

## Review Notes
- The Trivy CLI flags used in the Docker examples (`--severity`, `--exit-code`, `--ignore-unfixed`, `--format`, and `--output`) match current Trivy documentation.
- The `aquasec/trivy:latest` container tag is valid, but pinning a specific Trivy image version would improve reproducibility in the future.
- The Compose image extraction one-liner is acceptable for simple Compose files, but complex YAML structures would be better handled with a YAML-aware parser if this post is expanded later.
