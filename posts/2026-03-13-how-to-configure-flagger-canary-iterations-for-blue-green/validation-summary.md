# Validation Summary: How to Configure Flagger Canary Iterations for Blue-Green

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes
- Kubernetes Canary custom resources
- Blue-green deployments
- Traffic mirroring
- Flagger webhooks and load testing
- kubectl

## Sources Consulted
- Flagger Deployment Strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Kubernetes Blue/Green Deployments tutorial: https://docs.flagger.app/main/tutorials/kubernetes-blue-green
- Flagger How It Works: https://docs.flagger.app/usage/how-it-works
- Flagger Webhooks: https://docs.flagger.app/main/usage/webhooks
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The post implied that a service mesh or ingress controller is required for blue-green deployments. Flagger's official docs state that blue-green can run with the Kubernetes provider and does not require Layer 7 traffic management, so the prerequisite was corrected.
- The post described blue-green promotion as a direct permanent switch from primary to canary and showed the primary being scaled down. Flagger promotes the canary spec to the primary deployment and scales down the canary; for service mesh providers, traffic can briefly route to canary before routing back to the updated primary. The explanation and sequence diagram were corrected.
- The post said rollback occurs after three consecutive failed checks. Flagger documents `threshold` as the maximum number of failed checks before rollback, so the wording was changed to avoid claiming consecutiveness.
- The monitoring section claimed `WEIGHT` stays at 0 during blue-green analysis. Official examples show weight behavior can vary by provider, so the post now recommends checking events or `.status.iterations` for iteration progress.
- The mirroring section did not mention duplicate-request safety. Flagger's docs warn that mirrored traffic sends a copy to the canary, so the post now notes that mirroring should be used only for idempotent or duplicate-safe requests.

## Review Notes
The YAML snippets use valid Flagger `flagger.app/v1beta1` fields (`iterations`, `threshold`, `metrics`, `thresholdRange`, `webhooks`, `mirror`, and `mirrorWeight`) and current Kubernetes `autoscaling/v2` HPA references. The `kubectl set image`, `kubectl get`, `kubectl describe`, and `kubectl logs` commands are syntactically consistent with Kubernetes CLI documentation, though `kubectl` was not installed in the local environment for direct command-help verification.
