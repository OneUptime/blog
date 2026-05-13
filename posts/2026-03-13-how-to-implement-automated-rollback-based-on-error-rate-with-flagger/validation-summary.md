# Validation Summary: How to Implement Automated Rollback Based on Error Rate with Flagger

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Prometheus and PromQL
- Istio metrics
- Flagger MetricTemplate resources
- Flagger webhooks and load tester
- kubectl

## Sources Consulted
- Flagger documentation: Metrics Analysis - https://docs.flagger.app/main/usage/metrics
- Flagger documentation: How it works - https://docs.flagger.app/usage/how-it-works
- Flagger documentation: Webhooks - https://docs.flagger.app/usage/webhooks
- Flagger GitHub repository README and CRD/source definitions - https://github.com/fluxcd/flagger
- Kubernetes release information - https://kubernetes.io/releases

## Issues Found
- The post described `analysis.threshold` as the number of consecutive failed metric checks and showed successful checks resetting the failure counter. Flagger tracks failed checks for the current analysis run and rolls back when the failed-check threshold is reached, so I changed the wording from "consecutive" to "maximum number of failed checks" and updated the rollback flow diagram.
- The example explanation said rollback would occur after 3 consecutive failed checks in 90 seconds. I changed it to say rollback occurs after the check fails 3 times during analysis, avoiding an inaccurate consecutive-failure guarantee.
- The rollback sensitivity table labeled values as exact rollback time. I changed the heading to "Fastest Rollback After Failed Checks" to reflect that the actual timing depends on reconciliation and when failed checks occur.
- The webhook example stored a Prometheus counter in a variable named `error_rate` and compared it with `bc`. I renamed it to `error_count` and used `awk` plus an integer shell comparison so the example matches what it reads from `/metrics`.

## Review Notes
- The Flagger API version `flagger.app/v1beta1`, Canary fields, `MetricTemplate`, `thresholdRange`, `templateRef`, and webhook `type: rollout` examples match the current Flagger documentation and CRD/source definitions.
- The built-in `request-success-rate` metric is documented as the minimum percentage of non-5xx responses. The Istio PromQL example is consistent with that definition.
- Kubernetes v1.25 is no longer a currently supported Kubernetes release as of 2026-05-13, but the prerequisite says "v1.25 or later" and the examples use stable APIs. For production guidance, a currently supported Kubernetes minor release would be preferable.
