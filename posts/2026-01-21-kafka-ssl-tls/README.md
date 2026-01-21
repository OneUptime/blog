# How to Secure Kafka with SSL/TLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, SSL, TLS, Security, Encryption, Certificates

Description: Learn how to secure Apache Kafka with SSL/TLS encryption, including certificate generation, broker configuration, and client setup for encrypted communication.

---

SSL/TLS encryption protects data in transit between Kafka clients and brokers. This guide covers certificate generation, broker configuration, and client setup for secure Kafka deployments.

## Certificate Generation

### Create CA (Certificate Authority)

```bash
# Generate CA key and certificate
openssl req -new -x509 -keyout ca-key -out ca-cert -days 365 \
  -subj "/CN=KafkaCA/O=YourOrg/C=US" \
  -passout pass:ca-password

# Create truststore with CA certificate
keytool -keystore kafka.truststore.jks -alias CARoot \
  -import -file ca-cert -storepass truststore-password -noprompt
```

### Generate Broker Certificates

```bash
#!/bin/bash
# generate-broker-certs.sh

BROKER_HOST=$1
KEYSTORE_PASSWORD="keystore-password"
CA_PASSWORD="ca-password"
VALIDITY=365

# Generate keystore with key pair
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -validity $VALIDITY -genkey -keyalg RSA -storetype pkcs12 \
  -storepass $KEYSTORE_PASSWORD -keypass $KEYSTORE_PASSWORD \
  -dname "CN=$BROKER_HOST,O=YourOrg,C=US" \
  -ext SAN=DNS:$BROKER_HOST,DNS:localhost

# Create CSR
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -certreq -file cert-request -storepass $KEYSTORE_PASSWORD

# Sign with CA
openssl x509 -req -CA ca-cert -CAkey ca-key \
  -in cert-request -out cert-signed \
  -days $VALIDITY -CAcreateserial -passin pass:$CA_PASSWORD \
  -extfile <(printf "subjectAltName=DNS:$BROKER_HOST,DNS:localhost")

# Import CA cert to keystore
keytool -keystore kafka.server.keystore.jks -alias CARoot \
  -import -file ca-cert -storepass $KEYSTORE_PASSWORD -noprompt

# Import signed cert to keystore
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -import -file cert-signed -storepass $KEYSTORE_PASSWORD -noprompt

echo "Generated keystore for $BROKER_HOST"
```

### Generate Client Certificates

```bash
#!/bin/bash
# generate-client-certs.sh

CLIENT_NAME=$1
KEYSTORE_PASSWORD="client-keystore-password"
CA_PASSWORD="ca-password"

# Generate client keystore
keytool -keystore $CLIENT_NAME.keystore.jks -alias $CLIENT_NAME \
  -validity 365 -genkey -keyalg RSA -storetype pkcs12 \
  -storepass $KEYSTORE_PASSWORD -keypass $KEYSTORE_PASSWORD \
  -dname "CN=$CLIENT_NAME,O=YourOrg,C=US"

# Create CSR
keytool -keystore $CLIENT_NAME.keystore.jks -alias $CLIENT_NAME \
  -certreq -file $CLIENT_NAME-cert-request -storepass $KEYSTORE_PASSWORD

# Sign with CA
openssl x509 -req -CA ca-cert -CAkey ca-key \
  -in $CLIENT_NAME-cert-request -out $CLIENT_NAME-cert-signed \
  -days 365 -CAcreateserial -passin pass:$CA_PASSWORD

# Import CA cert
keytool -keystore $CLIENT_NAME.keystore.jks -alias CARoot \
  -import -file ca-cert -storepass $KEYSTORE_PASSWORD -noprompt

# Import signed cert
keytool -keystore $CLIENT_NAME.keystore.jks -alias $CLIENT_NAME \
  -import -file $CLIENT_NAME-cert-signed -storepass $KEYSTORE_PASSWORD -noprompt

echo "Generated keystore for client $CLIENT_NAME"
```

## Broker Configuration

### server.properties

```properties
# SSL listener configuration
listeners=PLAINTEXT://0.0.0.0:9092,SSL://0.0.0.0:9093
advertised.listeners=PLAINTEXT://kafka-broker:9092,SSL://kafka-broker:9093

# SSL settings
ssl.keystore.location=/var/kafka/ssl/kafka.server.keystore.jks
ssl.keystore.password=keystore-password
ssl.key.password=keystore-password
ssl.truststore.location=/var/kafka/ssl/kafka.truststore.jks
ssl.truststore.password=truststore-password

# Enable client authentication (optional)
ssl.client.auth=required

# Inter-broker communication
security.inter.broker.protocol=SSL
ssl.endpoint.identification.algorithm=HTTPS
```

