# How to Configure Kafka SSL/TLS Listeners for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, SSL, TLS, IPv4, Encryption, Security, Messaging

Description: Enable SSL/TLS on Kafka brokers for encrypted IPv4 connections, configure keystores and truststores, and connect producers and consumers with SSL.

## Introduction

Kafka SSL encryption protects data in transit between clients and brokers, and between brokers in a cluster. It requires Java keystores (for the broker's certificate) and truststores (for CA certificates). Kafka 2.5+ can use TLS 1.3 when the JVM supports it.

## Generating Certificates

```bash
# Step 1: Create CA

openssl req -new -x509 -keyout ca-key.pem -out ca-cert.pem -days 3650 \
  -subj "/CN=Kafka CA" -passout pass:capassword

# Step 2: Create broker keystore
keytool -keystore kafka.broker.keystore.jks -storetype JKS -alias broker \
  -genkeypair -keyalg RSA -keysize 2048 -validity 3650 \
  -dname "CN=10.0.0.1,OU=Kafka,O=Company" \
  -ext SAN=IP:10.0.0.1 \
  -storepass brokerpass -keypass brokerpass

# Step 3: Create and sign broker certificate
keytool -keystore kafka.broker.keystore.jks -storetype JKS -alias broker \
  -certreq -file broker-cert.csr -ext SAN=IP:10.0.0.1 -storepass brokerpass

openssl x509 -req -CA ca-cert.pem -CAkey ca-key.pem -in broker-cert.csr \
  -out broker-cert.signed -days 3650 -copy_extensions copy \
  -CAcreateserial -passin pass:capassword

# Step 4: Import CA and signed cert into keystore
keytool -keystore kafka.broker.keystore.jks -storetype JKS -alias CARoot \
  -importcert -file ca-cert.pem -storepass brokerpass -noprompt
keytool -keystore kafka.broker.keystore.jks -storetype JKS -alias broker \
  -importcert -file broker-cert.signed -storepass brokerpass

# Step 5: Create truststore with CA
keytool -keystore kafka.broker.truststore.jks -storetype JKS -alias CARoot \
  -importcert -file ca-cert.pem -storepass trustpass -noprompt

# Copy to config directory
sudo cp kafka.broker.{keystore,truststore}.jks /etc/kafka/ssl/
```

## Broker SSL Configuration

```properties
# /etc/kafka/server.properties

broker.id=1

# SSL listener on specific IPv4
listeners=SSL://10.0.0.1:9093,PLAINTEXT://127.0.0.1:9092

advertised.listeners=SSL://10.0.0.1:9093

listener.security.protocol.map=SSL:SSL,PLAINTEXT:PLAINTEXT
# Encrypt inter-broker too
inter.broker.listener.name=SSL

# SSL settings
ssl.keystore.type=JKS
ssl.keystore.location=/etc/kafka/ssl/kafka.broker.keystore.jks
ssl.keystore.password=brokerpass
ssl.key.password=brokerpass
ssl.truststore.type=JKS
ssl.truststore.location=/etc/kafka/ssl/kafka.broker.truststore.jks
ssl.truststore.password=trustpass

# TLS version
ssl.enabled.protocols=TLSv1.2,TLSv1.3
ssl.protocol=TLSv1.3

# Client auth (set to required for mutual TLS)
ssl.client.auth=none
# Alternative values: requested, required
```

## Client Configuration

```properties
# /etc/kafka/client-ssl.properties

security.protocol=SSL
ssl.truststore.type=JKS
ssl.truststore.location=/etc/kafka/ssl/client.truststore.jks
ssl.truststore.password=clienttrustpass

# For mutual TLS:
ssl.keystore.type=JKS
ssl.keystore.location=/etc/kafka/ssl/client.keystore.jks
ssl.keystore.password=clientpass
ssl.key.password=clientpass
```

```bash
# Test with kafka-console-producer:
kafka-console-producer.sh \
  --bootstrap-server 10.0.0.1:9093 \
  --topic test-topic \
  --command-config /etc/kafka/client-ssl.properties

# Test with kafka-console-consumer:
kafka-console-consumer.sh \
  --bootstrap-server 10.0.0.1:9093 \
  --topic test-topic \
  --command-config /etc/kafka/client-ssl.properties \
  --from-beginning
```

## Conclusion

Kafka SSL requires Java keystores for the broker certificate and truststores for CA certificates. Configure `listeners=SSL://ip:port` and point `ssl.keystore.location`/`ssl.truststore.location` to the JKS files. Clients need a matching truststore with the CA certificate. Use `ssl.client.auth=required` for mutual TLS where brokers verify client certificates. Restrict TLS versions to 1.2 and 1.3 when they are supported by your JVM and clients.
