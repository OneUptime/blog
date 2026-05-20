# Validation Summary: How to Integrate LaunchDarkly Config with ArgoCD

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments, Services, Jobs, and PersistentVolumeClaims
- LaunchDarkly Relay Proxy
- LaunchDarkly SDK proxy mode
- External Secrets Operator
- Redis
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- LaunchDarkly Relay Proxy deployment documentation: https://launchdarkly.com/docs/sdk/relay-proxy/deploying
- LaunchDarkly Relay Proxy configuration reference: https://github.com/launchdarkly/ld-relay/blob/v8/docs/configuration.md
- LaunchDarkly Relay Proxy service endpoints documentation: https://github.com/launchdarkly/ld-relay/blob/v8/docs/endpoints.md
- LaunchDarkly Relay Proxy metrics documentation: https://github.com/launchdarkly/ld-relay/blob/v8/docs/metrics.md
- LaunchDarkly SDK Relay Proxy proxy mode documentation: https://launchdarkly.com/docs/sdk/features/relay-proxy-configuration/proxy-mode
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- Prometheus Operator API reference and getting started documentation: https://prometheus-operator.dev/docs/api-reference/api/ and https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Relay Proxy deployment used `launchdarkly/ld-relay:8` and `USE_ENVIRONMENT_VARIABLES`. LaunchDarkly recommends the v8 image pattern such as `launchdarkly/ld-relay:v8-static-debian12-nonroot`, and environment-variable configuration requires starting the relay with `--from-env`. Updated the image and added `args: ["--from-env"]`.
- The Relay Proxy Prometheus environment variable was incorrect. The v8 configuration reference uses `USE_PROMETHEUS`, not `PROMETHEUS_ENABLED`. Updated the manifest.
- The Relay Proxy example included `MAX_CLIENT_CONNECTIONS`, which is not a documented v8 Relay Proxy configuration variable. Removed it and kept the documented `HEARTBEAT_INTERVAL`.
- The `ld-relay` Service did not have the `app: ld-relay` label selected by the ServiceMonitor. Added the label so the ServiceMonitor selector can discover it.
- The two `apps/v1` Deployment snippets for `web-app` omitted required `.spec.selector` and matching pod template labels. Added selectors and template labels.
- The application configuration snippet implied generic LaunchDarkly environment variables would be consumed directly by every SDK. LaunchDarkly SDKs configure relay proxy endpoints through SDK-specific options, so the comment now states these are app-specific values that the application should pass to SDK service endpoint configuration.
- The Prometheus alert examples used non-matching metric names. LaunchDarkly Relay Proxy v8 uses the default Prometheus namespace `launchdarkly_relay` with metrics such as `connections` and `request_duration`. Updated the alert expressions to `launchdarkly_relay_request_duration_bucket` and `launchdarkly_relay_connections`.

## Review Notes
- YAML syntax was checked for every fenced YAML snippet after edits.
- The Argo CD Application and PostSync hook annotations are consistent with current Argo CD documentation.
- ExternalSecret examples use the older but still valid `external-secrets.io/v1beta1` API. Current External Secrets documentation also shows `external-secrets.io/v1`; this could be updated in a future broader refresh if the blog standardizes on the latest API version.
