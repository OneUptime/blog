# Validation Summary: How to Configure Flagger Load Tester with Bash Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flagger loadtester
- Kubernetes Canary resources
- Kubernetes ConfigMaps and volumes
- Helm chart values
- Bash scripting
- curl
- jq
- awk

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger loadtester Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/loadtester/values.yaml
- Flagger loadtester deployment template: https://github.com/fluxcd/flagger/blob/main/charts/loadtester/templates/deployment.yaml
- Flagger loadtester Bash task implementation: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/bash.go
- Flagger loadtester webhook handler implementation: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/server.go
- Flagger loadtester container image Dockerfile: https://github.com/fluxcd/flagger/blob/main/Dockerfile.loadtester
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The Helm values example used `extraVolumes` and `extraVolumeMounts`, but the official Flagger loadtester chart exposes these fields as `volumes` and `volumeMounts`. Updated the values snippet so Helm renders the ConfigMap volume and mount into the loadtester Deployment.
- The ConfigMap script used `#!/bin/bash`. Updated it to `#!/usr/bin/env bash` so the mounted executable resolves Bash from the container environment instead of assuming an absolute path.
- The performance baseline script used `bc`, but the current Flagger loadtester Dockerfile installs `curl` and `jq` but not `bc`. Replaced the conversion with `awk`, which is available in the Alpine-based image through BusyBox.

## Review Notes
- The `type: bash` webhook metadata is valid and Flagger loadtester executes it with `bash -c`.
- Bash tasks are handled synchronously by the loadtester webhook handler, so the webhook timeout and the loadtester command timeout should be sized for the script runtime.
