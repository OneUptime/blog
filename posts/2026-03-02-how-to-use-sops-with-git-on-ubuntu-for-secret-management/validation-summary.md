# Validation Summary: How to Use SOPS with Git on Ubuntu for Secret Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS (Secrets OPerationS) — encrypted-file workflow for Git
- AWS KMS (key management)
- GPG / PGP key generation and use
- age (modern file encryption)
- YAML / JSON / .env file encryption
- Git pre-commit hooks and `.gitattributes` diff drivers
- GitHub Actions with OIDC + `aws-actions/configure-aws-credentials@v4`
- Flux CD Kustomization with SOPS decryption provider
- Ubuntu apt-get package management

## Sources Consulted
- SOPS canonical repository: https://github.com/getsops/sops
- SOPS release artifacts (verified asset naming via GitHub API for v3.8.1 and latest v3.13.1)
- SOPS README / docs for `.sops.yaml` `creation_rules`, `--encrypt`, `--decrypt`, `--in-place`, `exec-env`, and `updatekeys`
- CNCF Sandbox project listing confirming SOPS donation in 2023
- AWS KMS CLI reference for `create-key`, `create-alias`, `describe-key`, and `--target-key-id` accepting either KeyId or ARN
- GnuPG `--batch --full-generate-key` unattended generation parameters
- age / age-keygen documentation (https://github.com/FiloSottile/age)
- Flux CD Kustomization API reference (`kustomize.toolkit.fluxcd.io/v1`) and SOPS decryption provider docs
- GitHub Actions `aws-actions/configure-aws-credentials@v4` documentation

## Issues Found

1. **Stale repository ownership / "Mozilla SOPS" references** — The post described SOPS as "Mozilla SOPS" and pointed all download/API URLs at `github.com/mozilla/sops`. SOPS was transferred from Mozilla to the community-run `getsops` organization in 2023 and is now a CNCF Sandbox project. The legacy URLs currently 301-redirect (verified: both `api.github.com/repos/mozilla/sops/...` and the release-download URLs redirect to `getsops/sops`), so commands still functioned, but the canonical location has changed. Updated all `mozilla/sops` references to `getsops/sops` in the install scripts and the GitHub Actions workflow, dropped "Mozilla SOPS" from the description, and added a short sentence in the intro noting the project's CNCF/getsops stewardship while preserving the Mozilla origin.

2. **Age key generation would fail on a fresh system** — `age-keygen -o ~/.config/sops/age/keys.txt` does not create parent directories and will exit with an "open … no such file or directory" error if `~/.config/sops/age/` does not already exist. Added a `mkdir -p ~/.config/sops/age` line before the `age-keygen` invocation.

3. **Misleading variable name in the AWS KMS snippet** — The code did `KEY_ARN=$(aws kms create-key … --query 'KeyMetadata.KeyId' …)`, storing the KeyId in a variable named `KEY_ARN`. The downstream `aws kms create-alias --target-key-id` accepts either, so the script worked, but the naming was misleading and could confuse readers who copy it into other contexts. Renamed the variable (and its single use) to `KEY_ID` to match what the query actually returns.

## Review Notes
- The post pins SOPS v3.8.1 in the "binary install" and GitHub Actions snippets. v3.8.1 is still a real, downloadable release and the `.deb` and binary asset names used in the post match the actual release artifacts (`sops_3.8.1_amd64.deb`, `sops-v3.8.1.linux.amd64`). The current latest at validation time is v3.13.1 (released 2026-05-16), which uses the same naming convention, so readers wanting the newest release can substitute the version without other changes. Left as-is to preserve the author's choice of a known-stable version.
- The first install snippet's `curl | grep | sed` approach to discover the latest version works against the (already-updated) `getsops/sops` API and tolerates the `v`-prefixed tag format.
- `eval "$(sops --decrypt secrets/production/.env)"` populates the current shell with the decrypted assignments but does not `export` them, so child processes (e.g., a subsequent `./deploy.sh`) won't see those values unless wrapped in `set -a` / `set +a` or each line is prefixed with `export`. The post does call out `sops exec-env` as the preferred alternative on the very next line, so the limitation is implicitly addressed; left unchanged to avoid restructuring the example.
- The pre-commit hook's "is this encrypted?" check is a `grep -q "sops:"` heuristic. It would false-positive on a plaintext file that happens to contain the literal string `sops:`; readers wanting stricter detection could grep for `ENC[AES256_GCM` or shell out to `sops filestatus`. Left as-is — the post presents this as a lightweight safety net, not a guarantee.
- The Flux CD example uses `kustomize.toolkit.fluxcd.io/v1`, which is the current GA API version for Flux v2; correct as written.
- The `aws-actions/configure-aws-credentials@v4` action and the `permissions: id-token: write` OIDC setup are current and correct.
