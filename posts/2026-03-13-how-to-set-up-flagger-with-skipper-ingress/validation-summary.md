# Validation Summary: How to Set Up Flagger with Skipper Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Skipper ingress controller
- Kubernetes Ingress
- Kubernetes Deployments, Services, DaemonSets, RBAC
- Helm
- Prometheus
- Flagger Canary and MetricTemplate resources

## Sources Consulted
- Flagger Skipper canary deployment tutorial: https://fluxcd.io/flagger/tutorials/skipper-progressive-delivery/
- Flagger Kubernetes install documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger Helm chart values: https://github.com/fluxcd/flagger/blob/main/charts/flagger/values.yaml
- Flagger Skipper router implementation: https://github.com/fluxcd/flagger/blob/main/pkg/router/skipper.go
- Flagger Skipper metrics observer implementation: https://github.com/fluxcd/flagger/blob/main/pkg/metrics/observers/skipper.go
- Skipper ingress controller deployment documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-controller/
- Skipper ingress usage and annotation documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-usage/
- Skipper command-line configuration source: https://github.com/zalando/skipper/blob/master/config/config.go
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post installed Skipper from a Helm repository and chart that do not exist in the official Skipper project. Replaced the Helm install with manifest-based installation guidance and a current Kubernetes DaemonSet/RBAC/Service example.
- The Skipper example used deprecated or incomplete Prometheus metrics configuration for Flagger's Skipper checks. Replaced `-enable-prometheus-metrics` with `-metrics-flavour=prometheus` and added route-level metrics flags used by Flagger's built-in `request-success-rate` and `request-duration` queries.
- The Prometheus install command used the `prometheus-community/prometheus` chart without adding the Prometheus Community Helm repository. Added the missing `helm repo add` and `helm repo update` commands.
- The Flagger install command omitted the Canary CRD installation even though the Flagger chart defaults `crd.create` to false. Added the documented CRD installation step and set `crd.create=false` explicitly.
- The Canary example omitted `spec.provider: skipper`, which is present in the official Flagger Skipper tutorial and keeps the resource provider-specific even if the controller is configured with a default provider. Added the field.
- The load-test webhook omitted `metadata.type: cmd`, which is used in the official Flagger load tester examples for command execution. Added it.
- The traffic-splitting explanation said Flagger updates the referenced Ingress directly. Flagger's Skipper router creates a generated canary Ingress and updates `zalando.org/backend-weights` there. Updated the explanation and the inspection command to use `podinfo-canary`.
- The custom MetricTemplate example used host-level metric labels that do not match Flagger's documented Skipper route-level query pattern. Replaced it with the Skipper latency query from the official Flagger Skipper tutorial.

## Review Notes
- I could not run `helm` or `kubectl` locally because neither command is installed in this workspace. Commands and manifests were checked against official documentation and source code instead.
- The post still uses the legacy `kubernetes.io/ingress.class` annotation because Skipper's own ingress controller documentation continues to document that annotation for Skipper class selection.
