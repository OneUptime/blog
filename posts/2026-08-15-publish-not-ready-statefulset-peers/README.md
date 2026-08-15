# Publish StatefulSet Peers Before They Are Ready

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Headless Service, publishNotReadyAddresses, Bootstrap, EndpointSlice

Description: Use a dedicated headless Service to publish StatefulSet peer DNS before readiness without exposing ordinary clients too early.

---

Some stateful systems cannot become ready until they discover enough peers to form a quorum or join a cluster. Kubernetes normally publishes ready endpoints in Service DNS, so a peer that waits for DNS before becoming ready can create a bootstrap deadlock.

Set `publishNotReadyAddresses: true` on a dedicated headless peer Service to break that cycle. The setting changes discovery visibility; it does not prove that a peer is accepting connections or safe for client traffic.

## Create a Bootstrap-Only Headless Service

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

Point the StatefulSet at that governing Service:

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
      terminationGracePeriodSeconds: 60
      containers:
        - name: ledger
          image: example.invalid/ledger:1.0.0
          args:
            - --peer-port=7000
            - --seed=ledger-0.ledger-peers.data.svc.cluster.local:7000
            - --seed=ledger-1.ledger-peers.data.svc.cluster.local:7000
            - --seed=ledger-2.ledger-peers.data.svc.cluster.local:7000
          ports:
            - name: peer
              containerPort: 7000
          readinessProbe:
            exec:
              command: ["/opt/ledger/bin/is-ready"]
            periodSeconds: 5
            failureThreshold: 6
~~~

The image and readiness command are placeholders for the system you operate. The important relationship is `serviceName: ledger-peers`, matching labels, a named peer port, and early publication on the governing Service.

## Understand What the Field Changes

For a normal selector-backed Service, the EndpointSlice controller tracks Pod readiness. An endpoint is generally ready when it is serving and not terminating.

For a Service with `publishNotReadyAddresses: true`, Kubernetes controllers treat all of that Service's endpoints as ready even when the Pods themselves are not. This allows DNS implementations to publish the addresses. The EndpointSlice `serving` condition still represents whether a Pod-backed endpoint's Pod is actually Ready, and `terminating` still reports termination.

That difference matters:

~~~text
ready=true      can be forced by publishNotReadyAddresses
serving=false   can still reveal that the Pod is not Ready
terminating=true still reveals that deletion has started
~~~

Do not treat DNS presence or EndpointSlice `ready: true` as application readiness for this Service.

## Verify Early Publication

Watch Pods and slices while the cluster starts:

~~~bash
kubectl -n data get pods -w
~~~

In another terminal:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-peers \
  -o jsonpath='{range .items[*].endpoints[*]}{.targetRef.name}{"\t"}{.addresses[*]}{"\tready="}{.conditions.ready}{"\tserving="}{.conditions.serving}{"\tterminating="}{.conditions.terminating}{"\n"}{end}'
~~~

And from a cluster-DNS Pod:

~~~bash
dig +noall +answer ledger-peers.data.svc.cluster.local. A
dig +noall +answer ledger-0.ledger-peers.data.svc.cluster.local. A
dig +noall +answer _peer._tcp.ledger-peers.data.svc.cluster.local. SRV
~~~

The address can appear before the readiness probe succeeds. DNS caching and CoreDNS watch propagation mean this is not an instantaneous scheduling guarantee, so bootstrap code still needs retries.

## Keep Client Traffic on a Different Service

`publishNotReadyAddresses` is not a DNS-only switch. Agents that consume endpoints for the Service are told to disregard ready and not-ready distinctions. Applying it to a general client Service can send traffic to a process that is restoring data, waiting for quorum, or shutting down.

Use a second readiness-gated Service for clients:

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

Peers use `ledger-*.ledger-peers.data.svc.cluster.local`. Ordinary clients use `ledger-client.data.svc.cluster.local` and receive the behavior of a normal ClusterIP Service backed by ready endpoints.

## Design Bootstrap to Tolerate Partial Availability

Early DNS publication only supplies candidates. A robust peer should:

1. resolve the complete peer set;
2. connect with a short timeout;
3. tolerate `connection refused`, timeout, and incomplete membership;
4. retry with bounded exponential backoff and jitter;
5. authenticate the remote peer;
6. become Ready only after its application-specific join condition succeeds.

Avoid making readiness depend on every replica being reachable forever. During an ordinary rolling update, at least one peer will be absent or restarting. Define the minimum safe condition, such as local recovery complete and quorum communication available.

If peers have fixed ordinal seeds, account for the StatefulSet replica count and any nonzero `.spec.ordinals.start`. Do not endlessly retry a Pod name that the desired StatefulSet will never create.

## Protect the Early Peer Endpoint

An unready process is now network-discoverable. Treat the peer port as a privileged control surface:

- use mutual authentication or another strong peer identity mechanism;
- apply NetworkPolicy where the cluster network plugin enforces it;
- expose only the peer port on the headless Service;
- reject client protocol traffic on the peer listener;
- make bootstrap operations idempotent;
- rate-limit join attempts and log rejected identities.

Readiness is a traffic signal, not a security boundary. Publishing an address early must not grant trust.

## Know When Not to Use It

Do not enable early publication merely to hide a slow or incorrect readiness probe. Keep the default behavior when each replica can initialize independently or when clients must never observe an unready address.

If discovery must be immediate and strongly ordered, DNS may be the wrong control plane. Kubernetes documentation recommends watching the API directly when newly created StatefulSet Pods must be discovered faster than DNS and negative caches can converge.

## Official Documentation

- [Kubernetes Service API publishNotReadyAddresses field](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
- [Kubernetes DNS readiness behavior](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes readiness probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/#readiness-probe)

## Conclusion

Use `publishNotReadyAddresses` when peer discovery is itself a prerequisite for readiness. Put it on a dedicated governing headless Service, treat the returned addresses as connection candidates rather than healthy backends, and keep ordinary client traffic on a separate readiness-gated Service.