### SSL Only (No Plaintext)

```properties
# SSL only - no plaintext listener
listeners=SSL://0.0.0.0:9093
advertised.listeners=SSL://kafka-broker:9093
security.inter.broker.protocol=SSL
```

## Client Configuration

### Java Producer

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-broker:9093");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

// SSL configuration
props.put("security.protocol", "SSL");
props.put("ssl.truststore.location", "/path/to/kafka.truststore.jks");
props.put("ssl.truststore.password", "truststore-password");

// Client authentication (if ssl.client.auth=required)
props.put("ssl.keystore.location", "/path/to/client.keystore.jks");
props.put("ssl.keystore.password", "client-keystore-password");
props.put("ssl.key.password", "client-keystore-password");

// Hostname verification
props.put("ssl.endpoint.identification.algorithm", "HTTPS");

Producer<String, String> producer = new KafkaProducer<>(props);
```

### Java Consumer

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka-broker:9093");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "ssl-consumer-group");
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

// SSL configuration
props.put("security.protocol", "SSL");
props.put("ssl.truststore.location", "/path/to/kafka.truststore.jks");
props.put("ssl.truststore.password", "truststore-password");
props.put("ssl.keystore.location", "/path/to/client.keystore.jks");
props.put("ssl.keystore.password", "client-keystore-password");
props.put("ssl.key.password", "client-keystore-password");
props.put("ssl.endpoint.identification.algorithm", "HTTPS");

Consumer<String, String> consumer = new KafkaConsumer<>(props);
```

### Python (confluent-kafka)

```python
from confluent_kafka import Producer, Consumer

# Producer
producer = Producer({
    'bootstrap.servers': 'kafka-broker:9093',
    'security.protocol': 'SSL',
    'ssl.ca.location': '/path/to/ca-cert.pem',
    'ssl.certificate.location': '/path/to/client-cert.pem',
    'ssl.key.location': '/path/to/client-key.pem',
    'ssl.key.password': 'key-password'
})

# Consumer
consumer = Consumer({
    'bootstrap.servers': 'kafka-broker:9093',
    'group.id': 'ssl-consumer-group',
    'security.protocol': 'SSL',
    'ssl.ca.location': '/path/to/ca-cert.pem',
    'ssl.certificate.location': '/path/to/client-cert.pem',
    'ssl.key.location': '/path/to/client-key.pem'
})
```

## Docker Compose with SSL

```yaml
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9093:9093"
    volumes:
      - ./ssl:/var/kafka/ssl
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENERS: SSL://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: SSL://localhost:9093
      KAFKA_SECURITY_INTER_BROKER_PROTOCOL: SSL
      KAFKA_SSL_KEYSTORE_LOCATION: /var/kafka/ssl/kafka.server.keystore.jks
      KAFKA_SSL_KEYSTORE_PASSWORD: keystore-password
      KAFKA_SSL_KEY_PASSWORD: keystore-password
      KAFKA_SSL_TRUSTSTORE_LOCATION: /var/kafka/ssl/kafka.truststore.jks
      KAFKA_SSL_TRUSTSTORE_PASSWORD: truststore-password
      KAFKA_SSL_CLIENT_AUTH: required
      KAFKA_SSL_ENDPOINT_IDENTIFICATION_ALGORITHM: HTTPS
```

## Verification

### Test SSL Connection

```bash
# Test with openssl
openssl s_client -connect kafka-broker:9093 \
  -CAfile ca-cert.pem \
  -cert client-cert.pem \
  -key client-key.pem

# Test with kafka-console-producer
kafka-console-producer.sh --bootstrap-server kafka-broker:9093 \
  --topic test \
  --producer.config client-ssl.properties
```

### client-ssl.properties

```properties
security.protocol=SSL
ssl.truststore.location=/path/to/kafka.truststore.jks
ssl.truststore.password=truststore-password
ssl.keystore.location=/path/to/client.keystore.jks
ssl.keystore.password=client-keystore-password
ssl.key.password=client-keystore-password
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use strong passwords | Generate random passwords for keystores |
| Rotate certificates | Plan for certificate renewal before expiry |
| Secure key storage | Use secrets management for passwords |
| Enable hostname verification | Set ssl.endpoint.identification.algorithm=HTTPS |
| Monitor certificate expiry | Alert before certificates expire |

SSL/TLS encryption is essential for protecting sensitive data in Kafka deployments and meeting compliance requirements.
