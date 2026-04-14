# Validation Summary: How to Organize Dapr Component Files in a Repository

## Status
validated

## Post Type
Guide / Best Practice

## Technologies Covered
- Dapr (components, configuration, sidecar, CLI)
- Kubernetes (custom resources, namespaces, labels)
- Kustomize (overlays, patches, resources)
- Redis (state store, pub/sub)
- GitHub Actions (CI/CD workflows)
- Make (build automation)

## Sources Consulted
- Dapr component schema documentation: https://docs.dapr.io/operations/components/component-schema/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis pub/sub reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Configuration reference: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Kustomize documentation: https://kustomize.io/
- GitHub Actions runner images (pre-installed software): https://github.com/actions/runner-images

## Issues Found

1. **Production kustomization.yaml: `resiliency-patch.yaml` misplaced as a resource** — The file `resiliency-patch.yaml` was listed under `resources` instead of `patches`. Since it is a patch file (consistent with the `-patch.yaml` naming convention used throughout the post), it belongs under `patches`. Also added the base `../../base/config/resiliency.yaml` to `resources` so the patch has a target resource.

2. **Makefile `.PHONY` target list incorrect** — The `.PHONY` declaration listed `components-prod` which does not exist as a Make target. The actual defined targets `components-diff` and `components-list` were missing from the `.PHONY` list. Fixed to match the actual target names.

3. **GitHub Actions: missing Kustomize installation in deploy jobs** — The `deploy-staging` and `deploy-production` jobs both use `kustomize build` but did not include the Kustomize installation step. Only the `validate` job installed Kustomize. Added the installation step to both deploy jobs since each job runs on a fresh runner.

4. **Deprecated `--components-path` CLI flag** — The Makefile `components-dev` target used `--components-path`, which is deprecated in Dapr 1.11+ in favor of `--resources-path`. Updated to the current recommended flag.

## Review Notes
- The Makefile `components-diff` target uses bash process substitution `<(...)`, which requires `/bin/bash`. Since Make defaults to `/bin/sh`, users may need to add `SHELL := /bin/bash` to the Makefile if their system's `/bin/sh` is not bash. This is a minor portability concern, not an error.
- The `dapr run --resources-path` flag loads component files recursively from subdirectories, which is necessary for the nested directory structure (state/, pubsub/, etc.) recommended in the post. This recursive behavior is supported in Dapr 1.11+.
- The `auth` field is placed at the root level (alongside `spec`), which matches the Dapr component schema documentation.
- All Dapr component types (`state.redis`, `pubsub.redis`), metadata field names, and Configuration fields are accurate per current Dapr documentation.
