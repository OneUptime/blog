# Validation Summary: How to Use Podman with Trivy for Image Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Trivy
- GitHub Actions
- SARIF
- SBOM (SPDX, CycloneDX)
- Containerfile / Dockerfile security scanning

## Sources Consulted
- Trivy installation docs: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy container image scanning docs: https://trivy.dev/docs/dev/guide/target/container_image/
- Trivy filtering docs (`.trivyignore.yaml`): https://trivy.dev/docs/dev/docs/configuration/filtering/
- Trivy reporting docs: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy misconfiguration docs: https://trivy.dev/docs/latest/scanner/misconfiguration/
- Trivy config CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- Trivy image CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy SBOM docs: https://trivy.dev/docs/latest/guide/target/sbom/
- Trivy Action README: https://github.com/aquasecurity/trivy-action
- setup-trivy README: https://github.com/aquasecurity/setup-trivy
- Podman system service docs: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman save docs: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html
- GitHub SARIF upload docs: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- Fedora Trivy package page: https://packages.fedoraproject.org/pkgs/trivy/trivy/
- Distroless image reference: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The original `dnf install` example grouped Fedora and RHEL together, but the official Trivy docs require adding the Trivy repository for RHEL/CentOS. I split the Fedora and RHEL/CentOS instructions and added the documented repository setup.
- The post treated local Podman image scanning as if it worked with no Podman API/socket setup. Trivy’s Podman support requires a local Podman socket or service, so I added the documented socket enable step and updated local image examples to use `--image-src podman`.
- The `.trivyignore.yaml` example used `expires`, but Trivy documents the field as `expired_at`. I corrected the field name and added the required `--ignorefile .trivyignore.yaml` example for YAML ignore files.
- The GitHub Actions workflow built a local Podman image and passed it directly to `trivy-action` via `image-ref`, which is not the documented tarball pattern for this action. I changed the workflow to `podman save` the image and scan it via the action’s `input` parameter, and I added the required `security-events: write` permission for SARIF upload.
- The HTML report example used an install-path-specific template location. I changed it to the portable documented default template reference `@contrib/html.tpl`.
- The base image comparison script used `distroless/static-debian12`, which is not the official fully qualified image reference. I corrected it to `gcr.io/distroless/static-debian12`.
- The Containerfile-specific misconfiguration commands scanned the entire directory without narrowing to Dockerfile/Containerfile checks. I changed them to use `--misconfig-scanners dockerfile` so the examples match the text more precisely.
- The helper scripts relied on local Podman images and tools like `jq`/`column` without making that explicit. I updated the image scan commands to use Podman as the source and added concise dependency notes where needed.

## Review Notes
- Trivy documents Podman image scanning support as experimental, so these examples are accurate for current docs but could require minor updates if Trivy changes that integration later.
- Trivy also documents `.trivyignore.yaml` as experimental and currently expects it to be passed explicitly with `--ignorefile`.
- The SARIF upload example assumes the repository supports GitHub code scanning, as documented by GitHub.
