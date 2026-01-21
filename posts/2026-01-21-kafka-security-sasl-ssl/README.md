# How to Configure Kafka Security (SASL/SSL)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Security, SASL, SSL, TLS, Authentication, Encryption, DevOps

Description: A comprehensive guide to securing Apache Kafka with SSL/TLS encryption and SASL authentication, covering certificate generation, broker configuration, client setup, and security best practices for production deployments.

---

Securing Apache Kafka is essential for production deployments. This guide covers implementing SSL/TLS for encryption and SASL for authentication, providing defense in depth for your Kafka cluster.

## Security Overview

Kafka supports multiple security mechanisms:

- **SSL/TLS**: Encrypts data in transit between clients and brokers
- **SASL**: Provides authentication (PLAIN, SCRAM, GSSAPI/Kerberos, OAUTHBEARER)
- **ACLs**: Authorization for topic and consumer group access

## Setting Up SSL/TLS Encryption

### Step 1: Generate Certificate Authority (CA)

```bash
#!/bin/bash
# generate-ca.sh

# Set variables
CA_PASSWORD="ca-password"
VALIDITY_DAYS=365

# Create directory structure
mkdir -p ssl/{ca,broker,client}

# Generate CA private key
openssl genrsa -aes256 -passout pass:${CA_PASSWORD} \
  -out ssl/ca/ca-key.pem 4096

# Generate CA certificate
openssl req -new -x509 \
  -key ssl/ca/ca-key.pem \
  -passin pass:${CA_PASSWORD} \
  -out ssl/ca/ca-cert.pem \
  -days ${VALIDITY_DAYS} \
  -subj "/CN=Kafka-CA/O=MyOrg/C=US"

echo "CA certificate generated: ssl/ca/ca-cert.pem"
```

### Step 2: Generate Broker Certificates

```bash
#!/bin/bash
# generate-broker-cert.sh

BROKER_NAME=${1:-kafka-broker}
CA_PASSWORD="ca-password"
BROKER_PASSWORD="broker-password"
VALIDITY_DAYS=365

# Generate broker private key and CSR
openssl req -newkey rsa:4096 -nodes \
  -keyout ssl/broker/${BROKER_NAME}-key.pem \
  -out ssl/broker/${BROKER_NAME}.csr \
  -subj "/CN=${BROKER_NAME}/O=MyOrg/C=US"

# Create extensions file for SAN
cat > ssl/broker/${BROKER_NAME}-ext.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = req_ext
[req_distinguished_name]
[req_ext]
subjectAltName = @alt_names
[alt_names]
DNS.1 = ${BROKER_NAME}
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Sign broker certificate with CA
openssl x509 -req \
  -in ssl/broker/${BROKER_NAME}.csr \
  -CA ssl/ca/ca-cert.pem \
  -CAkey ssl/ca/ca-key.pem \
  -passin pass:${CA_PASSWORD} \
  -CAcreateserial \
  -out ssl/broker/${BROKER_NAME}-cert.pem \
  -days ${VALIDITY_DAYS} \
  -extfile ssl/broker/${BROKER_NAME}-ext.cnf \
  -extensions req_ext

# Create PKCS12 keystore
openssl pkcs12 -export \
  -in ssl/broker/${BROKER_NAME}-cert.pem \
  -inkey ssl/broker/${BROKER_NAME}-key.pem \
  -chain -CAfile ssl/ca/ca-cert.pem \
  -name ${BROKER_NAME} \
  -out ssl/broker/${BROKER_NAME}.p12 \
  -password pass:${BROKER_PASSWORD}

# Convert to JKS keystore
keytool -importkeystore \
  -srckeystore ssl/broker/${BROKER_NAME}.p12 \
  -srcstoretype PKCS12 \
  -srcstorepass ${BROKER_PASSWORD} \
  -destkeystore ssl/broker/${BROKER_NAME}.keystore.jks \
  -deststoretype JKS \
  -deststorepass ${BROKER_PASSWORD}

# Create truststore with CA certificate
keytool -importcert \
  -keystore ssl/broker/${BROKER_NAME}.truststore.jks \
  -storepass ${BROKER_PASSWORD} \
  -alias ca-cert \
  -file ssl/ca/ca-cert.pem \
  -noprompt

echo "Broker certificates generated for ${BROKER_NAME}"
```

### Step 3: Generate Client Certificates

