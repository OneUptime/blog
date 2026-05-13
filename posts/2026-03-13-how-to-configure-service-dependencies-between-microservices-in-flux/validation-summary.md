# Validation Summary: How to Configure Service Dependencies Between Microservices in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization
- Flux GitRepository
- Kubernetes
- Kustomize Controller
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux get kustomizations --watch` example: https://fluxcd.io/flux/get-started/
- Flux CLI `flux resume kustomization` documentation: https://fluxcd.io/flux/cmd/flux_resume_kustomization/

## Issues Found
- The post combined `wait: true` and `healthChecks` as if both would be evaluated together. Flux documentation states that when `wait: true` is set, `.spec.healthChecks` is ignored. I removed `wait: true` from examples that rely on explicit `healthChecks` and updated the best-practice guidance.
- The introduction said dependencies are always "fully reconciled and healthy" before a dependent starts. I changed this to Flux's actual behavior: `dependsOn` waits for the dependency Kustomization Ready condition, and health checks matter when the dependency uses `healthChecks` or `wait: true`.
- The verification section used `flux suspend kustomization database` as a dependency-failure simulation. Suspending reconciliation is not the same as making the dependency unhealthy, so I replaced that example with a supported `flux reconcile kustomization database --with-source` workflow for observing dependent reconciliation.
- The best-practice section claimed Flux detects and reports circular dependencies as an error. The Flux documentation says circular dependencies must be avoided because interdependent Kustomizations will never be applied, so I corrected that statement.
- The conclusion said `healthChecks` guarantees readiness. I changed this to `healthChecks` or `wait: true` and softened "guarantees" to match Flux's readiness model.

## Review Notes
The YAML examples use current Flux `source.toolkit.fluxcd.io/v1` GitRepository and `kustomize.toolkit.fluxcd.io/v1` Kustomization APIs. The CLI commands are valid per Flux documentation, but `flux` and `kubectl` were not installed in this local environment, so command help could not be verified locally.
