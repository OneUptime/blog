# Validation Summary: How to Conduct Istio Architecture Reviews

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio control plane and data plane
- Istio traffic management resources: VirtualService, DestinationRule, ServiceEntry, Sidecar
- Istio security resources: PeerAuthentication, AuthorizationPolicy, RequestAuthentication
- Istio Telemetry API
- Kubernetes and kubectl
- jq

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio check-inject diagnostic documentation: https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The proxy sync command used `istioctl proxy-status | grep -v "SYNCED"`, which can hide partially unsynced proxies if any xDS column still contains `SYNCED` and can also produce confusing output. Changed it to `istioctl proxy-status`, which is the documented diagnostic command for reviewing proxy sync state.
- The sidecar injection commands only checked the legacy `istio-injection=enabled` namespace label. Current Istio installations may use revision labels such as `istio.io/rev`. Updated the namespace listing and loop to include both legacy injection and revision-based injection.
- The mTLS command used `istioctl authn tls-check`, which is not present in the current Istio command reference. Replaced it with `istioctl proxy-config secret deployment/<sample-service>.<namespace>` to inspect workload proxy certificates using the documented `proxy-config secret` command.
- The AuthorizationPolicy command and review question treated missing or empty `rules` as ALLOW-all. In Istio, an ALLOW policy with no rules matches nothing and is commonly used for default-deny; an empty rule (`{}`) matches everything and allows all requests when the action is ALLOW. Updated the jq filter and wording to flag empty ALLOW rules instead.
- The proxy count command used `istioctl proxy-status | wc -l`, which includes the table header. Changed it to `istioctl proxy-status | tail -n +2 | wc -l`.

## Review Notes
The article is version-neutral. Istio behavior can differ between sidecar mode and ambient mode, especially for mTLS validation and waypoint-bound policies, so future updates could mention which data plane mode the checklist targets.
