# How to Verify Headless Service DNS with EndpointSlices and `dig`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, EndpointSlice, dig, CoreDNS, Troubleshooting

Description: Correlate selected Pods, EndpointSlice conditions, and DNS answers to find exactly where headless Service discovery breaks.

---

A headless Service DNS lookup is the end of a reconciliation chain:

~~~text
Service selector -> matching Pods -> EndpointSlices -> cluster DNS -> client cache
~~~

Start with the Kubernetes API and move toward DNS. `dig` can show what a client sees, but it cannot explain whether an address is missing because a label did not match or a Pod is unready, whether an SRV answer is missing because a named `targetPort` failed to resolve, or whether CoreDNS lacks permissions or an old negative response is cached.

The examples below inspect a Service named `store-peers` in namespace `data`.

## Confirm That the Service Is Actually Headless

~~~bash
kubectl -n data get service store-peers -o yaml
~~~

Check these fields:

~~~yaml
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: store
  ports:
    - name: peer
      protocol: TCP
      port: 7000
      targetPort: peer
~~~

`clusterIP` must be the literal string `None`; leaving the field unset asks Kubernetes to allocate a normal Service IP. Copy the selector exactly for the next query:

~~~bash
kubectl -n data get pods \
  -l app.kubernetes.io/name=store \
  -o 'custom-columns=NAME:.metadata.name,IP:.status.podIP,READY:.status.conditions[?(@.type=="Ready")].status,NODE:.spec.nodeName'
~~~

No Pods means the selector is wrong or the workload is absent. A Pod with no IP cannot become an address endpoint. A Pod with `Ready=False` normally appears in EndpointSlice state but is not published through headless DNS unless the Service sets `publishNotReadyAddresses: true`.

## List Every EndpointSlice for the Service

Use the standard association label, not a generated slice name:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=store-peers \
  -o wide

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=store-peers \
  -o yaml
~~~

A Service can own multiple EndpointSlices. The control plane groups endpoints by IP address family, port/protocol combination, and Service, and normally caps each managed slice at 100 endpoints. The complete membership is the union of all linked slices, not the first object returned by `kubectl`.

For each slice, inspect:

- `addressType`: `IPv4` or `IPv6` for current routable Service endpoints;
- `ports`: the resolved backend port, name, and protocol shared by endpoints in that slice;
- `endpoints[].addresses`: one or more addresses for the logical endpoint;
- `endpoints[].conditions.ready`, `serving`, and `terminating`;
- `endpoints[].hostname`: the endpoint label used for service-scoped DNS names when present;
- `endpoints[].targetRef`: the Pod name and UID for Pod-backed endpoints;
- `metadata.labels.kubernetes.io/service-name`: the Service association.

For a concise view that remains readable on small Services:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=store-peers \
  -o 'custom-columns=SLICE:.metadata.name,FAMILY:.addressType,PORT:.ports[*].port,ADDRESSES:.endpoints[*].addresses[*],HOSTNAMES:.endpoints[*].hostname,READY:.endpoints[*].conditions.ready'
~~~

Use YAML or JSON for final diagnosis because custom columns flatten arrays and can obscure which condition belongs to which address.

## Compare API Membership with DNS Membership

Create a diagnostic Pod that uses the cluster's normal DNS policy:

~~~bash
kubectl -n data run dnsutils \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.53 \
  --restart=Never

kubectl -n data wait --for=condition=Ready pod/dnsutils --timeout=60s
kubectl -n data exec dnsutils -- cat /etc/resolv.conf
~~~

Query the absolute Service FQDN with a trailing dot:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +noall +answer store-peers.data.svc.cluster.local. A

kubectl -n data exec dnsutils -- \
  dig +noall +answer store-peers.data.svc.cluster.local. AAAA
~~~

Replace `cluster.local` with the configured cluster domain. An A answer should correspond to ready IPv4 endpoints; an AAAA answer should correspond to ready IPv6 endpoints. DNS order is not Kubernetes scheduling order, StatefulSet ordinal order, or an application health ranking.

