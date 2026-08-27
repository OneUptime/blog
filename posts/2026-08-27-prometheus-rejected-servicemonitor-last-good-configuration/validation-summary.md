# Validation Summary: Why Prometheus Rejects a ServiceMonitor but Keeps Its Last Config

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Prometheus configuration loading and runtime reloads
- Prometheus HTTP status and management APIs
- Prometheus `promtool`
- Prometheus Operator and its configuration reloader
- Kubernetes ServiceMonitor, PodMonitor, Probe, and ScrapeConfig custom resources
- Kubernetes CRD schema validation and Events
- kubectl server-side apply, explain, get, logs, and JSONPath output
- jq, base64, gzip, grep, and shell pipelines

## Sources Consulted

- [Prometheus configuration and reload behavior](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus management API](https://prometheus.io/docs/prometheus/latest/management_api/)
- [Prometheus HTTP API: loaded configuration and runtime information](https://prometheus.io/docs/prometheus/latest/querying/api/#config)
- [Prometheus promtool command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/#promtool-check-config)
- [Prometheus promtool implementation](https://github.com/prometheus/prometheus/blob/main/cmd/promtool/main.go)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator design and resource selectors](https://prometheus-operator.dev/docs/getting-started/design/)
- [Prometheus Operator configuration-resource status proposal](https://prometheus-operator.dev/docs/proposals/accepted/configuration-object-status-subresource/)
- [Prometheus Operator CLI feature-gate reference](https://prometheus-operator.dev/docs/platform/operator/)
- [Prometheus Operator additional scrape configuration](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/additional-scrape-config.md)
- [Prometheus Operator v0.93.0 resource selection and rejection source](https://github.com/prometheus-operator/prometheus-operator/blob/v0.93.0/pkg/prometheus/resource_selector.go)
- [Prometheus Operator v0.93.0 configuration generator source](https://github.com/prometheus-operator/prometheus-operator/blob/v0.93.0/pkg/prometheus/promcfg.go)
- [Prometheus Operator configuration-reloader wiring](https://github.com/prometheus-operator/prometheus-operator/blob/main/pkg/prometheus/common.go)
- [Kubernetes CRD schema validation, pruning, and CEL rules](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Kubernetes Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/)
- [Kubernetes kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes kubectl explain reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/)
- [Kubernetes kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes Event API migration guidance](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event)
- [jq manual](https://jqlang.org/manual/)
- [GNU Bash process substitution](https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html)
- [GNU gzip overview](https://www.gnu.org/software/gzip/manual/html_node/Overview.html)

## Issues Found

- The API-server boundary said that the object was not persisted, which was too broad for a rejected update because the previously stored object remains. Changed this to say that the attempted revision is not persisted and that no new revision exists.
- The Event command sorted on `.lastTimestamp`, a legacy Event field that is deprecated in the newer Events API and can be unset. Changed it to the stable `.metadata.creationTimestamp` field used by the current official kubectl quick reference.
- The local `promtool check config` command also checked referenced rule, credential, TLS, and service-discovery files. Those paths generally exist only inside the Prometheus Pod, so a valid generated main configuration could fail locally. Added `--syntax-only`, which still parses and validates the main configuration while skipping referenced-file and content checks.
- The generated-configuration search passed a process-substitution file descriptor to `gunzip`. `gunzip` can reject `/dev/fd/*` as a non-regular named file, and the command failed in local verification. Replaced it with a direct stdin pipeline and removed the now-unnecessary process-substitution caveat.
- The generated Secret and live status output were described too much like directly comparable files. The reloader renders the Secret template and the status API dumps the parsed configuration, so byte-for-byte equality is not expected. Changed the guidance to compare the relevant job stanza and require a contemporaneous reload error.
- The warning never to edit `prometheus-<name>` Secrets omitted the deprecated unmanaged-configuration exception. Scoped the warning to Operator-managed Prometheus configurations, for which the Operator does own and reconcile the Secret.

## Review Notes

The three validation boundaries are accurate: the API server rejects invalid attempted revisions before persistence, the Operator rejects and omits invalid selected configuration resources while emitting Events, and Prometheus retains its loaded configuration after a failed reload. The generated Secret naming convention, `prometheus.yaml.gz` data key, `serviceMonitor/<namespace>/<name>/<endpoint-index>` job naming, selectors, referenced-Secret behavior, timeout-versus-interval validation, relabel validation, and live `/api/v1/status/config` semantics were all confirmed.

As of Prometheus Operator 0.93.x, `StatusForConfigurationResources` remains disabled by default and under active development; its current implementation is for configuration resources selected by a `Prometheus` resource. `ScrapeConfig` remains an Alpha CRD. For a complete check of referenced files rather than the decoded main configuration alone, run the matching `promtool` inside the Prometheus Pod against the rendered configuration. The example Secret and Deployment names are installation-specific and must match the cluster.
