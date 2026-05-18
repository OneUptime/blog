# Validation Summary: How to Set Up Zot Container Registry on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Zot OCI container registry
- OCI Distribution Specification
- Ubuntu (systemd, useradd, openssl, apache2-utils/htpasswd)
- Docker CLI (login/push/pull, certs.d trust)
- Cosign (image signing, SBOM attachment)
- S3-compatible object storage (storage driver)
- htpasswd / bcrypt basic authentication
- Prometheus metrics extension

## Sources Consulted
- Project repository and release list: https://github.com/project-zot/zot/releases (latest tag at review time: v2.1.16, published 2026-04-19)
- Official example configs in `project-zot/zot/examples/`:
  - `config-allextensions.json`, `config-search.json`, `config-ui.json`, `config-metrics.json`
  - `config-sync.json`, `config-docker-compat-sync.json`, `config-sync-cloud-storage.json`
  - `config-s3.json`, `config-gc.json`, `config-gc-periodic.json`
  - `config-policy.json`, `config-anonymous-authz.json`
- Zot documentation: https://zotregistry.dev/v2.1.2/articles/authn-authz/ (accessControl schema)
- Zot documentation: https://zotregistry.dev/v2.1.2/admin-guide/admin-getting-started/ (`zot serve <config>` syntax)
- Container image listing: https://github.com/project-zot/zot/pkgs/container/zot-linux-amd64 (confirmed `latest` tag exists)

## Issues Found

1. **Incorrect `accessControl` JSON structure (Enabling Authentication section).** The post placed `accessControl` at the top level of the config and defined per-user repository permissions in a flat `policies` array containing a non-existent `repositories` field on each entry. Per the official schema (`examples/config-policy.json` and the authn-authz docs), `accessControl` must be **inside the `http` block**, and per-repository policies must be nested as `accessControl.repositories["<glob>"].policies[]` — not as a top-level array. The config as published would fail to parse / would not grant the intended permissions. Fixed by moving `accessControl` inside `http` and restructuring the developer policy under explicit `dev/**` and `staging/**` repository entries.

2. **Outdated version pin (Installing Zot section).** The post pinned `VERSION="2.0.2"` while describing it as "the latest Zot binary." v2.0.2 was released in 2023; as of the review date (2026-05-18) the current stable is v2.1.16. Updated `VERSION` to `2.1.16` and added `sudo` to the `curl -Lo /usr/local/bin/zot ...` line so the write to `/usr/local/bin` does not fail under a non-root shell.

3. **`distSpecVersion` bumped to current.** The post used `"distSpecVersion": "1.1.0"` in all three config blocks. All current official examples (v2.1.x) declare `"1.1.1"`. Updated for consistency with the upgraded Zot version; v1.1.0 was not strictly wrong but mismatched the binary the reader now installs.

## Review Notes

- The `https://registry-1.docker.io` URL in the sync example works in practice (it is Docker Hub's registry endpoint), though the official Zot sync examples use `https://index.docker.io`. Left as-is since both are accepted.
- The sync example uses `destination` without `stripPrefix: true`, which means the source prefix (e.g. `library/`) will be preserved beneath the destination path. This is valid but worth noting for readers expecting a clean mirror layout — add `"stripPrefix": true` if they want pulls to look like `registry.example.com:5000/mirror/docker-hub/ubuntu` instead of `.../mirror/docker-hub/library/ubuntu`.
- The S3 storage example embeds `accesskey`/`secretkey` directly in `storageDriver`. This is supported, but production deployments should prefer environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or an IAM instance role to avoid plaintext credentials in `/etc/zot/config.json`.
- The `cosign attach sbom` command shown is deprecated in newer Cosign releases in favor of `cosign attest --type spdxjson` / `cosign attest --type cyclonedx`. The legacy command still works against Zot, so it was left in place, but readers building a current SBOM pipeline should prefer `cosign attest`.
- The post correctly notes that UI/search are only included in the full `zot` binary (not `zot-minimal`). Worth reminding readers that `extensions.ui` requires `extensions.search` to be enabled — the example happens to enable both, so this is satisfied.
- `docker login` with `-u admin` will prompt for a password interactively; this is correct, just noting it is not a non-interactive flow.
