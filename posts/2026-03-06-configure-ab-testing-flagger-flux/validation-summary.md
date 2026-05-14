# Validation Summary: How to Configure A/B Testing with Flagger and Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Flux CD Kustomization
- Kubernetes Deployments, Ingress, HPA, Secrets, and Namespaces
- Istio traffic routing
- NGINX Ingress Controller
- Prometheus and PromQL MetricTemplates
- Flagger loadtester webhooks
- JavaScript fetch and cookies

## Sources Consulted
- Flagger deployment strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Istio A/B testing tutorial: https://docs.flagger.app/main/tutorials/istio-ab-testing
- Flagger NGINX progressive delivery tutorial: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger Canary CRD source: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes HPA documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction described query parameters as a Flagger A/B testing match attribute. Flagger's A/B testing documentation describes HTTP headers and cookies for this strategy, so the wording was narrowed to supported request attributes.
- The list of supported A/B testing integrations was incomplete and vague. It now matches the Flagger-supported set for A/B testing more closely: Istio, App Mesh, NGINX, Contour, Gloo Edge, and Gateway API-compatible implementations.
- The Istio gateway reference used a service FQDN-like value. Flagger's Istio examples use the `namespace/name` gateway form, so it was changed to `istio-system/public-gateway`.
- The Istio `sourceLabels` match was described as a source IP range and was used without the `mesh` gateway. Flagger documents `sourceLabels` as workload-label matching and notes that it applies only when `mesh` is included in `service.gateways`; the comment was corrected and `mesh` was added.
- The Istio traffic policy forced `ISTIO_MUTUAL` without stating that mesh-wide mTLS must be enabled. The example now defaults to `DISABLE` and notes when `ISTIO_MUTUAL` should be used.
- The cookie examples used `canary=true`. Flagger's NGINX A/B docs require cookie matching by cookie name with the cookie value set to `always`, so examples were standardized on `canary=always`.
- The NGINX Canary example omitted `spec.provider: nginx`, which is present in the official Flagger NGINX examples and is needed when the Canary should override or make explicit the provider.
- The NGINX cookie match used a regex. Flagger documents NGINX cookie matching as exact cookie-name matching with the value set to `always`, so the match was changed to `exact: "canary"`.
- The NGINX load test sent traffic directly to the canary service. For NGINX A/B routing, the load should go through the Ingress host with the matching header or cookie, so the command was changed to target `http://frontend.example.com/`.
- The custom metrics section claimed to compare version A against version B, but the PromQL examples only target canary pods. The section was renamed and reworded to describe canary validation.
- The custom metric template names and Prometheus label selectors were adjusted to align with Flagger's documented pod metric examples.
- The troubleshooting Prometheus query used the old `namespace` label while the custom templates used Kubernetes pod labels; it was updated to `kubernetes_namespace`.
- The summary claimed Flagger monitors metrics for both versions. It was corrected to say it monitors canary metrics.

## Review Notes
- The YAML snippets were parsed locally with PyYAML after edits.
- `kubectl` is not installed in this workspace, so CLI forms were reviewed against Kubernetes documentation instead of local `kubectl --help`.
- The custom MetricTemplates depend on the Prometheus scrape label names used by the target metrics pipeline; installations with different relabeling may need corresponding label changes.
