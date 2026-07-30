# ActiveMQ Classic or Artemis? How to Choose for a New JMS Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ Classic, Apache Artemis, Jakarta Messaging, JMS, Message Broker

Description: Choose between ActiveMQ Classic and Artemis by testing the client API, protocol, routing, durability, and operational behavior your new workload actually requires.

---

ActiveMQ Classic and Apache Artemis are separate brokers with different internals, configuration models, management objects, and feature edges. Artemis originated from the HornetQ codebase; it is not a new storage engine that can be enabled inside Classic. Since Artemis 2.50, the project's documentation uses the name **Apache Artemis**, although many applications and older documents still say **ActiveMQ Artemis**.

For a greenfield workload, Artemis is usually the stronger starting candidate. That is a recommendation to evaluate it first, not a claim that it implements every Classic-specific behavior. Classic remains a supported broker and can be the lower-risk choice when a workload depends on its OpenWire client behavior, virtual destinations, network-of-brokers topology, plugins, or existing operational tooling.

## Start with the Compatibility Boundary

As of July 2026, Apache publishes supported Classic 6.2.x and 5.19.x lines. They are not identical client stacks:

- Classic 6.2.x uses the `jakarta.jms` namespace, requires Java 17+, and has partial Jakarta Messaging 3.1/JMS 2 functionality.
- Classic 5.19.x requires Java 11+ and remains relevant to applications built around the older `javax.jms` ecosystem.
- Artemis 2.55 provides separate JMS and Jakarta Messaging client artifacts and requires Java 17+ for the broker distribution.

Do not reduce the decision to “does it support JMS?” Record the exact artifact, API namespace, Java version, wire protocol, framework, acknowledgement mode, transaction mode, and broker feature used by each application. A method present in a Jakarta Messaging interface can still be unsupported by a particular Classic client version; the Classic JMS 2 transition page explicitly documents such gaps.

## Compare the Models, Not Just the Names

| Concern | ActiveMQ Classic | Apache Artemis |
| --- | --- | --- |
| Native client protocol | OpenWire | Core |
| Other major protocols | AMQP 1.0, MQTT, STOMP, and others | AMQP 1.0, OpenWire, MQTT, STOMP |
| Broker routing model | JMS queues/topics plus Classic destination policies and virtual destinations | Addresses, queues, and `ANYCAST`/`MULTICAST` routing types |
| Large backlog mechanism | Store-backed message cursors and temporary-file cursors | Per-address paging |
| Backpressure vocabulary | Destination `memoryLimit`, broker `SystemUsage`, producer flow control | `max-size-bytes`, `address-full-policy`, producer credits, global limits |
| Native management identity | Classic JMX object names and attributes such as `QueueSize` and `InFlightCount` | Artemis `AddressControl`/`QueueControl`, with attributes such as `messageCount` and `deliveringCount` |
| Classic virtual-topic compatibility | Native `VirtualTopic.>` and `Consumer.*.VirtualTopic.>` convention | OpenWire translation to a multicast address and fully qualified queue name |

The similarly named concepts are not configuration equivalents. For example, Classic prefetch is principally a message count. Artemis Core consumer flow control uses a byte window. Copying `queuePrefetch=10` into an Artemis configuration has no defined meaning.

## When Classic Is the Better Fit

Prefer a Classic proof of concept when one or more of these are hard requirements:

- The application depends on a Classic-specific feature such as a custom virtual destination, destination interceptor, broker plugin, or network-connector policy.
- Existing OpenWire clients rely on behavior that has not been demonstrated against Artemis's OpenWire protocol manager.
- The broker is embedded in a Classic application and changing the broker API or its in-VM lifecycle is out of scope.
- Operations already depend on Classic JMX object names, KahaDB procedures, advisory topics, or tested Classic failover-transport behavior.
- This is really an extension of an existing Classic broker estate, and introducing a second broker model would create more risk than it removes.

Even in these cases, select a currently supported Classic line and verify its Java and JMS namespace requirements. Choosing Classic because an application imports `javax.jms` is not by itself enough: a remote-client upgrade or an AMQP client might decouple the application API from the broker, but that path needs a compatibility test.

## When Artemis Is the Better Starting Point

Start with Artemis for a new design when the workload benefits from its native model:

