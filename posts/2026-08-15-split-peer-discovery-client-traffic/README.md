# Split Stateful Peer Discovery from Client Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Headless Service, ClusterIP Service, Peer Discovery, Readiness

Description: Pair a headless governing Service with a ClusterIP client Service so peer identity and client routing follow different health rules.

---

A stateful workload often needs two incompatible networking behaviors:

- peers need stable, individual DNS identities and may need discovery before readiness;
- clients need one stable front door that sends new connections only to ready backends.

Use two Services over the same Pods. A headless governing Service owns peer identity, while a normal ClusterIP Service fronts client traffic.

## Define Both Services

The peer Service is headless and publishes early for bootstrap:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: ledger-peers
  namespace: data
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    app.kubernetes.io/name: ledger
  ports:
    - name: peer
      protocol: TCP
      port: 7000
      targetPort: peer
~~~

The client Service receives a ClusterIP and keeps the default readiness behavior:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: ledger-client
  namespace: data
spec:
  selector:
    app.kubernetes.io/name: ledger
  ports:
    - name: client
      protocol: TCP
      port: 8080
      targetPort: client
~~~

Both selectors intentionally match the same Pod set. The Services publish different ports and apply different endpoint-readiness semantics.

## Govern the StatefulSet with the Peer Service

`StatefulSet.spec.serviceName` must name the headless Service, not the client Service:

~~~yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ledger
  namespace: data
spec:
  serviceName: ledger-peers
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
          image: example.invalid/ledger:1.0.0
          ports:
            - name: peer
              containerPort: 7000
            - name: client
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: client
            periodSeconds: 5
            failureThreshold: 3
~~~

Replace the image and probe with the application you operate. Readiness should mean that this replica can safely receive client work, not merely that its process exists.

The resulting names have distinct purposes:

| Name | Resolves to | Intended consumer |
| --- | --- | --- |
| `ledger-0.ledger-peers.data.svc.cluster.local` | one current Pod IP | peer protocol and member identity |
| `ledger-peers.data.svc.cluster.local` | peer Pod IP set, including unready addresses here | bootstrap discovery |
| `ledger-client.data.svc.cluster.local` | one Service ClusterIP | ordinary clients |

The platform proxies traffic sent to the ClusterIP and selects eligible endpoints. It does not proxy traffic sent directly to a headless-Service Pod IP.

## Verify the Separation

Inspect Service allocation:

~~~bash
kubectl -n data get services ledger-peers ledger-client -o wide
~~~

Expected shape:

~~~text
NAME            TYPE        CLUSTER-IP
ledger-peers    ClusterIP   None
ledger-client   ClusterIP   10.x.y.z
~~~

Compare DNS:

~~~bash
dig +noall +answer ledger-peers.data.svc.cluster.local. A
dig +noall +answer ledger-client.data.svc.cluster.local. A
dig +noall +answer ledger-0.ledger-peers.data.svc.cluster.local. A
~~~

Then compare EndpointSlices by Service label:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-peers -o yaml

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-client -o yaml
~~~

Kubernetes creates separate slices because each Service is a separate discovery contract. With early peer publication, a Pod that is not application-ready can appear ready in the peer Service's slice while remaining not ready in the client Service's slice.

## Keep Protocols on Their Intended Names

Configure peers with individual identities:

~~~text
ledger-0.ledger-peers.data.svc.cluster.local:7000
ledger-1.ledger-peers.data.svc.cluster.local:7000
ledger-2.ledger-peers.data.svc.cluster.local:7000
~~~

Configure ordinary clients with the front door:

~~~text
ledger-client.data.svc.cluster.local:8080
~~~

Do not give general clients the peer RRset merely because it contains the same Pods. It can include unready or terminating addresses, exposes member topology, and moves retry and balancing behavior into every client.

Likewise, do not configure the peer protocol with only the ClusterIP when the distributed system requires durable member names or ordinal identity. The virtual IP deliberately hides which Pod accepted a connection.

## Model Roles Explicitly

The two-Service pattern does not know which replica is a leader, writer, follower, or read-only member. If clients need role-aware routing, update labels through a controller designed for that application and use additional Services with narrow selectors.

Be careful with rapidly changing role labels. Service and EndpointSlice propagation is asynchronous, and DNS or connection caches can outlive a role transition. The application protocol must still reject unsafe operations on the wrong role and redirect or retry safely.

## Apply Security to Both Paths

The peer and client ports have different trust models. Use distinct listeners and credentials where possible:

- authenticate peer identities independently from client identities;
- restrict peer-port ingress with NetworkPolicy if supported by the CNI;
- avoid exposing the peer Service outside the cluster;
- publish only the necessary port on each Service;
- enforce authorization in the application even when network policy is present.

`publishNotReadyAddresses` makes early peer addresses discoverable, so it must not be treated as an authentication mechanism.

## Understand Connection-Level Behavior

A ClusterIP Service gives the platform an opportunity to select a ready endpoint for a new connection. It does not guarantee that every HTTP request uses a different Pod. HTTP keep-alive, HTTP/2, gRPC, and database pools can keep many requests on one connection.

Clients still need timeouts, retry safety, and sensible pool rotation. The difference is that the normal Service centralizes endpoint eligibility and proxy selection, while the headless peer Service deliberately exposes individual addresses.

## Roll Out Without Mixing Health Contracts

During a rollout:

1. the replacement Pod obtains its stable ordinal identity through `ledger-peers`;
2. peer bootstrap can begin before readiness because that Service publishes unready addresses;
3. the Pod joins, restores state, and eventually passes readiness;
4. its `ledger-client` endpoint becomes eligible for client traffic;
5. on deletion, the client endpoint becomes not ready while peer-level shutdown can drain within the termination grace period.

Monitor each Service separately. A healthy peer-discovery RRset does not prove that the client Service has enough ready capacity.

## Official Documentation

- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes Service virtual IPs and proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

## Conclusion

Give peer discovery and client traffic separate Service contracts. The governing headless Service preserves ordinal identity and can publish bootstrap candidates early. The ClusterIP Service provides a readiness-gated client address and platform endpoint selection. Keeping those paths distinct prevents bootstrap requirements from weakening client health guarantees.
