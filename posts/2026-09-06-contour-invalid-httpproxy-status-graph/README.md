# Diagnose Invalid HTTPProxies with Status and the Contour Graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, HTTPProxy, Service Graph, Troubleshooting, Envoy, Kubernetes, Routing

Description: Trace an invalid HTTPProxy from its current-generation status errors through Contour's internal DAG and xDS output.

---

An HTTPProxy can pass Kubernetes schema admission and still be semantically invalid. The API server checks the CRD shape. Contour then resolves Services, ports, Secrets, includes, route conflicts, class ownership, and virtual-host relationships before it can build Envoy configuration.

Use evidence in this order:

1. the HTTPProxy `Valid` condition;
2. related Kubernetes objects;
3. Contour's directed acyclic graph; and
4. generated xDS resources.

The status usually identifies the fix before a graph is necessary.

## Read the Positive-Polarity Condition

List all proxies with their summary:

```bash
kubectl get httpproxy -A \
  -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,FQDN:.spec.virtualhost.fqdn,GEN:.metadata.generation,STATUS:.status.currentStatus,DESCRIPTION:.status.description'
```

Then inspect the complete status:

```bash
kubectl -n storefront get httpproxy shop -o yaml
kubectl -n storefront describe httpproxy shop
```

Contour writes one normal-true condition of type `Valid`. `status: 'True'` means the object was ingested without a fatal error, although warnings may appear. `status: 'False'` means Contour recorded fatal validation errors; depending on the error, some routes may still be generated.

Compare `metadata.generation` with the condition's `observedGeneration`. If they differ, you may be reading status from an older spec. Wait briefly and confirm that the intended Contour instance is healthy, watches the namespace, and accepts the object's ingress class.

Do not key automation only on the legacy lowercase `status.currentStatus`. Prefer the Kubernetes condition, reason, message, and observed generation.

## Follow the Referenced Objects

Read the error literally and inspect its owner. Common branches are:

| Status clue | Objects to inspect |
| --- | --- |
| Unresolved service reference | Service in the route HTTPProxy namespace and its numeric Service port |
| TLS Secret invalid or not found | Secret type, certificate and private-key data, and TLSCertificateDelegation |
| Include not found or invalid | Child HTTPProxy namespace, non-root shape, composed conditions |
| Duplicate include conditions | Sibling includes with identical match conditions |
| Disallowed root namespace, or missing/stale status from class filtering | Contour flags, `spec.ingressClassName`, and any legacy `kubernetes.io/ingress.class` annotation (which takes precedence) |
| Invalid route condition | At most one path matcher per route and valid header or query rules |

For a Service branch:

```bash
kubectl -n storefront get service shop -o yaml
kubectl -n storefront get endpointslice \
  -l kubernetes.io/service-name=shop -o yaml
```

Endpoint readiness affects runtime health, but a missing Service or missing Service port affects HTTPProxy validity. Keep those cases separate.

Server-side dry-run catches schema and admission-policy failures before apply:

```bash
kubectl apply --server-side --dry-run=server -f shop.yaml
```

It cannot reproduce Contour's whole semantic graph, so a successful dry-run is not proof of `Valid=True`.

## Visualize the Internal DAG

Contour models accepted configuration as a directed acyclic graph. Its debug endpoint emits Graphviz DOT. Keep the endpoint local through `kubectl port-forward`; never expose a controller debug port publicly.

```bash
contour_pod=$(kubectl -n projectcontour get pod \
  -l app=contour -o jsonpath='{.items[0].metadata.name}')

kubectl -n projectcontour port-forward \
  "pod/$contour_pod" 6060:6060
```

In another shell, save text for inspection or render it with Graphviz:

```bash
curl --fail --silent http://127.0.0.1:6060/debug/dag \
  -o /tmp/contour-dag.dot
dot -Tsvg /tmp/contour-dag.dot -o /tmp/contour-dag.svg
```

Search the DOT for the FQDN, namespace, Service, and port. The graph helps answer whether a virtual host connects to the intended routes, clusters, and Services. Includes are flattened into routes; child HTTPProxy objects are not separate DOT nodes. A rejected object or route may be absent, so absence plus a `Valid=False` status is expected evidence, not proof that Contour never observed it.

Run the check against the leader's current view when replicas could differ. Also verify the port-forwarded Pod belongs to the Contour deployment and ingress class handling this HTTPProxy.

## Inspect What Contour Sends to Envoy

Once the object is valid, xDS inspection shows whether listeners, routes, clusters, and endpoints were generated. Contour ships a `contour cli` client in its container:

```bash
contour_pod=$(kubectl -n projectcontour get pod \
  -l app=contour -o jsonpath='{.items[0].metadata.name}')

kubectl -n projectcontour exec "$contour_pod" -c contour -- \
  contour cli rds \
  --cafile=/certs/ca.crt \
  --cert-file=/certs/tls.crt \
  --key-file=/certs/tls.key
```

Replace `rds` with `lds`, `cds`, or `eds` to inspect listeners, clusters, or endpoints. These commands stream updates, so bound the session and avoid dumping a large production configuration into tickets or public logs.

The layers answer different questions:

- RDS: did the FQDN, path, and policy become a route?
- CDS: did the route produce the expected Service cluster and protocol?
- EDS: which endpoint addresses and ports did Contour send?
- LDS: is the expected HTTP or TLS listener present?

Do not jump to EDS when the HTTPProxy remains invalid. Depending on the validation error, Contour may still generate unaffected routes or direct 502 responses; inspect the specific failed route rather than assuming the whole HTTPProxy is absent from xDS.

## Use Logs as Supporting Evidence

Temporarily enabling Contour `--debug` can show more about API processing. `--kubernetes-debug` requires an integer verbosity level (for example, `--kubernetes-debug=4`) and should be used sparingly. Prefer status and object inspection first.

Correlate timestamps with an apply and filter on namespace, kind, and name. Never assume the final log line is the root cause; one invalid child can produce follow-on messages for multiple parents.

After the fix, wait for a current condition:

```bash
kubectl -n storefront wait httpproxy/shop \
  --for=condition=Valid --timeout=60s
kubectl -n storefront get httpproxy shop -o yaml
```

Then send a real request and inspect Envoy access logs. `Valid=True` means configuration was accepted, not that DNS, load balancers, endpoints, network policy, and the application all work.

## Conclusion

Start invalid HTTPProxy diagnosis with the current-generation `Valid` condition. Follow its named Service, Secret, include, or route conflict. Use the DAG to see the assembled configuration and xDS to confirm what a valid graph sends to Envoy. This order avoids treating a semantic configuration rejection as a data-plane outage.

## Official Documentation

- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 internal graph visualization](https://projectcontour.io/docs/1.33/troubleshooting/contour-graph/)
- [Contour 1.33 xDS resource inspection](https://projectcontour.io/docs/1.33/troubleshooting/contour-xds-resources/)
- [Contour 1.33 debug logging](https://projectcontour.io/docs/1.33/troubleshooting/contour-debug-log/)
- [Contour 1.33 HTTPProxy inclusion](https://projectcontour.io/docs/1.33/config/inclusion-delegation/)
- [Kubernetes API conventions for conditions](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-architecture/api-conventions.md#typical-status-properties)
