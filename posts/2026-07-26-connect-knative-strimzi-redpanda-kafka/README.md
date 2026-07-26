# How to Connect Knative Eventing to Strimzi or Redpanda Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative Eventing, Strimzi, Redpanda, Apache Kafka, TLS, SASL, Kubernetes

Description: Connect Knative KafkaSource or the native Kafka Broker to Strimzi and Redpanda with correct bootstrap metadata, TLS trust, SASL credentials, ACLs, and Secret placement.

---

Knative's Kafka components use the Kafka protocol. They do not require Kafka to have been installed by a particular operator, so both a Strimzi-managed Apache Kafka cluster and Redpanda's Kafka-compatible API can work.

Most failed integrations come from one of four details:

1. the bootstrap address is reachable, but Kafka advertises broker addresses that are not;
2. the TLS CA or hostname does not match;
3. the SASL mechanism or Secret key format is wrong;
4. credentials exist in a namespace where the Knative component cannot reference them.

Choose the Knative resource first because a `KafkaSource` and a native Kafka Broker use different authentication schemas.

## Discover the Actual Kafka Listener

For Strimzi, read the selected listener from the `Kafka` resource status rather than guessing the Service port:

```bash
kubectl get kafka my-cluster -n kafka \
  -o=jsonpath='{range .status.listeners[*]}{.name}{"\t"}{.bootstrapServers}{"\n"}{end}'
```

To select the common TLS listener:

```bash
kubectl get kafka my-cluster -n kafka \
  -o=jsonpath='{.status.listeners[?(@.name=="tls")].bootstrapServers}{"\n"}'
```

A typical in-cluster result is:

```text
my-cluster-kafka-bootstrap.kafka.svc:9093
```

Use the listener whose authentication and TLS settings match the client configuration. When Knative and Kafka share a Kubernetes cluster, prefer an internal listener. Exposing Kafka externally adds load balancers, public DNS, certificate names, and firewall policy without benefiting in-cluster traffic.

For Redpanda, read the Kafka API bootstrap address from the Redpanda custom resource, Helm release values, or generated client configuration for your installation. Do not substitute the HTTP Proxy, Admin API, or Schema Registry address; Knative needs the Kafka API listener.

## Validate Kafka Metadata from the Knative Network

A Kafka client contacts the bootstrap server and then connects to the broker addresses returned in metadata. Reaching only the bootstrap Service is insufficient.

Run a temporary Kafka client Pod under the same NetworkPolicies and service-mesh policy as the Knative data plane. With a mounted client configuration:

```bash
kcat -F /etc/kafka/client.properties -b "$BOOTSTRAP_SERVERS" -L
```

Verify that every broker hostname in the output:

- resolves from the Pod;
- routes to the correct cluster and port;
- is allowed by NetworkPolicy and firewalls;
- appears in the broker certificate's subject alternative names.

Timeouts after a successful bootstrap connection almost always point to bad advertised listeners or blocked per-broker addresses.

## Connect a KafkaSource with TLS and SCRAM

`KafkaSource` references individual Secret keys under `spec.net`. Put the Secret in the same namespace as the KafkaSource. The example assumes a Secret named `orders-kafka-client` containing:

- `ca.crt`;
- `user`;
- `password`;
- `saslType`, with a supported value such as `SCRAM-SHA-512`.

Create that Secret through your secret manager or GitOps secret controller. Do not commit the plaintext password.

```yaml
apiVersion: sources.knative.dev/v1
kind: KafkaSource
metadata:
  name: orders
  namespace: production
spec:
  consumerGroup: knative-orders-v1
  bootstrapServers:
    - my-cluster-kafka-bootstrap.kafka.svc:9093
  topics:
    - orders
  consumers: 6
  net:
    sasl:
      enable: true
      user:
        secretKeyRef:
          name: orders-kafka-client
          key: user
      password:
        secretKeyRef:
          name: orders-kafka-client
          key: password
      type:
        secretKeyRef:
          name: orders-kafka-client
          key: saslType
    tls:
      enable: true
      caCert:
        secretKeyRef:
          name: orders-kafka-client
          key: ca.crt
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: orders
```

For Strimzi, the broker trust certificate is normally the `ca.crt` key in `<cluster-name>-cluster-ca-cert`. A SCRAM `KafkaUser` Secret provides its password. Build a client Secret with Knative's expected keys and keep it synchronized through a controller; manually copied credentials silently become stale after rotation.

For mutual TLS instead of SASL, configure `spec.net.tls.cert`, `key`, and `caCert` Secret references. Strimzi normally provides `user.crt` and `user.key` in the TLS KafkaUser Secret. Knative requires PEM files.