```bash
#!/bin/bash
# generate-client-cert.sh

CLIENT_NAME=${1:-kafka-client}
CA_PASSWORD="ca-password"
CLIENT_PASSWORD="client-password"
VALIDITY_DAYS=365

# Generate client private key and CSR
openssl req -newkey rsa:4096 -nodes \
  -keyout ssl/client/${CLIENT_NAME}-key.pem \
  -out ssl/client/${CLIENT_NAME}.csr \
  -subj "/CN=${CLIENT_NAME}/O=MyOrg/C=US"

# Sign client certificate with CA
openssl x509 -req \
  -in ssl/client/${CLIENT_NAME}.csr \
  -CA ssl/ca/ca-cert.pem \
  -CAkey ssl/ca/ca-key.pem \
  -passin pass:${CA_PASSWORD} \
  -CAcreateserial \
  -out ssl/client/${CLIENT_NAME}-cert.pem \
  -days ${VALIDITY_DAYS}

# Create PKCS12 keystore
openssl pkcs12 -export \
  -in ssl/client/${CLIENT_NAME}-cert.pem \
  -inkey ssl/client/${CLIENT_NAME}-key.pem \
  -chain -CAfile ssl/ca/ca-cert.pem \
  -name ${CLIENT_NAME} \
  -out ssl/client/${CLIENT_NAME}.p12 \
  -password pass:${CLIENT_PASSWORD}

# Convert to JKS keystore
keytool -importkeystore \
  -srckeystore ssl/client/${CLIENT_NAME}.p12 \
  -srcstoretype PKCS12 \
  -srcstorepass ${CLIENT_PASSWORD} \
  -destkeystore ssl/client/${CLIENT_NAME}.keystore.jks \
  -deststoretype JKS \
  -deststorepass ${CLIENT_PASSWORD}

# Create truststore
keytool -importcert \
  -keystore ssl/client/${CLIENT_NAME}.truststore.jks \
  -storepass ${CLIENT_PASSWORD} \
  -alias ca-cert \
  -file ssl/ca/ca-cert.pem \
  -noprompt

echo "Client certificates generated for ${CLIENT_NAME}"
```

### Step 4: Configure Broker for SSL

```properties
# server.properties

# Listeners
listeners=PLAINTEXT://:9092,SSL://:9093
advertised.listeners=PLAINTEXT://broker1:9092,SSL://broker1:9093
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,SSL:SSL

# SSL configuration
ssl.keystore.location=/etc/kafka/ssl/kafka-broker.keystore.jks
ssl.keystore.password=broker-password
ssl.key.password=broker-password
ssl.truststore.location=/etc/kafka/ssl/kafka-broker.truststore.jks
ssl.truststore.password=broker-password

# Inter-broker communication
security.inter.broker.protocol=SSL

# SSL settings
ssl.client.auth=required
ssl.enabled.protocols=TLSv1.3,TLSv1.2
ssl.protocol=TLSv1.3
ssl.cipher.suites=TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256
```

## Setting Up SASL Authentication

### SASL/PLAIN Authentication

SASL/PLAIN is simple but sends credentials in clear text - always use with SSL.

#### Broker Configuration for SASL/PLAIN

```properties
# server.properties

# Listeners
listeners=SASL_SSL://:9093
advertised.listeners=SASL_SSL://broker1:9093
listener.security.protocol.map=SASL_SSL:SASL_SSL

# SASL configuration
sasl.enabled.mechanisms=PLAIN
sasl.mechanism.inter.broker.protocol=PLAIN

# SSL configuration
ssl.keystore.location=/etc/kafka/ssl/kafka-broker.keystore.jks
ssl.keystore.password=broker-password
ssl.key.password=broker-password
ssl.truststore.location=/etc/kafka/ssl/kafka-broker.truststore.jks
ssl.truststore.password=broker-password

# Inter-broker communication
security.inter.broker.protocol=SASL_SSL
```

#### JAAS Configuration for Broker

```
# /etc/kafka/kafka_server_jaas.conf

KafkaServer {
    org.apache.kafka.common.security.plain.PlainLoginModule required
    username="admin"
    password="admin-secret"
    user_admin="admin-secret"
    user_producer="producer-secret"
    user_consumer="consumer-secret";
};
```

Set the JAAS config as a JVM option:

```bash
export KAFKA_OPTS="-Djava.security.auth.login.config=/etc/kafka/kafka_server_jaas.conf"
```

### SASL/SCRAM Authentication

SCRAM provides secure password-based authentication with salted credentials.

#### Create SCRAM Users

```bash
# Create admin user
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=admin-secret],SCRAM-SHA-512=[password=admin-secret]' \
  --entity-type users --entity-name admin

# Create application users
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=producer-secret],SCRAM-SHA-512=[password=producer-secret]' \
  --entity-type users --entity-name producer-user

bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=consumer-secret],SCRAM-SHA-512=[password=consumer-secret]' \
  --entity-type users --entity-name consumer-user
```

#### Broker Configuration for SASL/SCRAM

