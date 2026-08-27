# Why Does Prometheus Ignore a ServiceMonitor That Exists in Kubernetes?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes, Observability, Troubleshooting

Description: Trace a ServiceMonitor through Operator selection, generated configuration, Kubernetes service discovery, and target scraping to find why it is ignored.

---

A `ServiceMonitor` can be accepted by the Kubernetes API and still have no effect on Prometheus. Existence proves only that the CRD is installed and the object passed API validation. Four separate boundaries must be satisfied:

```text
Prometheus selects ServiceMonitor namespace
  -> Prometheus selects ServiceMonitor labels
    -> ServiceMonitor selects Service namespace and labels
      -> endpoint identifies the scrape port
```

Debug those boundaries in order. A scrape error is relevant only after the monitor has generated a scrape job and produced an active target.

## 1. Find the Prometheus Custom Resource

Prometheus Operator manages `Prometheus` custom resources. A Helm release named `kube-prometheus-stack` is not itself the Prometheus selector configuration.

```bash
kubectl get prometheus -A
kubectl get prometheus PROMETHEUS_NAME -n PROMETHEUS_NAMESPACE -o yaml
```

Inspect these fields on the live object:

```yaml
spec:
  serviceMonitorNamespaceSelector:
    matchLabels:
      monitoring: enabled
  serviceMonitorSelector:
    matchLabels:
      prometheus: platform
```

`serviceMonitorNamespaceSelector` chooses namespaces in which the Operator looks for `ServiceMonitor` objects. `serviceMonitorSelector` then matches each monitor's `metadata.labels`. Neither field matches the target Service.

The API has important null semantics:

- an empty `serviceMonitorSelector: {}` matches all ServiceMonitors;
- a null `serviceMonitorSelector` matches none;
- an empty `serviceMonitorNamespaceSelector: {}` matches all namespaces;
- a null `serviceMonitorNamespaceSelector` searches only the Prometheus object's namespace.

There is a deprecated unmanaged-configuration case when all scrape-object selectors are null. Do not depend on that behavior. Make selection explicit.

Compare the selected labels directly:

```bash
kubectl get servicemonitor MONITOR_NAME -n MONITOR_NAMESPACE \
  -o jsonpath='{.metadata.labels}{"\n"}'
kubectl get namespace MONITOR_NAMESPACE --show-labels
```

If you installed kube-prometheus-stack, chart values can render or modify these fields. Options such as `serviceMonitorSelectorNilUsesHelmValues` are Helm chart behavior, not Prometheus Operator API fields. Always diagnose the rendered `Prometheus` resource.

## 2. Confirm That the Operator Accepted the Monitor

The Operator rejects a monitoring resource that cannot be translated safely into Prometheus configuration. It emits a Kubernetes Event describing the rejection.

```bash
kubectl get events -n MONITOR_NAMESPACE \
  --field-selector=involvedObject.kind=ServiceMonitor,involvedObject.name=MONITOR_NAME \
  --sort-by=.lastTimestamp
```

Also inspect the Operator logs for reconciliation errors. Deployment names and labels vary by installation, so list deployments rather than assuming either, then inspect the Operator deployment:

```bash
kubectl get deployment -A
kubectl logs -n OPERATOR_NAMESPACE deployment/OPERATOR_DEPLOYMENT
```

The generated configuration is stored in a Secret named for the Prometheus resource with a `prometheus-` prefix. The Operator troubleshooting guide shows this check for a Prometheus resource named `k8s`:

```bash
kubectl -n monitoring get secret prometheus-k8s -o json \
  | jq -r '.data["prometheus.yaml.gz"]' \
  | base64 -d \
  | gunzip \
  | grep -F 'serviceMonitor/MONITOR_NAMESPACE/MONITOR_NAME/'
```

Treat generated configuration as sensitive because it can contain rendered references and authentication configuration. Do not paste it into a public ticket.

If this job prefix is absent, remain at the Operator-selection layer. If it is present, continue to target discovery.

## 3. Check What the ServiceMonitor Selects

