# Validation Summary: How to Understand the Dapr Sidecar Injector on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (Mutating Admission Webhooks)
- daprd sidecar container
- Helm (Dapr Helm chart configuration)
- kubectl CLI

## Sources Consulted
- Dapr GitHub repository source code: `pkg/injector/patcher/sidecar_container.go`, `pkg/injector/patcher/services.go`, `pkg/injector/consts/consts.go`
- Dapr Helm chart templates: `charts/dapr/charts/dapr_sidecar_injector/`
- Dapr official documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/

## Issues Found

1. **Sentry port was incorrect**: The `--sentry-address` used port `50001` but the correct default is `443`. Fixed to `dapr-sentry.dapr-system.svc.cluster.local:443`.

2. **Control plane port was incorrect**: The `--control-plane-address` used port `80` but the correct default is `443`. Fixed to `dapr-api.dapr-system.svc.cluster.local:443`.

3. **daprd command path was incorrect**: The args showed `./daprd` (relative path) but the actual binary path is `/daprd` (absolute path). Fixed.

4. **Liveness probe was wrong**: The blog showed an HTTP GET to `/v1.0/healthz` on port 3500 for the liveness probe. The actual liveness probe uses a TCP socket on port 3501. Fixed to `tcpSocket` on port `3501`.

5. **Readiness probe port was wrong**: The readiness probe used port 3500 but the correct port is 3501 (the Dapr public port). The HTTP path `/v1.0/healthz` is correct for readiness. Fixed port to `3501`.

6. **Init container `dapr-init` does not exist**: The blog claimed a `dapr-init` init container is injected for certificate setup. Dapr does not inject an init container by default — it only injects the `daprd` sidecar container. Removed the init container from the pod spec and the numbered list.

7. **`APP_ID` environment variable is not injected**: The blog listed `APP_ID` as an injected environment variable. The sidecar injector injects `DAPR_HTTP_PORT`, `DAPR_GRPC_PORT`, and `APP_PROTOCOL` — but not `APP_ID`. Fixed to `APP_PROTOCOL`.

8. **Namespace label `dapr-enabled=true` is not a standard Dapr feature**: The blog claimed that labeling a namespace with `dapr-enabled=true` causes automatic sidecar injection for all pods. This is incorrect — the default `namespaceSelector` in the Helm chart is empty (applies to all namespaces), and injection is controlled per-pod via the `dapr.io/enabled: "true"` annotation. Rewrote the section to accurately describe how namespace-level filtering works via Helm `namespaceSelector` customization.

9. **Webhook namespace selector claims were incorrect**: The description of what triggers the webhook incorrectly stated a `dapr-enabled: true` namespace label. Fixed to accurately describe the default behavior (applies to all namespaces, injection requires pod annotation).

10. **Troubleshooting referenced non-existent `dapr-init` container**: The "Pod Stuck in Init" section referenced `kubectl logs <pod-name> -c dapr-init`. Fixed to reference the `daprd` container.

## Review Notes
- The post references Dapr version 1.14.0 in image tags. The configuration details have been verified against the current Dapr source code. Future Dapr versions may change default ports or probe behavior.
- Dapr 1.28+ Kubernetes supports "native sidecars" (init containers with `restartPolicy: Always`) via the `dapr.io/enable-native-sidecar` annotation, but this is an opt-in feature and not the default injection behavior.
- The Helm value key `webhookFailurePolicy` and the placement service port `50005` were verified as correct.
- The metrics port `9090` was verified as the correct default.