```properties
# server.properties

# Listeners
listeners=SASL_SSL://:9093
advertised.listeners=SASL_SSL://broker1:9093

# SASL configuration
sasl.enabled.mechanisms=SCRAM-SHA-256,SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512

# SSL configuration
ssl.keystore.location=/etc/kafka/ssl/kafka-broker.keystore.jks
ssl.keystore.password=broker-password
ssl.truststore.location=/etc/kafka/ssl/kafka-broker.truststore.jks
ssl.truststore.password=broker-password

# Inter-broker communication
security.inter.broker.protocol=SASL_SSL
```

#### JAAS Configuration for SCRAM

```
# /etc/kafka/kafka_server_jaas.conf

KafkaServer {
    org.apache.kafka.common.security.scram.ScramLoginModule required
    username="admin"
    password="admin-secret";
};
```

## Client Configuration

### Java Client with SASL/SCRAM

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import java.util.Properties;

public class SecureKafkaClient {

    public static Properties getSecureConfig(String username, String password) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "broker1:9093");

        // SSL configuration
        props.put("security.protocol", "SASL_SSL");
        props.put("ssl.truststore.location", "/path/to/client.truststore.jks");
        props.put("ssl.truststore.password", "client-password");

        // SASL configuration
        props.put("sasl.mechanism", "SCRAM-SHA-512");
        props.put("sasl.jaas.config",
            "org.apache.kafka.common.security.scram.ScramLoginModule required " +
            "username=\"" + username + "\" " +
            "password=\"" + password + "\";");

        return props;
    }

    public static Producer<String, String> createProducer(String username, String password) {
        Properties props = getSecureConfig(username, password);
        props.put("key.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put("acks", "all");

        return new KafkaProducer<>(props);
    }

    public static Consumer<String, String> createConsumer(
            String username, String password, String groupId) {
        Properties props = getSecureConfig(username, password);
        props.put("key.deserializer",
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer",
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("group.id", groupId);
        props.put("auto.offset.reset", "earliest");

        return new KafkaConsumer<>(props);
    }

    public static void main(String[] args) {
        // Create secure producer
        Producer<String, String> producer = createProducer("producer-user", "producer-secret");

        producer.send(new ProducerRecord<>("secure-topic", "key", "value"));
        producer.close();

        // Create secure consumer
        Consumer<String, String> consumer = createConsumer(
            "consumer-user", "consumer-secret", "secure-group");

        consumer.subscribe(java.util.Collections.singletonList("secure-topic"));
        // ... consume messages
        consumer.close();
    }
}
```

### Python Client with SASL/SCRAM

```python
from kafka import KafkaProducer, KafkaConsumer
import json

def create_secure_producer(username, password):
    return KafkaProducer(
        bootstrap_servers=['broker1:9093'],
        security_protocol='SASL_SSL',
        sasl_mechanism='SCRAM-SHA-512',
        sasl_plain_username=username,
        sasl_plain_password=password,
        ssl_cafile='/path/to/ca-cert.pem',
        ssl_certfile='/path/to/client-cert.pem',
        ssl_keyfile='/path/to/client-key.pem',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

def create_secure_consumer(username, password, group_id):
    return KafkaConsumer(
        'secure-topic',
        bootstrap_servers=['broker1:9093'],
        security_protocol='SASL_SSL',
        sasl_mechanism='SCRAM-SHA-512',
        sasl_plain_username=username,
        sasl_plain_password=password,
        ssl_cafile='/path/to/ca-cert.pem',
        ssl_certfile='/path/to/client-cert.pem',
        ssl_keyfile='/path/to/client-key.pem',
        group_id=group_id,
        auto_offset_reset='earliest',
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

# Usage
producer = create_secure_producer('producer-user', 'producer-secret')
producer.send('secure-topic', {'message': 'Hello, Secure Kafka!'})
producer.flush()

consumer = create_secure_consumer('consumer-user', 'consumer-secret', 'secure-group')
for message in consumer:
    print(f"Received: {message.value}")
```

### Node.js Client with SASL/SCRAM

```javascript
const { Kafka } = require('kafkajs');
const fs = require('fs');

const kafka = new Kafka({
  clientId: 'secure-app',
  brokers: ['broker1:9093'],
  ssl: {
    ca: [fs.readFileSync('/path/to/ca-cert.pem', 'utf-8')],
    cert: fs.readFileSync('/path/to/client-cert.pem', 'utf-8'),
    key: fs.readFileSync('/path/to/client-key.pem', 'utf-8')
  },
  sasl: {
    mechanism: 'scram-sha-512',
    username: 'producer-user',
    password: 'producer-secret'
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'secure-group' });

async function run() {
  await producer.connect();
  await consumer.connect();

  await producer.send({
    topic: 'secure-topic',
    messages: [
      { key: 'key1', value: 'Hello, Secure Kafka!' }
    ]
  });

  await consumer.subscribe({ topic: 'secure-topic', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString()
      });
    }
  });
}

run().catch(console.error);
```

## Setting Up ACLs for Authorization

### Enable ACL Authorization

```properties
# server.properties

# Authorization
authorizer.class.name=org.apache.kafka.metadata.authorizer.StandardAuthorizer
allow.everyone.if.no.acl.found=false
super.users=User:admin
```

### Create ACLs

```bash
# Grant producer permissions
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config /etc/kafka/admin.properties \
  --add --allow-principal User:producer-user \
  --operation Write --operation Describe \
  --topic orders

# Grant consumer permissions
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config /etc/kafka/admin.properties \
  --add --allow-principal User:consumer-user \
  --operation Read --operation Describe \
  --topic orders

# Grant consumer group permissions
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config /etc/kafka/admin.properties \
  --add --allow-principal User:consumer-user \
  --operation Read \
  --group order-processor

# Grant permissions for all topics with prefix
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config /etc/kafka/admin.properties \
  --add --allow-principal User:app-user \
  --operation All \
  --topic 'app-' --resource-pattern-type prefixed

# List ACLs
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config /etc/kafka/admin.properties \
  --list
```

### Admin Properties File

```properties
# /etc/kafka/admin.properties
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="admin" \
  password="admin-secret";
ssl.truststore.location=/etc/kafka/ssl/admin.truststore.jks
ssl.truststore.password=admin-password
```

## Docker Compose with Security

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka-secure
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,SSL://:9093,CONTROLLER://:9094
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,SSL://localhost:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9094
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      # SSL Configuration
      KAFKA_SSL_KEYSTORE_LOCATION: /etc/kafka/secrets/kafka.keystore.jks
      KAFKA_SSL_KEYSTORE_PASSWORD: broker-password
      KAFKA_SSL_KEY_PASSWORD: broker-password
      KAFKA_SSL_TRUSTSTORE_LOCATION: /etc/kafka/secrets/kafka.truststore.jks
      KAFKA_SSL_TRUSTSTORE_PASSWORD: broker-password
      KAFKA_SSL_CLIENT_AUTH: required
      KAFKA_SSL_ENABLED_PROTOCOLS: TLSv1.3,TLSv1.2
    volumes:
      - ./ssl/broker:/etc/kafka/secrets:ro
      - kafka-data:/var/lib/kafka/data

volumes:
  kafka-data:
```

## Security Best Practices

### Certificate Management

1. **Use short-lived certificates** - Rotate certificates regularly (30-90 days)
2. **Secure private keys** - Store in HSM or secrets manager
3. **Use strong key sizes** - Minimum 2048-bit RSA or 256-bit ECDSA
4. **Monitor certificate expiration** - Alert before expiry

### Password Management

1. **Use strong passwords** - Minimum 16 characters with complexity
2. **Store secrets securely** - Use HashiCorp Vault, AWS Secrets Manager
3. **Rotate credentials** - Regular rotation policy
4. **Audit access** - Log and monitor authentication events

### Network Security

1. **Use private networks** - Deploy Kafka in private subnets
2. **Enable encryption** - Always use SSL/TLS in production
3. **Restrict access** - Use security groups and firewalls
4. **Disable plaintext listeners** - Remove PLAINTEXT in production

### Monitoring Security

```bash
# Check for unauthorized access attempts
grep -i "authentication failed" /var/log/kafka/server.log

# Monitor ACL changes
grep -i "acl" /var/log/kafka/authorizer.log

# Check SSL handshake failures
grep -i "ssl handshake" /var/log/kafka/server.log
```

## Troubleshooting

### SSL Handshake Failures

```bash
# Test SSL connection
openssl s_client -connect broker1:9093 -CAfile ca-cert.pem

# Verify certificate chain
openssl verify -CAfile ca-cert.pem broker-cert.pem
```

### SASL Authentication Failures

```bash
# Check JAAS configuration
echo $KAFKA_OPTS

# Test with kafka-console-producer
bin/kafka-console-producer.sh --bootstrap-server broker1:9093 \
  --topic test \
  --producer.config client.properties
```

### ACL Permission Denied

```bash
# List all ACLs
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config admin.properties \
  --list --principal User:myuser

# Check specific topic ACLs
bin/kafka-acls.sh --bootstrap-server broker1:9093 \
  --command-config admin.properties \
  --list --topic mytopic
```

## Conclusion

Securing Kafka requires a layered approach combining SSL/TLS encryption, SASL authentication, and ACL authorization. Start with SSL for encryption, add SASL/SCRAM for authentication, and implement fine-grained ACLs for authorization. Regular auditing and monitoring ensure your security posture remains strong.

Remember to:
- Always use encryption in production
- Implement least-privilege access with ACLs
- Rotate credentials and certificates regularly
- Monitor and audit security events
- Test security configurations before production deployment
