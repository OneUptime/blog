# Validation Summary: How to Deploy Linkerd with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Kubernetes
- Linkerd
- Helm
- Smallstep `step` CLI
- Prometheus

## Sources Consulted
- Linkerd releases and versions: https://linkerd.io/releases/
- Linkerd Helm installation guide: https://linkerd.io/2.19/tasks/install-helm/
- Linkerd Helm chart index: https://helm.linkerd.io/edge/index.yaml
- Linkerd automatic proxy injection: https://linkerd.io/2-edge/features/proxy-injection/
- Linkerd certificate generation guide: https://linkerd.io/2.19/tasks/generate-certificates/
- Linkerd external Prometheus guide: https://linkerd.io/2.19/tasks/external-prometheus/
- Linkerd dynamic request routing guide: https://linkerd.io/2.19/tasks/configuring-dynamic-request-routing/
- Linkerd HTTPRoute reference: https://linkerd.io/2.19/reference/httproute/
- Linkerd traffic split deprecation note: https://linkerd.io/2.19/features/traffic-split/
- Smallstep `step certificate create` reference: https://smallstep.com/docs/step-cli/reference/certificate/create/

## Issues Found
- The description incorrectly claimed Linkerd provides these features "without sidecar resource overhead." Linkerd uses injected sidecar proxies, so this was corrected to describe lower sidecar overhead rather than no overhead.
- The post pinned old `stable` Helm repository/chart versions. Current official Linkerd guidance uses the `edge` Helm repository, and the open source project no longer publishes stable release artifacts. The chart repository URLs and versions were updated to current official edge charts.
- The Linkerd Viz example configured `prometheusUrl` for an existing Prometheus instance but did not disable the bundled Prometheus. `prometheus.enabled = false` was added so the configuration matches Linkerd's documented external Prometheus setup.
- The traffic-splitting section used the deprecated SMI `TrafficSplit` API. It was replaced with a current `HTTPRoute` weighted-routing example based on Linkerd's current request-routing APIs.
- The routing example now includes explicit `depends_on` references for the control plane and application namespace so the manifest ordering is valid in an OpenTofu apply.
- The resource comparison diagram used specific CPU/RAM numbers that were not supported by current official documentation and mixed benchmark CPU time with Kubernetes-style CPU units. It was rewritten as a qualitative comparison.

## Review Notes
- The root trust-anchor example uses `--not-after 8760h`, which is valid, but Linkerd's certificate guide notes that longer-lived trust anchors are common; only the clearly incorrect items were changed.
- `dashboard.enforcedHostRegexp = ".*"` is permissive. It works, but if the dashboard is exposed beyond local development, production deployments should restrict it to expected hostnames.
