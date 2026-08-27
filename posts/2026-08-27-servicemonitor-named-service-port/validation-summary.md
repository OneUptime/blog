# Validation Summary: Why a ServiceMonitor Endpoint Must Reference the Named Service Port, Not the Container Port

## Status

validated

## Post Type

Technical guide and troubleshooting reference

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes `ServiceMonitor` and `PodMonitor` custom resources
- Kubernetes Deployments, Services, named ports, and EndpointSlices
- YAML
- `kubectl` and JSONPath

## Sources Consulted

- [Prometheus Operator `Endpoint` API reference](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator generated ServiceMonitor relabeling logic](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/promcfg.go#L2086-L2109)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#using-textual-port-number-instead-of-port-name)
- [Prometheus Operator getting-started example application](https://prometheus-operator.dev/docs/developer/getting-started/)
- [Prometheus Kubernetes service-discovery configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Kubernetes `ServicePort` API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/#ServicePort)
- [Kubernetes Service port definitions and multi-port Services](https://kubernetes.io/docs/concepts/services-networking/service/#field-spec-ports)
- [Kubernetes `EndpointPort` API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/#EndpointPort)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes v1.37 Service port validation](https://github.com/kubernetes/kubernetes/blob/v1.37.0/pkg/apis/core/validation/validation.go#L6634-L6644)

## Issues Found

- The post incorrectly stated that Kubernetes Service port names must contain a lowercase letter and that an all-numeric name such as `8080` is invalid. `ServicePort.name` is a DNS label and may be all numeric. Rewrote the explanation to clarify that ServiceMonitor treats `"8080"` as a literal Service port name rather than selecting numeric `ServicePort.port: 8080`, and that it fails in the example because no port has that name.
- The post described ServiceMonitor `Endpoint.targetPort` as suitable for a legacy configuration. That field remains supported and is not marked deprecated in the current ServiceMonitor `Endpoint` API. Reworded the passage to describe its valid use: intentionally selecting a declared Pod container port.
- The debugging guidance stated that the first port-chain mismatch necessarily explains the missing target. Other causes include ServiceMonitor selection, discovery permissions, and missing endpoint addresses. Changed the sentence to say that a mismatch can explain a missing target.
- The Deployment used the non-pullable placeholder image `example/catalog:1.0`. Replaced it with the example application used by the official Prometheus Operator guide and added its `-bind=:9090` argument so that the shown container really listens on port `9090` and exposes `/metrics`.
- The Kubernetes Service documentation link used the obsolete `#port-definitions` fragment. Updated it to the current `#field-spec-ports` section.

## Review Notes

- All seven YAML snippets parse successfully. The complete Deployment and Service manifests also pass `kubectl create --dry-run=client` with kubectl v1.34.1, and the current Prometheus Operator schema confirms the ServiceMonitor fields.
- All four JSONPath templates use supported kubectl syntax and were checked with the current client-go JSONPath implementation. The selectors and resource field paths match the current Kubernetes and Prometheus Operator APIs.
- The post correctly distinguishes the Service port name, numeric Service port, Service `targetPort`, Pod container-port name, and numeric `containerPort`. The Operator's generated relabeling rules confirm both `port` precedence and `targetPort` container-metadata matching.
- A Prometheus or PrometheusAgent resource must still select the ServiceMonitor and have discovery permissions. The example also assumes that the `catalog` namespace and the Prometheus Operator CRDs already exist.
- Prometheus Operator can use either Endpoints or EndpointSlice service discovery. The EndpointSlice command is valid for the selector-backed Service shown, but role-specific troubleshooting should inspect the discovery role configured on the Prometheus resource.
- A rename cannot be staged by defining old and new Service port names simultaneously on the same numeric port and protocol because Kubernetes rejects duplicate `(protocol, port)` pairs. Overlap requires a distinct temporary Service port or ServiceMonitor-side staging around the rename.
- All external documentation links in the corrected post returned HTTP 200, and their fragments resolve to the intended sections.
