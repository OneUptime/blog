# Validation Summary: How to Implement Custom Verification Scripts in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and hook delete policies
- Kubernetes Jobs, Pods, ConfigMaps, container commands, and resource requests/limits
- Dockerfile ENTRYPOINT behavior
- Python requests, pytest, and PyYAML
- kubectl, curl, jq, and OCI registry HTTP API checks

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Argo CD Resource Hooks and Hook Deletion Policies: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_hooks/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes command and arguments for containers: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes CPU resource requests and limits: https://kubernetes.io/docs/tasks/configure-pod-container/assign-cpu-resource/
- Kubernetes memory resource requests and limits: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Dockerfile reference for ENTRYPOINT/CMD behavior: https://docs.docker.com/reference/dockerfile/

## Issues Found
- The SyncFail diagnostic Job used `curlimages/curl:latest` while running `kubectl` commands. `curlimages/curl` is appropriate for a simple Slack webhook call, but it does not provide the Kubernetes CLI used in the example. Changed the image to the verification container built earlier in the post, which installs `kubectl`, `curl`, and `jq`.
- The ConfigMap example included `expected_body_check: "items_not_empty"`, but `configurable_verify.py` did not implement that check. Added handling for `items_not_empty` so the `critical_flow` check verifies that the JSON response contains a non-empty `items` field.

## Review Notes
- Argo CD hook phase names, `argocd.argoproj.io/hook`, and `argocd.argoproj.io/hook-delete-policy: BeforeHookCreation` are correct. Official docs note that named hooks need `BeforeHookCreation` or `generateName` to be recreated on later syncs.
- The Job fields `backoffLimit`, `activeDeadlineSeconds`, `restartPolicy: Never`, ConfigMap volume mount, and container resource request/limit syntax are valid Kubernetes patterns.
- The Python examples are syntactically valid. Runtime success depends on the example service exposing the documented endpoints and returning the expected JSON schema.
