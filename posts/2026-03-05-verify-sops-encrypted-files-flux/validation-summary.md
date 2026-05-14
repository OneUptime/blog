# Validation Summary: How to Verify SOPS Encrypted Files Before Committing in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Flux CD
- Kubernetes Secrets
- Git hooks
- pre-commit framework
- GitHub Actions
- Bash
- YAML

## Sources Consulted
- SOPS official README and CLI documentation: https://github.com/getsops/sops
- SOPS official releases page: https://github.com/getsops/sops/releases
- Flux official SOPS/Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- pre-commit official documentation: https://pre-commit.com/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GNU Bash reference manual: https://www.gnu.org/software/bash/manual/bash.html
- Local CLI checks: `git help hooks`, `git --version`, and SOPS v3.13.0 `--help` / `filestatus`

## Issues Found
- The manual pre-commit hook used `sops --decrypt --extract '["sops"]["version"]'` to validate metadata. This requires decryption credentials and is not a metadata-only validation. Replaced it with `sops filestatus "$file"` and an `"encrypted":true` check, which verifies that SOPS recognizes the file as encrypted without needing the private key.
- The manual hook checked `data` and `stringData` with `grep -A 100`, which could pass because encrypted SOPS metadata appears later in the file even when a secret value is plaintext. Added a small `awk` helper to check values inside the relevant YAML section directly.
- The pre-commit framework example used `bash -c` without a dummy `$0` argument, causing the first filename passed by pre-commit to be assigned to `$0` and omitted from `"$@"`. Added `--` after the script so all matched filenames are processed.
- The pre-commit framework YAML snippet was fragile because the inline multi-line command included a colon in an `echo` string. Changed `entry` to a folded block scalar so the YAML parses correctly.
- The pre-commit framework example only checked for a top-level `sops:` key. Replaced it with `sops filestatus` so the example validates SOPS encryption status rather than only checking for metadata text.
- The GitHub Actions workflow installed SOPS v3.8.1, which is outdated compared with the current official release. Updated the example to SOPS v3.13.0 and followed the documented binary move/chmod pattern.
- The CI verification step only checked for a `sops:` key. Updated it to use `sops filestatus` for the same reason as the pre-commit examples.
- The standalone validation script checked for SOPS metadata, MAC, and timestamps but did not ask SOPS to parse the file status. Added a `sops filestatus` check.

## Review Notes
- The article remains a heuristic safeguard, not a formal secret scanner. The plaintext pattern checks are intentionally conservative and may produce false positives or miss unusual YAML shapes.
- Flux documentation confirms that SOPS is the supported decryption provider and that Kubernetes Secret `data` / `stringData` should be encrypted while `apiVersion`, `kind`, and `metadata` remain plaintext.
