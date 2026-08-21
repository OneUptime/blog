# How Named Ports Produce Headless Service SRV Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, SRV Records, DNS, CoreDNS, Named Ports

Description: Separate address discovery from port discovery and configure named headless Service ports that generate useful DNS SRV records.

---

A headless Service does not need a port merely to publish its ready endpoint IPs as A or AAAA records. Kubernetes' own Indexed Job DNS example uses a selector-based headless Service with no `ports` list. Address discovery and port discovery are separate:

- the Service name publishes A and/or AAAA records for ready endpoint addresses;
- a **named** Service port publishes an SRV record that tells clients both a port number and one or more endpoint target names;
- an unnamed port can carry traffic, but it has no SRV owner name to query.

Define ports when the Service is part of a real connection contract, when an Ingress or another Kubernetes object references a Service port, or when clients should discover the port through SRV.

## Address-Only Discovery Can Omit Ports

This Service selects Pods and publishes their ready addresses:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: workers
  namespace: batch
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: worker
~~~

From a cluster DNS client:

~~~bash
dig +noall +answer workers.batch.svc.cluster.local. A
dig +noall +answer workers.batch.svc.cluster.local. AAAA
~~~

The absence of `spec.ports` does not suppress these address records. It does mean there is no named Service port from which DNS can construct an SRV query, and objects that require a Service port reference have nothing to select.

## Name a Port to Create SRV Records

The SRV owner name follows this form:

~~~text
_<port-name>._<protocol>.<service>.<namespace>.svc.<cluster-domain>
~~~

For a TCP peer port named `raft`, create the Service like this:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: store-peers
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: store
  ports:
    - name: raft
      protocol: TCP
      port: 7000
      targetPort: raft
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: store
  namespace: data
spec:
  serviceName: store-peers
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
            - --http-port=7000
          ports:
            - name: raft
              containerPort: 7000
          readinessProbe:
            tcpSocket:
              port: raft
            periodSeconds: 5
~~~

Query the named port:

~~~bash
dig +noall +answer \
  _raft._tcp.store-peers.data.svc.cluster.local. SRV
~~~

A headless Service returns multiple SRV answers, one for each published endpoint. Each answer contains priority, weight, port, and an endpoint-specific target such as:

~~~text
store-0.store-peers.data.svc.cluster.local.
~~~

The DNS discovery specification does not prescribe particular priority and weight values, so clients should parse them according to SRV semantics instead of assuming literal values. It may also include target A or AAAA records in the DNS response's additional section.

## Keep `port`, `targetPort`, and the Container Port Straight

In the StatefulSet example:

- Service `port: 7000` is the Service-facing port in the API contract;
- Service `targetPort: raft` resolves the backend port by the named container port;
- container `containerPort: 7000` named `raft` describes where the process listens;
- EndpointSlice `ports[].port` contains the resolved endpoint port, which current CoreDNS uses in a headless-Service SRV answer.

Named `targetPort` values are useful because the container's numeric port can change without changing the Service port name used by clients. During a rollout, Pods can even resolve the same named target port to different numbers; Kubernetes may create separate EndpointSlices because a slice has one port set shared by all its endpoints. Current CoreDNS reads those slice ports for headless SRV records, whereas a regular ClusterIP Service SRV record uses the Service port.

The published Kubernetes DNS discovery specification describes the headless SRV port in terms of the named Service port, while the current CoreDNS implementation reads the resolved EndpointSlice port. For the clearest and most portable peer-discovery contract, many stateful systems therefore keep the Service port and endpoint port equal. If they differ, verify the SRV answer from the DNS implementation deployed in the cluster and ensure the application listens at the advertised endpoint port.

## The Service Port Name Is the DNS Label

The query uses the Service port's `name`, not `appProtocol`, the container name, or an arbitrary protocol label.

~~~yaml
ports:
  - name: grpc
    protocol: TCP
    appProtocol: kubernetes.io/h2c
    port: 50051
    targetPort: grpc
~~~

The corresponding query is:

~~~bash
dig +noall +answer \
  _grpc._tcp.store-peers.data.svc.cluster.local. SRV
~~~

`appProtocol` is a hint to implementations; it does not replace the `_grpc._tcp` SRV owner labels. DNS uses `_tcp`, `_udp`, or `_sctp` according to the Service port's `protocol`, rendered in lowercase in the query.

If a Service exposes multiple ports, Kubernetes requires names that distinguish them:

~~~yaml
ports:
  - name: raft
    protocol: TCP
    port: 7000
    targetPort: raft
  - name: metrics
    protocol: TCP
    port: 9090
    targetPort: metrics
~~~

That produces separate `_raft._tcp...` and `_metrics._tcp...` SRV names.

## Selectorless Headless Services Have an Extra Rule

For a headless Service without a selector, Kubernetes documentation requires `port` to equal `targetPort`. You must also create the EndpointSlice yourself:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: external-peers
  namespace: data
spec:
  clusterIP: None
  ports:
    - name: raft
      protocol: TCP
      port: 7000
      targetPort: 7000
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-peers-v4
  namespace: data
  labels:
    kubernetes.io/service-name: external-peers
    endpointslice.kubernetes.io/managed-by: platform-example-manual
addressType: IPv4
ports:
  - name: raft
    protocol: TCP
    port: 7000
endpoints:
  - addresses:
      - 10.20.30.70
    hostname: peer-a
    conditions:
      ready: true
~~~

The Service name, namespace, association label, port name, protocol, and port number all need to describe the same backend contract.

## Diagnose Missing SRV Answers

An A answer with no SRV answer usually points to the port definition, not address discovery:

~~~bash
kubectl -n data get service store-peers \
  -o jsonpath='{range .spec.ports[*]}{.name}{"\t"}{.protocol}{"\t"}{.port}{"\t"}{.targetPort}{"\n"}{end}'

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=store-peers \
  -o yaml

dig +noall +answer store-peers.data.svc.cluster.local. A
dig +noall +answer \
  _raft._tcp.store-peers.data.svc.cluster.local. SRV
~~~

Check that the Service port has a name, the query uses that exact name and protocol, the endpoints are published as ready, and the EndpointSlice contains the expected port and endpoint hostname. `publishNotReadyAddresses: true` deliberately includes unready peers for bootstrap but also exposes them to endpoint consumers.

## Official Documentation

- [Kubernetes DNS Service A, AAAA, and SRV records](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#services)
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md)
- [Kubernetes Service port definitions and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes Indexed Job Pod-to-Pod communication](https://kubernetes.io/docs/tasks/job/job-with-pod-to-pod-communication/)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [CoreDNS Kubernetes plugin implementation](https://github.com/coredns/coredns/blob/master/plugin/kubernetes/kubernetes.go)

## Conclusion

Headless A and AAAA records need published endpoint addresses, not named ports. SRV discovery needs a named Service port and uses that name plus the port protocol in the query. Define ports whenever clients or Kubernetes routing objects need a port contract, and keep the Service, container, and EndpointSlice representations aligned.
