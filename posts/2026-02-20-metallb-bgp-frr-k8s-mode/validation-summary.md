# Validation Summary: How to Configure MetalLB BGP with the Experimental FRR-K8s Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- FRR
- FRR-K8s
- Helm
- kubectl

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/index.html
- MetalLB advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB full example documentation: https://metallb.io/usage/example/
- MetalLB Helm chart values: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/charts/metallb/values.yaml
- MetalLB FRR-K8s implementation: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/internal/bgp/frrk8s/frrk8s.go
- FRR-K8s project documentation: https://github.com/metallb/frr-k8s
- FRR-K8s API documentation: https://github.com/metallb/frr-k8s/blob/main/API-DOCS.md
- FRR-K8s Helm chart values: https://raw.githubusercontent.com/metallb/frr-k8s/main/charts/frr-k8s/values.yaml

## Issues Found
- The post described FRR-K8s as experimental and standard FRR mode as stable. Current MetalLB documentation marks FRR-K8s as the recommended/default BGP backend and FRR mode as deprecated, so the title, tags, description, introduction, maturity table, and summary were updated.
- The MetalLB Helm install command omitted `helm repo add metallb https://metallb.github.io/metallb`. Added the repository setup before `helm install metallb`.
- The MetalLB Helm install command installed an external FRR-K8s deployment first but did not set `frrk8s.external=true` or `frrk8s.namespace=frr-k8s-system`. Added those settings so MetalLB consumes the external FRR-K8s instance instead of deploying a bundled one.
- The generated `FRRConfiguration` example used a peer-based name and omitted `nodeSelector` and router `prefixes`. Updated it to match MetalLB's per-node generated configuration shape.
- The post attributed `FRRConfiguration` generation to the MetalLB controller. Updated it to the MetalLB speaker, which is the component that manages FRR-K8s BGP session configuration.
- The post described FRR-K8s as an operator managing a separate FRR DaemonSet. Updated the wording to describe FRR-K8s as a DaemonSet/controller deployment with FRR in the FRR-K8s pods.
- The speaker pod label selector used `component=speaker`, but the Helm chart uses `app.kubernetes.io/component=speaker`. Updated the verification command.
- The custom configuration section mentioned adding a static route or route map, but the example only announces an additional BGP prefix. Updated the wording to match the YAML.
- The "Cilium BGP" sharing example was too broad because the documented sharing model is based on components producing `FRRConfiguration` resources. Reworded it to avoid implying unsupported integration.
- The Kubernetes prerequisite named a specific minimum version that was not supported by the checked MetalLB docs. Replaced it with a release-compatible Kubernetes prerequisite.

## Review Notes
FRR-K8s custom configuration is additive: multiple `FRRConfiguration` resources can extend configuration for selected nodes, but the API is not a generic replacement for all possible FRR configuration workflows.
