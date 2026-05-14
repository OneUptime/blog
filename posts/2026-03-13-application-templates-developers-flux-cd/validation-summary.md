# Validation Summary: How to Create Application Templates for Developers with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2
- Flux Kustomization custom resources
- Kubernetes Deployments, Services, Ingresses, and HorizontalPodAutoscalers
- Kustomize bases, overlays, patches, labels, image transformers, and remote bases
- Git tags for template versioning

## Sources Consulted
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The introduction and conclusion implied centrally updated templates would be picked up automatically by all referencing applications. Because the tutorial later recommends pinning remote bases to Git tags, applications only receive template changes after updating the referenced tag. Reworded this to describe controlled opt-in upgrades.
- The Deployment example set `spec.replicas` while the template also included a HorizontalPodAutoscaler. Kubernetes documentation recommends not setting Deployment replicas when an HPA manages scaling. Removed `spec.replicas` from the base Deployment and removed the production overlay patch that replaced `/spec/replicas`.
- The developer overlay patched only the Deployment `metadata.name`, which would not reliably update related generated names or references such as the HPA scale target, Service name, or Ingress backend references. Replaced that with `namePrefix: my-service-` so Kustomize can apply name transformations and update supported name references.
- The developer overlay relied on generic `app: app` selectors from the shared base, which could cause multiple applications instantiated from the template in the same namespace to share selectors. Added a Kustomize `labels` transformer with `includeSelectors: true` for `app.kubernetes.io/name: my-service`.
- The developer overlay patched the container image by JSON pointer. This was syntactically valid, but Kustomize provides an image transformer for this purpose. Replaced the image patch with the `images` field while keeping the focused container-name patch.

## Review Notes
- The post references `service.yaml` and `ingress.yaml` in the directory structure and base kustomization but does not include their full contents. The corrected overlay assumes those files use ordinary Kubernetes Service and Ingress references that Kustomize can transform.
- Remote bases are supported by Kustomize and Flux kustomize-controller, but Flux operators can disable them with the `--no-remote-bases` controller flag. Teams using this pattern should confirm their Flux installation allows remote bases.
