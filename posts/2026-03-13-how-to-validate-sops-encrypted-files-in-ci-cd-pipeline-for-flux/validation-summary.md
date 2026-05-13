# Validation Summary: How to Validate SOPS Encrypted Files in CI/CD Pipeline for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- SOPS
- age encryption
- GitHub Actions
- GitLab CI/CD
- Bash
- YAML

## Sources Consulted
- SOPS official documentation: https://sops.pages.dev/
- SOPS official GitHub repository and release metadata: https://github.com/getsops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- The SOPS install snippets used v3.8.1. Updated the GitHub Actions and GitLab examples to v3.13.0, the current official SOPS release at review time.
- The GitHub Actions workflow used `git diff origin/main...HEAD` after a default shallow checkout, which can leave `origin/main` unavailable. Added `fetch-depth: 0` to `actions/checkout`.
- The GitHub Actions secret-file loop used command substitution over file names, which breaks on paths containing whitespace. Replaced it with a line-safe `while read` loop and included both `.yaml` and `.yml` files.
- The GitHub Actions metadata loop combined `find -print` with `grep -l`, causing all YAML files to be checked as if they were SOPS files. Removed the unconditional `-print` behavior so only files containing SOPS metadata are checked.
- The GitLab CI example used a custom `validate` stage without declaring it. Added a `stages` section containing `validate`.
- The reusable validation script used `python3 -c "import yaml"`, which requires PyYAML and is not guaranteed in CI. Replaced it with `sops --config .sops.yaml filestatus .sops.yaml` so the installed SOPS binary validates that the SOPS config can be loaded.

## Review Notes
- The metadata checks are intentionally lightweight and verify expected SOPS metadata fields. The optional decryption step remains the stronger validation because it verifies the encrypted file can actually be decrypted with the configured key material.
