# Validation Summary: How to Handle SOPS Merge Conflicts in Git for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Flux
- Kubernetes
- Kustomize
- Git merge conflicts and custom merge drivers
- YAML
- kubectl

## Sources Consulted
- SOPS documentation: https://sops.pages.dev/
- Git gitattributes documentation: https://git-scm.com/docs/gitattributes
- Local Git documentation for `git checkout`, `git rebase`, and `git merge-file`
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- SOPS encryption examples used temporary plaintext filenames when re-encrypting merged content. SOPS uses the input filename to match `.sops.yaml` creation rules, so encrypting `/tmp/merged-secret.yaml` or a merge-driver temp file can miss path-based rules. Updated the commands to pass `--filename-override secrets/app-secret.yaml` or `--filename-override "$FILEPATH"`.
- SOPS command examples used older flag-style `--encrypt` and `--decrypt` forms. Updated them to the current documented `sops encrypt` and `sops decrypt` subcommands.
- The custom merge driver copied the decrypted conflict file to `$OURS.decrypted-conflict`, but `%A` is the merge driver result file supplied by Git, not necessarily the repository path shown to the user. Updated the script to write `${FILEPATH}.decrypted-conflict`, matching the printed recovery command.
- The rebase example used `git checkout --theirs` while instructing the reader to re-apply their changes. Git documents that during rebase, `ours` is the upstream side and `theirs` is the branch being replayed, so the example now starts from `--ours` before re-applying the feature branch changes.

## Review Notes
The remaining commands and configuration snippets are technically valid. The custom merge driver remains an illustrative script and assumes the user has working SOPS credentials and matching `.sops.yaml` rules available in the repository where Git runs the merge driver.
