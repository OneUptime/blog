# How to Secure Kafka with TLS and SASL Authentication on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Message Broker, Security, Linux

Description: Learn how to secure Kafka with TLS and SASL Authentication on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Securing Kafka involves encrypting network traffic with TLS and authenticating clients with SASL. This prevents unauthorized access and protects message data in transit.

## Prerequisites

- RHEL 9 with Kafka running
- Root or sudo access
- openssl or keytool for certificate generation

## Step 1: Generate TLS Certificates

Create a Certificate Authority:

```bash
openssl req -new -x509 -keyout ca-key -out ca-cert -days 365   -subj "/CN=Kafka-CA" -nodes
```

Create broker keystore:

```bash
keytool -keystore kafka.server.keystore.jks -alias localhost   -genkey -keyalg RSA -validity 365   -dname "CN=kafka-broker" -storepass changeit

keytool -keystore kafka.server.keystore.jks -alias localhost   -certreq -file cert-file -storepass changeit

openssl x509 -req -CA ca-cert -CAkey ca-key -in cert-file   -out cert-signed -days 365 -CAcreateserial

keytool -keystore kafka.server.keystore.jks -alias CARoot   -import -file ca-cert -storepass changeit -noprompt

keytool -keystore kafka.server.keystore.jks -alias localhost   -import -file cert-signed -storepass changeit -noprompt
```

Create truststore:

```bash
keytool -keystore kafka.server.truststore.jks -alias CARoot   -import -file ca-cert -storepass changeit -noprompt
```

## Step 2: Configure TLS in Kafka

```properties
listeners=SSL://:9093
ssl.keystore.location=/opt/kafka/config/kafka.server.keystore.jks
ssl.keystore.password=changeit
ssl.key.password=changeit
ssl.truststore.location=/opt/kafka/config/kafka.server.truststore.jks
ssl.truststore.password=changeit
ssl.client.auth=required
security.inter.broker.protocol=SSL
```

## Step 3: Configure SASL Authentication

For SASL/PLAIN:

```properties
listeners=SASL_SSL://:9094
sasl.enabled.mechanisms=PLAIN
sasl.mechanism.inter.broker.protocol=PLAIN
security.inter.broker.protocol=SASL_SSL
```

Create JAAS configuration:

```bash
vi /opt/kafka/config/kafka_server_jaas.conf
```

```
KafkaServer {
    org.apache.kafka.common.security.plain.PlainLoginModule required
    username="admin"
    password="admin-secret"
    user_admin="admin-secret"
    user_producer="producer-secret"
    user_consumer="consumer-secret";
};
```

Set the JAAS config:

```bash
export KAFKA_OPTS="-Djava.security.auth.login.config=/opt/kafka/config/kafka_server_jaas.conf"
```

## Step 4: Configure Client

```properties
security.protocol=SASL_SSL
sasl.mechanism=PLAIN
sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username="producer" password="producer-secret";
ssl.truststore.location=/path/to/client.truststore.jks
ssl.truststore.password=changeit
```

## Step 5: Restart and Test

```bash
sudo systemctl restart kafka
/opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9094   --topic test --producer.config /opt/kafka/config/client.properties
```

## Conclusion

TLS encryption and SASL authentication on RHEL 9 protect Kafka clusters from unauthorized access and eavesdropping. Use SASL/PLAIN for simplicity or SASL/SCRAM for password hashing in production environments.
