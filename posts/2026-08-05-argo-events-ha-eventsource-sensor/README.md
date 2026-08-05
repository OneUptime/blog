# High-Availability Argo EventSources and Sensors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, High Availability, EventSource, Sensor, Leader Election, Kubernetes, Failover

Description: Configure and test Argo EventSource and Sensor replicas with the correct active-active, active-passive, and leader-election behavior.

---

Argo Events high availability is resource- and EventBus-specific. `spec.replicas: 3` can mean three serving webhook pods, one active Kafka EventSource plus two standbys, one active JetStream-backed Sensor plus standbys, or three active Kafka-backed Sensor consumers.

Those modes have different capacity, failover, duplicate, and test expectations. High availability begins by identifying which one you actually run.

## Let the Custom Resource Own Replicas

The EventSource and Sensor controllers generate Deployments from their custom resources. Configure replicas on the EventSource or Sensor:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: EventSource
metadata:
  name: inbound
  namespace: argo-events
spec:
  replicas: 3
  # Event source definitions follow.
---
apiVersion: argoproj.io/v1alpha1
kind: Sensor
metadata:
  name: workflow-router
  namespace: argo-events
spec:
  replicas: 3
  # Dependencies and triggers follow.
```

Official documentation explicitly warns against manually scaling the generated Deployments. Manual scaling can conflict with reconciliation and, more importantly, bypass the HA strategy Argo selects for the source or EventBus.

One replica is the default. Three is a common HA choice, but it is not automatically better than two or sufficient across failure domains. Choose a count alongside scheduling, disruption budgets, broker quorum, external load balancing, and capacity.

## Know Which EventSources Are Active-Active

Current Argo Events documentation lists these EventSource types as active-active when `spec.replicas` is greater than one:

- AWS SNS and SQS;
- Bitbucket and Bitbucket Server;
- GitHub and GitLab;
- NetApp StorageGRID;
- Slack and Stripe;
- Webhook.

All replicas serve traffic. For HTTP-based sources, the Service or external ingress must distribute requests only to ready pods. The upstream sender's retry and delivery policy remains part of availability; three healthy pods do not recover an event a sender abandoned before retry.

Active-active is not the same as exactly-once. A provider can retry, a load balancer can lose a response, or a pod can publish and terminate before responding. Preserve a stable provider delivery ID where available and make downstream actions idempotent.

## Know Which EventSources Are Active-Passive

Current documentation lists AMQP, Azure Event Hubs, Calendar, Emitter, GCP Pub/Sub, Generic, File, HDFS, Kafka, Minio, MQTT, NATS, NSQ, Pulsar, Redis, and Resource EventSources as active-passive. Only one replica serves; standbys participate in leader election and one takes over after leader loss.

For these types, replica count improves recovery time and failure tolerance, not steady-state throughput. A three-replica Kafka EventSource still has one active EventSource pod. Scale its topic partitions, listener configuration, or explicit sharding architecture separately rather than assuming standby pods consume.

Some EventSource types in an installed release may differ from the current list. Treat the documentation shipped for that release as authoritative, especially when a newer source type is involved.

## Match Sensor HA to the EventBus

For JetStream and other non-Kafka EventBus implementations, Sensor HA is active-passive. One Sensor replica subscribes and executes triggers while the others wait for leadership.

For a Kafka EventBus, Sensors can scale horizontally and all replicas actively process partitions. No Sensor leader election is required in this mode. Ensure the Kafka event topic has at least as many partitions as intended Sensor replicas; excess replicas cannot create matching consumer parallelism.

This makes a critical operational distinction:

```text
JetStream Sensor replicas -> failover capacity
Kafka Sensor replicas     -> failover plus processing capacity
```

An active-active Kafka Sensor also multiplies process-local resources such as trigger rate limiters. If a trigger is limited to 20 requests per second in each of three replicas, do not treat 20 as a global maximum.

## Choose the Leader-Election Backend

Where leader election is required, Argo Events uses NATS-based election by default for EventSources and non-Kafka Sensors. When the EventBus is Kafka, an active-passive EventSource uses Kubernetes leader election; a Kafka-backed Sensor is active-active and does not elect a leader.

With a non-Kafka EventBus, you can opt an EventSource or Sensor into Kubernetes-native leader election using this annotation:

```yaml
metadata:
  annotations:
    events.argoproj.io/leader-election: k8s
```

The official HA pages require the workload's service account to have Lease permissions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: argo-events-leader-election
  namespace: argo-events
rules:
  - apiGroups:
      - coordination.k8s.io
    resources:
      - leases
    verbs:
      - get
      - create
      - update
```

Bind that Role to the specific EventSource or Sensor service account. A controller being able to create the Deployment does not mean the generated pods can update Leases. Missing RBAC can leave all replicas present without a functioning active leader.

Use Kubernetes leader election when it fits your platform's operational model, then monitor Lease renewals and Kubernetes API availability. Keeping NATS leader election retains a dependency on EventBus connectivity. Neither choice removes the need to test a broker or API outage.

## Separate Pods Across Failure Domains

Replicas on the same node are not meaningful node HA. EventSources and Sensors accept pod placement under `spec.template`. For an EventSource:

