# Correlate Metric Spikes with Deployments and Kubernetes Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment, Application Metrics, Correlation, Observability

Description: Build a defensible incident timeline that aligns metric anomalies with immutable releases, configuration changes, Kubernetes rollouts, events, and audit records.

---

A deployment marker near a metric spike is a lead, not proof of causation. Several changes can overlap, telemetry can arrive late, and Kubernetes Events are explicitly best-effort supplemental data with limited retention. Reliable correlation starts by putting every signal on one timeline and preserving durable change records outside the transient Event API.

The goal is to compare what changed, where it changed, and whether impact follows the same scope and rollout fraction.

## Capture an Immutable Change Identity

Every rollout should emit a deployment record containing:

~~~text
deployment_id       unique attempt ID
service.name        canonical logical service
service.version     immutable artifact version or digest
environment         production/staging/etc.
cluster             name plus stable UID where available
namespace           Kubernetes namespace
workload            kind, name, and UID
started_at/ended_at source timestamps
actor/tool          authenticated principal and delivery system
config_revision     immutable ConfigMap/Secret/config repository revision
result              succeeded, failed, rolled back
~~~

OpenTelemetry defines stable `service.name`, `service.version`, and `deployment.environment.name` resource attributes. Its deployment registry also contains `deployment.id`, `deployment.name`, and `deployment.status`, currently marked Development. If you use those newer fields, pin the semantic-convention version; otherwise use a namespaced internal attribute for the deployment attempt.

Annotate Kubernetes objects with non-secret provenance such as release ID, source revision, and build URL. Annotations support non-identifying metadata and are suitable for release pointers. Never store credentials or sensitive configuration in them.

## Put Changes on the Metrics Timeline

Send deployment records to a durable event store or annotation API and overlay them on service dashboards. Scope markers by service, environment, cluster, and namespace. A global marker makes an unrelated rollout look causal.

Start the incident window before the first anomalous sample and include:

- CI/CD deployment start, traffic-shift steps, and completion;
- ReplicaSet revision and pod readiness transitions;
- service version distribution over time;
- configuration publication and application/reload time;
- autoscaling, node, and scheduling events;
- alert evaluation and notification timestamps;
- telemetry source and observed/ingestion timestamps.

Compare absolute times in UTC. Preserve both source and ingestion time so a delayed log or metric does not reorder the narrative.

For a Prometheus counter, locate the first sustained change rather than the first alert notification:

~~~promql
sum by (service_version) (
  rate(http_requests_total{
    service="checkout",
    environment="production",
    status=~"5.."
  }[5m])
)
/
sum by (service_version) (
  rate(http_requests_total{
    service="checkout",
    environment="production"
  }[5m])
)
~~~

Metric and label names are deployment-specific. Handle zero denominators in the real rule; `rate()` already adjusts for counter resets when it is applied before aggregation, as above. Breaking down by immutable version is more persuasive than observing only a fleet-wide spike.

## Distinguish Configuration Publication from Use

A ConfigMap edit does not prove an application consumed the new value. Configuration can be injected through environment variables, mounted volumes, sidecars, remote stores, or application reload APIs, each with different timing.

Record at least three moments:

1. configuration revision accepted by its source of truth;
2. revision delivered to a workload or pod;
3. application confirms the active revision.

Expose the active, non-sensitive configuration fingerprint as a bounded resource attribute, info metric, or structured startup/reload log. Do not hash secrets in a way that invites offline guessing; derive a revision from the deployment system instead.

Environment-variable ConfigMap values normally require a pod restart to change. Mounted ConfigMap volumes can update eventually, but applications still must reread them; `subPath` mounts do not receive automated ConfigMap updates. Validate the mechanism actually used rather than assuming “Kubernetes reloaded it.”

## Use Kubernetes Events as Supplemental Evidence

Query recent events for the affected object:

~~~bash
kubectl events --for deployment/checkout -n storefront
kubectl events --for pod/checkout-7d9f6c8b5-x2abc -n storefront
kubectl events --all-namespaces --types=Warning
~~~

The `events.k8s.io/v1` API provides fields such as `eventTime`, `reason`, `action`, `regarding`, reporting controller/instance, and an optional series count and last-observed time. Repeated events may be aggregated into a series. Kubernetes warns that retention is limited and reasons/messages can evolve, so do not parse human-readable notes as a stable machine contract.

Export needed Events promptly, but still do not treat them as an audit log. Kubernetes audit records answer who made which API request, when, and against what resource. Enable an appropriately scoped audit policy and durable backend before incidents occur. Audit data can be sensitive and expensive, so protect access and tune levels deliberately.

Use `kubectl rollout history deployment/<name>` to inspect Deployment revisions. `CHANGE-CAUSE` can be populated from the `kubernetes.io/change-cause` annotation; current Kubernetes guidance notes that the old `--record` flag is deprecated. Prefer deployment automation that writes explicit provenance.

## Test the Causal Hypothesis

A change becomes a strong candidate when several independent observations agree:

- anomaly onset follows exposure to the new version or config;
- only changed pods, zones, clusters, or cohorts degrade;
- impact grows with rollout percentage;
- traces or logs show a plausible mechanism tied to the change;
- pausing or rolling back exposure improves the metric;
- a controlled reproduction produces the same effect.

Check competing causes: traffic shape, a downstream dependency, node pressure, certificate expiry, autoscaling, and telemetry pipeline changes. A rollback can coincide with external recovery, so keep evidence from control cohorts where possible.

## Operationalize the Timeline

Create a correlation view with shared variables for service, environment, cluster, namespace, version, and time. Retain durable deploy/config events longer than the metrics required for incident review. Alert when production telemetry reports an unknown version, when a rollout lacks a deployment record, or when the application-reported config revision differs across replicas unexpectedly.

Test the pipeline with a harmless canary deployment. Verify the release marker, Kubernetes revision, active version metric, logs, traces, Events, and audit record align. This is much easier to fix before a real outage.

## Conclusion

Correlating a spike with change requires more than adjacent timestamps. Record immutable release and configuration identities, overlay scope-matched changes, preserve source and ingestion time, use Kubernetes Events only as transient supporting evidence, and rely on audit/deployment records for durable provenance. Then test whether impact tracks exposure and reverses with a controlled change before declaring cause.

## Official References

- [Kubernetes Events API](https://kubernetes.io/docs/reference/kubernetes-api/events/)
- [kubectl events](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes Deployments: Rollout History](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#checking-rollout-history-of-a-deployment)
- [Kubernetes Annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/)
- [Kubernetes Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [OpenTelemetry Service Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)
- [OpenTelemetry Deployment Attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/)
