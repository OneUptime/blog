# Validation Summary: How to Build a GitOps Pipeline with Rancher Fleet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- GitHub Actions
- Kustomize
- Docker
- Git

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet CRD reference: https://fleet.rancher.io/reference/ref-crds
- Fleet deployment tutorial: https://fleet.rancher.io/tutorials/tut-deployment
- Fleet troubleshooting reference: https://fleet.rancher.io/troubleshooting
- Fleet private Git repository auth guide: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Kustomize guide: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout
- GitHub `GITHUB_TOKEN` documentation: https://docs.github.com/actions/concepts/security/github_token
- Docker Build and Push action documentation: https://github.com/docker/build-push-action
- Docker Login action documentation: https://github.com/docker/login-action
- GitHub-hosted runner images reference: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- Rancher documentation versions page: https://ranchermanager.docs.rancher.com/versions

## Issues Found
- The cluster-labeling commands used `cluster.fleet.cattle.io/NAME`, which was inconsistent with Fleet's documented `clusters.fleet.cattle.io` resource usage. I changed the examples to `kubectl label clusters.fleet.cattle.io NAME ...` so the targeting step matches documented Fleet cluster resources.
- The post mixed Fleet raw-YAML overlays in `fleet.yaml` with Kustomize-based CI commands in the workflow. That combination would not work as written because `kubectl kustomize apps/myapp` and `kustomize edit set image` require actual `kustomization.yaml` files. I converted the example to a consistent Kustomize-based layout with `base` and `overlays/*`, and updated `fleet.yaml` to use `targetCustomizations.kustomize.dir`.
- The private Git credential example created an untyped generic secret. Fleet documents that `clientSecretName` secrets must be `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`. I added `--type=kubernetes.io/basic-auth` to make the example compatible with Fleet.
- The workflow triggered on both `main` and `staging`, but the `GitRepo` example watched only `main`. That made the branch model internally inconsistent. I changed the workflow trigger to `main` only so CI and Fleet watch the same branch.
- The Docker push example omitted a registry login step, so `push: true` would fail against a private or authenticated registry such as Docker Hub. I added `docker/login-action@v4` before `docker/build-push-action`.
- The original workflow validated `apps/myapp` with `kubectl kustomize` even though that directory had no kustomization, and it updated only the production overlay with an ambiguous `kustomize edit set image` invocation. I changed validation to the actual overlay directories and updated the image in `apps/myapp/base` using explicit `old=new:tag` syntax.
- The manifest update step would fail on reruns when there was no diff to commit. I added an idempotency guard with `git diff --cached --quiet && exit 0`.
- The rollback section told readers to find a previous commit and then run `git revert HEAD`, which could revert the wrong change. I changed the example to `git revert <commit-sha>` so the rollback command matches the commit the reader selected.
- The best-practices section recommended `prune: true`, which is not a documented Fleet `fleet.yaml` option. I replaced that advice with Fleet's documented `keepResources` behavior.

## Review Notes
- The prerequisite `Rancher 2.6+` is not wrong, but Rancher 2.6 is listed under legacy documentation on Rancher's versions page. Readers should prefer a currently supported Rancher release.
- The workflow example assumes GitHub-hosted `ubuntu-latest`, which currently includes both `kubectl` and `kustomize`. On self-hosted runners, those tools must be installed separately.
- The article still uses `spec.branch: main` for the `GitRepo` example. If you want the production-tag workflow recommended in the best-practices section, use a tag or commit-based promotion model with `spec.revision` or separate promotion repos/branches.
