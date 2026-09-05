# Trace Empty Envoy EDS Despite Kubernetes Service Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Istio, Envoy, EndpointSlice, Endpoint Discovery, Service Mesh, Troubleshooting

Description: Explain why Kubernetes endpoints can exist while a caller's Envoy EDS cluster is empty, then trace ports, subsets, readiness, and scope.

---

Seeing Pod IPs in Kubernetes and seeing no endpoints in Envoy are not contradictory. Kubernetes publishes endpoint data for a Service. Istiod reads that data, combines it with Istio routing, subsets, network topology, revision, and visibility, then sends the endpoints relevant to each proxy. The caller's Envoy finally stores that computed result in one specific cluster.

An empty EDS view can therefore mean any of these:

- the wrong Envoy or wrong cluster was inspected;
- Kubernetes endpoints exist for another Service port;
- endpoints are present but not ready;
- a DestinationRule subset selects no workload labels;
- the caller cannot import or see the service configuration;
- the namespace is excluded from Istiod discovery; or
- EDS delivery is disconnected, stale, or rejected.

Trace the same service identity and port through every layer.

## Name the Caller and Exact Envoy Cluster

EDS is a client-side view. Run the investigation against the proxy that originates the failing request, not an arbitrary backend proxy:

```bash
istioctl proxy-config clusters \
  pod/frontend-6c8d9f8dc8-d4k5p.shop \
  --fqdn inventory.inventory.svc.cluster.local
```

List before filtering. A typical outbound cluster name encodes direction, Service port, subset, and FQDN:

```text
outbound|8080|v2|inventory.inventory.svc.cluster.local
```

Copy the actual name and query it exactly:

```bash
istioctl proxy-config endpoints \
  pod/frontend-6c8d9f8dc8-d4k5p.shop \
  --cluster 'outbound|8080|v2|inventory.inventory.svc.cluster.local'
```

If the base cluster is populated but the `v2` cluster is empty, the problem is probably subset selection rather than Kubernetes service discovery. If no cluster exists at all, investigate routing and configuration visibility before EDS.

Confirm the source Pod actually uses this proxy and the expected Istio revision:

```bash
kubectl -n shop get pod frontend-6c8d9f8dc8-d4k5p -o json |
  jq '{containers: [.spec.containers[].name],
       initContainers: [.spec.initContainers[]?.name],
       requestedRevision: .metadata.labels["istio.io/rev"],
       actualRevision: .metadata.annotations["istio.io/rev"],
       sidecarStatus: .metadata.annotations["sidecar.istio.io/status"]}'
```

## Read All EndpointSlices, Not Only Legacy Endpoints

Kubernetes EndpointSlice is the scalable source for Service backends. A Service can have multiple slices by address family, port combination, or size. Inspect the Service, selected Pods, and every slice:

```bash
kubectl -n inventory get service inventory -o yaml
kubectl -n inventory get pods -l app=inventory \
  -o custom-columns='NAME:.metadata.name,IP:.status.podIP,READY:.status.conditions[?(@.type=="Ready")].status,LABELS:.metadata.labels'
kubectl -n inventory get endpointslice \
  -l kubernetes.io/service-name=inventory -o yaml
```

Check:

- Service selectors match the intended Pods;
- the slice `addressType` is usable by the caller and mesh network;
- each endpoint's `conditions.ready` is usable (`true` in normal controller output; API consumers treat an omitted value as ready for compatibility);
- slice addresses match current Pod IPs; and
- the slice contains the resolved target port for the Service port used by the Envoy cluster; its port name matches the Service port name, not necessarily the named `targetPort`.

Legacy `Endpoints` output can be truncated in large Services and is being replaced by EndpointSlice. Do not stop after `kubectl get endpoints inventory` prints an address.

Readiness often explains the difference. Kubernetes normally removes an unready Pod from regular Service load balancing by marking its endpoint not ready. A terminating endpoint can remain in a slice with `ready: false` for drain semantics. Envoy should not use its mere presence as proof of a healthy upstream.

If the Service intentionally sets `publishNotReadyAddresses`, document why. Publishing an address does not make the application or its sidecar safe to serve.

## Match Service Port, Target Port, and EndpointSlice Port

The port in the Envoy cluster name is normally the Service's client-facing port. The endpoint address uses the resolved target port. Print the mapping compactly:

```bash
kubectl -n inventory get service inventory -o json |
  jq '.spec.ports[] | {name, protocol, appProtocol, port, targetPort}'

kubectl -n inventory get endpointslice \
  -l kubernetes.io/service-name=inventory -o json |
  jq '.items[] | {slice: .metadata.name, ports, endpoints}'
```

For example, Service port `8080` can target a container's named port `grpc` that resolves to `9090`. Envoy's cluster may be `outbound|8080|...`, while EDS contains `PodIP:9090`. Looking for `PodIP:8080` would incorrectly appear empty.

Named target ports can resolve differently across Pods, causing Kubernetes to create different EndpointSlices. Make sure every selected Pod defines the name. An absent or misspelled container port name prevents a useful endpoint port from being produced for that Pod.

Istio protocol selection is a separate but related concern. `appProtocol` takes precedence over the Service port name. Use `grpc`, `http2`, `http`, or `tcp` according to real traffic. Protocol misclassification may generate a different listener or cluster path even while endpoint addresses exist.

