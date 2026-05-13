# Validation Summary: How to Configure FluxInstance with Custom Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Operator
- FluxInstance custom resources
- Kubernetes Deployments
- Kustomize patches
- kubectl JSONPath output

## Sources Consulted
- Flux Operator FluxInstance CRD documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator instance customization documentation: https://fluxoperator.dev/docs/instance/customization/
- Flux Operator Go API reference for FluxInstanceSpec and Distribution: https://pkg.go.dev/github.com/controlplaneio-fluxcd/flux-operator/api/v1
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux source components and source-watcher documentation: https://fluxcd.io/flux/components/source/
- Flux Kustomization patches documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post described the image automation example as installing all Flux components, but current Flux Operator also supports the `source-watcher` component for Flux v2.7.0 and later. I changed the section to describe the common classic controller set plus image automation, and added `source-watcher` to the component overview with its ArtifactGenerator role and version requirement.
- The Helm-only example included `notification-controller` while the surrounding text said to include only source and Helm controllers. I clarified that notification-controller is optional when events and alerts are desired.
- The controller arguments example replaced each controller's full `args` list even though the section described adding arguments. I changed the snippet to use JSON patch `add` operations against `/spec/template/spec/containers/0/args/-`, matching the Flux Operator customization documentation.

## Review Notes
The FluxInstance `apiVersion`, `kind`, `spec.distribution.version`, `spec.distribution.registry`, `spec.components`, and `spec.kustomize.patches` fields match the current Flux Operator API. The edited YAML snippets parse successfully. The `kubectl get deployment ... -o jsonpath=...` verification commands are valid for inspecting generated Kubernetes Deployments.
