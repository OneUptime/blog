# How to Avoid StatefulSet Bootstrap Deadlocks with Peer DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Headless Service, Readiness Probe, Peer Discovery, DNS

Description: Break the circular dependency between StatefulSet peer discovery and readiness without exposing booting members to normal clients.

---

A stateful cluster can deadlock when its readiness rule and peer discovery depend on each other:

1. a new Pod waits to discover and contact its peers before reporting ready;
2. the headless Service normally publishes only ready endpoint addresses;
3. cluster DNS therefore withholds the new Pod's peer record;
4. peers cannot discover it, so the join condition never completes;
5. the Pod never becomes ready.

The default StatefulSet creation order can add a second loop. `OrderedReady` creates `store-0` first and waits for it to become ready before creating `store-1`. If `store-0` insists on seeing all three planned members, the missing peers do not merely lack DNS records-they do not exist yet.

Solve the two loops separately: make pre-readiness addresses discoverable, and choose a Pod management policy compatible with the application's bootstrap protocol.

## Publish Bootstrap Addresses Before Readiness

Set `publishNotReadyAddresses: true` on the governing headless Service used for peer discovery:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: store-peers
  namespace: data
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    app.kubernetes.io/name: store
  ports:
    - name: peer
      protocol: TCP
      port: 8080
      targetPort: peer
~~~

The Service API defines peer discovery for a StatefulSet as the primary use case for this field. Kubernetes controllers treat the selected endpoints as ready for consumers of generated Endpoints and EndpointSlices even while the Pods themselves have not passed readiness. CoreDNS can therefore publish names such as:

~~~text
store-0.store-peers.data.svc.<cluster-domain>
store-1.store-peers.data.svc.<cluster-domain>
store-2.store-peers.data.svc.<cluster-domain>
~~~

This does not alter the Pod's `Ready` condition, make the process healthy, or wait for its peer port to listen. Discovery clients still need bounded DNS retries, connection timeouts, and application-level join retries.

## Keep Client Traffic Readiness-Gated

`publishNotReadyAddresses` affects every agent that consumes the Service's endpoints, not just DNS. Do not use that peer Service as the general client entry point unless the application safely rejects or queues traffic during bootstrap.

Create a second, ordinary Service with the default readiness behavior:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: store-client
  namespace: data
spec:
  selector:
    app.kubernetes.io/name: store
  ports:
    - name: client
      protocol: TCP
      port: 8080
      targetPort: peer
~~~

The two Services select the same Pods but serve different contracts:

| Service | ClusterIP | Publishes unready Pods | Intended consumer |
| --- | --- | --- | --- |
| `store-peers` | None | Yes | Internal bootstrap and peer protocol |
| `store-client` | Allocated | No | Normal clients and Ingress/Gateway |

This split prevents a DNS fix for bootstrap from silently weakening client readiness.

## Choose `OrderedReady` or `Parallel` Deliberately

StatefulSet defaults to `OrderedReady`. That is appropriate when ordinal 0 can bootstrap alone and later members join one at a time. Configure the first member as an initial seed, let its local service become ready without requiring absent replicas, and allow subsequent members to contact it.

If the application genuinely needs all planned members to start before any member can become ready, use `Parallel`:

~~~yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: store
  namespace: data
spec:
  serviceName: store-peers
  podManagementPolicy: Parallel
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: store
  template:
    metadata:
      labels:
        app.kubernetes.io/name: store
    spec:
      containers:
        - name: store
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          args:
            - netexec
            - --http-port=8080
          ports:
            - name: peer
              containerPort: 8080
          startupProbe:
            tcpSocket:
              port: peer
            periodSeconds: 2
            failureThreshold: 60
          readinessProbe:
            tcpSocket:
              port: peer
            periodSeconds: 5
            failureThreshold: 3
~~~

The example reuses one concrete listener for both discovery and probe mechanics. Use the distinct peer and client ports and application-aware probes documented by your software. `Parallel` tells the StatefulSet controller not to wait for one Pod to become Running and Ready before launching the next. It preserves ordinal identities, but it removes ordered creation and deletion, so use it only when the application supports concurrent member startup and shutdown.

Changing only `publishNotReadyAddresses` cannot help `store-0` discover `store-1` when `OrderedReady` has not created `store-1`. Changing only `podManagementPolicy` creates all Pods, but the default headless Service can still hide their records until readiness. Applications that require all peers before readiness often need both settings.

## Design Probes Around Local Health

Readiness should answer whether this Pod can safely receive its intended traffic. It should not require every remote peer to be reachable indefinitely. If loss of one peer makes every member unready, a transient network partition can remove the entire cluster from the client Service and make recovery harder.

A safer separation is:

- `startupProbe`: allow enough time for local initialization, recovery, and first cluster join;
- `readinessProbe`: check the local client listener and whether this member can currently serve requests;
- `livenessProbe`: detect a locally stuck process, not temporary loss of quorum or DNS;
- application metrics: report peer count, quorum state, leader state, and replication lag.

The correct semantics depend on the database or consensus system. Follow its operator documentation when it provides health endpoints designed for Kubernetes.

## Build Peer Names Without a Discovery Race

StatefulSet supplies predictable ordinal hostnames. For three replicas, bootstrap configuration can construct the complete peer list from known inputs:

~~~text
store-0.store-peers.data.svc.<cluster-domain>:8080
store-1.store-peers.data.svc.<cluster-domain>:8080
store-2.store-peers.data.svc.<cluster-domain>:8080
~~~

Use the actual cluster domain, and make the replica count or initial member list explicit configuration. Do not enumerate one DNS response once and assume it is permanent; rolling updates, scaling, and address changes alter the set.

Even with early publication, DNS can briefly return a cached negative result when a name was queried before its Pod existed. Retry with backoff and jitter. Kubernetes StatefulSet documentation recommends watching the API when discovery must react immediately; changing cluster-wide DNS cache policy is an operator decision, not an application bootstrap shortcut.

## Verify Which Loop Is Blocking

Check creation, readiness, EndpointSlices, and DNS in that order:

~~~bash
kubectl -n data get statefulset store -o yaml

kubectl -n data get pods \
  -l app.kubernetes.io/name=store \
  -o 'custom-columns=NAME:.metadata.name,PHASE:.status.phase,READY:.status.conditions[?(@.type=="Ready")].status,IP:.status.podIP'

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=store-peers \
  -o yaml

dig +noall +answer \
  store-1.store-peers.data.svc.cluster.local. A
~~~

If only ordinal 0 exists, inspect `podManagementPolicy` and the readiness rule that blocks ordered creation. If all Pods exist but names are absent, verify the governing Service name, selector, and `publishNotReadyAddresses`. With that field set, do not mistake EndpointSlice `ready: true` for the Pod readiness probe succeeding-the field deliberately makes endpoint consumers disregard the distinction.

## Official Documentation

- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [StatefulSet Pod management policies](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#pod-management-policies)
- [Kubernetes Service API `publishNotReadyAddresses`](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
- [Kubernetes container probes](https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/)

## Conclusion

Break StatefulSet bootstrap deadlocks at both boundaries. Publish unready addresses on a dedicated peer-discovery headless Service, and use `Parallel` only when all replicas must be launched together. Keep client routing readiness-gated, make probes reflect local serving ability, and make peer code tolerant of DNS propagation and connection races.
