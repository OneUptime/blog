# Validation Summary: How to configure Kustomize with remote bases from Git repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Git
- GitHub Actions
- YAML
- Shell scripting

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: kubectl kustomize - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize official remote build example - https://github.com/kubernetes-sigs/kustomize/blob/master/examples/remoteBuild.md
- Kustomize upstream README - https://github.com/kubernetes-sigs/kustomize
- GitHub Actions checkout repository / release documentation - https://github.com/actions/checkout

## Issues Found
- The post said remote Git URLs can be referenced in the `bases` or `resources` field. Current Kustomize examples and Kubernetes documentation use `resources`, and `bases` is legacy. Changed the wording to recommend `resources`.
- The commit SHA example used a shortened SHA. Kustomize's official remote build documentation says short hashes are not supported. Replaced it with a full 40-character SHA-shaped example.
- The base example used deprecated `commonLabels`. Replaced it with the current `labels` field using `includeSelectors: true` to preserve the same behavior.
- The caching section claimed Kustomize caches remote bases in `~/.kustomize/cache` and enables offline work. Official Kustomize documentation describes cloning remote repositories to a temporary directory and checking out the requested ref. Rewrote the section to describe remote fetch behavior and recommend vendoring or submodules for offline use.
- The consumer test script cloned repositories into paths containing `/`, then tried to remove a different path. Added a safe `workdir` name and used it consistently. Also quoted the overlay path passed to `kustomize build`.
- The documentation example had broken nested Markdown fences. Switched the outer fence to four backticks and corrected the inner fence closing.
- The breaking-changes directory tree was marked as a Bash block and closed as `text`. Changed it to a valid `text` fence.
- The GitHub Actions example used `actions/checkout@v3`, which is outdated. Updated it to `actions/checkout@v6`.
- The performance section suggested using `kustomize build --output` to vendor a remote base. That renders manifests rather than vendoring the source base. Replaced it with a `git clone --branch ... --depth 1` example.

## Review Notes
Local CLI execution was not possible because `kustomize`, `kubectl`, and `kubeval` were not installed in the review environment. Claims and examples were validated against official Kubernetes, Kustomize, and GitHub Actions documentation instead.
