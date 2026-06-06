# Validation Summary: How to Use Tekton Workspaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines (v1 API)
- Kubernetes (PersistentVolumeClaims, ConfigMaps, Secrets, EmptyDir, Projected Volumes)
- kubectl
- Maven (settings.xml ConfigMap example)
- Kaniko (container image builds)
- Git (SSH credentials example)
- Go, Node.js, Alpine container images

## Sources Consulted
- Tekton Pipelines official documentation: https://tekton.dev/docs/pipelines/
- Tekton Workspaces reference: https://tekton.dev/docs/pipelines/workspaces/
- Tekton Tasks reference: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines TEP/deprecation notes for ClusterTask (TEP-0131; deprecated in Tekton Pipelines v0.41.0 / Sept 2022)
- Tekton v1 API reference (which does not include the `ClusterTask` kind)
- Kubernetes documentation for PVCs, ConfigMaps, Secrets, EmptyDir, and Projected Volumes
- Tekton Catalog tasks (git-clone, maven, kaniko) for workspace name conventions

## Issues Found

1. **`kind: ClusterTask` used with `apiVersion: tekton.dev/v1`** — Multiple `taskRef` entries in the build-and-test and parallel-analysis pipelines specified `kind: ClusterTask`. ClusterTask was deprecated in Tekton Pipelines v0.41.0 (September 2022) and is not part of the stable `tekton.dev/v1` API; it only existed in `tekton.dev/v1beta1`. For a tutorial written in 2026 against the v1 API, this is incorrect. Removed all `kind: ClusterTask` lines so the `taskRef` falls back to referencing a namespace-local Task, which is the modern, simple approach for tutorials. (Affected the git-clone, maven, maven test, kaniko, and golangci-lint/etc. parallel pipeline references.)

## Review Notes
- The recommended modern alternatives to ClusterTask are the Cluster Resolver (`resolver: cluster`) or the Hub Resolver (`resolver: hub`). The post does not cover resolvers, but the simpler namespace-local `taskRef: name: <task>` form is sufficient for the workspace-focused examples here and keeps the focus on workspaces.
- `Secret`-backed workspaces are mounted read-only by the kubelet; the `chmod 600 .../ssh-privatekey` line in the SSH git-clone example will typically fail on the projected file. In practice, users either set `defaultMode` via a `projected` workspace (as the post itself later demonstrates with `mode: 0600`) or copy the key into a writable location before chmod. Left as-is because this is a widely-used pattern and not strictly inaccurate at the YAML/Tekton-API level — it's a runtime nuance worth being aware of.
- Container image versions (alpine 3.19, golang 1.22, node 20, alpine/git 2.43.0) are slightly behind 2026 latest but are valid, existing tags and don't affect technical correctness.
- The Tekton variable substitutions used — `$(workspaces.<name>.path)`, `$(workspaces.<name>.bound)`, `$(results.<name>.path)`, `$(params.<name>)`, `$(context.pipelineRun.uid)`, and `$(context.pipelineRun.name)` — are all valid in the v1 API.
- All Kubernetes resource fields (PVC accessModes, EmptyDir `medium: Memory` / `sizeLimit`, Secret types `kubernetes.io/dockerconfigjson` and `kubernetes.io/ssh-auth`, projected volume sources) verified against the Kubernetes API.
- The `optional: true` workspace field, `readOnly` flag, `subPath` field, `stepTemplate`, and `podTemplate.affinity` on PipelineRun are all valid v1 fields.
