# Validation Summary: How to Configure SOPS Secret Validation in CI for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS (Secrets OPerationS) — encryption tool for Kubernetes secrets
- Flux CD — GitOps controller
- Age — modern encryption tool used with SOPS
- AWS/GCP/Azure KMS — referenced as alternative key backends
- GitHub Actions — CI pipeline
- `kubectl` — used for dry-run validation
- pre-commit framework — for local validation hooks
- Bash — validation scripting

## Sources Consulted
- [getsops/sops GitHub repository](https://github.com/getsops/sops)
- [SOPS releases](https://github.com/getsops/sops/releases)
- [SOPS v3.12.2 release notes](https://github.com/getsops/sops/releases/tag/v3.12.2)
- [SOPS v3.8.0 release notes](https://github.com/getsops/sops/releases/tag/v3.8.0)
- [PR #545 — add filestatus subcommand](https://github.com/getsops/sops/pull/545) (added in v3.9.0)
- [PR #1601 — Add --input-type option for filestatus](https://github.com/getsops/sops/pull/1601) (added in v3.10.0)
- [filestatus package docs](https://pkg.go.dev/github.com/getsops/sops/v3/cmd/sops/subcommand/filestatus)
- [yuvipanda/pre-commit-hook-ensure-sops](https://github.com/yuvipanda/pre-commit-hook-ensure-sops)
- [SOPS official site](https://getsops.io/)

## Issues Found

1. **SOPS version too old for `filestatus` command.** The post installed `v3.8.1` and then used `sops ... filestatus ...`, but the `filestatus` subcommand was only added in SOPS v3.9.0 (PR #545). Updated `SOPS_VERSION` to `v3.12.2`, which is the latest stable release available as of March 2026 (v3.13.0 was released May 2026, after the post date).

2. **Invalid `--output-type` flag on `filestatus`.** The post invoked `sops --input-type yaml --output-type yaml filestatus "$file"`. The `filestatus` subcommand always emits JSON (`{"encrypted":true|false}`), so `--output-type` is not applicable. The `--input-type` flag for `filestatus` is also new in v3.10.0 (PR #1601), so it only works once we bump the version. Removed `--output-type yaml` and kept `--input-type yaml` (now valid against v3.12.2). Also rewrote the step body so the boolean output of `filestatus` is actually inspected, which makes the step align with its name.

3. **Step name mismatched what `filestatus` does.** The original step was titled "Validate SOPS recipient keys" but only called `filestatus`, which reports encryption state — not which recipients are configured. Renamed the step to "Verify SOPS encryption status" so the label matches the behavior.

4. **Broken pre-commit hook reference.** The `.pre-commit-config.yaml` snippet pointed at `https://github.com/getsops/sops` with `id: sops-check`. The upstream `getsops/sops` repository does not ship a `.pre-commit-hooks.yaml` and does not expose a `sops-check` hook, so the example would fail with `pre-commit` resolving the repo. Replaced with the widely-used community hook `yuvipanda/pre-commit-hook-ensure-sops` at `rev: v1.1` with `id: sops-encryption`, which is the documented and working integration.

## Review Notes

- The `.sops.yaml` `creation_rules` / `path_regex` / `age` / `encrypted_regex` fields are correct for current SOPS. The Age public keys in the examples are obvious placeholders and do not match the real Bech32 length, which is fine for a doc snippet but worth flagging that readers must substitute their own keys.
- The bash validation script uses heuristic `grep` checks for `sops:`, `version:`, and `mac:` — these are correct field names in a SOPS-encrypted YAML, but the technique is heuristic rather than authoritative. For stricter validation, callers can layer `sops filestatus` on top, which the post now does in the GitHub Actions job.
- `kubectl apply --dry-run=client` is the current syntax (the deprecated `--dry-run=true` form is gone); leaving as-is.
- The `git diff origin/main...HEAD` line assumes the base branch is `main` and that `origin/main` is fetched in CI. `actions/checkout@v4` defaults to a shallow clone, so users may need `fetch-depth: 0` for that command to resolve `origin/main` — worth mentioning if the post is expanded later, but not technically incorrect as written.
- SOPS releases continue past v3.12.2 (v3.13.0 was published May 8, 2026). Readers running this guide after May 2026 can safely bump `SOPS_VERSION` to v3.13.0 or newer.
