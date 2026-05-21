# Validation Summary: How to Handle Service Account Tokens with Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and workload certificates
- Kubernetes ServiceAccounts and projected service account tokens
- Kubernetes TokenRequest and TokenReview APIs
- Istio mTLS and SPIFFE workload identity
- Istio multicluster remote secrets
- PrometheusRule monitoring

## Sources Consulted
- Kubernetes Service Accounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes configure ServiceAccounts for Pods task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Istio security best practices: https://istio.io/latest/docs/ops/best-practices/security/
- Istio security model: https://istio.io/latest/docs/ops/deployment/security-model/
- Istio multicluster primary-remote install documentation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio 1.29.2 sidecar injection template and security source files: https://github.com/istio/istio/tree/1.29.2

## Issues Found
- The post said to check the Istio token audience in mesh configuration by grepping for `ISTIO_META`. Changed this to inspect the injected pod's `istio-token` projected volume, which directly shows the configured service account token audience.
- The token lifetime section used `ISTIO_META_TOKEN_ROTATION_PERIOD`, which is not a valid Kubernetes projected token lifetime setting. Replaced it with the projected volume fields that Istio's injector actually uses.
- The custom projected volume example defined a volume but did not mount it into a container. Added a `volumeMounts` entry so the example is usable.
- The JWT decoding command used plain `base64 -d`, which is unreliable for JWT base64url payloads and missing padding. Replaced it with a Python base64url decode command and clarified that decoding is inspection, not cryptographic validation.
- The rotation section omitted Kubernetes' documented 24-hour proactive rotation condition. Added that kubelet rotates projected tokens at 80% of TTL or when older than 24 hours.
- The JWT policy section presented `first-party-jwt` as a current fallback. Updated it to explain that this was an older Istio option and has been deprecated/removed in current Istio releases.
- The Prometheus alert used `pilot_total_xds_rejects{type="cds"}`, which measures rejected xDS config responses, not Istio CA token authentication failures. Replaced it with `citadel_server_authentication_failure_count`.

## Review Notes
The post is now technically accurate for current Kubernetes and Istio behavior. Future maintenance should re-check Istio release notes because JWT policy handling and injection template fields are implementation-sensitive.
