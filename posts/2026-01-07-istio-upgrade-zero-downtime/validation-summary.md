# Validation Summary: How to Upgrade Istio with Zero Downtime

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Istio service mesh
- Istio canary upgrades and revision labels
- istioctl
- Helm
- Kubernetes workloads, namespaces, webhooks, HPAs, and Services
- Istio ingress gateways
- Grafana and Prometheus monitoring snippets

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio 1.20 Canary Upgrades: https://istio.io/v1.20/docs/setup/upgrade/canary/
- Istio Upgrade with Helm: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Installing Gateways: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio 1.20 Installing Gateways: https://istio.io/v1.20/docs/setup/additional-setup/gateway/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Understand your Mesh with istioctl describe: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Local validation with official `istioctl` 1.20.0 and 1.30.1 binaries downloaded from https://istio.io/downloadIstio

## Issues Found
- The examples were pinned to Istio 1.20.0, which is no longer supported as of June 23, 2026. Updated the example target version and revision from 1.20.0 / 1-20-0 to 1.30.1 / 1-30-1.
- The IstioOperator comments described `enableAutoMtls` as an Envoy access log service setting. Corrected the comment to describe automatic mutual TLS.
- The IstioOperator combined `replicaCount` with autoscaling, which `istioctl` warns against when autoscaling is enabled. Replaced fixed replica counts with HPA `minReplicas` settings.
- The HPA metric format used the older `targetAverageUtilization` field. Updated it to the autoscaling/v2 `target.type` and `target.averageUtilization` format required by Istio 1.30.1 rendering.
- The Helm canary flow used `helm install istio-base ... --set defaultRevision=...` for an existing installation. Updated it to `helm upgrade istio-base istio/base -n istio-system`, matching the official Helm upgrade flow.
- The `istioctl experimental wait --for=distribution --revision=... --timeout=...` command omitted the required resource type and name. Replaced it with `kubectl wait` for the new `istiod` deployment availability.
- The post used `istioctl authn tls-check`, which is not available in the verified `istioctl` command set. Replaced those checks with `istioctl x describe pod`, which official docs recommend for inspecting pod traffic and mTLS policy.
- The ingress gateway canary Deployment used sidecar injection instead of the gateway injection template, pinned a proxy image manually, and changed the Service selector to only the new revision. Updated it to use `inject.istio.io/templates: gateway`, `image: auto`, stable gateway labels, endpoint verification, and replica scaling for gradual traffic movement.
- The old control-plane removal section showed `istioctl uninstall --revision=default` for a non-revisioned install and manually deleted shared configmaps/webhooks. Replaced this with revision-specific uninstall for an old revision, profile-based uninstall for non-revisioned installs, and inspection of leftover webhooks before manual deletion.

## Review Notes
- The revised IstioOperator manifest was rendered successfully with official `istioctl` 1.30.1.
- The article still uses placeholder namespace, deployment, and service names. Operators must adapt these examples to their actual installation profile, gateway labels, and old revision name.
