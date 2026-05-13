# Validation Summary: How to Debug Flagger Canary That Gets Stuck in Progressing State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flagger
- Kubernetes
- kubectl
- Prometheus and PromQL
- Canary deployments
- Istio, NGINX Ingress, and Linkerd routing resources

## Sources Consulted
- Flagger documentation: How it works, Canary resource and progress deadline: https://docs.flagger.app/usage/how-it-works
- Flagger documentation: Deployment strategies and canary rollout behavior: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger documentation: Webhooks and load testing behavior: https://docs.flagger.app/main/usage/webhooks
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/3.2/querying/api/

## Issues Found
- The first Flagger logs command was described as filtered for the canary, but the command only selects Flagger pods. Updated the comment to avoid implying the command filters by canary name.
- The Prometheus query example embedded a PromQL expression directly in the URL. Because the query contains characters such as braces and square brackets, this can fail with curl URL globbing or encoding issues. Updated the example to use `curl -G --data-urlencode`, matching Prometheus HTTP API guidance.
- The metrics section said missing metric data would leave the canary stuck indefinitely. Flagger documentation says failed metric checks halt advancement, increment failed checks, and eventually roll back when the threshold is reached. Updated the wording accordingly.
- The progress deadline section only described a too-low deadline. Flagger defines the field as the maximum time for the canary deployment to make progress before rollback. Updated the explanation to clarify both too-low and too-high settings.
- The webhook section implied all failing webhooks block progression the same way. Flagger distinguishes confirmation hooks, which pause until approval, from pre-rollout and rollout hooks, which increment failed checks and can roll back. Updated the wording for that distinction.

## Review Notes
The remaining commands are environment-dependent but syntactically consistent with current kubectl references. The exact Flagger label selectors, generated service names, routing resources, and metric names can vary by installation and provider configuration, so the guide correctly presents them as items to verify rather than universal constants.
