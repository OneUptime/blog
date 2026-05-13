# Validation Summary: Flagger vs Istio Native Canary: Which Approach Is Better

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments, Services, and kubectl patch
- Istio VirtualService and DestinationRule traffic splitting
- Flagger Canary custom resources
- Prometheus-based canary metric analysis
- Flagger webhooks and load testing

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Flagger Istio canary deployments: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks: https://docs.flagger.app/main/usage/webhooks
- Flagger Canary CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The native Istio example routed to host `myapp` but did not define a Kubernetes Service named `myapp`. Added a Service selecting both stable and canary pods, and added `containerPort: 8080` to make the example internally consistent.
- The Istio manifests used `networking.istio.io/v1beta1`. Updated the DestinationRule and VirtualService examples to `networking.istio.io/v1`, matching the current Istio reference examples.
- The `kubectl patch` command used the short resource name `virtualservice`. Changed it to `virtualservice.networking.istio.io` to avoid ambiguity and align with the Istio custom resource being patched.
- The Flagger description implied Flagger creates both primary and canary Deployment variants from a single Deployment. Adjusted the wording to clarify that the target Deployment is the source/canary workload and Flagger creates the primary variant plus services and routing objects.
- The comparison table omitted the Service required by the native Istio example and understated generated objects in the Flagger path. Updated the table to reflect the Service and Flagger-generated services/routing.
- The best-practices section listed header matching and mirroring as examples of routing Flagger does not support. Flagger's Istio integration supports A/B header/cookie routing and traffic mirroring, so the guidance was narrowed to route behavior outside Flagger's Canary spec.

## Review Notes
The Flagger Canary fields for service headers, traffic policy, builtin metrics, metric template references, and webhooks match the current CRD schema and official documentation. The example assumes an existing Istio Gateway named `istio-system/public-gateway`, Prometheus/Istio telemetry, and the Flagger load tester service.
