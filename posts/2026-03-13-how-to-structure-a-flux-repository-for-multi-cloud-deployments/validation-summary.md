# Validation Summary: How to Structure a Flux Repository for Multi-Cloud Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux Kustomization API
- Flux HelmRelease API
- Kubernetes
- Kustomize
- Kubernetes Ingress
- AWS Load Balancer Controller
- GKE Ingress and Google-managed certificates
- cert-manager

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/
- Amazon EKS Application Load Balancer Ingress documentation: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- GKE secure traffic / Google-managed certificates documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/secure-traffic-management
- cert-manager Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/

## Issues Found
- The AWS Ingress patch used the legacy `kubernetes.io/ingress.class: alb` annotation. Kubernetes documents this annotation as deprecated in favor of `spec.ingressClassName`, and the AWS Load Balancer Controller documents IngressClass as the current mechanism while retaining the annotation only for backward compatibility. Updated the AWS patch to use `spec.ingressClassName: alb` and kept the AWS-specific ALB annotations for scheme and target type.

## Review Notes
- The GCP Ingress patch intentionally still uses `kubernetes.io/ingress.class: gce`; current GKE documentation for Google-managed certificates states that this annotation is required and that `ingressClassName` is not supported for that use case.
- The Flux `postBuild.substitute` and `substituteFrom` fields, Flux `Kustomization` API version, Flux `HelmRelease` API version, and `flux bootstrap github` flags shown in the post match current Flux documentation.
- The cert-manager `installCRDs: true` value is valid for the chart version family shown in the post. Newer cert-manager guidance also documents `crds.enabled` for current releases, so future updates may want to revisit the pinned chart example.
