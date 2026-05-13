# Validation Summary: How to Configure FluxInstance with Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Operator
- FluxInstance CRD
- Flux controller sharding
- Kubernetes
- kubectl
- Kustomize patches
- Prometheus metrics

## Sources Consulted
- Flux Operator FluxInstance CRD reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator controller sharding guide: https://fluxoperator.dev/docs/instance/sharding/
- Flux Operator instance customization guide: https://fluxoperator.dev/docs/instance/customization/
- Flux sharding and horizontal scaling documentation: https://fluxcd.io/flux/installation/configuration/sharding/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/guides/monitoring/
- Flux installation prerequisites and Flux v2.8 supported versions: https://fluxcd.io/flux/installation/ and https://fluxcd.io/blog/2026/02/flux-v2.8.0/

## Issues Found
- The prerequisites stated that Kubernetes v1.28 or later was sufficient. Current Flux documentation supports the latest three Kubernetes minor versions, and Flux v2.8 supports Kubernetes v1.33-v1.35. I changed the prerequisite to say the cluster must run a Kubernetes version supported by the selected Flux release and included the Flux v2.8 range as the current example.

## Review Notes
- The FluxInstance sharding fields, default sharding label, generated controller deployment pattern, and note that only source-controller, kustomize-controller, and helm-controller support sharding match the official Flux Operator documentation.
- The GitRepository and Kustomization examples use current stable Flux API versions and valid resource shapes.
- The Kustomize patch example follows the documented FluxInstance `.spec.kustomize.patches` format. In practice, teams should verify patches with `flux-operator build instance -f flux.yaml` before applying them.
- Flux controller metrics are exposed on port 8080 at `/metrics`, so the monitoring example is technically correct.
