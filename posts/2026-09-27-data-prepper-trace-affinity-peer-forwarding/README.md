# How to Keep Each Trace on One Data Prepper Node with Peer Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Observability

Description: Configure Data Prepper peer discovery and trace-ID routing, then verify that distributed spans reach the same processing node.

---

A load balancer can spread incoming OpenTelemetry requests evenly while sending the spans of one trace to several Data Prepper nodes. Stateless indexing may continue working, but trace-group enrichment and service relationships need related spans together. Configure the core Peer Forwarder before treating a multi-node trace pipeline as a single logical processor.

This guide covers self-managed Data Prepper using the event model and the `otel_traces` and `service_map` processors. It does not configure a Collector's tail sampler; that component has its own routing requirements upstream.

## Understand the routing boundary

Core Peer Forwarder chooses a destination from a consistent hash ring. For the trace processors, the identification key is `traceId`. Requests can arrive through any ingress node; the required records are forwarded before stateful processing. The default discovery mode, `local_node`, provides no cross-node routing. These behaviors are documented in the [Peer Forwarder reference](https://docs.opensearch.org/latest/data-prepper/managing-data-prepper/peer-forwarder/).

The distinction between an ingress address and a peer address matters. The ingress load balancer can hide individual nodes from applications. Peer discovery must identify the individual Data Prepper nodes, because forwarding through another round-robin load balancer would not reliably reach the chosen owner.

```text
Collector requests -> ingress load balancer -> node A or node B
                                               |
                                  route spans by traceId
                                               |
                                      selected peer node
                                               |
                                  trace and map processors
```

This is a processing-affinity design. It is not a promise that a trace has one permanent owner through failures or membership changes.

## Configure the same membership on every node

For a small cluster with stable addresses, put this fragment in `config/data-prepper-config.yaml` on every node:

```yaml
peer_forwarder:
  discovery_mode: static
  static_endpoints:
    - dp-1.internal.example
    - dp-2.internal.example
  port: 4994
  ssl: true
  ssl_certificate_file: /etc/data-prepper/peer-cert.pem
  ssl_key_file: /etc/data-prepper/peer-key.pem
```

Replace the names and certificate paths with real deployment values. Configure certificates and trust using the options supported by the installed release. The peer listener and the OpenTelemetry source listener are different services; a successful OTLP connection does not test peer connectivity.

For changing membership, DNS discovery can use a name that resolves to the nodes themselves:

```yaml
peer_forwarder:
  discovery_mode: dns
  domain_name: dp-peers.internal.example
  port: 4994
  ssl: true
  ssl_certificate_file: /etc/data-prepper/peer-cert.pem
  ssl_key_file: /etc/data-prepper/peer-key.pem
```

Use one discovery mode at a time. In Kubernetes, inspect the actual addresses returned from inside each pod. A DNS name returning one virtual service address is not the same as a name returning the peer pod addresses. Test bidirectional connectivity to the peer port and check that every node has a consistent view of the membership.

## Preserve the trace-processing path

Keep identical pipeline names and processor layouts across peers. Peer requests identify their destination pipeline and processor, so sharing network access alone is insufficient. The [peer request implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/client/PeerForwarderClient.java) serializes those destinations with the events.

A normal trace topology has an OTLP entry pipeline feeding two local pipeline sinks: a raw-span branch containing `otel_traces`, and a service-map branch containing `service_map`. Each branch writes through the corresponding trace analytics OpenSearch sink. Configure core peer forwarding at the Data Prepper server level; it is not an option inside the OpenSearch sink.

Do not replace `traceId` with `serviceName` or an application label to balance traffic. Different services participate in the same trace, and splitting them defeats correlation. Also keep trace IDs intact through preceding transforms.

## Prove affinity with a controlled trace

Create one synthetic trace with a root and child spans from two test services. Arrange for separate OTLP requests to reach different ingress nodes. Record the trace ID and expected span IDs before sending it.

Then examine peer-forwarder counters on every node over the same interval. Successful forwarding and received-record counters should increase where remote routing is required. Local-processing counts are expected when the ingress node is already the selected destination.

Finally, search the raw trace index for the known ID:

```http
GET otel-v1-apm-span*/_search
{
  "size": 100,
  "query": {
    "term": {
      "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  }
}
```

Compare the returned span IDs with the fixture and inspect trace-group and service-map output after their processing windows. A complete raw-span count alone does not prove that both stateful branches correlated correctly.

## Plan for node changes

Run the same experiment while adding or draining one node in staging. A changed hash ring can change the destination for later spans, while earlier processor state remains on another node. Long-running traces make this especially visible. The [hash-ring implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-core/src/main/java/org/opensearch/dataprepper/core/peerforwarder/HashRing.java) is useful when checking the behavior of a particular release.

Keep deployment churn, trace duration, processing windows, and shutdown behavior in the capacity plan. Increasing the number of ingress replicas without validating peer discovery can increase apparent throughput while reducing correlation quality.

## Conclusion

Working trace affinity requires consistent peer membership, direct peer connectivity, matching pipelines, and intact trace IDs. Verify the result with a known distributed trace and peer metrics before relying on aggregate dashboards.
