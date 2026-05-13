# Validation Summary: How to Configure Variable Precedence in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux post-build variable substitution
- Kubernetes ConfigMaps
- Kubernetes Secrets
- kubectl
- jq

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux v2.3 release announcement and supported Kubernetes versions: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The prerequisite "A Kubernetes cluster running version 1.25 or later" was too broad for current Flux releases, because Flux support tracks Kubernetes-supported versions and current Flux releases no longer support all versions from 1.25 upward. Changed it to require a Kubernetes version supported by the selected Flux release.
- The Secret inspection command used `kubectl -o jsonpath='{.data}'` and piped the result to `jq`. Kubernetes JSONPath map output is not JSON, so `jq` would not reliably parse it. Changed the command to use `kubectl -o json` and select `.data` inside `jq`.

## Review Notes
The main Flux precedence explanation is correct: inline `.spec.postBuild.substitute` values take precedence over values loaded through `.spec.postBuild.substituteFrom`, and later `substituteFrom` references overwrite earlier references for matching keys. The examples use the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API.
