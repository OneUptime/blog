# Query Headless Service A, AAAA, and SRV Records with dig

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, DNS, dig, SRV Records, IPv6

Description: Query and interpret the address and named-port records that Kubernetes DNS publishes for a headless Service.

---

A headless Service can publish three record families that answer different questions:

- `A` returns IPv4 endpoint addresses;
- `AAAA` returns IPv6 endpoint addresses;
- `SRV` returns a named port plus an endpoint-specific DNS target.

Use `dig` from inside the cluster and ask for each type explicitly. An ordinary lookup may hide whether an absent result is expected for the cluster's address family or caused by a discovery problem.

## Use a Named Service Port

Address records do not require a named port, but SRV records do. This Service exposes a TCP peer port:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: raft
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: raft
  ports:
    - name: peer
      protocol: TCP
      port: 7000
      targetPort: peer
~~~

For stable targets such as `raft-0.raft.data.svc.cluster.local`, use the Service as a StatefulSet's governing Service:

~~~yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: raft
  namespace: data
spec:
  serviceName: raft
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: raft
  template:
    metadata:
      labels:
        app.kubernetes.io/name: raft
    spec:
      containers:
        - name: server
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          command: ["/agnhost", "netexec"]
          args: ["--http-port=7000"]
          ports:
            - name: peer
              containerPort: 7000
~~~

The Kubernetes test image provides a concrete TCP listener for the DNS exercise. Replace it with the peer image and readiness checks you operate in production.

## Launch a DNS Toolbox Pod

The Kubernetes `agnhost` test image includes `dig`:

~~~bash
kubectl -n data run dns-tools --rm -it --restart=Never \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.53 \
  --command -- /bin/sh
~~~

Use absolute names ending in a dot. That bypasses search-list expansion and makes the result reproducible.

## Query IPv4 A Records

~~~bash
dig +noall +answer raft.data.svc.cluster.local. A
~~~

By default, an IPv4-backed headless Service returns one A record per ready IPv4 endpoint. If `spec.publishNotReadyAddresses: true` is set, Kubernetes also publishes controller-generated endpoints for Pods that are not Ready. The answer is an RRset, not a ClusterIP:

~~~text
raft.data.svc.cluster.local.  5  IN  A  10.244.1.20
raft.data.svc.cluster.local.  5  IN  A  10.244.2.31
raft.data.svc.cluster.local.  5  IN  A  10.244.3.14
~~~

The addresses, order, and TTL above are examples. Do not assert a fixed order, and inspect the TTL returned by your cluster rather than assuming it is five seconds.

For a compact address-only result:

~~~bash
dig +short raft.data.svc.cluster.local. A
~~~

`+short` is convenient for scripts but hides status, authority data, and TTL. Use the full answer while troubleshooting.

## Query IPv6 AAAA Records

~~~bash
dig +noall +answer raft.data.svc.cluster.local. AAAA
~~~

An IPv6 endpoint is published as an AAAA record. A dual-stack Service can have both IPv4 and IPv6 EndpointSlices, while an IPv4-only Service normally has no AAAA data. An empty AAAA answer is therefore not proof of a DNS fault.

Compare DNS with EndpointSlice address families:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=raft \
  -o 'custom-columns=NAME:.metadata.name,FAMILY:.addressType,PORTS:.ports[*].port'
~~~

Each EndpointSlice has one `addressType`, so a dual-stack endpoint set spans at least one IPv4 slice and one IPv6 slice.

## Query the SRV Record

Kubernetes constructs the SRV owner name from the Service port name and protocol:

~~~text
_<port-name>._<port-protocol>.<service>.<namespace>.svc.<cluster-domain>
~~~

For the `peer` TCP port:

~~~bash
dig +noall +answer \
  _peer._tcp.raft.data.svc.cluster.local. SRV
~~~

For the queried named port, a headless Service normally returns one SRV answer per backing Pod (more generally, per unique endpoint target and port). Each answer contains priority, weight, port, and a target name. With three ready IPv4 endpoints, one representative CoreDNS record might look like:

~~~text
_peer._tcp.raft.data.svc.cluster.local. 5 IN SRV 0 33 7000 raft-0.raft.data.svc.cluster.local.
~~~

The TTL, priority, and weight are examples. Kubernetes does not prescribe priority or weight, and CoreDNS derives weight from the candidate set. Treat those values as discovery data, not a health-aware load-balancing policy. For StatefulSet endpoints, the target is the stable Pod DNS name. For endpoints without a hostname, CoreDNS applies its endpoint-name rules and may use a dashed form of the IP address. A client that requires stable member identity should not derive it from record order or an encoded IP label.

The protocol label follows the Service port's protocol in lowercase. For example, a port named `dns` with `protocol: UDP` uses `_dns._udp...`.

## Resolve SRV Targets as a Client Would

An SRV target is a DNS name, not an address. Resolve both layers:

~~~bash
dig +short _peer._tcp.raft.data.svc.cluster.local. SRV
dig +short raft-0.raft.data.svc.cluster.local. A
dig +short raft-0.raft.data.svc.cluster.local. AAAA
~~~

Client libraries vary. Some resolve SRV and honor its port, while others accept only host and port configuration and never issue SRV queries. Confirm the library behavior before relying on SRV discovery.

## Interpret Failures Precisely

Check the DNS response header without suppressing it:

~~~bash
dig raft.data.svc.cluster.local. A
~~~

Then distinguish:

| Observation | Meaning to investigate |
| --- | --- |
| A answers, no AAAA answers | likely IPv4-only endpoint set |
| AAAA answers, no A answers | likely IPv6-only endpoint set |
| A/AAAA work, SRV is absent | port is unnamed, query name is wrong, or endpoint port data is missing |
| Service RRset works, one Pod target fails | endpoint hostname, StatefulSet governing Service, readiness, or negative cache |
| `NXDOMAIN` | wrong owner name, no publishable endpoints, or DNS configuration |
| `SERVFAIL` | CoreDNS synchronization, permissions, or runtime failure |

For large RRsets, force the query over TCP to rule out UDP-path or truncation problems:

~~~bash
dig +tcp +noall +answer raft.data.svc.cluster.local. A
~~~

Finally, inspect the source objects:

~~~bash
kubectl -n data get service raft -o yaml
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=raft -o yaml
~~~

## Official Documentation

- [Kubernetes DNS records for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes EndpointSlice address types and ports](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes DNS debugging](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [CoreDNS kubernetes plugin endpoint naming and TTL](https://coredns.io/plugins/kubernetes/)

## Conclusion

Query A, AAAA, and SRV independently. A and AAAA expose the published endpoint addresses for each IP family, while SRV exposes a named port and endpoint target. Use absolute names, preserve the full `dig` response during diagnosis, and compare every answer with the Service and all of its EndpointSlices.
