# How to Secure Kafka with TLS and SASL Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, TLS, SASL, Security, Encryption

Description: Learn how to secure Apache Kafka on RHEL with TLS encryption and SASL authentication for both broker-to-broker and client-to-broker communication.

---

By default, Kafka communicates without encryption or authentication. Enabling TLS and SASL is essential for production deployments to protect data in transit and control access.

## Generating TLS Certificates

```bash
# Create a directory for certificates
mkdir -p /opt/kafka/ssl && cd /opt/kafka/ssl

# Generate a CA key and certificate
openssl req -new -x509 -keyout ca-key.pem -out ca-cert.pem \
  -days 365 -subj "/CN=KafkaCA" -nodes

# Generate a broker keystore
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -keyalg RSA -genkey -storepass changeit -keypass changeit \
  -dname "CN=kafka-broker"

# Create a certificate signing request
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -certreq -file server-cert-request.pem -storepass changeit

# Sign the certificate with the CA
openssl x509 -req -CA ca-cert.pem -CAkey ca-key.pem \
  -in server-cert-request.pem -out server-cert-signed.pem \
  -days 365 -CAcreateserial

# Import CA and signed cert into keystore
keytool -keystore kafka.server.keystore.jks -alias CARoot \
  -importcert -file ca-cert.pem -storepass changeit -noprompt
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -importcert -file server-cert-signed.pem -storepass changeit -noprompt

# Create a truststore with the CA
keytool -keystore kafka.server.truststore.jks -alias CARoot \
  -importcert -file ca-cert.pem -storepass changeit -noprompt
```

## Configuring Kafka for TLS and SASL

```properties
# Add to /opt/kafka/config/kraft/server.properties

# TLS Configuration
listeners=SASL_SSL://0.0.0.0:9093,CONTROLLER://0.0.0.0:9094
advertised.listeners=SASL_SSL://your-hostname:9093
listener.security.protocol.map=SASL_SSL:SASL_SSL,CONTROLLER:PLAINTEXT

ssl.keystore.location=/opt/kafka/ssl/kafka.server.keystore.jks
ssl.keystore.password=changeit
ssl.key.password=changeit
ssl.truststore.location=/opt/kafka/ssl/kafka.server.truststore.jks
ssl.truststore.password=changeit

# SASL Configuration (SCRAM-SHA-512)
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512

# Required for SCRAM
listener.name.sasl_ssl.scram-sha-512.sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="admin" \
  password="admin-secret";
```

## Creating SASL Users

```bash
# Create admin user
/opt/kafka/bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=admin-secret]' \
  --entity-type users --entity-name admin

# Create an application user
/opt/kafka/bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=app-secret]' \
  --entity-type users --entity-name myapp
```

## Client Configuration

```properties
# client.properties
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="myapp" \
  password="app-secret";
ssl.truststore.location=/path/to/client.truststore.jks
ssl.truststore.password=changeit
```

```bash
# Test with the console producer
/opt/kafka/bin/kafka-console-producer.sh \
  --topic test \
  --bootstrap-server your-hostname:9093 \
  --producer.config /opt/kafka/client.properties
```

Restart Kafka after configuration changes. Test TLS connectivity with `openssl s_client -connect your-hostname:9093` to verify the certificate chain.
