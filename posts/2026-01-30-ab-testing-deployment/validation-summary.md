# Validation Summary: How to Build A/B Testing Deployment

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Kubernetes Deployments, Services, and Ingress
- ingress-nginx canary annotations
- Istio VirtualService and DestinationRule traffic management
- Flagger Canary and MetricTemplate resources
- Prometheus metrics and PromQL
- Grafana dashboard JSON snippets
- Express.js middleware
- Python statistical analysis with SciPy
- GitHub Actions deployment workflow
- Docker, kubectl, Helm, and istioctl CLI usage

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx canary deployment example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Flagger metrics analysis documentation: https://docs.flagger.app/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flagger Istio A/B testing documentation: https://docs.flagger.app/tutorials/istio-ab-testing
- Flagger "How it works" Canary resource documentation: https://docs.flagger.app/usage/how-it-works
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Azure k8s-set-context action documentation: https://github.com/Azure/k8s-set-context

## Issues Found
- The Ingress examples used the legacy `kubernetes.io/ingress.class` annotation. Updated the examples to use `spec.ingressClassName: nginx`, which is the current Kubernetes Ingress field for Kubernetes v1.18+.
- The header/cookie routing section described cookie routing as taking precedence over header routing, but ingress-nginx evaluates canary rules in the order `canary-by-header`, then `canary-by-cookie`, then `canary-weight`. Updated the prose and comments to match the documented precedence.
- The Express cookie example set cookie values to `experiment` and `control`, but ingress-nginx `canary-by-cookie` routes only when the cookie value is `always` and prevents canary routing when it is `never`. Updated the cookie values while preserving the application-level `experiment` and `control` group names.
- The Flagger custom conversion-rate check was modeled as a webhook with Prometheus query metadata and `thresholdRange`, which is not valid Flagger webhook syntax. Replaced it with a `MetricTemplate` and referenced it from `analysis.metrics` with `templateRef`, matching Flagger's custom metric model.
- The sample-size script output was incorrect for the formula shown. Updated the expected sample size from `31234` to `31200`.
- The chi-squared test output was statistically incorrect for the provided conversion counts. Updated the p-value and recommendation to reflect SciPy's default Yates-corrected chi-squared result: not significant, keep control.
- The GitHub Actions-generated canary Ingress omitted the Ingress class. Added `ingressClassName: nginx` to keep it consistent with the corrected Kubernetes examples.

## Review Notes
- The post is technically relevant and contains substantial implementation content.
- The example Docker image name `myapp:experiment-${{ github.sha }}` is illustrative; a real workflow should use a registry-qualified image name that the workflow can push.
- The Grafana dashboard JSON is a partial illustrative dashboard model rather than a complete export with all Grafana metadata fields.
