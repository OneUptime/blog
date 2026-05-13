# Validation Summary: How to Run Conformance Tests During Flagger Canary Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary resources
- Flagger webhooks
- Flagger loadtester
- Bash
- curl
- jq
- hey
- ghz
- grpcurl
- gRPC

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger loadtester Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/loadtester/values.yaml
- Flagger loadtester Dockerfile: https://github.com/fluxcd/flagger/blob/main/Dockerfile.loadtester
- Flagger loadtester task handling source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/server.go
- Flagger loadtester bash task source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/bash.go
- Flagger loadtester shell task source: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/task_shell.go

## Issues Found
- The ConfigMap script example invoked `/scripts/run-tests.sh` directly, but ConfigMap-mounted files are not guaranteed to be executable unless file mode is configured. Changed the webhook command to `bash /scripts/run-tests.sh http://my-app-canary.default:80`.
- The gRPC example used `grpcurl` with the Flagger loadtester webhook without noting that the stock loadtester image includes `ghz` but not `grpcurl`. Updated the text to state that `grpcurl` requires a custom load tester image containing the binary.

## Review Notes
- Flagger webhook types, `metadata.type: bash`, default command behavior, generated canary service naming, and failure handling were verified against Flagger documentation and source.
- The mounted ConfigMap section still assumes the reader configures the loadtester Deployment or Helm chart values to mount the ConfigMap at `/scripts`.
