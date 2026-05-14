# Validation Summary: How to Use Flux CD with AWS App Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS App Mesh
- AWS App Mesh Controller for Kubernetes
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization resources
- Flagger
- Kubernetes manifests and Kustomize
- Prometheus metrics for App Mesh canary analysis

## Sources Consulted
- AWS App Mesh Kubernetes getting started guide: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html
- AWS App Mesh service mesh documentation and end-of-support notice: https://docs.aws.amazon.com/app-mesh/latest/userguide/meshes.html
- AWS App Mesh Controller documentation: https://aws.github.io/aws-app-mesh-controller-for-k8s/
- AWS App Mesh Controller sidecar injection reference: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/injector/
- AWS App Mesh Controller v1beta2 API spec: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/api_spec/
- AWS EKS charts appmesh-controller chart metadata and values: https://raw.githubusercontent.com/aws/eks-charts/master/stable/appmesh-controller/Chart.yaml and https://raw.githubusercontent.com/aws/eks-charts/master/stable/appmesh-controller/values.yaml
- AWS EKS charts appmesh-prometheus chart metadata and values: https://raw.githubusercontent.com/aws/eks-charts/master/stable/appmesh-prometheus/Chart.yaml and https://raw.githubusercontent.com/aws/eks-charts/master/stable/appmesh-prometheus/values.yaml
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flagger EKS App Mesh install guide: https://fluxcd.io/flagger/install/flagger-install-on-eks-appmesh/
- Flagger App Mesh canary tutorial: https://fluxcd.io/flagger/tutorials/appmesh-progressive-delivery/
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger upgrade guide: https://fluxcd.io/flagger/dev/upgrade-guide/
- Flagger and loadtester release/package metadata: https://github.com/fluxcd/flagger and https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- Added the AWS App Mesh end-of-support notice. AWS documentation states App Mesh support ends on September 30, 2026, so the guide now clarifies that it applies to existing App Mesh environments and that migrations should be planned.
- Updated the App Mesh controller chart version from `1.12.x` to `1.13.x`, matching the current EKS chart metadata.
- Added App Mesh Prometheus installation via Flux and changed Flagger's `metricsServer` from the non-standard `http://prometheus.amazon-cloudwatch:9090` endpoint to `http://appmesh-prometheus:9090`, matching Flagger's App Mesh install guidance.
- Added a separate App Mesh CRD Kustomization and made the App Mesh infrastructure Kustomization depend on it. AWS documents the controller CRDs as a prerequisite, and Flux should apply the CRDs before App Mesh custom resources.
- Added a missing `frontend-service` `VirtualService`. The GatewayRoute targeted `frontend-service`, but the post only defined a frontend `VirtualNode` and backend `VirtualService`.
- Updated Flagger from `1.37.x` to `1.43.x` and the loadtester image from `0.31.0` to `0.37.0` to match current Flagger release/package metadata.
- Added `spec.provider: appmesh:v1beta2` to the Canary and removed deprecated `spec.service.meshName`, which the Flagger upgrade guide says is no longer used for App Mesh v1beta2.
- Changed the Canary backend entry from `database-service.my-app` to `database-service`, matching Flagger's documented App Mesh backend examples that use virtual service names or full App Mesh ARNs.
- Removed `analysis.iterations` from the weighted canary example. Flagger documents `iterations` as used for A/B testing and blue/green, while weighted canaries use `maxWeight` and `stepWeight`.
- Added missing Kustomize files and Flux Kustomizations so the Flagger infrastructure and canary manifests are actually reconciled by Flux.

## Review Notes
- The guide still assumes the application Deployments, Kubernetes Services, and the `database-service` App Mesh virtual service already exist or are managed elsewhere.
- App Mesh is approaching AWS end of support, so this content is technically valid for existing deployments but should not be positioned as a recommendation for new long-lived service mesh adoption.
