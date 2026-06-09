# Validation Summary: How to Implement Kubernetes Service Mesh

## Status
validated

## Post Type
Tutorial / Hands-on implementation guide

## Technologies Covered
- Kubernetes
- Istio (service mesh, control plane, sidecar proxy, IstioOperator)
- Linkerd (service mesh, viz extension)
- Envoy proxy
- mTLS / SPIFFE identity
- Istio CRDs: PeerAuthentication, AuthorizationPolicy, VirtualService, DestinationRule
- Prometheus (ServiceMonitor, PodMonitor, PromQL)
- Grafana dashboards
- `step` CLI for certificate generation
- `kubectl`, `istioctl`, `linkerd` CLIs
- nicolaka/netshoot debug container

## Sources Consulted
- Istio documentation — https://istio.io/latest/docs/
- Istio reference (commands & API) — https://istio.io/latest/docs/reference/
- Linkerd installation docs — https://linkerd.io/2/getting-started/
- Kubernetes kubectl reference — https://kubernetes.io/docs/reference/kubectl/
- Istio PR #22407: "Remove deprecate istioctl authn tls-check" — https://github.com/istio/istio/pull/22407
- Envoy access log format documentation
- Prometheus Operator CRDs documentation

## Issues Found

1. **`kubectl version --short` flag is deprecated/removed** (line 74).
   The `--short` flag for `kubectl version` was deprecated in Kubernetes 1.27 and effectively removed in newer kubectl releases — running it now emits a deprecation warning or errors out depending on version. Replaced with `kubectl version -o json | jq -r '.serverVersion.gitVersion'`, which works reliably across modern kubectl/server versions.

2. **Missing `linkerd install --crds` step in Linkerd installation** (around line 307).
   Starting with Linkerd 2.12, the installation procedure was split: CRDs must be installed first via `linkerd install --crds | kubectl apply -f -`, then the control plane via `linkerd install ... | kubectl apply -f -`. The post jumped straight to the control plane install, which would fail on a fresh cluster. Added the CRD-install step before the control plane install.

3. **`istioctl x authz check` mislabeled as an mTLS verification command** (line 390).
   `istioctl x authz check` (alias of `istioctl experimental authz check`) inspects **authorization policies** on a workload's Envoy config — it does not report mTLS status. The legacy `istioctl authn tls-check` (which did this) was deprecated and removed (Istio PR #22407). Replaced with `istioctl x describe pod <pod-name> -n default`, which is the currently recommended way to inspect mTLS mode applied to a workload.

## Review Notes

- The post uses `apiVersion: install.istio.io/v1alpha1` (`IstioOperator`) for installation. This is still functional but the IstioOperator-based install path has been increasingly de-emphasized in favor of Helm in recent Istio releases (1.23+). The post does not advertise itself as targeting a specific Istio version, and IstioOperator continues to be supported, so this was left as-is. Readers on Istio 1.24+ may want to consult current Istio install docs for guidance on Helm vs. IstioOperator.
- `apiVersion: networking.istio.io/v1beta1` and `apiVersion: security.istio.io/v1beta1` are correct and supported. Istio has also graduated these CRDs to `v1`; both versions are accepted by current Istio releases, so the v1beta1 examples remain valid.
- The Envoy `accessLogFormat` string uses valid Envoy access log operators (e.g. `%REQ(:METHOD)%`, `%RESPONSE_CODE%`, `%RESPONSE_FLAGS%`, `%DURATION%`).
- The Istio Prometheus metrics referenced (`istio_requests_total`, `istio_request_duration_milliseconds_bucket`, `istio_tcp_connections_opened_total`, `istio_tcp_connections_closed_total`) are accurate metric names.
- The `consecutive5xxErrors` field in `outlierDetection` is correct (replaced the older `consecutiveErrors`).
- `h2UpgradePolicy: UPGRADE` is a valid `connectionPool.http` setting.
- The deny-all `AuthorizationPolicy` with an empty `spec: {}` is correctly the Istio idiom for deny-all when paired with the default `ALLOW` action absence.
- The "Resource Impact" section heading is missing its `##` markdown prefix (line 962), but this is a formatting/style issue rather than a technical correctness issue, so it was not modified per the review-scope guidelines.
- The mTLS sequence diagram correctly shows the typical SPIFFE/Istio flow: app-to-sidecar plaintext over loopback, mTLS between sidecars.
