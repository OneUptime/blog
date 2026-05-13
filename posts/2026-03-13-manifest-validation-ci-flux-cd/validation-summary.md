# Validation Summary: How to Configure Manifest Validation in CI for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes manifests and CRDs
- GitHub Actions
- Kustomize
- kubeconform
- kubectl server-side dry-run
- YAML / PyYAML

## Sources Consulted
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- kubeconform custom resource schema documentation: https://kubeconform.mandragor.org/docs/crd-support/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubeconfig documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Actions secrets documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets
- Datree CRDs catalog Flux schema URLs, checked via HTTP HEAD:
  https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/source.toolkit.fluxcd.io/gitrepository_v1.json and
  https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/helm.toolkit.fluxcd.io/helmrelease_v2.json

## Issues Found
- The kubeconform installation extracted into `/usr/local/bin` without `sudo`, which can fail on GitHub-hosted runners. Changed the command to pipe into `sudo tar xz -C /usr/local/bin/`.
- The YAML syntax check used PyYAML without installing it, and `yaml.safe_load_all()` was not consumed, so parsing errors could be missed. Added `python3 -m pip install --user pyyaml` and changed the syntax check to iterate through all YAML documents.
- The original Python `-c` snippet would fail with indentation problems in the workflow shell block. Replaced it with a here-doc Python script.
- The workflow used `flux validate --path=...`, but the current Flux CLI documentation does not list a `flux validate` command. Removed that invalid step and kept Flux CRD validation through kubeconform with the CRDs catalog.
- The kubeconform step claimed to download Flux CRD schemas by applying `install.yaml` with client-side dry-run, but that does not create schema files and the `/tmp/flux-schemas` directory was unused. Removed the ineffective commands and clarified that the CRDs catalog schema location is used.
- The Flux-specific validation comment claimed to validate GitRepository URLs and intervals, but the snippet only checked API versions. Updated the comment to match what the snippet actually does.
- The server-side dry-run command ended with `|| true`, so dry-run failures would not block CI despite the article recommending blocking failures. Removed the error suppression.
- The server-side dry-run step set `KUBECONFIG` directly to a secret value. Since kubectl expects `KUBECONFIG` to be a path, changed the snippet to write the kubeconfig secret to `/tmp/kubeconfig` and export `KUBECONFIG` to that file.
- The kustomize diff step fetched `main` but never checked out or read from `origin/main`, so it would not reliably compare base and PR manifests. Changed it to create a temporary Git worktree at `origin/main` and build the base manifests from that worktree.

## Review Notes
- The current stable Flux API versions used in the post, `source.toolkit.fluxcd.io/v1` for GitRepository and `helm.toolkit.fluxcd.io/v2` for HelmRelease, match the Flux documentation reviewed.
- `kubectl apply --dry-run=server` is current and valid; the Kubernetes reference documents `--dry-run` values of `none`, `server`, and `client`.
- The kubeconform flags used in the post, including `--strict`, `--ignore-missing-schemas`, `--kubernetes-version`, and repeated `--schema-location`, match kubeconform documentation.
- Secrets are not available to all pull request workflows, especially workflows triggered from forks. The article's test-cluster dry-run remains optional, which is appropriate for repositories that cannot safely expose cluster credentials to PR runs.
