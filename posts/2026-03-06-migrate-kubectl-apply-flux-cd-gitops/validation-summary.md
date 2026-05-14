# Validation Summary: How to Migrate from kubectl apply to Flux CD GitOps

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Kustomize
- SOPS / OpenPGP secret encryption
- GitHub Actions
- GitOps deployment workflows

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux bootstrap generic Git CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Flux trace CLI documentation: https://fluxcd.io/flux/cmd/flux_trace/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The database Flux `Kustomization` example used `wait: true` together with `healthChecks`. Flux ignores `.spec.healthChecks` when `.spec.wait` is true, so I removed `wait: true` from that example to make the explicit StatefulSet health check meaningful.
- The adoption section described `force: true` as enabling server-side apply. Flux already uses server-side apply; `.spec.force` replaces resources when immutable field changes prevent patching. I corrected the explanation and comment.
- The SOPS section did not create the in-cluster `sops-gpg` Secret needed by Flux for OpenPGP decryption. I added the documented `gpg --export-secret-keys` and `kubectl create secret generic sops-gpg` command.
- The SOPS configuration and encryption command did not restrict encryption to `data` and `stringData`. Flux requires Kubernetes `apiVersion`, `kind`, and `metadata` to remain plaintext, so I added `encrypted_regex: ^(data|stringData)$` and the matching `sops --encrypted-regex` flag.
- The verification section attempted to detect Flux management by reading a `kustomize.toolkit.fluxcd.io/name` label from the Deployment. Flux tracks inventory in the Kustomization status rather than relying on that label, so I replaced it with `flux trace -n default deployment my-app`.
- The GitHub Actions example pushed to the repository without explicitly granting write access to `GITHUB_TOKEN`. I added `permissions: contents: write` so the commit-and-push step works in repositories with read-only default workflow permissions.

## Review Notes
The article is technically relevant and current for Flux CD v2-style APIs using `kustomize.toolkit.fluxcd.io/v1`. The examples remain intentionally simplified; production migrations should also consider branch protection, image automation controllers, RBAC scoping via Flux service accounts, and a stronger secrets approach such as age or cloud KMS where appropriate.