To see status, authority, and timing rather than only answers, remove `+noall +answer`:

~~~bash
kubectl -n data exec dnsutils -- \
  dig store-peers.data.svc.cluster.local. A
~~~

`NXDOMAIN`, `NOERROR` with an empty answer, and `SERVFAIL` are different signals. Their exact use can depend on the DNS implementation and CoreDNS plugin configuration. `SERVFAIL` often points toward an unsynchronized or unhealthy DNS backend rather than an empty Service.

## Verify One Endpoint Name and the SRV Set

For a StatefulSet named `store` whose `serviceName` is `store-peers`, test an ordinal:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +noall +answer \
  store-0.store-peers.data.svc.cluster.local. A
~~~

Then query a named Service port:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +noall +answer \
  _peer._tcp.store-peers.data.svc.cluster.local. SRV
~~~

The SRV query exists only when the Service port is named. For a headless Service, answers should contain the endpoint targets and advertised port. If the Service-wide A record works but the ordinal record does not, check the StatefulSet `spec.serviceName`, endpoint `hostname`, namespace, and readiness. If A works but SRV does not, check the Service port name and protocol plus the EndpointSlice port.

## Interpret Readiness Carefully

EndpointSlice defines three conditions:

- `serving`: the endpoint currently serves responses;
- `terminating`: the endpoint has begun termination;
- `ready`: effectively serving and not terminating for normal consumers.

For Services with `publishNotReadyAddresses: true`, Kubernetes-generated EndpointSlices report `ready: true` even if the Pod's readiness condition is false. Therefore always compare both objects when debugging bootstrap:

~~~bash
kubectl -n data get service store-peers \
  -o jsonpath='{.spec.publishNotReadyAddresses}{"\n"}'

kubectl -n data get pods \
  -l app.kubernetes.io/name=store \
  -o 'custom-columns=NAME:.metadata.name,POD-READY:.status.conditions[?(@.type=="Ready")].status'
~~~

Endpoint membership and application health are not interchangeable.

## Diagnose Common Mismatches

### Pod exists, but no EndpointSlice address

Check selector labels and Pod IP assignment:

~~~bash
kubectl -n data get service store-peers -o jsonpath='{.spec.selector}{"\n"}'
kubectl -n data get pod store-0 --show-labels -o wide
~~~

For a selectorless Service, the control plane intentionally creates no slices. A human or external controller must create same-namespace EndpointSlices with the `kubernetes.io/service-name` label.

### Endpoint is present, but DNS omits it

Check `conditions.ready`, `publishNotReadyAddresses`, `addressType`, and the actual query type. An IPv6 endpoint belongs in an IPv6 slice and answers AAAA, not A.

### EndpointSlices look correct, but every lookup fails

Test the built-in Kubernetes Service and inspect CoreDNS:

~~~bash
kubectl -n data exec dnsutils -- nslookup kubernetes.default

kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system get configmap coredns -o yaml
kubectl describe clusterrole system:coredns
~~~

The standard `system:coredns` ClusterRole grants list/watch permission for Services, Endpoints, EndpointSlices, Pods, and namespaces. The CoreDNS `kubernetes` plugin's `noendpoints` option deliberately disables endpoint and headless-Service answers. A restricted `namespaces` or label configuration can also hide records.

### A fixed record does not appear immediately

Inspect the TTL in `dig` output and retry after it expires. A negative response made before a Pod existed can also be cached. Avoid tight polling; use backoff, and watch EndpointSlices through the Kubernetes API when immediate membership updates are a hard requirement.

Clean up the test Pod:

~~~bash
kubectl -n data delete pod dnsutils
~~~

## Official Documentation

- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Debugging Kubernetes DNS resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)

## Conclusion

Treat EndpointSlices as the API-side membership record and `dig` as the client-side observation. Join every slice carrying the Service association label, correlate addresses and readiness with Pods, then compare A, AAAA, endpoint-specific, and SRV answers. That sequence isolates selection, readiness, port, DNS, and cache failures instead of treating every empty lookup as the same problem.
