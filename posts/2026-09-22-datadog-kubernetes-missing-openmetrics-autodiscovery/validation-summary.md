# Validation Summary: How to Diagnose Missing OpenMetrics Checks in Datadog Kubernetes Autodiscovery

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes configuration and CLI examples.

## Technologies Covered
- Datadog Agent, Kubernetes Autodiscovery, and Cluster Checks
- Datadog OpenMetrics integration and Prometheus scraping
- Kubernetes Deployments, Pods, networking, NetworkPolicy, and kubectl
- YAML configuration, JSON annotations, and shell commands
- HTTP endpoint access and TLS verification

## Sources Consulted
- [Datadog Kubernetes Prometheus and OpenMetrics metrics collection](https://docs.datadoghq.com/containers/kubernetes/prometheus/) — annotation schema, container matching, Agent 7.36 requirement, and optional Prometheus annotation scraping.
- [Datadog Autodiscovery troubleshooting](https://docs.datadoghq.com/agent/troubleshooting/autodiscovery/) — resolved configuration inspection and unresolved templates.
- [Datadog OpenMetrics integration](https://docs.datadoghq.com/integrations/openmetrics/) — required settings, latest mode, counter selection, renaming, and status inspection.
- [Datadog OpenMetrics example configuration](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example) — metric mappings and exclusions.
- [Datadog Autodiscovery template variables](https://docs.datadoghq.com/containers/guide/template_variables/) — host substitution and port selection.
- [Datadog troubleshooting Cluster and Endpoint Checks](https://docs.datadoghq.com/containers/troubleshooting/cluster-and-endpoint-checks/) — Cluster Agent dispatch and runner configuration inspection.
- [Datadog mapping Prometheus metrics to Datadog metrics](https://docs.datadoghq.com/integrations/guide/prometheus-metrics/) — counter mapping and consecutive-value deltas.
- [Datadog custom Agent metric submission](https://docs.datadoghq.com/metrics/custom_metrics/agent_metrics_submission/) — monotonic counter submission behavior.
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — pod templates, required manifest fields, and replacement pods.
- [Kubernetes Pods](https://kubernetes.io/docs/concepts/workloads/pods/) — pod network context and shared networking.
- [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/) — connectivity restrictions and network-context considerations.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — namespace, label selector, and YAML output flags.
- [kubectl exec reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/) — container selection and command separator syntax.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged; the post is technically relevant and its diagnostic sequence correctly separates discovery, endpoint access, and metric selection.
- Parsed the YAML fragment with PyYAML and its annotation value with Python's JSON parser. Confirmed that the annotation targets the declared checkout container and that the metric mapping is preserved. All Bash examples passed bash -n.
- The manifest is explicitly a fragment. Readers must supply the surrounding Deployment fields, matching labels and selector, and a real application image. The example namespaces, app label, Agent pod, and container name must match the installation.
- Autodiscovery annotation v2 requires Agent 7.36 or later. This is separate from the OpenMetrics integration's latest mode, selected by openmetrics_endpoint. The documented counter naming behavior applies from Agent 7.32 onward and is compatible with the example's annotation-version requirement.
- In the shown configuration, checkout_requests_total is selected through checkout_requests, renamed to requests, and submitted as shop.requests.count. Consecutive counter samples establish increments; a single diagnostic execution is insufficient evidence of missing collection.
- Explicit integration annotations and optional prometheus.io scraping are distinct configuration paths. Cluster-dispatched checks must be traced through the Cluster Agent to their assigned runner.
- agent configcheck and agent status are valid diagnostic commands. The optional configcheck -v flag can additionally expose unresolved templates if deeper investigation is needed.
- The HTTP and connection-error interpretations are appropriately presented as diagnostic clues. Testing from the collection environment and preserving TLS verification are sound recommendations.
- The three linked Datadog documentation pages resolve to the intended official resources. Some direct browser fetches returned a Markdown content-type error; their documentation content was available through indexed official pages.
- Validation consisted of documentation review and local syntax checks. No live Kubernetes cluster, Datadog Agent, application endpoint, rollout, or metric delivery was exercised.
