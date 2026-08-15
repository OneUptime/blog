# Resolve One StatefulSet Pod by Its Stable Service DNS Name

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Headless Service, Stable DNS, CoreDNS, Pod Identity

Description: Configure a StatefulSet governing Service and resolve one ordinal Pod by its stable in-cluster DNS name.

---

A StatefulSet Pod gets a stable DNS name only when its StatefulSet names a governing headless Service. The complete name is:

~~~text
<statefulset>-<ordinal>.<service>.<namespace>.svc.<cluster-domain>
~~~

For a Pod named `ledger-0`, a Service named `peers`, the `data` namespace, and the usual cluster domain, that is:

~~~text
ledger-0.peers.data.svc.cluster.local
~~~

`<pod>.<service>.<namespace>.svc` is a useful partially qualified form inside a cluster, but it is not the full DNS name because the cluster domain is still appended by the resolver.

## Connect the StatefulSet to Its Governing Service

The Service name and `StatefulSet.spec.serviceName` must match:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: peers
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: ledger
  ports:
    - name: http
      port: 80
      targetPort: http
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ledger
  namespace: data
spec:
  serviceName: peers
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: ledger
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ledger
    spec:
      containers:
        - name: ledger
          image: nginx:1.29-alpine
          ports:
            - name: http
              containerPort: 80
          readinessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 5
            failureThreshold: 3
~~~

The example uses nginx only to provide a concrete ready endpoint. A real peer process should expose its own peer port, so align the Service's `targetPort`, the named container port, and the application's listener.

The StatefulSet controller names the Pods `ledger-0`, `ledger-1`, and `ledger-2`. It assigns each Pod a hostname derived from that name and a subdomain derived from `serviceName`. The headless Service supplies the governing DNS domain.

## Resolve the Absolute Name

Run the query from a Pod configured to use cluster DNS:

~~~bash
kubectl -n data run dns-tools --rm -it --restart=Never \
  --image=registry.k8s.io/e2e-test-images/dnsutils:1.3 \
  --command -- \
  dig +noall +answer ledger-0.peers.data.svc.cluster.local. A
~~~

On an IPv6 or dual-stack cluster, also query `AAAA`:

~~~bash
dig +noall +answer ledger-0.peers.data.svc.cluster.local. AAAA
~~~

The answer is the current Pod IP, not a permanent IP allocation. When Kubernetes replaces `ledger-0`, the StatefulSet preserves the Pod identity and storage association, but the Pod IP can change. DNS is what keeps the name stable.

From another Pod in `data`, these shorter forms normally work through the resolver search list:

~~~bash
dig +search ledger-0.peers
dig +search ledger-0.peers.data.svc
~~~

Use the absolute name with a trailing dot for diagnostics and configuration that should not depend on a search path.

## Verify Each Link in the Name

Check the names and selected endpoints directly:

~~~bash
kubectl -n data get statefulset ledger \
  -o jsonpath='{.spec.serviceName}{"\n"}'

kubectl -n data get pods \
  -l app.kubernetes.io/name=ledger \
  -o 'custom-columns=NAME:.metadata.name,IP:.status.podIP,READY:.status.conditions[?(@.type=="Ready")].status'

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=peers \
  -o yaml
~~~

The EndpointSlice endpoint for `ledger-0` should have its Pod reference, address, and hostname. Do not expect the EndpointSlice resource itself to have a predictable name. A Service can own several slices, so always select them by `kubernetes.io/service-name`.

## Account for Readiness

Kubernetes normally publishes a Pod's service-scoped record only when the Pod is ready. A newly created `ledger-0` can therefore exist while its DNS lookup still has no address.

For systems that must discover peers before readiness, set this only on the peer-discovery Service:

~~~yaml
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    app.kubernetes.io/name: ledger
~~~

This makes unready addresses discoverable; it does not make the peer process ready. Bootstrap code still needs bounded retries, connection timeouts, and an application-level join protocol. General clients should use a separate readiness-gated Service.

## Do Not Assume the Cluster Domain

`cluster.local` is conventional, not mandatory. Inspect a Pod's search domains:

~~~bash
kubectl -n data exec ledger-0 -- cat /etc/resolv.conf
~~~

For a search entry such as `data.svc.corp.internal`, the Service domain is `peers.data.svc.corp.internal`, and the Pod name is `ledger-0.peers.data.svc.corp.internal`.

Do not derive the domain by blindly taking the last two labels of a search entry. Cluster operators can configure several search domains. Supply the cluster domain as deployment configuration when software must construct absolute names.

## Diagnose a Missing Pod Record

If the Service name resolves but `ledger-0.peers...` does not, check:

- `spec.serviceName` exactly matches the headless Service name;
- the Service selector matches the StatefulSet template labels;
- both resources share a namespace;
- the Pod has an IP and its endpoint has a hostname;
- the endpoint is ready, or peer discovery deliberately publishes unready addresses;
- the query uses the real cluster domain and reaches cluster DNS;
- an earlier `NXDOMAIN` response is not still held in a negative cache.

Kubernetes documentation specifically warns that a lookup made before a StatefulSet Pod exists can be negatively cached after the Pod starts. For immediate discovery, watch the Kubernetes API or tune DNS caching with care instead of polling DNS at high frequency.

## Official Documentation

- [Kubernetes StatefulSets and stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [StatefulSet basics tutorial](https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

A StatefulSet ordinal becomes a stable service-scoped DNS identity only when `spec.serviceName` points to the correct headless Service. Build the full name from Pod, Service, namespace, `svc`, and the configured cluster domain, then account for readiness and negative caching when a newly created peer does not resolve immediately.