The `ServiceMonitor` uses `spec.namespaceSelector` to choose Service namespaces and `spec.selector` to match Service labels. If the owning `Prometheus` resource sets `spec.ignoreNamespaceSelectors: true`, the Operator ignores the monitor's namespace selector and restricts discovery to the `ServiceMonitor` object's namespace.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  namespaceSelector:
    matchNames:
      - production
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  endpoints:
    - port: metrics
      path: /metrics
```

List exactly what this selector should match:

```bash
kubectl get service -n production \
  -l app.kubernetes.io/name=api \
  --show-labels
```

The labels on a Deployment or Pod do not substitute for labels on the Service. If this command returns nothing, the ServiceMonitor cannot discover a target.

## 4. Match the Named Service Port

When set, `endpoints[].port` is the name of a port in `Service.spec.ports`, not a numeric container port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
  labels:
    app.kubernetes.io/name: api
spec:
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
```

```bash
kubectl get service api -n production \
  -o jsonpath='{range .spec.ports[*]}{.name}{" -> "}{.port}{" -> "}{.targetPort}{"\n"}{end}'
```

If the monitor says `port: metrics`, the Service must contain `name: metrics`. The Pod's container port name matters to the Service's `targetPort`, but it is not what `ServiceMonitor.endpoints[].port` directly references.

As an alternative, `ServiceMonitor.endpoints[].targetPort` can select a Pod container port by name or number. If both fields are set, `port` takes precedence.

## 5. Verify Discovery RBAC and the Live Target

Prometheus performs Kubernetes service discovery and needs `get`, `list`, and `watch` permissions on the relevant resources. Check `spec.serviceDiscoveryRole` on the `ServiceMonitor`; if it is unset, it inherits the `Prometheus` setting, and if both are unset the Operator uses `Endpoints`. Kubernetes deprecated the Endpoints API in version 1.33, so prefer `EndpointSlice` for current deployments after granting the corresponding RBAC.

For each target namespace, replace `DISCOVERY_RESOURCE` with `endpoints` for the `Endpoints` role or `endpointslices.discovery.k8s.io` for the `EndpointSlice` role, then verify all three verbs:

```bash
for resource in services pods DISCOVERY_RESOURCE; do
  for verb in get list watch; do
    kubectl auth can-i "$verb" "$resource" -n TARGET_NAMESPACE \
      --as=system:serviceaccount:PROMETHEUS_NAMESPACE:PROMETHEUS_SERVICE_ACCOUNT
  done
done
```

Repeat the checks for every selected namespace. Use `--all-namespaces` instead of `-n TARGET_NAMESPACE` only when the generated discovery configuration watches all namespaces. Your current identity must also be allowed to impersonate the Prometheus ServiceAccount for `--as` to work. If `attachMetadata.node` is enabled, verify `list` and `watch` permissions on the cluster-scoped `nodes` resource as well.

Find and port-forward a Pod for the specific Prometheus resource, then inspect **Status > Service discovery** and **Status > Target health**:

```bash
kubectl -n PROMETHEUS_NAMESPACE get pod \
  -l operator.prometheus.io/name=PROMETHEUS_NAME
kubectl -n PROMETHEUS_NAMESPACE port-forward \
  pod/PROMETHEUS_POD 9090:9090
```

- absent from generated configuration means Operator selection or rejection;
- job present but no active target means inspect dropped targets for Service selection or port matching, then check discovery RBAC and endpoint data;
- target present but down means network, TLS, authentication, path, response format, or timeout.

This classification prevents unrelated fixes such as changing NetworkPolicy when Prometheus never selected the monitor.

## Official Documentation

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Prometheus Operator getting started](https://prometheus-operator.dev/docs/developer/getting-started/)
- [Kubernetes label selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Prometheus targets API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)

## Conclusion

Prometheus does not scrape a ServiceMonitor merely because Kubernetes stores it. Verify the live Prometheus selectors, rejection Events, generated configuration, matching Service labels, configured endpoint port, discovery RBAC, and finally the target-health page. Each check proves one boundary and identifies the layer that is actually ignoring the object.
