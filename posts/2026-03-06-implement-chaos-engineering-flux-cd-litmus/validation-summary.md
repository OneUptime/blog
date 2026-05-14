# Validation Summary: How to Implement Chaos Engineering with Flux CD and Litmus

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- LitmusChaos
- Kubernetes
- Helm
- Argo Workflows / CronWorkflows
- Kubernetes RBAC
- GitOps

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation, including health checks and healthCheckExprs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert and Provider documentation: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/providers/
- Litmus Helm chart repository and chart values: https://litmuschaos.github.io/litmus-helm/
- LitmusChaos experiment documentation for Pod Delete and Pod Network Latency: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/ and https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-latency/
- LitmusChaos ChaosEngine, ChaosResult, probes, and CronWorkflow documentation: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/litmus-probes/ and https://litmuschaos.website.cncfstack.com/docs/3.28.0/concepts/chaos-workflow/

## Issues Found
- The Litmus HelmRelease examples placed the HelmRelease objects in the target `litmus` namespace while relying on `install.createNamespace`. Flux still needs the namespace for the HelmRelease object itself, so the examples now place the HelmRelease objects in `flux-system` and use `targetNamespace: litmus`.
- The Litmus agent values used non-existent `agent.name` and `agent.serverAddress` keys. Updated the snippet to use the current `litmus-agent` chart values such as `INFRA_NAME`, `LITMUS_URL`, `LITMUS_BACKEND_URL`, and `global.INFRA_MODE`.
- The MongoDB persistence example used `accessMode`; the Bitnami MongoDB subchart expects `accessModes`. Updated the values accordingly.
- The ChaosExperiment definitions were missing the command/image pull policy and had incomplete permissions compared with the official experiment templates. Updated the examples to include `/bin/bash`, `imagePullPolicy`, and the required resource/verb set.
- The ChaosEngine comment above `chaosServiceAccount` incorrectly described an abort duration. Reworded it to describe the service account purpose.
- The Flux Kustomization health check targeted `ChaosEngine` without custom health logic. Updated it to check the generated `ChaosResult` and added CEL expressions for pass/fail verdicts.
- The scheduled chaos example used an invalid `ChaosSchedule` shape while the section described CronWorkflows. Replaced it with an Argo `CronWorkflow` example.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider, but the current Alert/Provider API is `v1beta3`. Updated both resources.
- The RBAC example missed permissions needed for Litmus experiment jobs and common workload owner lookups. Expanded the Role to cover jobs, ConfigMaps, replication controllers, StatefulSets, DaemonSets, OpenShift DeploymentConfigs, and Argo Rollouts.

## Review Notes
The post is technically relevant and now aligns with current Flux and Litmus documentation. The Litmus chart version remains a broad semver constraint (`3.x`), which is acceptable for a guide but production users should pin an exact chart version after testing.
