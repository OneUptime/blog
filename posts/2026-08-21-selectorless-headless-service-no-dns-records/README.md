# Why Selectorless Headless Services Have No DNS Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, EndpointSlice, CoreDNS, Service Discovery, DNS

Description: Diagnose an empty selectorless headless Service and publish its addresses correctly with a manually managed EndpointSlice.

---

A selectorless headless Service is only a name and a port contract. Kubernetes cannot infer its backends because there is no selector, and a headless Service has no virtual IP of its own. Until something creates a correctly linked EndpointSlice containing usable endpoint addresses, the Service has no A or AAAA answers to publish.

This is the key contrast:

- a Service **with** a selector causes the control plane to create and maintain EndpointSlices for matching Pods;
- a Service **without** a selector expects you or another controller to create and maintain those EndpointSlices;
- `clusterIP: None` tells Kubernetes not to allocate a ClusterIP. It does not turn addresses written elsewhere into Service endpoints automatically.

## Create the Service and EndpointSlice Together

Assuming the `data` namespace already exists and the cluster domain is `cluster.local`, the following example publishes two IPv4 backends under `database.data.svc.cluster.local`. It uses the same port number for `port` and `targetPort`, as Kubernetes requires for a selectorless headless Service.

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: data
spec:
  clusterIP: None
  ports:
    - name: postgres
      protocol: TCP
      port: 5432
      targetPort: 5432
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: database-ipv4-1
  namespace: data
  labels:
    kubernetes.io/service-name: database
    endpointslice.kubernetes.io/managed-by: platform-example-manual
addressType: IPv4
ports:
  - name: postgres
    protocol: TCP
    port: 5432
endpoints:
  - addresses:
      - 10.20.30.41
    conditions:
      ready: true
    hostname: database-a
  - addresses:
      - 10.20.30.42
    conditions:
      ready: true
    hostname: database-b
~~~

The `kubernetes.io/service-name: database` label is the actual association between the slice and the Service. Similar-looking labels such as `app: database`, a matching object name, or an owner reference by itself do not make the slice a backend for that Service. The Service and EndpointSlice must also be in the same namespace.

Use a distinct `endpointslice.kubernetes.io/managed-by` value that identifies the real owner. Do not claim the reserved control-plane manager identity for a manually maintained slice. In production, a controller should reconcile changing external addresses rather than leaving a hand-edited object to drift.

## Understand the Three Port Fields

The fields serve related but different purposes:

- `Service.spec.ports[].port` declares the port in the Service contract. Its name and protocol define the named-port SRV query;
- `Service.spec.ports[].targetPort` is ignored when `clusterIP: None`. For a headless Service without a selector, omit it or set it equal to `port`;
- `EndpointSlice.ports[].port` is the concrete port offered by the endpoints in that slice. CoreDNS uses the matching endpoint port in each headless SRV answer.

Keep the port names and protocols aligned as well. In the example, every layer describes a TCP port named `postgres` on `5432`. A different EndpointSlice port name or protocol prevents the corresponding SRV match and can break other port-aware consumers. An incorrect endpoint port number advertises that incorrect number in the SRV answer. These port mismatches do not suppress the Service's A or AAAA records, which depend on endpoint addresses and readiness.

If the Service has several ports, give every Service port a unique name and represent each corresponding endpoint port accurately. EndpointSlices group endpoints by address family, protocol, and port combination, so a Service can legitimately have more than one slice.

## Use Valid Endpoint Addresses

`addressType` applies to every address in one EndpointSlice. Put IPv4 and IPv6 addresses in separate slices:

~~~yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: database-ipv6-1
  namespace: data
  labels:
    kubernetes.io/service-name: database
    endpointslice.kubernetes.io/managed-by: platform-example-manual
addressType: IPv6
ports:
  - name: postgres
    protocol: TCP
    port: 5432
endpoints:
  - addresses:
      - 2001:db8:20::41
    conditions:
      ready: true
    hostname: database-a-v6
~~~

The documentation address above is intentionally illustrative. Use addresses routable from your cluster. Kubernetes rejects or does not support several unsafe endpoint choices: loopback and link-local addresses are not valid Service endpoints, and a ClusterIP belonging to another Service cannot be used as an endpoint destination. EndpointSlice `addressType: FQDN` is deprecated and has no defined proxying semantics; use `ExternalName` when the intended abstraction is a DNS alias, or use IP endpoints that the cluster can actually reach.

## Check Readiness Before Blaming DNS

Headless DNS publishes endpoint addresses whose `conditions.ready` value is true; an omitted value is interpreted as true. Kubernetes-managed slices mark endpoints ready when the Service sets `publishNotReadyAddresses: true`, and a custom slice manager must honor that Service contract itself. With the Service shown here, a slice containing only endpoints with `conditions.ready: false` will not provide the expected Service answers.

For a manually managed endpoint, update readiness to reflect whether the backend should receive traffic:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=database \
  -o yaml
~~~

Do not set `ready: true` merely to make a DNS test pass. DNS publication makes the address discoverable; it does not test the database listener, network route, TLS identity, or application health.

## Query the Exact Records

From a Pod using cluster DNS, query the Service and its named port. Replace `cluster.local` if your cluster uses a different cluster domain:

~~~bash
dig +noall +answer database.data.svc.cluster.local. A
dig +noall +answer database.data.svc.cluster.local. AAAA
dig +noall +answer \
  _postgres._tcp.database.data.svc.cluster.local. SRV
~~~

The A query should return the IPv4 endpoint addresses and the AAAA query should return the IPv6 endpoint addresses, if corresponding ready slices exist. The SRV answers identify the named port and endpoint-specific target names. DNS answer order is not a health or priority signal.

If there is still no answer, inspect the chain rather than recreating the Service:

~~~bash
kubectl -n data get service database -o yaml

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=database \
  -o 'custom-columns=SLICE:.metadata.name,FAMILY:.addressType,PORTS:.ports[*].port,ADDRESSES:.endpoints[*].addresses[*],READY:.endpoints[*].conditions.ready'

kubectl -n kube-system get configmap coredns -o yaml
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=100
~~~

Check the namespace, association label, `addressType`, endpoint readiness, address validity, Service `port`/`targetPort` equality, and EndpointSlice port. Also allow for DNS cache TTLs after fixing an earlier empty answer. For this lookup, CoreDNS must be able to list and watch Services, namespaces, and EndpointSlices. The standard `system:coredns` ClusterRole also grants access to Pods and legacy Endpoints; Pod access is needed by features such as `pods verified`. Missing EndpointSlice RBAC can cause resolution failures across many Services.

## Official Documentation

- [Kubernetes Services, custom EndpointSlices, and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [Debugging Kubernetes DNS resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)

## Conclusion

A selectorless headless Service does not discover anything by itself. Publish backends through same-namespace EndpointSlices carrying the exact `kubernetes.io/service-name` label, valid same-family addresses, ready conditions, and ports that agree with the Service. Once that API data is correct, cluster DNS can turn the headless Service name into the endpoint addresses.
