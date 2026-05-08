# Validation Summary: How to Generate a Kubernetes Deployment YAML with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Kubernetes Deployments
- Kubernetes Services
- kubectl
- YAML manifests

## Sources Consulted
- Podman documentation: `podman kube generate` / `podman generate kube` options, including `--type`, `--replicas`, and `--service`: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman documentation: `podman kube play` / `podman play kube` supported Kubernetes kinds and Deployment field support: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman documentation: `podman generate` command group, showing `kube` as a supported subcommand: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Kubernetes documentation: Deployment specification fields, replicas, selectors, pod templates, and rolling update behavior: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl reference: `kubectl apply` and `kubectl scale` command behavior: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The illustrative Deployment manifest used `web-app-deployment` and `app: web-app`, but Podman's documented Deployment examples name generated container-based Deployments with the generated pod name plus `-deployment`, and use the generated pod-style app label. Updated the example to `web-app-pod-deployment` and `app: web-app-pod`.
- The example omitted the `hostPort` that is generated from the local `podman run -p 8080:80` port binding. Added `hostPort: 8080` to the example port structure.
- The `kubectl get deployment` and `kubectl scale deployment` examples referenced the old illustrative Deployment name. Updated them to `web-app-pod-deployment`.
- The summary implied Podman local replay preserves Deployment replica behavior. Podman documents Deployment `replicas` as supported for parsing but with the actual replica count ignored and set to 1. Updated the summary to state that Podman plays Deployment YAML as a single local replica.

## Review Notes
The Podman CLI was not installed in the local environment, so commands could not be exercised directly with `--help` or live generated output. Validation was performed against official Podman and Kubernetes documentation. The post remains accurate as a tutorial, but a future improvement could mention that generated `hostPort` values from `-p` bindings can constrain multi-replica Kubernetes scheduling and that Services are usually the better cluster-facing exposure mechanism.
