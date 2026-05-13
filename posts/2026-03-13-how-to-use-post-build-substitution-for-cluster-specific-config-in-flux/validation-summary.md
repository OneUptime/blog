# Validation Summary: How to Use Post-Build Substitution for Cluster-Specific Config in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kustomize post-build substitution
- Kubernetes Deployments
- Kubernetes Ingress
- Kubernetes ConfigMaps and Secrets
- kubectl and Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes API reference for Deployment replicas: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Kubernetes API reference for ConfigMap data: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/

## Issues Found
- The post said that Flux leaves an undefined variable placeholder as-is and reports a warning. Flux documentation says undefined `${var}` values are substituted with an empty string unless a default value is provided, and missing variables can be made fatal by enabling the `StrictPostBuildSubstitutions` feature gate. Updated the explanation accordingly.
- The post used `flux get kustomization app`. The official CLI documentation lists the command as `flux get kustomizations`. Updated the example to use the documented command.

## Review Notes
The Flux `postBuild.substitute` and `postBuild.substituteFrom` examples use current `kustomize.toolkit.fluxcd.io/v1` syntax. Inline substitutions taking precedence over referenced ConfigMaps/Secrets is correct. Kubernetes `Deployment`, `Ingress`, and `ConfigMap` snippets are syntactically valid, assuming the referenced Service and ingress controller exist in the target cluster.
