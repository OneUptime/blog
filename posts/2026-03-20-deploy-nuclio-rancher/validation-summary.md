# Validation Summary: How to Deploy Nuclio on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nuclio
- Rancher
- Kubernetes
- Helm
- `kubectl`
- `nuctl`
- Python
- Kafka

## Sources Consulted
- Nuclio Kubernetes setup: https://docs.nuclio.io/en/latest/setup/k8s/getting-started-k8s.html
- Nuclio production Helm installation guidance: https://docs.nuclio.io/en/1.13.x/setup/k8s/running-in-production-k8s.html
- Nuclio CLI reference: https://docs.nuclio.io/en/latest/reference/nuctl/nuctl.html
- `nuctl deploy` reference: https://docs.nuclio.io/en/stable/reference/nuctl/cli/nuctl_deploy.html
- `nuctl invoke` reference: https://docs.nuclio.io/en/latest/reference/nuctl/cli/nuctl_invoke.html
- Nuclio function deployment guide: https://docs.nuclio.io/en/1.14.x/tasks/deploying-functions.html
- Nuclio function configuration reference: https://docs.nuclio.io/en/latest/reference/function-configuration/function-configuration-reference.html
- Nuclio Python runtime reference: https://docs.nuclio.io/en/stable/reference/runtimes/python/python-reference.html
- Nuclio Kafka trigger reference: https://docs.nuclio.io/en/latest/reference/triggers/kafka.html
- Nuclio HTTP trigger reference: https://docs.nuclio.io/en/latest/reference/triggers/http.html
- Nuclio best practices: https://docs.nuclio.io/en/1.12.x/concepts/best-practices-and-common-pitfalls.html
- Nuclio GitHub repository and release metadata: https://github.com/nuclio/nuclio and https://github.com/nuclio/nuclio/releases

## Issues Found
- The original Helm install step referenced `registry.secretName` before the secret was created and used an undocumented registry environment-variable approach afterward. I corrected this to use Helm-based registry configuration with `registry.secretName` and `registry.pushPullUrl`, which matches the official Kubernetes installation guidance.
- The original post pinned `nuctl` to `1.12.0`, which is outdated. I replaced it with Nuclio’s official “download latest release” command so the instructions stay aligned with current releases.
- The Python HTTP example used `nuclio.Response` and `application/text`. I updated it to use `context.Response` with `text/plain`, matching the current Python examples in Nuclio’s official repository and docs.
- The `nuctl deploy` example used unsupported flags (`--trigger-name`, `--trigger-kind`, and `--replicas`) and omitted `--run-registry`. I replaced these with supported flags, including `--http-trigger-service-type nodePort`, `--min-replicas`, and `--max-replicas`, and adjusted the invoke example so it is reachable on Kubernetes.
- The Kafka function example used `apiVersion: nuclio.io/v1beta1` and Python `3.9`. I updated it to `nuclio.io/v1` and Python `3.11`, which aligns with the current function configuration reference and supported Python runtimes.
- The ML inference example used global state and `nuclio.Response`. I updated it to initialize the model in `init_context`, store it on `context.user_data`, and return `context.Response`, which matches Nuclio’s documented Python best practices.
- The HTTP trigger example used deprecated `maxWorkers`, an invalid `port: 8080` interpretation for Kubernetes ingress use, and an undocumented `tlsSecret` field. I changed the example to a valid ingress-based HTTP trigger using `numWorkers` and documented ingress fields only.
- The monitoring section used `nuctl logs`, which is not present in the current CLI reference. I replaced it with `kubectl logs` and aligned the dashboard port-forward example with the official docs.

## Review Notes
- As of May 1, 2026, the Nuclio GitHub repository shows `1.15.26` as the latest release (released April 16, 2026). Replacing the hardcoded `1.12.0` CLI download avoided locking the guide to an old release.
- The post is technically valid for Rancher-managed Kubernetes clusters, but the steps are mostly generic Kubernetes/Nuclio instructions rather than Rancher UI-specific workflow.
