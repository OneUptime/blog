# Validation Summary: How to Install Linkerd Service Mesh on Kubernetes

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Linkerd (service mesh, control plane, data plane proxies)
- Kubernetes (kubectl, CRDs, Deployments, Services, ConfigMaps, Secrets, Ingress)
- Helm (linkerd-crds, linkerd-control-plane, linkerd-viz charts)
- mTLS / Linkerd identity (trust anchor, issuer certificates)
- step CLI (certificate generation)
- Gateway API style HTTPRoute, Server/ServerAuthorization, ServiceProfile policy CRDs
- SMI TrafficSplit (multi-cluster traffic splitting)
- Prometheus & Grafana (metrics, recording/alerting rules)
- Linkerd multicluster extension

## Sources Consulted
- Linkerd CLI reference: https://linkerd.io/2.15/reference/cli/
- Linkerd viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd High Availability docs: https://linkerd.io/2-edge/features/ha/
- Installing Linkerd with Helm: https://linkerd.io/2-edge/tasks/install-helm/
- linkerd-control-plane Helm values.yaml: https://github.com/linkerd/linkerd2/blob/main/charts/linkerd-control-plane/values.yaml
- Linkerd HTTPRoute reference: https://linkerd.io/2-edge/reference/httproute/
- Automatically Rotating Control Plane TLS Credentials (trust-roots ConfigMap): https://linkerd.io/2-edge/tasks/automatically-rotating-control-plane-tls-credentials/
- linkerd profile CLI reference: https://linkerd.io/2.15/reference/cli/profile/
- Linkerd 2.10 upgrade notes (viz extension split): https://linkerd.io/2.10/tasks/upgrade/

## Issues Found
1. **Invalid `linkerd install` flag `--enable-high-availability`.** This is not a valid flag; the correct flag for high availability is `--ha`. Fixed both occurrences in the "Install with Custom Configuration" section.

2. **Observability commands used at the root level instead of under `viz`.** Since Linkerd 2.10, `tap`, `edges`, `routes`, `stat`, and `top` live under the `linkerd viz` extension and were removed from the root command. Fixed:
   - `linkerd routes deploy/my-app` (and `--watch` / `svc/my-app` variants) → `linkerd viz routes ...`
   - `linkerd edges deployment` → `linkerd viz edges deployment`
   - `linkerd tap deploy/my-app --to ...` (two occurrences) → `linkerd viz tap ...`
   (`linkerd identity`, `linkerd profile`, `linkerd diagnostics`, and `linkerd multicluster` are genuinely root-level and were left unchanged.)

3. **Trust anchor stored in a Secret instead of a ConfigMap.** The trust roots live in the **ConfigMap** `linkerd-identity-trust-roots` (key `ca-bundle.crt`, stored as plain text — no base64 decode needed). The post read it with `kubectl get secret ... | base64 -d`. Fixed all three occurrences (Identity/Certificates section and the two multi-cluster fingerprint checks) to use `kubectl get configmap` and dropped the erroneous `base64 -d`. (The issuer cert/key reads using `kubectl get secret linkerd-identity-issuer ... | base64 -d` are correct and were left unchanged, since the issuer is genuinely a Secret.)

4. **Removed `linkerd profile --tap`/`--tap-duration` flags.** Tap-based service profile generation is no longer supported by `linkerd profile`. Replaced the example with the supported `linkerd profile --template my-app` form (which emits a fillable template). The `--open-api` and `--proto` examples are correct and were left unchanged.

5. **Invalid Helm values in the production values block.** Corrected keys that do not exist in the `linkerd-control-plane` chart:
   - `controllerResources` does not exist — control plane resources are set per component. Replaced with `destinationResources`, `identityResources`, and `proxyInjectorResources`.
   - Top-level `podDisruptionBudget: {enabled, minAvailable}` is not a valid key — replaced with `controller.podDisruptionBudget.maxUnavailable`.
   - `enablePodDebugContainer` is not a chart value — removed.
   (`controllerReplicas`, `enablePodAntiAffinity`, `proxy.resources`, `proxy.logLevel`, `proxy.waitBeforeExitSeconds`, `identity.issuer.issuanceLifetime`, `identity.issuer.clockSkewAllowance`, `webhookFailurePolicy`, `nodeSelector`, and `tolerations` are all valid and were left unchanged.)

6. **Deprecated `kubectl version --short` flag.** The `--short` flag was removed in kubectl v1.28+. Changed both occurrences to `kubectl version` and added a brief note about the removed flag.

## Review Notes
- The multi-cluster traffic splitting example uses the SMI `TrafficSplit` resource (`split.smi-spec.io/v1alpha2`). The API version is correct, but as of Linkerd 2.12+ SMI/TrafficSplit support was moved out of core into the separate `linkerd-smi` extension; modern setups generally prefer `HTTPRoute` with weighted `backendRefs` (already demonstrated earlier in the post) for traffic splitting. Left as-is since it remains functional with the SMI extension installed.
- The Grafana dashboard download URLs point at `raw.githubusercontent.com/linkerd/linkerd2/main/grafana/dashboards/*.json`. Grafana assets have been relocated out of the core linkerd2 repo over time, so these exact paths may 404 depending on the branch/version; readers may need to source dashboards from the current Linkerd/Buoyant location. Not changed because the canonical replacement path varies by version.
- The "Linkerd control plane uses ports 8443, 8089, 9990, 9991" comment is a loose, informational note; the exact admin/webhook ports vary by component. Harmless but imprecise.
- `HTTPRoute` examples use `policy.linkerd.io/v1beta2`, which is valid for the referenced stable-2.14 era; newer releases also offer `v1beta3`. Both are accepted.
- The CRD list, `linkerd check` workflow, sidecar injection annotations, Server/ServerAuthorization/ServiceProfile manifests, and Prometheus metric names (`request_total`, `response_latency_ms_bucket`) all check out against current docs.
