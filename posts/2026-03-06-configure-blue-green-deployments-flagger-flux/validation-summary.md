# Validation Summary: How to Configure Blue-Green Deployments with Flagger and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux CD
- Kubernetes Deployments, Services, and HPAs
- Kustomize
- Prometheus metrics
- Flagger webhooks and load tester
- Slack alerting

## Sources Consulted
- Flagger Blue/Green Deployments documentation: https://docs.flagger.app/main/tutorials/kubernetes-blue-green
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger Alerting documentation: https://docs.flagger.app/usage/alerting
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- podinfo project documentation: https://github.com/stefanprodan/podinfo

## Issues Found
- The post described Flagger's Kubernetes blue/green behavior as an instant traffic switch to the green deployment. Flagger's Kubernetes blue/green flow validates the canary deployment, promotes it to the primary deployment, and then scales the canary deployment down, so the wording was updated to "promotion after validation."
- The Canary examples omitted `spec.provider: kubernetes`, which is required to make the examples explicit for Flagger's Kubernetes L4 blue/green provider.
- The post defined a Flux-managed `Service` with the same name that Flagger creates and reconciles. This can cause Flux and Flagger to fight over selectors and ports, so the Service manifest and Kustomize resource entry were removed.
- The generated resource list omitted the generated primary HPA and showed the apex service on port 80. Flagger's documented output includes the primary HPA when `autoscalerRef` is used, and the generated services use the Canary service port, so the examples were corrected.
- The manual gating example used an invalid `confirm-rollback` webhook type. Flagger supports `rollback`, so the webhook type, URL, and comment were corrected.
- The manual gate open/close commands omitted the expected canary name and namespace payload for Flagger's tester API. The commands were updated with `{"name":"webapp","namespace":"webapp"}`.
- The gated Kubernetes-provider example included header match routing, which applies to mesh or ingress routing providers rather than Kubernetes L4 blue/green. The match block was removed and the later header-routing note was qualified.
- The manual test command used `/api/info`, which is not a documented podinfo endpoint. It was changed to `/version`.

## Review Notes
- All YAML snippets were parsed successfully after the fixes.
- The examples assume the Flagger load tester service is installed in `flagger-system`; if installed in another namespace, the webhook URLs must be adjusted.