```yaml
spec:
  replicas: 3
  template:
    priorityClassName: platform-critical
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  controller: eventsource-controller
                  eventsource-name: inbound
              topologyKey: topology.kubernetes.io/zone
```

For a Sensor, use `controller: sensor-controller` and `sensor-name: workflow-router`. Verify generated labels in the installed version before turning preferred placement into a hard requirement.

`spec.template.nodeSelector`, tolerations, affinity, and priority fields are documented HA controls. Required zone anti-affinity can make every pod Pending when the cluster has too few eligible zones. Prefer a topology rule that matches the actual failure model and maintain spare schedulable capacity.

A PodDisruptionBudget can protect multiple replicas from simultaneous voluntary eviction. It cannot prevent machine failure, force deletion, OOM kill, or a broken application. Match its selector against generated pod labels, and test that it does not deadlock node maintenance.

## Make the EventBus at Least as Available

EventSources publish to the EventBus and Sensors consume from it. Making both Deployments highly available while running an ephemeral, single-failure-domain bus leaves the middle of the path fragile.

For managed JetStream, use persistent volumes, multiple replicas, anti-affinity, capacity limits, and a tested stream backup and restore. For Kafka, own broker replication, in-sync replica policy, topic retention, ACLs, and cross-failure-domain recovery. Retention must exceed the longest EventSource or Sensor outage plus drain time.

Leader election protects process ownership. It does not preserve events that expired while no Sensor could process them.

## Define Observable Readiness

Deployment readiness proves containers passed their probes. It does not prove the complete event path. An HA service-level check should demonstrate:

1. the EventSource can receive or consume a uniquely identified test event;
2. it can publish that event to the intended EventBus;
3. the Sensor dependency accepts it;
4. the expected trigger executes once according to policy;
5. the target records the same correlation ID.

Use synthetic events that cannot invoke production side effects. Run them often enough to detect broken credentials, ACLs, Services, EventBus subjects/topics, Sensor expressions, and trigger RBAC.

The official Argo Events metrics help separate stages. Watch EventSource running-service count, successful and failed sends, Sensor successful and failed actions, retry exhaustion, and duration. Add Lease age, Deployment availability, restarts, EventBus health, and target admission metrics.

## Test Active-Active Failure

For an active-active webhook or GitHub EventSource:

1. verify traffic reaches every ready replica;
2. send uniquely numbered requests continuously;
3. terminate one pod without draining it;
4. observe load-balancer endpoint removal and replacement scheduling;
5. compare accepted provider deliveries with EventBus IDs and actions;
6. repeat during a rolling update and node drain.

Expected behavior is continued service at reduced capacity. Duplicates may still occur around ambiguous responses, so the pass criterion is no unexplained loss and idempotent final effects, not a simplistic one-log-line-per-request count.

## Test Active-Passive Failover

For an active-passive EventSource or JetStream-backed Sensor:

1. identify the active pod from leader/subscription logs and real data flow;
2. publish uniquely numbered events at a controlled rate;
3. terminate the active pod;
4. measure detection, election, reconnect, and first successful processing times;
5. compare IDs before, during, and after the transition;
6. repeat with EventBus latency and Kubernetes API latency injected separately.

Deleting a random pod may delete a standby and prove nothing about failover. Likewise, `kubectl rollout status` proves a Deployment rollout, not leadership transfer.

For a Kafka-backed active-active Sensor, remove one consumer and observe partition rebalance, processing pause, lag growth, and recovery. Verify that Argo's coordination topics and target idempotency prevent repeated business effects across the rebalance.

## Test More Than Pod Deletion

Production failures include:

- loss of a node or availability zone;
- EventBus quorum loss or broker network partition;
- Kubernetes API unavailability during Lease renewal;
- expired or rotated credentials;
- a full EventBus disk or expired Kafka retention window;
- a trigger target that accepts work but times out;
- rollout to an incompatible CRD or broker/client configuration.

Record measured recovery time and any unprocessed interval for each test. RPO and RTO are results from these drills, not properties implied by `replicas: 3`.

## Official Documentation

- [Argo Events EventSource high availability](https://argoproj.github.io/argo-events/eventsources/ha/)
- [Argo Events Sensor high availability](https://argoproj.github.io/argo-events/sensors/ha/)
- [Argo Events HA and DR recommendations](https://argoproj.github.io/argo-events/dr_ha_recommendations/)
- [Argo Events Kafka EventBus scaling](https://argoproj.github.io/argo-events/eventbus/kafka/)
- [Argo Events Prometheus metrics](https://argoproj.github.io/argo-events/metrics/)
- [Kubernetes Lease API](https://kubernetes.io/docs/concepts/architecture/leases/)
- [Kubernetes PodDisruptionBudget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)

## Conclusion

Configure replicas on the Argo custom resource, classify the workload as active-active or active-passive, and match leader election to the EventBus. Spread pods across real failure domains, keep the EventBus durable, and make duplicate effects idempotent. Then test the active pod, broker, API, node, and zone failures directly. HA is proven by correlated events continuing through the full path, not by three green pod icons.
