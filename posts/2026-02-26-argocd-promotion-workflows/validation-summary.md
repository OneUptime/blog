# Validation Summary: How to Implement Promotion Workflows with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- GitHub Actions
- GitHub CLI
- Bash

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Kustomize `images` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/images/
- Kustomize `patches` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kustomize `patchesStrategicMerge` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patchesstrategicmerge/
- GitHub Actions workflow syntax for `jobs.<job_id>.environment`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idenvironment
- GitHub Actions deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub CLI `gh pr create --help` output from the local CLI

## Issues Found
- The Kustomize overlay examples used `patchesStrategicMerge`, which is deprecated in Kustomize v5.0.0. Updated the examples to use the current `patches` field with `path` entries.
- The GitHub Actions workflow used `argocd app wait --health` only. That can succeed against an already healthy older deployment before the new Git commit has synced. Updated the wait commands to use `--sync --health`.
- The rollback script piped a previous commit hash into `git show -- <path>`, which treats the appended hash as another pathspec rather than the revision to inspect. Updated it to read the file from `"$PREVIOUS_COMMIT:overlays/$ENV/kustomization.yaml"`.

## Review Notes
The examples are still intentionally simplified. In production, the promotion scripts should validate arguments, handle missing tags or insufficient Git history, and avoid embedding tokens in clone URLs where credential helpers or GitHub Actions token configuration can be used.
