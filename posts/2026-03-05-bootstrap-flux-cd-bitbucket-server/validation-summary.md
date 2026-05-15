# Validation Summary: How to Bootstrap Flux CD with Bitbucket Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- Helm Controller and HelmRelease
- GitRepository and Kustomization custom resources
- Bitbucket Server / Bitbucket Data Center
- SSH and HTTPS Git authentication

## Sources Consulted
- Flux bootstrap for Bitbucket: https://fluxcd.io/flux/installation/bootstrap/bitbucket/
- Flux CLI reference for `flux bootstrap bitbucket-server`: https://fluxcd.io/flux/cmd/flux_bootstrap_bitbucket-server/
- Flux bootstrap for generic Git servers: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux CLI reference for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux CLI reference for `flux install`: https://fluxcd.io/flux/cmd/flux_install/
- Atlassian Bitbucket Data Center SSH access keys: https://confluence.atlassian.com/display/BitbucketServer/SSH%2Baccess%2Bkeys%2Bfor%2Bsystem%2Buse
- Atlassian Bitbucket Data Center SSH clone URL documentation: https://confluence.atlassian.com/bitbucketserver093/enable-ssh-access-to-git-repositories-1472431883.html
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post incorrectly stated that Flux CD does not have a dedicated Bitbucket Server bootstrap command. Current Flux documentation includes `flux bootstrap bitbucket-server` for Bitbucket Server and Data Center. Updated the introduction, Step 4, and summary to explain that the post covers the manual generic Git server workflow instead.
- The prerequisites pinned Kubernetes to `v1.26 or later`, which is outdated for current Flux releases. Updated this to require a Kubernetes cluster supported by the Flux release being used.
- The repository layout in Step 8 was incomplete. The Flux Kustomization used `path: ./clusters/production`, but the commands only created `clusters/production/flux-system/kustomization.yaml`. Added a root `clusters/production/kustomization.yaml` so the configured path can be built by Kustomize.
- The sample application in Step 9 would not be applied because `clusters/production/apps/podinfo.yaml` was not referenced by any kustomization. Added commands to create the apps directory, create `clusters/production/apps/kustomization.yaml`, and update the root kustomization to include the `apps` directory.

## Review Notes
The manual SSH-based approach is technically valid for existing Bitbucket Server repositories, although Flux's provider-specific `flux bootstrap bitbucket-server` command is the documented primary path when Bitbucket API token automation is acceptable.
