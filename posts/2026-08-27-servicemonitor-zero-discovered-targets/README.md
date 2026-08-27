# How to Debug a ServiceMonitor with Zero Discovered Targets from Service to EndpointSlice

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes, EndpointSlice, Service Discovery

Description: Follow a selected ServiceMonitor through Service labels, Pod selectors, named ports, EndpointSlices, discovery roles, and RBAC to explain zero targets.

---

If a ServiceMonitor appears in generated Prometheus configuration but its job has zero discovered targets, the Operator has already selected the monitor. The break is later in the chain:

```text
ServiceMonitor selector
  -> Service
    -> Service selector
      -> Pod
        -> EndpointSlice address and port
          -> Prometheus Kubernetes discovery
```

Do not test `/metrics` until an address reaches Prometheus. A perfect metrics endpoint cannot repair an empty discovery result.

## Capture the Intended Mapping

Suppose the monitor contains:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: payments
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - payments
  selector:
    matchLabels:
      app.kubernetes.io/name: payments
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

This expresses three exact requirements:

- look for Services in namespace `payments`;
- keep Services labeled `app.kubernetes.io/name=payments`;
- use the Service port named `metrics`.

Check the live object rather than the manifest in Git:

```bash
kubectl get servicemonitor payments -n monitoring -o yaml
kubectl get service -n payments \
  -l app.kubernetes.io/name=payments \
  --show-labels
```

If no Service matches, fix the Service label or the monitor selector. Pod labels are not evaluated by `ServiceMonitor.spec.selector`.

## Trace the Service to Pods

Inspect the selected Service:

```bash
kubectl get service payments -n payments -o yaml
```

A typical mapping is:

```yaml
spec:
  selector:
    app.kubernetes.io/name: payments
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
```

Use the Service's selector to list Pods:

```bash
kubectl get pods -n payments \
  -l app.kubernetes.io/name=payments \
  -o wide --show-labels
```

An empty list means the Kubernetes Service controller also has no workload to publish. Compare selector keys, values, namespace, and rollout labels exactly. Label matching is case-sensitive.

For a named `targetPort`, confirm that a selected Pod declares the matching container port:

```bash
kubectl get pod POD_NAME -n payments \
  -o jsonpath='{range .spec.containers[*]}{.name}{"\n"}{range .ports[*]}  {.name}{"="}{.containerPort}{"\n"}{end}{end}'
```

The names play different roles:

```text
ServiceMonitor endpoints.port = Service ports.name
Service ports.targetPort      = Pod container ports.name or a number
```

They are often both `metrics`, but Kubernetes does not require those two fields to be identical.

## Inspect Every EndpointSlice

Kubernetes links EndpointSlices to a Service with the label `kubernetes.io/service-name`:

```bash
kubectl get endpointslice -n payments \
  -l kubernetes.io/service-name=payments \
  -o yaml
```

Check all returned slices. A Service can own multiple EndpointSlices, including separate slices for address families or different resolved named-port values.

Verify:

- `ports[].name` is `metrics`;
- `ports[].port` is the real serving port;
- `endpoints[].addresses` contains the intended Pod IPs;
- `endpoints[].conditions.ready` reflects Pod readiness;
- endpoint `targetRef` values identify the expected Pods.

The EndpointSlice controller normally creates slices automatically only for Services with selectors. For a selectorless Service, you must provide EndpointSlices yourself or use another discovery mechanism. A manually managed EndpointSlice needs the `kubernetes.io/service-name` label and an appropriate `endpointslice.kubernetes.io/managed-by` value.

Readiness is valuable evidence, but do not assume it alone explains zero Prometheus discovery. EndpointSlices can contain endpoints with `ready: false`, and Prometheus discovery behavior also depends on generated relabeling. Separately, ServiceMonitor endpoint `filterRunning` defaults to enabled and filters Pods in `Failed` or `Succeeded` phase. Inspect the live discovered-label set before deciding which condition removed a target.

## Confirm Which Discovery Role Prometheus Uses

Prometheus Operator supports `Endpoints` and `EndpointSlice` service-discovery roles. On the Prometheus CR, `spec.serviceDiscoveryRole` defaults to `Endpoints` when unset. A ServiceMonitor can override it with its own `spec.serviceDiscoveryRole`.

```bash
kubectl get prometheus PROMETHEUS_NAME -n monitoring \
  -o jsonpath='{.spec.serviceDiscoveryRole}{"\n"}'
kubectl get servicemonitor payments -n monitoring \
  -o jsonpath='{.spec.serviceDiscoveryRole}{"\n"}'
```

If the active role is `Endpoints`, inspecting only EndpointSlices is incomplete. Inspect the legacy object too:

```bash
kubectl get endpoints payments -n payments -o yaml
```

Kubernetes deprecated the Endpoints API in v1.33, but the Operator retains the role for compatibility. EndpointSlice discovery requires a compatible Prometheus version and appropriate RBAC.

## Test Prometheus Discovery RBAC

For EndpointSlice discovery, the Prometheus service account needs access to EndpointSlices and related Service and Pod metadata in target namespaces:

```bash
for resource in services pods endpointslices.discovery.k8s.io; do
  kubectl auth can-i list "$resource" -n payments \
    --as=system:serviceaccount:monitoring:PROMETHEUS_SERVICE_ACCOUNT
  kubectl auth can-i watch "$resource" -n payments \
    --as=system:serviceaccount:monitoring:PROMETHEUS_SERVICE_ACCOUNT
done
```

For the `Endpoints` role, test `endpoints` instead of `endpointslices.discovery.k8s.io`. A RoleBinding in `monitoring` does not grant access to namespace `payments`; RBAC bindings apply within their own namespace unless a ClusterRoleBinding grants cluster-wide access.

## Inspect Dropped Targets Before Changing YAML

Open Prometheus **Status > Service Discovery**, find the generated ServiceMonitor job, and expand both active and dropped targets. The pre-relabel labels show the discovered Service, namespace, port name, Pod, and endpoint readiness metadata. A dropped target often exposes the exact mismatch that a final target list hides.

If the job has no raw discovery entries, focus on namespace selection and RBAC. If raw entries exist only under dropped targets, inspect generated relabel rules and port labels. If an active target appears, zero discovery is resolved and any remaining failure belongs to the scrape path.

## Official Documentation

- [Prometheus Operator ServiceMonitor API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Prometheus Kubernetes service discovery](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)

## Conclusion

Zero discovered targets is a data-flow failure, not yet a scrape failure. Prove the monitor's Service selector, the Service's Pod selector, both named-port mappings, every EndpointSlice, the active discovery role, and Prometheus RBAC. The first empty or mismatched object in that chain is the boundary to fix.
