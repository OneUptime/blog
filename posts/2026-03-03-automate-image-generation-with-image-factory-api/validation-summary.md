# Validation Summary: How to Automate Image Generation with Image Factory API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos Image Factory (factory.talos.dev) REST API
- curl, wget, jq, bash scripting
- GitHub Actions (CI/CD workflow)
- Python 3 with the `requests` and `PyYAML` libraries
- OCI image references (installer image)

## Sources Consulted
- Image Factory project source and README: https://github.com/siderolabs/image-factory
- Talos Linux Image Factory documentation: https://www.talos.dev/latest/talos-guides/install/boot-assets/#image-factory
- Image Factory public service: https://factory.talos.dev
- Talos boot assets and schematic format reference (siderolabs/image-factory `pkg/schematic`)

## Issues Found
No technical issues found.

Verified specifically:
- `POST /schematics` accepts a YAML (or JSON) schematic body and returns `{"id": "<sha256-hex>"}`. The example ID `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba` is a valid 64-character SHA256 hex string, matching the actual ID format.
- `GET /versions` returns a JSON array of supported Talos versions.
- `GET /version/{version}/extensions/official` returns the official extensions list for the given version.
- Image URL pattern `https://factory.talos.dev/image/{schematic-id}/{version}/{image-type}` is correct.
- Installer image reference `factory.talos.dev/installer/{id}:{ver}` is the documented OCI reference format.
- Asset filenames are accurate for the listed platforms: `metal-amd64.iso`, `metal-arm64.iso`, `aws-amd64.raw.xz`, `aws-arm64.raw.xz`, `azure-amd64.vhd.xz`, `vmware-amd64.ova`.
- The schematic format `customization.systemExtensions.officialExtensions` and `customization.extraKernelArgs` matches the schematic struct defined by Image Factory.
- The `Content-Type: application/yaml` header is appropriate; Image Factory's `/schematics` endpoint also accepts JSON, but YAML works as shown.
- All bash scripts use valid syntax (`set -euo pipefail`, parameter expansion defaults, `curl -w '%{http_code}'`, backgrounded subshells with `wait`).
- The GitHub Actions workflow uses current major versions (`actions/checkout@v4`, `actions/upload-artifact@v4`).
- The Python wrapper correctly serializes the schematic to YAML and posts it with the matching Content-Type, and uses `response.raise_for_status()` for error handling.

## Review Notes
- The post uses Talos `v1.7.0` as the example version. v1.7.0 was released in April 2024; by the post's publication context (2026) much newer Talos versions exist, but using an explicit fixed version in examples is conventional and not technically incorrect. Readers should substitute the version they intend to deploy.
- The Python wrapper imports `json`, `sys`, and `hashlib` but does not use them. This is a stylistic issue, not a technical error, and was left alone per the instruction not to make stylistic changes.
- Image Factory's `/schematics` endpoint also accepts JSON bodies (with `Content-Type: application/json`); the post's choice to standardize on YAML is fine and consistent.
- The `--head` flag with `curl -X HEAD` style is approximated using `curl --head` in the availability checker, which is correct; Image Factory responds to HEAD requests on image URLs.
- No retries/backoff are demonstrated in the example scripts even though the best-practices section recommends them — this is a documented gap rather than incorrect content.
