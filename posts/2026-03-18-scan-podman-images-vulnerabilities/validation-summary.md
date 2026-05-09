# Validation Summary: How to Scan Podman Images for Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Trivy
- Grype
- Shell scripting
- Vulnerability scanning

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy container image scanning documentation: https://trivy.dev/docs/latest/guide/target/container_image/
- Trivy image CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_image/
- Trivy reporting documentation: https://trivy.dev/latest/docs/configuration/reporting/
- Trivy filtering documentation: https://trivy.dev/docs/latest/guide/configuration/filtering/
- Grype README and installation guidance: https://github.com/anchore/grype
- Grype command line reference: https://oss.anchore.com/docs/reference/grype/cli/
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman save documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html

## Issues Found
- The Trivy package installation examples used bare `dnf install trivy` and `apt-get install trivy` commands without adding the official Trivy repositories. Updated the examples to add Aqua Security's official RPM and DEB repositories before installing.
- The post said Trivy can scan Podman's local storage directly without mentioning that local Podman image scanning requires the Podman socket. Added the `systemctl --user enable --now podman.socket` step and clarified the wording.
- The Grype example comment said `--fail-on critical` shows only critical vulnerabilities. Grype's `--fail-on` changes the exit code when findings at or above the severity threshold exist; it does not filter displayed results. Updated the comment to describe the actual behavior.
- The Trivy HTML report example used `/usr/share/trivy/templates/html.tpl`. Trivy's reporting documentation lists `/usr/local/share/trivy/templates/html.tpl` for RPM-installed default templates. Updated the template path.

## Review Notes
- The Trivy and Grype scan commands, JSON output flags, Trivy `--input` archive scan, Trivy `.trivyignore` usage, Podman `save`, and Podman `images --format` examples are consistent with the referenced documentation.
- Grype can explicitly target Podman with the `podman:` source prefix when scanning a local Podman image; the current example uses a fully qualified registry image and is valid.
