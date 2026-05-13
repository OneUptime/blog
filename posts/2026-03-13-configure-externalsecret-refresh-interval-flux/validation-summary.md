# Validation Summary: How to Configure ExternalSecret Refresh Interval with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- Kubernetes
- Flux CD Kustomization
- GitOps
- Prometheus metrics

## Sources Consulted
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator FAQ: https://external-secrets.io/latest/introduction/faq/
- External Secrets Operator metrics documentation: https://external-secrets.io/latest/api/metrics/
- External Secrets Operator v0.17.0 release notes: https://github.com/external-secrets/external-secrets/releases/tag/v0.17.0
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The ExternalSecret examples used `apiVersion: external-secrets.io/v1beta1`. ESO v0.17.0 stopped serving `v1beta1`, and current docs use `external-secrets.io/v1`. Updated all ExternalSecret examples to `apiVersion: external-secrets.io/v1`.
- The post described `refreshInterval` scheduling as adding the interval to the last successful sync timestamp and retrying failures with exponential backoff without resetting the clock. The official docs describe the supported behavior in terms of refresh policies, interval-based updates, spec changes, and metadata updates. Replaced the unsupported implementation detail with the documented behavior.
- The one-time sync example used `refreshInterval: "0"`. Current ESO docs document zero duration as `0s` / zero duration. Updated the duration examples, YAML, and best-practice text to use `refreshInterval: "0s"`.
- The best-practice section referenced `externalsecret_sync_calls_error_total`, but the ESO metrics documentation lists the counter as `externalsecret_sync_calls_error`. Updated the metric name to match the docs.

## Review Notes
The Flux Kustomization example uses current `kustomize.toolkit.fluxcd.io/v1` fields, including `interval`, `path`, `prune`, `sourceRef`, and `dependsOn`. The manual refresh command matches the ESO FAQ example for ExternalSecret resources.
