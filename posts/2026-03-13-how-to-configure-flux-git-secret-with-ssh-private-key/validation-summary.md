# Validation Summary: How to Configure Flux Git Secret with SSH Private Key

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Source Controller
- Kubernetes Secrets
- GitRepository custom resources
- SSH authentication
- Git deploy keys
- kubectl
- ssh-keygen and ssh-keyscan

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI reference for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- GitHub deploy keys documentation: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- Local OpenSSH command help for `ssh-keygen` and `ssh-keyscan`

## Issues Found
- The SSH Secret example omitted the `known_hosts` key. Flux's v1 GitRepository API documentation states that SSH repository Secrets must contain `identity` and `known_hosts`. Added an `ssh-keyscan github.com > known_hosts` command and included `--from-file=known_hosts=./known_hosts` in the `kubectl create secret generic` command.
- The YAML Secret example omitted `known_hosts`. Added a `known_hosts` entry to match Flux Source Controller's SSH authentication requirements.
- The URL guidance said Flux accepts `git@...` SSH syntax. Flux documentation explicitly says scp-like SSH syntax such as `git@github.com:org/repo.git` is not supported. Updated the guidance to recommend `ssh://git@...` and warn against scp-like syntax.
- The command used `--from-literal=identity.pub="$(cat flux-deploy-key.pub)"`. This can work, but `--from-file=identity.pub=./flux-deploy-key.pub` is a more direct and less shell-sensitive match for Kubernetes Secret creation. Updated the command accordingly.

## Review Notes
The remaining examples use current Flux `source.toolkit.fluxcd.io/v1` GitRepository fields and valid Kubernetes Secret syntax. `stringData` is appropriate for illustrative manifests, though Kubernetes notes it does not work well with server-side apply. The post correctly notes that deploy keys are read-only by default on GitHub and require write access when Flux image automation must push changes.
