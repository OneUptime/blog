# Validation Summary: How to Use Kustomize Components with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes
- Kubernetes NetworkPolicy
- GitOps

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Kustomize components example documentation: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/components.md
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kustomize v5.8.1 CLI behavior, downloaded from the official kubernetes-sigs/kustomize GitHub release

## Issues Found
- The NetworkPolicy component description said it allowed "only required traffic", but the example combines a default-deny ingress/egress policy with an ingress-only allow policy. Updated the wording to "only required ingress traffic" to avoid implying egress is allowed.
- The debug tools component described the added container as "debug containers", which could be confused with Kubernetes ephemeral debug containers. Updated the wording to "debug sidecar containers" because the snippet adds a regular container to the Deployment pod template.

## Review Notes
- Argo CD renders a source path with Kustomize when a `kustomization.yaml` exists, and official Argo CD documentation supports Kustomize components both through overlay `components:` and, from Argo CD v2.10.0, through `spec.source.kustomize.components`.
- The `argocd app manifests my-api-production --source git` command is valid according to the Argo CD command reference.
- The Kustomize component examples were validated with Kustomize v5.8.1 for component inclusion and target-based strategic merge patches across multiple Deployments.
- The NetworkPolicy examples are syntactically valid, but a production deny-all egress baseline usually also needs explicit egress rules for DNS and any external dependencies.
