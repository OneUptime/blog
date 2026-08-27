# Why Did Prometheus Reject a ServiceMonitor and Keep Its Last Known Good Configuration?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Configuration Reload, Troubleshooting

Description: Trace ServiceMonitor rejection through API validation, Operator reconciliation, generated configuration, and Prometheus reload behavior.

---

There are three validation boundaries between a ServiceMonitor manifest and a running Prometheus scrape job. Saying that "Prometheus rejected the ServiceMonitor" often collapses them into one event:

1. The Kubernetes API server validates the object against the installed CRD.
2. The Prometheus Operator performs the semantic checks needed to generate scrape configuration.
3. Prometheus validates the complete generated configuration during reload.

Prometheus keeps its current runtime configuration when a replacement configuration is not well formed. That protects the process from a bad reload, but it is not a per-ServiceMonitor rollback mechanism. Determine which boundary rejected the change before assuming that the previous scrape entry is still active.

## Boundary 1: API Server Schema Validation

The API server rejects values that violate the ServiceMonitor CRD schema. The object is not persisted, so the Operator never sees the attempted revision.

Test the manifest against the cluster's live schema:

```bash
kubectl apply --server-side --dry-run=server -f servicemonitor.yaml
kubectl explain servicemonitor.spec.endpoints --recursive
```

Typical schema failures include a field with the wrong type, an unknown enum value, or mutually invalid structure caught by CRD validation. Fix the manifest that Git actually deploys rather than patching only the live object.

## Boundary 2: Operator Resource Rejection

Some checks require reconciliation context. The Operator can reject a ServiceMonitor and omit it from generated configuration. Examples include a scrape timeout greater than the scrape interval, incompatible authentication settings, an invalid relabel configuration, or a referenced Secret that the Operator cannot resolve.

The Operator emits a Kubernetes Event for rejected configuration resources. Query the exact object:

```bash
kubectl get events -n payments \
  --field-selector involvedObject.kind=ServiceMonitor,involvedObject.name=payments-api \
  --sort-by=.lastTimestamp

kubectl logs -n monitoring deployment/prometheus-operator \
  --since=30m \
  | grep -i 'payments-api'
```

The official troubleshooting guide says invalid resources are not reconciled into the Prometheus configuration. Do not assume the Operator retains the old stanza from that one ServiceMonitor. Depending on the reconciliation result, the live generated configuration can remain unchanged or a newly generated valid configuration can omit the rejected resource. Verify the actual configuration and target, not only the previous object revision.

Recent Operator releases can expose status for ServiceMonitor, PodMonitor, Probe, and ScrapeConfig when the `StatusForConfigurationResources` feature is enabled. Because that status is feature-gated and under active development, Events remain the portable first check.

## Boundary 3: Prometheus Configuration Reload

The Operator continuously reconciles scrape configuration into a Secret, and a sidecar triggers Prometheus to reload it. Prometheus documents a firm reload rule: if the new configuration is not well formed, the changes are not applied. The already running configuration remains active.

This boundary is especially relevant when lower-level configuration, such as manually supplied additional scrape configuration, contributes content that the Operator cannot fully validate. A valid ServiceMonitor can coexist with an invalid fragment elsewhere in the complete configuration.

Inspect the generated Secret without editing it:

```bash
kubectl get secret prometheus-platform -n monitoring -o json \
  | jq -r '.data["prometheus.yaml.gz"]' \
  | base64 -d \
  | gunzip > /tmp/prometheus-generated.yaml
```

Run the `promtool` version shipped with the same Prometheus release when possible:

```bash
promtool check config /tmp/prometheus-generated.yaml
```

Then compare it with Prometheus's live configuration in the Status page or HTTP status API. The generated Secret is desired configuration; the Prometheus status view is runtime configuration. A difference plus a reload error identifies the third boundary.

## Find Whether the Monitor Reached Generated Configuration

The generated job name contains the ServiceMonitor namespace and name. Search it directly:

```bash
gunzip -c <(kubectl get secret prometheus-platform -n monitoring \
  -o jsonpath='{.data.prometheus\.yaml\.gz}' | base64 -d) \
  | grep -A15 'serviceMonitor/payments/payments-api'
```

If your shell does not support process substitution, decode to a temporary file as shown earlier. The result separates two cases:

- Absent from generated configuration: check Prometheus object selectors, Operator rejection Events, namespace access, and referenced Secrets.
- Present in generated configuration but absent from live configuration: check the reloader and Prometheus reload error.

If it is present in the live configuration but has no targets, the configuration was accepted. Move on to Service label selection, named ports, EndpointSlices, RBAC, and target health.

## Repair Without Bypassing Validation

Fix the first concrete error. Common corrections include reducing `scrapeTimeout`, choosing one authentication mechanism, creating the referenced Secret in the required namespace, or correcting a relabel expression. Apply with server-side dry run first, then watch the Event stream and generated configuration.

Do not manually edit `prometheus-<name>` Secrets. The Operator owns them and will reconcile them again. Do not disable validation or force a reload to hide an error; an invalid configuration is safer when rejected than when partially assumed to be active.

ServiceMonitor only defines direct scrapes of Service-backed metrics endpoints. Probe and ScrapeConfig use their own selectors and also emit rejection Events. Confirm the resource kind before searching for its generated job.

## Official Documentation

- [Prometheus configuration and reload behavior](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus management API](https://prometheus.io/docs/prometheus/latest/management_api/)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator design](https://prometheus-operator.dev/docs/getting-started/design/)

## Conclusion

First identify the rejecting layer. API schema rejection means no object revision exists, Operator rejection means the resource is not reconciled into generated configuration, and a malformed full configuration makes Prometheus keep its current runtime configuration. Compare Events, the generated Secret, and the live Prometheus configuration to prove which case occurred.
