# How to Migrate ServiceMonitor Discovery from Endpoints to EndpointSlices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, EndpointSlice, Migration

Description: Migrate ServiceMonitor discovery to EndpointSlice with compatible CRDs, scoped RBAC, canary rollout, relabel checks, and rollback.

---

Kubernetes deprecated the legacy `Endpoints` API in version 1.33. EndpointSlice has been stable since Kubernetes 1.21, supports newer Service features such as dual stack, and avoids the legacy Endpoints object's 1,000-backend truncation. Prometheus can discover targets with the `endpointslice` role, and current Prometheus Operator CRDs let you select that role globally or per ServiceMonitor.

Treat the change as a service-discovery migration, not a field-only edit. Prometheus needs new RBAC, user-written relabel rules may refer to different discovery meta labels, and older installed Operator CRDs may not expose the required field.

## Check Compatibility Before Changing Roles

Ask the API server whether the installed ServiceMonitor schema has the field:

```bash
kubectl explain servicemonitor.spec.serviceDiscoveryRole
kubectl explain prometheus.spec.serviceDiscoveryRole
kubectl api-resources --api-group=discovery.k8s.io
```

The valid role values are `Endpoints` and `EndpointSlice`. A ServiceMonitor's `spec.serviceDiscoveryRole` overrides the role inherited from the Prometheus or PrometheusAgent resource. If the field is absent, upgrade the Prometheus Operator CRDs and controller using a release compatible with the cluster before editing monitors.

Check the Prometheus image version as well as the CRD. Prometheus 2.21 introduced the `endpointslice` discovery role, but Prometheus 2.35 added support for the stable `discovery.k8s.io/v1` API. Kubernetes serves that API from 1.21 and stopped serving `v1beta1` in 1.25. On Kubernetes 1.25 or newer, use Prometheus 2.35 or newer for EndpointSlice discovery.

Also inventory the live discovery objects for a canary Service:

```bash
kubectl get endpointslice -n payments \
  -l kubernetes.io/service-name=payments-api -o wide
kubectl get endpoints payments-api -n payments -o wide
```

For a normal Service with a selector, the Kubernetes control plane creates its EndpointSlices. The Prometheus Operator does not create application EndpointSlices.

## Grant Prometheus EndpointSlice Read Access

The Prometheus service account needs `get`, `list`, and `watch` on `endpointslices` in every namespace where it discovers EndpointSlice-backed targets. This includes namespaces from which ServiceMonitors discover Services and, when using the global Prometheus setting below, namespaces containing Alertmanager endpoints configured under `spec.alerting.alertmanagers`. Add this rule to the existing namespaced Role or ClusterRole, following the deployment's current RBAC scope:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prometheus-endpointslice-reader
  namespace: payments
rules:
  - apiGroups: ["discovery.k8s.io"]
    resources: ["endpointslices"]
    verbs: ["get", "list", "watch"]
```

Bind that Role to the Prometheus service account. Verify the resulting permission using the actual namespace and identity:

```bash
kubectl auth can-i list endpointslices.discovery.k8s.io \
  -n payments \
  --as=system:serviceaccount:monitoring:prometheus-k8s
kubectl auth can-i watch endpointslices.discovery.k8s.io \
  -n payments \
  --as=system:serviceaccount:monitoring:prometheus-k8s
```

The Operator service account needs EndpointSlice write permissions only for special resources that the Operator itself manages, notably when it is configured to create kubelet EndpointSlices. Do not grant application-namespace write access merely because Prometheus reads application EndpointSlices.

## Canary One ServiceMonitor

Start with one monitor rather than changing the global role:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments-api
  namespace: payments
spec:
  serviceDiscoveryRole: EndpointSlice
  selector:
    matchLabels:
      app.kubernetes.io/name: payments-api
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

The `selector` still selects the Service by labels, and `endpoints[].port` still names a Service port. The role changes the Kubernetes discovery object that Prometheus watches; it does not turn ServiceMonitor into arbitrary target discovery. Continue to use Probe for black-box checks and ScrapeConfig for lower-level or external direct scrapes.

After canaries pass, verify EndpointSlice discovery, RBAC, and custom target relabelings for any Kubernetes Alertmanager endpoints configured under `spec.alerting.alertmanagers`. The Prometheus-level field also changes discovery for those endpoints, so a ServiceMonitor canary does not test that path. Then set the default for all inherited ServiceMonitors on the Prometheus resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: k8s
  namespace: monitoring
spec:
  serviceDiscoveryRole: EndpointSlice
```

Any ServiceMonitor with an explicit role continues to use its own value. Remove temporary overrides only after confirming the intended global behavior.

## Audit Custom Relabelings

Prometheus exposes different discovery meta-label families for the two roles. Legacy rules can use names beginning with `__meta_kubernetes_endpoint_`, while EndpointSlice discovery uses labels beginning with `__meta_kubernetes_endpointslice_`, such as the EndpointSlice port name and endpoint node name.

The Operator generates its standard selection rules for the chosen role. It cannot infer the intent of custom `relabelings` copied into a ServiceMonitor or configured for Alertmanager endpoints. Search those fields before migration:

```bash
kubectl get servicemonitor,prometheus -A -o yaml \
  | grep -E '__meta_kubernetes_(endpoint|endpointslice)'
```

Update custom source labels and test whether keep or drop rules retain the expected targets. A syntactically valid obsolete meta label often produces zero targets rather than a clear API error.

## Verify Discovery and Roll Back Safely

Verify all of the following for the canary:

```bash
kubectl get endpointslice -n payments \
  -l kubernetes.io/service-name=payments-api -o yaml
kubectl get servicemonitor payments-api -n payments -o yaml
kubectl get events -n payments \
  --field-selector involvedObject.kind=ServiceMonitor,involvedObject.name=payments-api \
  --sort-by=.lastTimestamp
```

In the Prometheus Service Discovery page, confirm the expected target count, named port, ready endpoints, node metadata used by relabeling, and final labels. On the Targets page, compare target health and last scrape duration. Query `up`, `scrape_duration_seconds`, and `scrape_samples_scraped` before and after the role switch.

If targets disappear, set the canary back to `serviceDiscoveryRole: Endpoints` while correcting RBAC or relabeling. Keep legacy Endpoints available during the canary period. For the Operator-managed kubelet Service, follow the additional dual-publish sequence in the Prometheus Operator troubleshooting guide before disabling kubelet Endpoints generation.

## Official Documentation

- [Prometheus Operator API reference for serviceDiscoveryRole](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceDiscoveryRole)
- [Prometheus Operator EndpointSlice migration troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#v1-endpoints-is-deprecated-in-v133--warning-in-the-operators-logs)
- [Prometheus Kubernetes service discovery roles and meta labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus 2.21 changelog: EndpointSlice discovery support](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#2210--2020-09-11)
- [Prometheus 2.35 changelog: discovery.k8s.io/v1 support](https://github.com/prometheus/prometheus/blob/main/CHANGELOG.md#2350--2022-04-21)
- [Kubernetes Service documentation: deprecated Endpoints API](https://kubernetes.io/docs/concepts/services-networking/service/#endpoints)
- [Kubernetes EndpointSlice API](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

Migrate one ServiceMonitor at a time: confirm the installed schema, grant Prometheus read access to EndpointSlices, switch the discovery role, update custom meta-label relabelings, and compare target sets. Move the global default only after the canary proves the complete path.
