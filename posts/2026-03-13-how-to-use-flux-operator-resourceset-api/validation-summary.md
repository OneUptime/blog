# Validation Summary: How to Use Flux Operator ResourceSet API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator
- Flux Operator ResourceSet API
- Flux Operator ResourceSetInputProvider API
- Flux GitRepository and Kustomization APIs
- Kubernetes ConfigMaps, Secrets, and kubectl
- Go text templates and slim-sprig template functions

## Sources Consulted
- Flux Operator ResourceSet API reference: https://fluxoperator.dev/docs/crd/resourceset/
- Flux Operator ResourceSetInputProvider API reference: https://fluxoperator.dev/docs/crd/resourcesetinputprovider/
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/

## Issues Found
- The post described ConfigMaps and Secrets as direct ResourceSet input sources under `spec.inputs`. The official ResourceSet API supports inline `spec.inputs` and `spec.inputsFrom` references to ResourceSetInputProvider objects, not `configMap` or `secret` entries in `spec.inputs`. I replaced the ConfigMap input example with a `ResourceSetInputProvider` using `spec.type: Static` and `spec.inputsFrom`.
- The Secret input example used an unsupported `spec.inputs[].secret` shape. I changed it to demonstrate the official `fluxcd.controlplane.io/copyFrom` annotation for copying data from an existing Secret into generated Secret resources.
- The lifecycle section said generated resources are owned by the ResourceSet. The official docs describe inventory tracking and garbage collection rather than requiring Kubernetes owner references, so I updated the wording to match the documented behavior.
- The conclusion repeated the incorrect guidance to use ConfigMaps and Secrets as input sources. I updated it to recommend inline inputs, ResourceSetInputProviders, and Secret copy annotations where appropriate.

## Review Notes
- The inline ResourceSet examples use the current `fluxcd.controlplane.io/v1`, `source.toolkit.fluxcd.io/v1`, and `kustomize.toolkit.fluxcd.io/v1` APIs.
- The `kubectl apply`, `kubectl get`, `kubectl describe`, and JSONPath commands are syntactically valid.
- The template function section is consistent with the ResourceSet documentation, which states that templates are based on Go `text/template` with slim-sprig functions.