Run analysis before changing ports:

```bash
istioctl analyze -n inventory
kubectl apply --dry-run=server -f inventory-service.yaml
```

Port renames affect clients and telemetry, so change the declarative owner and roll out deliberately.

## Check DestinationRule Subsets

A VirtualService route can name a subset, but a subset is not a second Kubernetes Service. It filters the Service's endpoints by labels declared in a DestinationRule:

```bash
kubectl -n inventory get virtualservice,destinationrule -o yaml
```

A typical definition is:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: inventory
  namespace: inventory
spec:
  host: inventory.inventory.svc.cluster.local
  subsets:
  - name: v2
    labels:
      version: v2
```

Compare that label predicate with endpoint Pod labels, not Deployment labels alone:

```bash
kubectl -n inventory get pods -l app=inventory,version=v2 \
  --show-labels
```

Common failures include `version: v2` on the Deployment object but not its Pod template, case differences, a route to a removed subset, and a DestinationRule whose short `host` resolves in the rule's namespace rather than the Service namespace. Prefer the Service FQDN in cross-namespace production configuration.

`istioctl x describe pod` can also identify routes whose subsets do not match a destination Pod. Run it against an inventory backend Pod from the preceding listing (replace the example Pod name):

```bash
istioctl x describe pod inventory-v2-6c8d9f8dc8-d4k5p.inventory
```

Do not remove the subset from a live route simply to populate EDS. Decide whether the route or workload labels represent the intended release, then fix that owner.

## Trace Configuration Visibility in Both Directions

Istio provides several independent scoping controls:

- a `Sidecar` resource's `egress.hosts` controls which configuration affected workloads import;
- `exportTo` on VirtualService, DestinationRule, and ServiceEntry lets owners restrict visibility;
- `networking.istio.io/exportTo` on a Kubernetes Service controls its Istio visibility; and
- mesh `discoverySelectors` tell Istiod to ignore namespaces that do not match.

Inventory relevant resources:

```bash
kubectl get sidecar.networking.istio.io -A -o yaml
kubectl -n inventory get service inventory \
  -o jsonpath='{.metadata.annotations.networking\.istio\.io/exportTo}{"\n"}'
kubectl get virtualservice,destinationrule,serviceentry -A -o yaml
```

For a `Sidecar` resource, `./*` means the workload's own namespace, while `inventory/*` imports configuration from `inventory`. For `exportTo`, `.` means the resource's own namespace, not the caller's. The effective visibility must satisfy both producer export and consumer import.

Check installation-time `discoverySelectors` from the effective mesh configuration. If the `inventory` namespace does not match, Istiod ignores its configuration entirely. Adding a label can greatly expand control-plane load, so make the namespace-discovery decision with the mesh administrator.

Gateways are different: Sidecar resources do not scope gateway configuration, though gateways still respect applicable export and discovery selection. Always identify the proxy role before applying a scoping explanation.

## Check xDS Delivery and Revision

If Istiod should compute endpoints but Envoy does not have them, inspect synchronization:

```bash
istioctl proxy-status --namespace shop
```

`EDS SYNCED` means Envoy acknowledged the last endpoint configuration sent by that Istiod view; it does not prove the set contains the endpoint you expected. `STALE` means an update lacks acknowledgement. A missing proxy is not connected to the queried control-plane view; check the Kubernetes context and selected control plane before concluding it is disconnected.

Compare a failing caller with a working caller using the same exact cluster filter. If they connect to different revisions, inspect namespace labels, revision tags, and actual revision annotations. If they connect to different Istiod replicas of the same revision and disagree, check control-plane logs, remote-cluster sync, and registry event metrics.

Avoid querying unauthenticated Istiod debug endpoints over plaintext. Prefer authenticated `istioctl` access. Istiod can still expose an HTTP debug interface when `ENABLE_DEBUG_ON_HTTP` is enabled; do not assume every debug endpoint is authenticated.

## Verify the Fix from Kubernetes to Traffic

After correcting a port, label, route, or scope, wait for the declarative controllers to converge. Confirm in order:

```bash
kubectl -n inventory get endpointslice \
  -l kubernetes.io/service-name=inventory -o wide

istioctl proxy-status --namespace shop

istioctl proxy-config endpoints \
  pod/frontend-6c8d9f8dc8-d4k5p.shop \
  --cluster 'outbound|8080|v2|inventory.inventory.svc.cluster.local'
```

Then send a controlled request from the real caller and correlate the caller proxy access log with the backend log. Verify the selected endpoint, protocol, mTLS state, and response. A populated EDS list alone does not prove network reachability or application health.

## Conclusion

Kubernetes endpoints are raw registry input; Envoy EDS is a per-proxy, per-cluster computed view. Start from the failing caller and exact cluster, join all EndpointSlices, map Service ports to endpoint ports, evaluate subset labels, and then evaluate producer and consumer discovery scope. Only after those inputs agree should an xDS delivery problem be suspected.

## Official Documentation

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Istio: Destination Rule](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Understand Your Mesh with istioctl describe](https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: EndpointSlice v1 API](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/endpoint-slice-v1/)
