# Validation Summary: How to Configure Progressive Delivery with Flagger on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Flagger
- Helm
- NGINX Ingress
- Prometheus
- Slack

## Sources Consulted
- Flagger introduction: https://docs.flagger.app/
- Flagger canary resource and analysis behavior: https://docs.flagger.app/main/usage/how-it-works
- Flagger deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks and rollback flow: https://docs.flagger.app/main/usage/webhooks
- Flagger alerting and `AlertProvider`: https://docs.flagger.app/main/usage/alerting
- Flagger NGINX progressive delivery tutorial: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger Kubernetes blue-green tutorial: https://docs.flagger.app/main/tutorials/kubernetes-blue-green
- Flagger upgrade guide for deprecated `spec.canaryAnalysis`: https://docs.flagger.app/main/dev/upgrade-guide
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post used deprecated Flagger schema fields such as `spec.canaryAnalysis`. I replaced them with `spec.analysis`, which is the current documented field in Flagger `v1beta1`.
- The NGINX canary example used Istio-style `service.gateways` and `service.hosts`, which are not the documented NGINX configuration path. I replaced those with `provider: nginx` and `ingressRef` to match Flagger's NGINX tutorial.
- The canary load-test webhook targeted the canary ClusterIP service directly. For NGINX progressive delivery, Flagger's documented example drives traffic through the public host so the ingress controller participates in the rollout. I changed the load-test target to `http://api.company.com/`.
- The monitoring example sorted events by `.lastTimestamp` and filtered only by object name. I updated it to sort by `.metadata.creationTimestamp` and filter on both `involvedObject.kind=Canary` and `involvedObject.name=api-server` so it aligns with current Kubernetes field-selector guidance and scopes to the Flagger canary object.
- The blue-green example modeled blue-green as `stepWeight: 100`, which is not Flagger's documented blue-green strategy. I changed it to use `provider: kubernetes` with `analysis.iterations`, which is how Flagger documents blue-green promotion.
- The manual rollback example used `kubectl annotate canary ... flagger.app/rollback="true"`, which is not the documented Flagger rollback flow. I replaced it with the documented rollback webhook approach using `type: rollback` and the load tester's `rollback/open` endpoint.
- The rollback event example filtered on `reason=Rolled_Back`, which does not match Flagger's documented event flow. I replaced it with a canary-scoped event watch.
- The notification example still nested alerts under `canaryAnalysis`. I corrected it to `analysis.alerts`.

## Review Notes
- The post now explicitly assumes an existing Prometheus instance at `prometheus.monitoring.svc:9090` and an existing Kubernetes `Ingress` named `api-server` for the NGINX example.
- The blue-green example intentionally overrides the globally installed NGINX provider with `provider: kubernetes`, which Flagger supports on a per-canary basis.
