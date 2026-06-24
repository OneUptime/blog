# How to Configure Kafka SASL Authentication Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, SASL, Authentication, IPv4, Security, Configuration, Messaging

Description: Learn how to configure Apache Kafka with SASL/PLAIN or SASL/SCRAM authentication over IPv4 to require client authentication before producing or consuming messages.

---

Kafka without authentication allows any client on the network to produce or consume from any topic. SASL (Simple Authentication and Security Layer) adds authentication to Kafka connections.

## SASL Mechanisms

| Mechanism | Description |
|-----------|-------------|
| `PLAIN` | Username/password in cleartext (use with TLS) |
| `SCRAM-SHA-256` | Salted challenge-response (more secure) |
| `SCRAM-SHA-512` | Same as SCRAM-SHA-256 but with SHA-512 |
| `GSSAPI` | Kerberos authentication |
| `OAUTHBEARER` | OAuth 2.0 bearer token authentication |

## Step 1: Configure the Broker (server.properties)

```properties
# /etc/kafka/server.properties

# Bind to the broker's IPv4 address

listeners=SASL_PLAINTEXT://10.0.0.10:9092
advertised.listeners=SASL_PLAINTEXT://10.0.0.10:9092

# SASL settings
sasl.enabled.mechanisms=SCRAM-SHA-256
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-256

# Security protocol for inter-broker communication
security.inter.broker.protocol=SASL_PLAINTEXT
```

## Step 2: Create JAAS Configuration for the Broker

```nginx
# /etc/kafka/kafka_server_jaas.conf

KafkaServer {
    org.apache.kafka.common.security.scram.ScramLoginModule required
    username="broker-admin"
    password="BrokerPassword123!";
};
```

```bash
# Add to Kafka broker startup script or KAFKA_OPTS
export KAFKA_OPTS="-Djava.security.auth.login.config=/etc/kafka/kafka_server_jaas.conf"
```

## Step 3: Create SCRAM Users

```bash
# When formatting broker storage for the first time, create the inter-broker SCRAM credential
kafka-storage.sh format -t $(kafka-storage.sh random-uuid) \
  -c /etc/kafka/server.properties \
  --add-scram 'SCRAM-SHA-256=[name="broker-admin",password="BrokerPassword123!"]'

# After the broker is running, create client users with an authenticated admin config
kafka-configs.sh --bootstrap-server 10.0.0.10:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=ProducerPass456!]' \
  --entity-type users --entity-name producer-user \
  --command-config /etc/kafka/admin.properties

kafka-configs.sh --bootstrap-server 10.0.0.10:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=ConsumerPass789!]' \
  --entity-type users --entity-name consumer-user \
  --command-config /etc/kafka/admin.properties
```

## Step 4: Client Configuration

```properties
# admin.properties (for kafka-configs.sh)
bootstrap.servers=10.0.0.10:9092
security.protocol=SASL_PLAINTEXT
sasl.mechanism=SCRAM-SHA-256
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="broker-admin" \
  password="BrokerPassword123!";

# producer.properties
bootstrap.servers=10.0.0.10:9092
security.protocol=SASL_PLAINTEXT
sasl.mechanism=SCRAM-SHA-256
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="producer-user" \
  password="ProducerPass456!";

# consumer.properties
bootstrap.servers=10.0.0.10:9092
security.protocol=SASL_PLAINTEXT
sasl.mechanism=SCRAM-SHA-256
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="consumer-user" \
  password="ConsumerPass789!";
```

## Step 5: Test Authentication

```bash
# Test producing with credentials
kafka-console-producer.sh \
  --bootstrap-server 10.0.0.10:9092 \
  --topic my-topic \
  --producer.config /etc/kafka/producer.properties

# Test consuming with credentials
kafka-console-consumer.sh \
  --bootstrap-server 10.0.0.10:9092 \
  --topic my-topic \
  --from-beginning \
  --consumer.config /etc/kafka/consumer.properties
```

## Key Takeaways

- Use `SCRAM-SHA-256` over `PLAIN` for stronger security; `PLAIN` transmits passwords in cleartext.
- For production, combine `SASL_SSL` instead of `SASL_PLAINTEXT` to encrypt the connection.
- Inter-broker communication also uses SASL; set `sasl.mechanism.inter.broker.protocol`.
- Create inter-broker SCRAM credentials before starting brokers that use SCRAM; use `kafka-storage.sh` for the initial broker credential and `kafka-configs.sh` for client users after the broker is up.
