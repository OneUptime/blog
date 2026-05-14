# Validation Summary: How to Rotate Flux CD Deploy Keys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets
- GitRepository sources
- GitHub deploy keys and GitHub CLI
- GitLab deploy keys API
- SSH key generation and cleanup

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux deploy key rotation documentation: https://fluxcd.io/flux/installation/configuration/deploy-key-rotation/
- Flux CLI `reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- GitHub CLI deploy-key manual and local `gh repo deploy-key --help`: https://cli.github.com/manual/gh_repo_deploy-key
- GitLab Deploy Keys API documentation: https://docs.gitlab.com/api/deploy_keys/
- Local OpenSSH `ssh-keygen` behavior for existing target files

## Issues Found
- The automation script used `KEY_FILE=$(mktemp)` before running `ssh-keygen -f "$KEY_FILE"`. Because `mktemp` creates the file immediately, `ssh-keygen` detects that the target already exists and prompts for overwrite, which breaks non-interactive automation. Changed the script to create a temporary directory with `mktemp -d` and use a non-existent key path inside it.
- The cleanup examples used `rm -P` as a fallback after `shred`. `rm -P` is BSD/macOS-specific and is not valid on typical GNU/Linux systems. Changed the fallback to `rm -f` and adjusted the nearby comment to avoid promising guaranteed secure deletion behavior across filesystems and platforms.

## Review Notes
- The Flux Secret keys `identity` and `known_hosts`, `.spec.secretRef.name`, `flux reconcile source git`, and `flux get sources git` usage match current Flux documentation.
- The GitHub CLI deploy-key commands and flags match the current GitHub CLI help output.
- The GitLab API endpoint and `can_push` parameter match the current GitLab Deploy Keys API documentation.
