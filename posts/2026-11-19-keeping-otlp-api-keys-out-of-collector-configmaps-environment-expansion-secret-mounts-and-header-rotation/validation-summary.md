# Validation Summary: Keep OTLP API Keys Out of Collector ConfigMaps with Secrets and Header Rotation

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- OpenTelemetry Collector and the OTLP HTTP exporter
- Collector environment expansion and configuration merging
- Kubernetes Secrets, ConfigMaps, environment variables, and projected volumes
- Kubernetes Deployments and kubectl rollouts
- Authentication header rotation and telemetry queue persistence

## Sources Consulted
- [Collector configuration](https://opentelemetry.io/docs/collector/configuration/): environment expansion, component IDs, multiple configuration files, and sensitive configuration output.
- [OTLP HTTP exporter documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md): exporter naming and endpoint configuration.
- [Collector HTTP client configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md): outgoing request headers.
- [Collector file provider implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/confmap/provider/fileprovider/provider.go): file retrieval and absence of change watching.
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/): Secret references, required keys, projection updates, subPath limitations, access controls, and encryption at rest.
- [Distribute credentials securely using Secrets](https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/): volume wiring, permissions, and environment refresh behavior.
- [kubectl rollout restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/): restart syntax and namespace selection.
- [kubectl rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/): rollout monitoring syntax.
- [Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/): export failure monitoring and persistent queues across restarts.
- [Author profile](https://github.com/nawazdhandala): author link destination.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. The examples are explicitly fragments requiring an existing Collector pipeline and pod specification.
- Current upstream documentation uses `otlp_http`; the exporter documentation identifies `otlphttp` as a deprecated alias. The post correctly directs readers to the component name supported by their pinned distribution.
- The HTTPS endpoint is an illustrative backend address. The exporter appends the signal-specific OTLP path to its base endpoint; the actual destination and authentication format must match the backend.
- Environment expansion and repeated `--config` arguments are supported. The public pipeline and private exporter configuration must reference the same component ID, as stated.
- Required Secret references prevent startup when the Secret or named key is missing. This does not establish that an existing value is nonempty or authorized; the post appropriately requires successful export verification.
- Secret projection and exporter activation are separate. The upstream file provider ignores the watcher callback, supporting the recommendation to restart unless a specific distribution documents another mechanism.
- The commands correctly restart and monitor the named Deployment in the observability namespace. Rollout readiness does not independently demonstrate backend authorization.
- Backend key overlap and revocation depend on the selected service; the post states that limitation. Queue durability and shutdown planning remain deployment-specific.
- Documentation links and the author destination resolve to the intended resources. No concrete Collector or Kubernetes release is pinned in the post.
- Review consisted of official documentation and source inspection plus local syntax checks. No live Kubernetes rollout, backend authentication test, or Collector process was run.
