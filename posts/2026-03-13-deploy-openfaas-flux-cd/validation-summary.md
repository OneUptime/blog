# Validation Summary: How to Deploy OpenFaaS with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenFaaS Standard/Enterprise
- OpenFaaS Function CRD
- Flux CD v2
- Kubernetes
- HelmRelease and HelmRepository
- faas-cli
- NATS JetStream

## Sources Consulted
- OpenFaaS Pro installation documentation: https://docs.openfaas.com/deployment/pro/
- OpenFaaS CE Kubernetes deployment documentation: https://docs.openfaas.com/deployment/kubernetes/
- OpenFaaS Function CRD documentation: https://docs.openfaas.com/openfaas-pro/function-crd/
- OpenFaaS production guidance: https://docs.openfaas.com/architecture/production/
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS faas-netes Helm chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS Pro Helm chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values-pro.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- OpenFaaS faas-cli README: https://github.com/openfaas/faas-cli

## Issues Found
- The post described deploying OpenFaaS CE while using the `Function` CRD for GitOps-managed functions. Current OpenFaaS documentation states that the Function CRD/operator path is part of OpenFaaS Standard/Enterprise and is required for GitOps function management. I changed the guide to target OpenFaaS Standard or Enterprise and added the required `openfaasPro`, `clusterRole`, and `operator.create` Helm values.
- The prerequisites did not mention the required OpenFaaS Standard/Enterprise license Secret. I added a prerequisite for an `openfaas-license` Secret.
- The Helm values enabled Alertmanager for autoscaling triggers. OpenFaaS production documentation states that Alertmanager is not used in OpenFaaS Pro, while the Pro autoscaler handles autoscaling. I changed `alertmanager.create` to `false` and adjusted the comment.
- The Function CRD example used a Kubernetes-style nested `resources.requests` and `resources.limits` block. The OpenFaaS Function CRD uses top-level `requests` and `limits` fields under `spec`. I corrected the sample manifest.
- The function autoscaling example used `com.openfaas.scale.factor` and described scaling from zero while also setting `com.openfaas.scale.min: "1"`. For the corrected Standard/Enterprise autoscaler path, I changed the example to use `com.openfaas.scale.target` and `com.openfaas.scale.type`, and clarified that it scales between the configured minimum and maximum replicas.
- The best-practices section referred generally to NATS for async invocations. For the corrected Standard/Enterprise path, I updated this to NATS JetStream.

## Review Notes
The Flux `dependsOn` example assumes a separate Flux `Kustomization` named `openfaas` reconciles the OpenFaaS infrastructure manifests. That is consistent with the later `flux get kustomizations openfaas` command, but a future revision could show that infrastructure Kustomization explicitly for completeness.
