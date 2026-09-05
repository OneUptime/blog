# Istio Proxy Readiness Returns 503: Verify Service Ports, Endpoints, and Envoy Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Envoy, Kubernetes, Readiness Probe, EndpointSlice, Service, Troubleshooting

Description: Trace an Istio proxy readiness 503 from the injected probe through application ports, Kubernetes endpoints, and Envoy xDS configuration.

---

An injected Pod may show `1/2` containers ready while the application itself responds on localhost. `kubectl describe pod` then shows the `istio-proxy` readiness probe receiving HTTP `503`. That response is useful: a process answered the probe, so this is different from `connection refused`, a probe timeout, or kubelet being unable to reach the Pod IP.

In current Istio releases, the default sidecar readiness handler on port `15021` waits for the first successful CDS and LDS updates, then checks that Envoy reports `LIVE` and its workers have started. Stock Istio 1.31 caches those successful checks for that Envoy process lifetime. It does **not** wait for EDS endpoints, an HTTP route, a Kubernetes Service `targetPort`, or an application socket. Those objects still determine whether traffic works after the proxy becomes ready, but an empty EndpointSlice alone is not an explanation for a current Istio startup-readiness `503`.

Keep the readiness gate and the subsequent traffic-path checks separate:

```text
kubelet -> :15021/healthz/ready
           -> first successful CDS update
           -> first successful LDS update
           -> Envoy LIVE with workers started

real request -> listener -> route -> cluster -> endpoint -> workload socket
```

## Identify Which Endpoint Returned 503

Capture the injected probe and events rather than assuming its port and path:

```bash
kubectl -n catalog get pod catalog-api-7dbbd75b8c-6tlqf -o json |
  jq '.spec.containers[] |
      {name, readinessProbe, livenessProbe, startupProbe}'

kubectl -n catalog describe pod catalog-api-7dbbd75b8c-6tlqf
```

If the event says `HTTP probe failed with statuscode: 503`, note the container, port, path, first failure, and whether it ever recovered. If it says `dial tcp ... connection refused`, verify that the status process is listening and that kubelet can reach the Pod. A timeout can instead indicate node-to-Pod networking or CPU starvation.

Query the actual status endpoint through a temporary local port-forward:

```bash
kubectl -n catalog port-forward \
  pod/catalog-api-7dbbd75b8c-6tlqf 15021:15021

# In another terminal:
curl -i --max-time 3 http://127.0.0.1:15021/healthz/ready
```

`pilot-agent request GET ready` is a different check: it queries Envoy's admin `/ready` endpoint. That is useful for distinguishing an Envoy state problem from the agent's first-CDS/first-LDS gate, but it is not the same handler that kubelet calls. Do not expose Envoy's admin interface outside the Pod.

Then collect the proxy and agent log around startup:

```bash
kubectl -n catalog logs catalog-api-7dbbd75b8c-6tlqf \
  -c istio-proxy --since=15m --timestamps
```

Look for xDS connection failures, rejected CDS or LDS updates, listener warming, certificate errors, and Envoy startup failures. Avoid raising log level mesh-wide; if a temporary per-Pod increase is necessary, bound its duration because debug logs can expose hostnames and consume significant storage.

## Verify the Readiness Contract for the Installed Revision

Inspect the injected readiness probe and the proxy image before applying advice from another Istio version:

```bash
kubectl -n catalog get pod catalog-api-7dbbd75b8c-6tlqf -o json |
  jq '.spec.containers[] |
      select(.name == "istio-proxy") |
      {image, args, readinessProbe}'

istioctl version
```

The annotation catalog still documents `readiness.status.sidecar.istio.io/applicationPorts`, and older or customized injectors may use application-port information. Do not infer current behavior from that annotation alone. The release-matched `pilot-agent` implementation and the rendered injection template are authoritative for the deployed revision. In stock Istio 1.31, sidecar readiness is based on successful CDS/LDS receipt and Envoy state, not an application-port socket check.

Now distinguish the two common cases:

- Envoy admin `/ready` is not successful: investigate Envoy startup, bootstrap, certificates, resources, and listener warming.
- Envoy admin `/ready` is successful but `:15021/healthz/ready` returns `503`: focus first on whether the agent has observed successful CDS and LDS updates. Check the proxy log and xDS synchronization for a missing stream or rejected listener/cluster configuration.

Application ports remain important to end-to-end traffic. Inventory them after identifying the readiness failure:

```bash
kubectl -n catalog get pod catalog-api-7dbbd75b8c-6tlqf -o json |
  jq '[.spec.containers[] |
       select(.name != "istio-proxy") |
       .name as $container |
       .ports[]? |
       {container: $container, name, containerPort, protocol}]'
```

Confirm that the process listens on the expected port. A distroless application may not have `ss`; use a vetted ephemeral container in the same Pod network namespace if policy permits:

```bash
kubectl -n catalog debug -it catalog-api-7dbbd75b8c-6tlqf \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.53 \
  --target=catalog-api -- sh
```

Pin diagnostic images by digest in production. A listener on `127.0.0.1` is not equivalent to one on the Pod IP. Conversely, container ports are metadata and do not make a process listen. Record both the declared and observed sockets.

## Follow Each Service Port After Readiness

Find every Service selecting the Pod rather than checking only the expected one:

```bash
kubectl -n catalog get service -o json |
  jq -r '.items[] |
    [.metadata.name,
     (.spec.selector // {} | to_entries | map("\(.key)=\(.value)") | join(",")),
     (.spec.ports | map("\(.name):\(.port)->\(.targetPort)") | join(","))] |
    @tsv'
```

Inspect the target Service and all EndpointSlices:

