# Validation Summary: How to Deploy Woodpecker CI on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Woodpecker CI (server, agent, Kubernetes backend)
- Talos Linux
- Kubernetes (RBAC, Ingress, ServiceAccount, PersistentVolume)
- Helm v3 (Woodpecker Helm chart)
- GitHub / Gitea / Forgejo OAuth integration
- Woodpecker pipeline syntax (`.woodpecker.yaml`, multi-workflow)
- Docker / docker-buildx plugin
- PostgreSQL and Redis as pipeline services

## Sources Consulted
- Woodpecker CI Kubernetes backend docs: https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes
- Woodpecker CI workflow syntax docs: https://woodpecker-ci.org/docs/usage/workflow-syntax
- Woodpecker CI services docs: https://woodpecker-ci.org/docs/usage/services
- Woodpecker CI environment / string substitution docs: https://woodpecker-ci.org/docs/usage/environment
- Woodpecker CI GitHub forge docs: https://woodpecker-ci.org/docs/administration/configuration/forges/github
- Woodpecker CI CLI docs: https://woodpecker-ci.org/docs/cli
- Woodpecker Helm chart repo: https://github.com/woodpecker-ci/helm (values.yaml + chart README on `main`)

## Issues Found
1. **Non-existent agent env vars for build-pod resource defaults.** The "Kubernetes Backend Configuration" section listed `WOODPECKER_BACKEND_K8S_POD_RESOURCES_LIMITS_CPU`, `..._LIMITS_MEMORY`, `..._REQUESTS_CPU`, and `..._REQUESTS_MEMORY` as agent environment variables. These variables are not part of the Kubernetes backend configuration — the official docs only expose pod-level options like namespace, storage class, volume size, labels, annotations, tolerations, node selector, pull secrets, and priority class. Build pod resources are configured per step via `backend_options.kubernetes.resources` or cluster-wide via a Kubernetes `LimitRange`. Replaced the invalid env vars with an explanatory paragraph and a correct per-step `backend_options.kubernetes.resources` example.

2. **Wrong CLI binary / subcommand for adding secrets.** The "Managing Secrets" section used `woodpecker secret add ...`. The official CLI binary is `woodpecker-cli`, and repository-scoped secrets are added through the `repo secret add` subcommand. Updated both example invocations to `woodpecker-cli repo secret add ...`.

## Review Notes
- The Helm repo URL `https://woodpecker-ci.org/` still works but is the legacy installation method; the chart is now also published as an OCI artifact at `oci://ghcr.io/woodpecker-ci/helm/woodpecker`. Left as-is because the documented command still functions.
- The ingress values use the older `backend.serviceName` / `backend.servicePort` shape rather than `pathType`. This matches the current Woodpecker Helm chart's actual `values.yaml`, so it is correct even though it looks like the deprecated Kubernetes ingress style.
- Pipeline `steps` as a list, `services` at the top level, `when` with `branch`/`event`, and the `${CI_COMMIT_SHA:0:8}` substring substitution were all verified against the official workflow/services/environment docs.
- `WOODPECKER_GITHUB`, `WOODPECKER_GITHUB_CLIENT`, and `WOODPECKER_GITHUB_SECRET` match the documented GitHub forge environment variables.
- The Helm `agent`/`server` top-level keys, `extraSecretNamesForEnvFrom`, and `persistentVolume` field match the upstream chart's `values.yaml`.