## Connect the Native Kafka Broker

The native Kafka Broker reads connection settings from its referenced ConfigMap. Authentication is a single Secret named by `auth.secret.ref.name`, and that Secret must be in the **same namespace as the ConfigMap**.

The Secret schema for SCRAM over TLS is:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: knative-kafka-auth
  namespace: knative-eventing
type: Opaque
stringData:
  protocol: SASL_SSL
  sasl.mechanism: SCRAM-SHA-512
  user: knative-eventing
  password: REPLACE_THROUGH_A_SECRET_CONTROLLER
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    REPLACE_WITH_THE_PEM_CA_CHAIN
    -----END CERTIFICATE-----
```

Reference it from the connection ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-broker-config
  namespace: knative-eventing
data:
  bootstrap.servers: "my-cluster-kafka-bootstrap.kafka.svc:9093"
  default.topic.partitions: "12"
  default.topic.replication.factor: "3"
  auth.secret.ref.name: "knative-kafka-auth"
---
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders
  namespace: production
  annotations:
    eventing.knative.dev/broker.class: Kafka
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-broker-config
    namespace: knative-eventing
```

Supported native Broker SASL mechanisms include `PLAIN`, `SCRAM-SHA-256`, and `SCRAM-SHA-512`. Use `SASL_SSL` for authenticated encrypted traffic. `SASL_PLAINTEXT` exposes the Kafka protocol and credentials to the network and is rarely appropriate.

If each namespace needs its own data-plane and credential boundary, evaluate the `KafkaNamespaced` Broker class. Its ConfigMap must be in the Broker namespace, and it costs additional deployments and resources.

## Use the Same Pattern for Redpanda

Redpanda exposes a Kafka-compatible API, and its client authentication supports SASL/SCRAM. The Knative manifests remain the same shape:

- set `bootstrapServers` or `bootstrap.servers` to the Redpanda Kafka API;
- trust the CA that signed the Kafka API listener certificate;
- select the SCRAM mechanism configured for the Redpanda user;
- provide the user and password through the Knative-specific Secret schema;
- make every advertised broker endpoint reachable from the Knative data plane.

Do not assume Strimzi-generated Secret names exist in Redpanda. Obtain the CA and credentials using the Redpanda operator or Helm procedure for the installed release, then map them into the keys Knative expects.

Check Redpanda's Kafka compatibility documentation for any client feature or configuration your Knative release depends on. Protocol compatibility does not mean every Kafka administrative feature has identical behavior.

## Grant the Minimum Kafka Permissions

The exact ACLs depend on the component and whether Knative manages topics:

- `KafkaSource` needs to describe and read its topics and use its consumer group;
- a native Kafka Broker receiver needs to write the Broker topic;
- its Trigger dispatchers need to read that topic and use their groups;
- topic creation or configuration requires additional cluster/topic permissions;
- a bring-your-own topic keeps lifecycle management outside Knative but still needs read/write/describe access.

With Strimzi, express these permissions on a dedicated `KafkaUser`. With Redpanda, use a dedicated SCRAM user and scoped ACLs. Avoid a shared superuser credential: it hides missing permissions in testing and expands the impact of a leaked Knative Secret.

## Verify End to End

Check reconciliation first:

```bash
kubectl get kafkasource -n production
kubectl get broker,trigger -n production
kubectl describe kafkasource orders -n production
kubectl describe broker orders -n production
```

Then send one event with a known CloudEvent ID and verify the Kafka topic, dispatcher, and sink. Classify errors:

- `UnknownHostException` or DNS timeout: bootstrap or advertised hostname;
- connection timeout after metadata: per-broker reachability;
- TLS handshake or unknown authority: wrong CA chain or certificate name;
- SASL authentication failure: wrong mechanism, user, password, or listener;
- topic authorization failure: ACL scope;
- replication-factor error: configured factor exceeds available Kafka brokers;
- resource remains `NotReady`: inspect the relevant Kafka controller and data-plane logs.

Finally, rehearse credential and CA rotation. A connection that works once but cannot rotate safely is not production-ready.

## Official Documentation

- [Knative native Kafka Broker configuration and security](https://knative.dev/docs/eventing/brokers/broker-types/kafka-broker/)
- [Knative KafkaSource TLS and SASL configuration](https://knative.dev/docs/eventing/sources/kafka-source/)
- [Strimzi deploying and managing Kafka](https://strimzi.io/docs/operators/latest/deploying.html)
- [Redpanda Kafka client compatibility](https://docs.redpanda.com/streaming/current/develop/kafka-clients/)
- [Redpanda authentication and SASL/SCRAM](https://docs.redpanda.com/streaming/current/manage/security/authentication/)