```bash
kubectl -n catalog get service catalog-api -o yaml
kubectl -n catalog get endpointslice \
  -l kubernetes.io/service-name=catalog-api -o yaml
```

Validate these relationships:

- the Service selector matches the Pod labels;
- each `targetPort` resolves to the intended numeric container port or named port;
- the EndpointSlice port is the resolved target port, not necessarily the Service's client-facing `port`;
- the affected Pod IP appears with the expected address family; and
- `conditions.ready` is true for endpoints intended to receive normal traffic.

There may be several EndpointSlices because Kubernetes separates address families, ports, or scale groups. Joining only the first slice can produce a false conclusion. During termination, an endpoint can remain present while `ready` is false; that is normal drain behavior.

Be careful with causality: when the proxy container is unready, the Pod is normally unready, which in turn makes the EndpointSlice endpoint unready. An unready endpoint is therefore commonly an **effect** of the proxy `503`. Conversely, a wrong Service `targetPort` or an empty endpoint set breaks application traffic but, by itself, does not fail the stock Istio 1.31 sidecar readiness gate.

## Inspect What Envoy Actually Accepted

Check control-plane synchronization first:

```bash
istioctl proxy-status catalog-api-7dbbd75b8c-6tlqf.catalog
```

A missing proxy has no active Istiod session. `STALE` means Istiod and the proxy are out of sync; inspect the proxy log for a NACK or a stalled stream rather than assuming one cause. Because readiness specifically needs successful CDS and LDS updates, start with those columns. If the connection is healthy, inspect the accepted configuration by the actual Service FQDN and ports:

```bash
istioctl proxy-config listeners \
  pod/catalog-api-7dbbd75b8c-6tlqf.catalog

istioctl proxy-config clusters \
  pod/catalog-api-7dbbd75b8c-6tlqf.catalog \
  --fqdn catalog-api.catalog.svc.cluster.local

istioctl proxy-config endpoints \
  pod/catalog-api-7dbbd75b8c-6tlqf.catalog \
  --cluster 'inbound|8080||'
```

The exact inbound cluster name can vary by Istio version and interception mode. List clusters first, then copy the name instead of assuming the example. For an outbound symptom, inspect from the caller's proxy and use a name such as `outbound|80||catalog-api.catalog.svc.cluster.local`.

The data should form a continuous chain for real traffic:

1. A listener accepts the captured destination and protocol.
2. Its route, when HTTP-aware, selects the expected cluster.
3. The cluster uses the expected service port and transport socket.
4. Its endpoint set contains the resolved workload port.

If LDS or CDS never reaches a successful first update, inspect the xDS connection and any rejected resources. If a traffic listener is missing after readiness, inspect protocol selection, Sidecar scope, and whether Istiod knows the Service. If a cluster exists but endpoints are empty, inspect subset labels, EndpointSlices, and configuration visibility. An ACK confirms that Envoy accepted the response as valid, not that every desired application route or endpoint exists; a NACK identifies rejected configuration and should be repaired rather than waited out.

## Check Protocol Selection and Conflicting Services

Istio can detect HTTP and HTTP/2, but explicit Service port naming or `appProtocol` is safer where protocol behavior matters. List all Services selecting this Pod because two Services can assign different protocols to the same workload port, which Istio documents as unsupported:

```bash
kubectl -n catalog get service -o custom-columns='NAME:.metadata.name,PORTS:.spec.ports[*].port,NAMES:.spec.ports[*].name,APP_PROTOCOL:.spec.ports[*].appProtocol,TARGET:.spec.ports[*].targetPort'
```

Use names such as `http-api`, `grpc-api`, `http2-api`, or `tcp-custom` according to the actual bytes. If `appProtocol` and the port name are both set, Istio gives `appProtocol` precedence. Changing a label or port name can affect every client, so render and analyze the candidate configuration before applying it:

```bash
istioctl analyze -n catalog
kubectl apply --dry-run=server -f catalog-service.yaml
```

Do not relabel an HTTPS port as HTTP merely to make a readiness warning disappear. That changes how Envoy parses traffic and can create data-plane failures.

## Repair the Owner, Then Recreate the Pod

Fix the Deployment, Service, DestinationRule, Sidecar resource, or injection configuration that owns the mismatch. Do not hand-edit a generated EndpointSlice or a running Pod; controllers will overwrite the former and most Pod fields are immutable.

Roll out one corrected replica and verify it before broad replacement:

```bash
kubectl -n catalog rollout status deployment/catalog-api --timeout=5m
kubectl -n catalog get pods -l app=catalog-api -w
```

On the new Pod, confirm `:15021/healthz/ready` returns success, `istioctl proxy-status` is synced for CDS and LDS, the expected listeners and clusters exist, and the Pod endpoint becomes ready. Then send a controlled request through a real Service from a meshed caller. A direct localhost check cannot validate Service port translation or outbound Envoy routing.

Avoid replacing the Istio readiness probe with an always-successful command. That advertises a Pod whose application traffic may have no usable proxy configuration. Also avoid converting it into liveness without careful design: a control-plane disruption can cause restart loops and destroy Envoy's last accepted configuration.

## Conclusion

An Istio proxy readiness `503` is a startup or xDS-readiness signal, not a generic verdict on the whole request path. Identify the exact probe, compare it with raw Envoy readiness, and verify that the proxy receives successful CDS and LDS updates. Once that gate passes, follow Service ports, EndpointSlices, routes, clusters, endpoints, and workload sockets to prove real traffic. Repair the declarative owner instead of masking the probe.

## Official Documentation

- [Istio: Resource Annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Application Requirements](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#container-probes)
- [Envoy: Administration Interface](https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html#get--ready)
- [Istio source: sidecar readiness probe](https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/status/ready/probe.go)