- Explicit anycast and multicast routing is clearer than emulating the topology with Classic-specific destination conventions.
- AMQP 1.0 interoperability or the Artemis Core client is central to the design.
- The workload needs large, disk-backed queues and you want to control paging independently per address.
- New HA, clustering, federation, and broker-to-broker behavior will be designed and tested from scratch.
- You want to use current Artemis management, metrics, security, and resource-limit facilities rather than preserve Classic operational contracts.

Artemis supporting OpenWire makes staged client migration possible, but it does not make every Classic broker feature portable. Apache's Artemis OpenWire documentation calls out compatibility features individually, including virtual-topic consumer translation and advisories. Treat documented support as a list of capabilities to test, not a blanket compatibility guarantee.

## Turn Requirements into a Broker Trial

A useful trial reproduces production semantics rather than publishing tiny non-persistent messages to an empty queue.

Build a test matrix with:

1. **The real client.** Use the exact client artifact, protocol, framework, connection URI, pooling layer, and Java runtime.
2. **The real message profile.** Include body-size percentiles, headers, selectors, priorities, groups, expiration, and durable versus non-durable sends.
3. **The real consumption contract.** Exercise transacted and non-transacted acknowledgement, rollback, redelivery, poison messages, and consumer restarts.
4. **Backlog.** Stop consumers long enough to create the largest credible queue, then measure disk use, producer behavior, recovery, and drain time.
5. **Failure.** Kill a consumer during processing, stop a broker during sends and commits, interrupt the network, and fail over if HA is required.
6. **Operations.** Prove that dashboards distinguish ready, delivering, acknowledged, expired, and dead-lettered messages. Test backup and restore.
7. **Security.** Exercise the actual TLS, authentication, authorization, and management roles.

Measure end-to-end outcomes: acknowledged throughput, latency percentiles, duplicate processing, loss, recovery time, store growth, CPU, heap, direct memory, and disk latency. Broker benchmark headline numbers do not answer whether a particular transaction and durability contract works.

## Avoid False Migration Shortcuts

Classic XML is not Artemis `broker.xml`, KahaDB is not an Artemis journal, and a Classic destination policy is not an Artemis address setting. A switch between the brokers is an application and operations migration even when clients keep using OpenWire.

Plan it as a data movement:

- inventory destination and subscription state;
- define the target address and queue topology explicitly;
- decide how existing queued messages will be drained, bridged, exported, or replayed;
- test headers and message-body conversion at the chosen protocol boundary;
- cut over producers and consumers with an observable rollback point;
- keep source data until target counts and business outcomes reconcile.

Do not copy a Classic store directory into Artemis or assume that identically named destinations imply identical routing.

## A Practical Default Decision

For a genuinely new workload with no Classic-only dependency, prototype Artemis first. Its address/queue model makes routing intent explicit and avoids making a new design depend on compatibility conventions.

Choose Classic when the trial proves that a required Classic behavior is unavailable or materially riskier on Artemis, or when the workload is part of an existing Classic system whose operational consistency outweighs the benefits of a second platform. Write the deciding requirement down. “The team already knows the name ActiveMQ” is not an architectural constraint; “these tested clients require this Classic plugin and fail the Artemis compatibility suite” is.

Whichever broker wins, pin the exact version and client artifacts in the decision record. The next maintainer needs to know which behavior was tested, not merely which logo was selected.

## Official Documentation

- [ActiveMQ Classic downloads, supported series, Java versions, and JMS API support](https://activemq.apache.org/components/classic/download/)
- [ActiveMQ Classic Jakarta Messaging 3.1 and JMS 2.0 support](https://activemq.apache.org/components/classic/documentation/jms2)
- [ActiveMQ Classic features overview](https://activemq.apache.org/components/classic/documentation/features-overview)
- [Apache Artemis 2.55 download and Java compatibility](https://artemis.apache.org/components/artemis/download/)
- [Apache Artemis protocols and interoperability](https://artemis.apache.org/components/artemis/documentation/latest/protocols-interoperability.html)
- [Apache Artemis address model](https://artemis.apache.org/components/artemis/documentation/latest/address-model.html)
- [Apache Artemis client classpath and JMS/Jakarta artifacts](https://artemis.apache.org/components/artemis/documentation/latest/client-classpath.html)
- [Apache Artemis OpenWire compatibility](https://artemis.apache.org/components/artemis/documentation/latest/openwire.html)
