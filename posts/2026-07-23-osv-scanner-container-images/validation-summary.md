# Validation Summary: How to Scan Container Images with OSV-Scanner—and Understand Its Coverage

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OSV-Scanner v2 and OSV-Scalibr
- Container image vulnerability scanning
- Docker image pull and save workflows
- Podman Docker-archive export
- OS package and language artifact extraction
- JSON, SARIF, and HTML scan reports
- Container image layers, base images, and CI validation

## Sources Consulted

- [OSV-Scanner container image scanning](https://google.github.io/osv-scanner/usage/scan-image)
- [OSV-Scanner supported artifacts and manifests](https://google.github.io/osv-scanner/supported-languages-and-lockfiles/)
- [OSV-Scanner usage and common scan flags](https://google.github.io/osv-scanner/usage/)
- [OSV-Scanner output formats and return codes](https://google.github.io/osv-scanner/output/)
- [OSV-Scanner configuration and ignore behavior](https://google.github.io/osv-scanner/configuration/)
- [OSV-Scanner v2 migration guide](https://google.github.io/osv-scanner/migration-guide.html)
- [OSV-Scanner v2.4.0 release notes](https://github.com/google/osv-scanner/releases/tag/v2.4.0)
- [OSV-Scanner v2.4.0 HTML server implementation](https://github.com/google/osv-scanner/blob/v2.4.0/cmd/osv-scanner/internal/helper/misc.go)
- [Docker image pull reference](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker image save reference](https://docs.docker.com/reference/cli/docker/image/save/)
- [Docker storage drivers and image layers](https://docs.docker.com/engine/storage/drivers/)
- [Podman save reference](https://docs.podman.io/en/latest/markdown/podman-save.1.html)

## Issues Found

- The post said that no finding meant no extracted package matched known vulnerability data. That was too absolute because configuration ignores, package overrides, selected vulnerability data, and result filters can suppress otherwise relevant matches. Changed the statement to describe an empty result as the absence of a reportable match after the selected data, configuration, and filters are applied.
- The JSON automation example omitted `--all-packages`, while the CI guidance recommends monitoring extracted package and ecosystem counts. Added `--all-packages` and clarified that it includes packages without findings, making the output suitable for complete inventory comparisons.
- The post described `--serve` only as hosting the report locally. OSV-Scanner v2.4.0 constructs a `localhost` URL but binds its HTTP server to `:<port>`, which listens on all network interfaces by default. Clarified the binding behavior and retained the shared-network warning.

## Review Notes

- Verified the documented image-name and Docker-archive scan syntax, the `--archive`, `--format`, `--all-packages`, `--output-file`, and `--serve` flags, and the listed output formats against the official v2.4.0 binary help.
- The seven artifact types listed in the post match the current supported-artifacts page. Canonical Chisel coverage is not yet included in that table, but its default enablement for container scans is explicitly confirmed by the v2.4.0 release notes.
- Exit codes `1`, `127`, and `128` match the current official output documentation.
