# Validation Summary: How to Use Flagger Load Tester for Canary Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flagger loadtester
- Kubernetes
- Helm
- Canary resources
- Flagger webhooks
- rakyll/hey
- ghz
- curl

## Sources Consulted
- Flagger documentation: Webhooks - https://docs.flagger.app/usage/webhooks
- Flagger documentation: How it works - https://docs.flagger.app/usage/how-it-works
- Flagger Helm repository index - https://flagger.app/index.yaml
- Flagger loadtester Helm chart 0.37.0 templates and values - https://flagger.app/loadtester-0.37.0.tgz
- Flagger loadtester source: server.go, runner.go, gate.go - https://github.com/fluxcd/flagger/tree/main/pkg/loadtester
- Flagger loadtester Go package documentation - https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- rakyll/hey README - https://github.com/rakyll/hey

## Issues Found
- The post stated that the load tester starts a new command instance on each webhook call and that overlapping runs may occur if the duration exceeds the analysis interval. This is inaccurate for identical `cmd` tasks: the loadtester stores running tasks by hash and skips the same task if it is already running. Updated the text to reflect that duplicate running tasks are skipped.
- The gate endpoint descriptions said `/gate/approve` returns 200 only if the gate is open and non-200 if closed. In the loadtester implementation and Flagger docs, `/gate/approve` always returns 200, `/gate/halt` always returns non-200, and `/gate/check` is the stateful endpoint controlled by `/gate/open` and `/gate/close`. Updated the endpoint list accordingly.

## Review Notes
- Helm was not installed in the local environment, so Helm CLI behavior was verified against the official chart repository index and chart templates instead of local `helm` output.
- The current official loadtester chart version in the Flagger repository is 0.37.0, and the chart defaults match the post's deployment naming and service port statements for the shown release name.
