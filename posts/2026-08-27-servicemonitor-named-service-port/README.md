# Why a ServiceMonitor Endpoint Must Reference the Named Service Port, Not the Container Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, Kubernetes, Services, Ports

Description: Map ServiceMonitor endpoint ports through a Kubernetes Service to Pod container ports and avoid the common numeric or container-port mismatch.

---

The normal ServiceMonitor contract is based on a Kubernetes Service port name:

```text
ServiceMonitor spec.endpoints[].port
              = Service spec.ports[].name
```

It does not equal `Service.spec.ports[].port`, `Service.spec.ports[].targetPort`, or a container's numeric port. Those fields may eventually lead to the same socket, but they belong to different API layers.

## A Correct Three-Layer Mapping

The Pod exposes metrics on container port `9090` and gives that port a name:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: catalog
  namespace: catalog
spec:
  selector:
    matchLabels:
      app: catalog
  template:
    metadata:
      labels:
        app: catalog
    spec:
      containers:
        - name: catalog
          image: example/catalog:1.0
          ports:
            - name: metrics
              containerPort: 9090
```

The Service exposes its own port `8080`, names that Service port `prom-metrics`, and maps it to the Pod port named `metrics`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: catalog
  namespace: catalog
  labels:
    app: catalog
spec:
  selector:
    app: catalog
  ports:
    - name: prom-metrics
      port: 8080
      targetPort: metrics
```

The ServiceMonitor references `prom-metrics`, because that is `Service.spec.ports[].name`:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: catalog
  namespace: catalog
spec:
  selector:
    matchLabels:
      app: catalog
  endpoints:
    - port: prom-metrics
      path: /metrics
```

The names do not have to match each other:

```text
ServiceMonitor endpoint.port = prom-metrics
Service port.name            = prom-metrics
Service port.targetPort      = metrics
Pod container port.name      = metrics
Pod containerPort            = 9090
```

Prometheus ultimately scrapes an endpoint address at the resolved target port. The Service supplies the discovery and port contract; Prometheus does not need to send the scrape through the Service's ClusterIP.

## Common Incorrect Forms

This uses the Service's numeric `port`, not its name:

```yaml
endpoints:
  - port: "8080"
```

It does not select numeric Service port `8080`. Kubernetes Service port-name validation requires at least one lowercase letter, so an all-numeric name such as `8080` is invalid as well. Use a real name such as `metrics`.

This uses the container port name while the Service port has a different name:

```yaml
endpoints:
  - port: metrics
```

In the example, the selected Service contains only `name: prom-metrics`, so the generated discovery job drops that port.

This omits the Service port name:

```yaml
ports:
  - port: 8080
    targetPort: metrics
```

Kubernetes permits an unnamed port for a single-port Service, but the ServiceMonitor `port` field has no stable name to reference. Name metrics ports explicitly.

For multi-port Services, Kubernetes requires names so that ports are unambiguous. Use semantic names such as `metrics`, `http-metrics`, or `grpc-metrics` and keep them stable across releases.

## What About `Endpoint.targetPort`?

The current `monitoring.coreos.com/v1` API still has `endpoints[].targetPort`. It selects a name or number from ports declared on Pods selected by the Service:

```yaml
spec:
  endpoints:
    - targetPort: metrics
```

If both are set, `port` takes precedence. `targetPort` is not a synonym for a Service port. It changes the selection contract from `Service.spec.ports[].name` to Pod container-port metadata.

Prefer `port` for a ServiceMonitor because the resource is designed to monitor Services and the Service port is the public discovery contract. `targetPort` can be useful for a carefully understood legacy configuration, but it fails when Pods do not declare a matching container port even if the process really listens there. If the intention is to select Pods and their container ports directly, a `PodMonitor` is usually clearer.

## Debug the Live Port Chain

Read the monitor endpoint:

```bash
kubectl get servicemonitor catalog -n catalog \
  -o jsonpath='{range .spec.endpoints[*]}port={.port}{" targetPort="}{.targetPort}{" path="}{.path}{"\n"}{end}'
```

List matching Services and their ports:

```bash
kubectl get service -n catalog -l app=catalog \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.ports[*]}  name={.name} port={.port} targetPort={.targetPort}{"\n"}{end}{end}'
```

Inspect resolved EndpointSlice ports:

```bash
kubectl get endpointslice -n catalog \
  -l kubernetes.io/service-name=catalog \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .ports[*]}  name={.name} port={.port}{"\n"}{end}{end}'
```

Finally, inspect the Pod declarations:

```bash
kubectl get pod -n catalog -l app=catalog \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .spec.containers[*].ports[*]}  name={.name} containerPort={.containerPort}{"\n"}{end}{end}'
```

The first mismatch explains the missing target. If all layers agree and an active target appears, move on to network reachability and the HTTP response.

## Keep the Contract Stable During Renames

Changing a Service port name is a breaking monitoring change even when `port` and `targetPort` numbers remain the same. Update the Service and ServiceMonitor together, and allow the Operator to reconcile before removing the old port contract.

For chart authors, expose one value for the Service metrics-port name and use it in both templates. Do not accidentally use the container port number in the ServiceMonitor template.

## Official Documentation

- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/)
- [Kubernetes Service port definitions](https://kubernetes.io/docs/concepts/services-networking/service/#port-definitions)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

For a ServiceMonitor endpoint, `port` names a port on the selected Service. Follow that name through the Service's `targetPort` to the Pod's declared container port and actual listener. The API's separate `targetPort` option targets Pod port metadata directly, but it should not be confused with the stable named-Service-port contract.
