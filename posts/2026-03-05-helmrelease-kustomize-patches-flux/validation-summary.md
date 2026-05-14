# Validation Summary: How to Use HelmRelease with Kustomize Patches in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Kustomize patches
- Kubernetes Deployments, Services, and ConfigMaps
- Helm post-renderers
- AWS Load Balancer Controller annotations

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://v2-0.docs.fluxcd.io/flux/components/helm/api/
- Flux Kustomization documentation: https://v2-6.docs.fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes well-known annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- AWS Load Balancer Controller NLB documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/

## Issues Found
- The base post-renderer patch used `metadata.name: all` while targeting all Deployments by `kind`. This is technically misleading because the `target` selector identifies the patched resources, and Flux/Kustomize examples use placeholder names when a separate target selector is supplied. Changed it to `metadata.name: not-used`.
- The AWS NLB Service annotation example used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"` and the deprecated `service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled` annotation. Updated the example to use the AWS Load Balancer Controller pattern with `aws-load-balancer-type: "external"`, explicit `aws-load-balancer-nlb-target-type: "instance"`, and `aws-load-balancer-attributes: "load_balancing.cross_zone.enabled=true"`.
- The "Patch name mismatch" pitfall incorrectly implied that the `metadata.name` inside every strategic merge patch must match the rendered resource name. Updated it to clarify that `target.name` must match the rendered resource when used, while a patch using kind or label selectors can use a placeholder `metadata.name`.

## Review Notes
The remaining HelmRelease, Flux Kustomization, Kustomize patch, Kubernetes scheduling, and verification command examples are consistent with the official documentation reviewed. The examples still assume the chart renders resources with the names and labels shown; users must adjust those selectors to their actual chart output.
