# Validation Summary: How to Rotate Git SSH Keys in Flux Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- GitRepository source-controller resources
- SSH keys and known_hosts
- GitHub deploy keys
- GitLab deploy keys API
- Bitbucket access keys
- Kubernetes CronJob

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI `reconcile source git` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `get sources git` reference: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- GitHub CLI `gh repo deploy-key add` manual: https://cli.github.com/manual/gh_repo_deploy-key_add
- GitHub CLI local help for `gh repo deploy-key add`, `list`, and `delete`
- GitLab Deploy Keys API: https://docs.gitlab.com/api/deploy_keys/

## Issues Found
- The post described `known_hosts` as containing a Git server fingerprint. Flux expects SSH host key entries in `known_hosts`, so the wording was corrected.
- The Step 5 description said `ssh-keyscan` fetches a fingerprint. `ssh-keyscan` fetches host key entries, so the wording was corrected.
- The Step 7 comment said `flux reconcile source git flux-system` reconciles all Git sources. The Flux CLI command reconciles one named `GitRepository`, so the comment was corrected to say it reconciles the bootstrap Git source.
- The Step 8 verification text referenced `lastHandshakeTime`, which is not a Flux `GitRepository` status field. The text was corrected to refer to `Ready: True`, artifact revision, and `.status.lastHandledReconcileAt` for manually triggered reconciliations.

## Review Notes
The main rotation sequence is technically sound: authorize the new public key first, update the Kubernetes Secret after the key is accepted by the Git server, verify Flux reconciliation, then remove the old deploy key. The example `ssh-keyscan` commands are operationally valid, but in production users should verify host keys against an authoritative source before trusting the generated `known_hosts` file.
