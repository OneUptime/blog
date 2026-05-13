# Validation Summary: How to Configure Flagger for Multi-Service Canary Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes
- Istio
- Canary deployments
- Flagger webhooks
- kubectl

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Deployment Strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/v1.43.0/artifacts/flagger/crd.yaml
- Flagger loadtester package documentation: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The `confirm-promotion` example checked only that dependent canaries were not `Failed`, which would allow promotion while dependencies were still `Initialized`, `Waiting`, or `Progressing`. Updated the command to require each dependency's `.status.phase` to equal `Succeeded`.
- The coordinated rollback description implied Flagger would automatically roll back all related canaries through `confirm-promotion` gating alone. Updated the wording to clarify that gated canaries will not promote and that active coordinated rollback requires a rollback webhook or external automation.

## Review Notes
- The Kubernetes Deployment examples use current `apps/v1` syntax.
- The Flagger Canary examples use current `flagger.app/v1beta1` fields for Flagger v1.37+ and remain valid against the current CRD schema.
- The `kubectl set image deployment/name container=image` commands match the official Kubernetes command reference.
