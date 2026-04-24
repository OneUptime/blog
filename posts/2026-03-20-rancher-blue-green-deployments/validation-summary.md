# Validation Summary: How to Implement Blue-Green Deployments in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Ingress
- Kubernetes readiness probes
- `kubectl`
- GitHub Actions
- Blue-green deployment strategy

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl set image` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Rancher documentation for accessing managed clusters with `kubectl`: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions

## Issues Found
- The description said the guide used "GitOps automation," but the example implementation is an imperative GitHub Actions CI/CD workflow using `kubectl`, not a GitOps reconciler such as Flux or Argo CD. I changed the description to say `CI/CD automation`.
- The smoke-test step called `http://myapp-${{ steps.slot.outputs.target }}` but Step 2 defined only the active `myapp` Service. I added `myapp-blue` and `myapp-green` Services so the inactive slot can actually be tested directly before traffic is switched.
- The smoke-test step used `kubectl run --rm -it`, which allocates a TTY and is a poor fit for a non-interactive GitHub Actions runner. I changed it to `--attach --rm --restart=Never --command -- curl -fsS ...`, which matches the documented `kubectl run` behavior for attached one-shot Pods in CI.

## Review Notes
- The Kubernetes manifests use current stable APIs: `apps/v1` for Deployments and `networking.k8s.io/v1` for Ingress.
- The example `ingressClassName: nginx` is valid, but readers still need an `IngressClass` named `nginx` in their cluster, or they must replace it with the class name used in their environment.
- The approach is Kubernetes-native rather than Rancher-specific, but it is technically applicable to Rancher-managed clusters because Rancher-managed clusters are operated through standard Kubernetes APIs and `kubectl`.
