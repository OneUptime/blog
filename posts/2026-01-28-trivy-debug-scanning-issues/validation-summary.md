# Validation Summary: How to Debug Trivy Scanning Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Trivy CLI
- Container image vulnerability scanning
- Docker image archives
- GitHub Actions
- GitLab CI
- Shell scripting
- HTTP proxy configuration

## Sources Consulted
- Trivy CLI reference for `trivy image`: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy CLI reference for `trivy clean`: https://trivy.dev/docs/latest/references/configuration/cli/trivy_clean/
- Trivy database configuration documentation: https://trivy.dev/docs/latest/configuration/db/
- Trivy filtering and `.trivyignore` documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy client/server mode documentation: https://trivy.dev/docs/latest/references/modes/client-server/
- Trivy cache documentation: https://trivy.dev/docs/latest/configuration/cache/
- Trivy troubleshooting documentation: https://trivy.dev/docs/latest/references/troubleshooting/
- Trivy private registry authentication documentation: https://trivy.dev/docs/latest/advanced/private-registries/
- Trivy GitLab CI integration documentation: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/

## Issues Found
- The database download section recommended setting `GITHUB_TOKEN` to avoid DB rate limiting. Current Trivy troubleshooting documentation states `GITHUB_TOKEN` does not help with vulnerability database and asset rate limits. I changed this to remove expired GHCR credentials with `docker logout ghcr.io` and `unset GITHUB_TOKEN`, and adjusted the flowchart wording.
- The local image archive example used `trivy image --input nginx.tar nginx:latest` without creating `nginx.tar`. Current Trivy syntax uses `--input` with the archive path instead of an image name. I added `docker save nginx:latest -o nginx.tar` and removed the extra image argument.
- The timeout section described `--ignore-unfixed` as scanning specific layers. That flag displays only fixed vulnerabilities. I corrected the comment.
- The post used the old `--vuln-type` flag. Current Trivy uses `--pkg-types os` and `--pkg-types library`, so I updated all examples.
- The parallel scan example reused the filesystem cache across concurrent image scans, which can cause cache lock errors. I added `--cache-backend memory` to the parallel scan command.
- The post used `trivy image --reset`, which is not present in the current CLI reference. I replaced it with `trivy clean --vuln-db` followed by a normal scan.
- The `.trivyignore` expiration example had the expiration token before the CVE ID. Current `.trivyignore` syntax places the ID first, followed by `exp:yyyy-mm-dd`. I corrected the example.
- The GitLab CI snippet used a custom `debug` stage without declaring it and did not clear the Trivy container entrypoint. I added a `stages` list and `entrypoint: [""]`, matching the official Trivy GitLab CI pattern.
- The server mode example used outdated `trivy client --remote` syntax. Current client mode uses `trivy image --server http://... IMAGE`, so I updated the command.

## Review Notes
The post is technically relevant and valid after the corrections. Some examples remain operationally environment-dependent, such as proxy settings, registry access, Docker availability, and network connectivity to `ghcr.io`, but the commands and configuration patterns are current and consistent with official Trivy documentation.
