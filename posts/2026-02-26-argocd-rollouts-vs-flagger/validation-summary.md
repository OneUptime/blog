# Validation Summary: ArgoCD + Argo Rollouts vs Flagger: Progressive Delivery Showdown

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Flagger
- Flux CD
- Kubernetes Deployments and custom resources
- Canary deployments
- Blue-green deployments
- Progressive delivery analysis and metrics
- Istio, Linkerd, NGINX Ingress, AWS ALB, SMI, Contour, Gloo, Apache APISIX, Traefik
- Prometheus, Datadog, New Relic, CloudWatch, Graphite, InfluxDB, Kayenta, Apache SkyWalking, Google Cloud Monitoring, Dynatrace, Keptn, Splunk

## Sources Consulted
- Argo Rollouts overview: https://argoproj.github.io/rollouts/
- Argo Rollouts traffic management documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/
- Argo Rollouts Istio traffic routing documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Argo Rollouts specification documentation: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts FAQ: https://argoproj.github.io/argo-rollouts/FAQ/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Flagger introduction: https://docs.flagger.app/main
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Kubernetes blue-green documentation: https://docs.flagger.app/main/tutorials/kubernetes-blue-green
- Flagger project site: https://flagger.app/
- OneUptime Kubernetes product page: https://oneuptime.com/product/kubernetes

## Issues Found
- The post said Flagger wraps Deployments without changing the resource type in a way that implied no custom resources are involved. Updated the wording to clarify that Flagger uses a Canary custom resource while keeping the application workload as a Deployment.
- The Argo Rollouts canary example comment said the inline analysis step runs for five minutes. The snippet did not define that duration, so the comment was changed to "Run analysis."
- The metric provider comparison was outdated and omitted several current providers. Updated the Argo Rollouts and Flagger provider lists based on the current official documentation.
- The traffic management table incorrectly marked Flagger Traefik support as "No." Changed it to "Yes."
- The Argo CD integration section overstated native Rollout UI support. Updated it to distinguish Argo CD health/actions from Rollout-specific views provided by the Argo Rollouts UI extension.
- The Argo CD ignore differences example did not include `RespectIgnoreDifferences=true`, which is needed when ignored fields should also be respected during sync. Added the sync option.
- The "When to Choose Flagger" section said "no custom resource types," which is inaccurate because Flagger uses the Canary CRD. Updated it to say Flagger keeps the application workload as a Deployment.
- The final OneUptime link pointed to an ArgoCD vs FluxCD comparison while the link text referenced Kubernetes monitoring. Updated it to the Kubernetes product page.

## Review Notes
The YAML examples are illustrative and omit supporting resources such as Services, VirtualServices, DestinationRules, Deployments, AnalysisTemplates, and MetricTemplates. They are technically consistent as partial snippets, but a future tutorial-style version should include complete manifests or explicitly label each block as an excerpt.
