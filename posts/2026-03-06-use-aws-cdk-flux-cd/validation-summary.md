# Validation Summary: How to Use AWS CDK with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon EKS
- TypeScript
- Flux CD
- Kubernetes
- Helm
- Kustomize
- AWS Load Balancer Controller annotations

## Sources Consulted
- AWS CDK API Reference: KubernetesVersion and kubectl layer requirements: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_eks.KubernetesVersion.html
- AWS CDK Amazon EKS Construct Library: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_eks/README.html
- AWS CDK CLI help output for `cdk deploy --require-approval`, `--all`, and context flags.
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux community Helm chart values: https://github.com/fluxcd-community/helm-charts/blob/main/charts/flux2/values.yaml
- AWS Load Balancer Controller service annotation documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.8/guide/service/annotations/
- AWS Load Balancer Controller subnet discovery documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/deploy/subnet_discovery/

## Issues Found
- The prerequisites mentioned a GitHub personal access token, but the CDK example creates an unauthenticated HTTPS `GitRepository` source and does not use a token or `secretRef`. Changed the prerequisite to require a GitHub repository containing the Flux manifests.
- The Flux Helm chart values included `cli: { install: false }`, but the current `flux2` chart values do not define a `cli.install` field. Removed the unsupported value and the inaccurate comment.
- The ingress-nginx HelmRelease used `service.beta.kubernetes.io/aws-load-balancer-type: nlb`. For AWS Load Balancer Controller-managed NLB Services, current documentation uses `external` and an explicit `aws-load-balancer-nlb-target-type`. Updated the annotation to `external` and added `service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: instance`.

## Review Notes
- The CDK EKS version `eks.KubernetesVersion.V1_31` and matching `KubectlV31Layer` are valid for AWS CDK v2.
- The Flux `GitRepository`, `Kustomization`, `HelmRepository`, and `HelmRelease` API versions used in the snippets are current.
- The `configureFluxAddons` helper is shown as a reusable helper but is not wired into the app entry-point snippet. That is not technically invalid, but a future revision could explicitly show where to call it.
