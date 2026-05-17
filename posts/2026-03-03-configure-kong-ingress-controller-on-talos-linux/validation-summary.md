# Validation Summary: How to Configure Kong Ingress Controller on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kong Gateway / Kong Ingress Controller (KIC)
- Kong `kong/ingress` Helm umbrella chart
- Kubernetes (Ingress, Service, Deployment, Secret)
- Kong CRDs (KongPlugin, KongClusterPlugin, KongConsumer)
- Helm 3
- kubectl

## Sources Consulted
- Kong charts repo (values structure): https://github.com/Kong/charts/blob/main/charts/kong/values.yaml
- Kong charts README (proxy/NodePort parameters): https://github.com/Kong/charts/blob/main/charts/kong/README.md
- Kong Ingress Controller custom resources docs: https://developer.konghq.com/kubernetes-ingress-controller/custom-resources/
- Kubernetes ComponentStatus deprecation: https://github.com/kubernetes/kubernetes/pull/93570 and https://github.com/kubernetes/enhancements/issues/553
- `ealen/echo-server` Docker Hub: https://hub.docker.com/r/ealen/echo-server

## Issues Found
- **`kubectl get cs` is deprecated.** The `componentstatuses` resource has been deprecated since Kubernetes 1.19 and produces empty/unhelpful output on modern clusters (including Talos), since kube-scheduler and kube-controller-manager no longer expose unsecured health endpoints by default. Replaced with `kubectl cluster-info`, which is the current way to verify the control plane is reachable.

## Review Notes
- The `kong/ingress` umbrella chart wraps the `kong/kong` subchart under `controller` and `gateway` keys, so `gateway.proxy.type`, `gateway.proxy.http.nodePort`, and `gateway.proxy.tls.nodePort` are the correct value paths — verified.
- Pod label selectors `app.kubernetes.io/component=gateway` and `app.kubernetes.io/component=controller` are correct for the umbrella chart's two releases.
- KongPlugin / KongConsumer / KongClusterPlugin CRDs intentionally place `plugin`, `config`, `username`, and `credentials` at the top level (no `spec:` wrapper) — the post uses this correctly.
- The `kubernetes.io/ingress.class` annotation on KongConsumer and KongClusterPlugin is a legacy Kubernetes annotation that Kong still requires for these CRDs (it has not been replaced by `ingressClassName` for these resource types). Worth being aware of, but the post is accurate.
- Newer Kong guidance also suggests adding `konghq.com/secret: "true"` alongside the `konghq.com/credential: key-auth` label on credential Secrets, but the original label form still works and the post is correct as written.
- `ealen/echo-server` does default to port 80 (`PORT=80`), so the Deployment/Service port configuration is accurate.
