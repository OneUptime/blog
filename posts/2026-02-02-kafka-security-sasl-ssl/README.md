# How to Set Up Kafka Security (SASL/SSL)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kafka, Security, SASL, SSL, Authentication

Description: A comprehensive guide to securing Apache Kafka with SASL authentication, SSL encryption, and ACLs for production environments.

---

Running Kafka without security in production is asking for trouble. Anyone on your network can read messages, write to topics, or even delete data. This guide walks through setting up SASL authentication, SSL encryption, and ACLs to lock down your Kafka cluster properly.

## Understanding Kafka Security Components

Kafka security has three main pieces:

| Component | What It Does | Protocol |
|-----------|-------------|----------|
| **Encryption** | Protects data in transit | SSL/TLS |
| **Authentication** | Verifies client identity | SASL (PLAIN, SCRAM, GSSAPI) |
| **Authorization** | Controls who can do what | ACLs |

You can use these independently or combine them. Most production setups use SASL for authentication plus SSL for encryption.

## SASL Mechanisms Comparison

| Mechanism | Complexity | Password Storage | Use Case |
|-----------|-----------|------------------|----------|
| PLAIN | Low | Plaintext in config | Development, internal networks |
| SCRAM-SHA-256 | Medium | Hashed in ZooKeeper | Production without Kerberos |
| SCRAM-SHA-512 | Medium | Hashed in ZooKeeper | Production (stronger hashing) |
| GSSAPI (Kerberos) | High | Kerberos KDC | Enterprise with existing Kerberos |

SCRAM is the sweet spot for most teams - good security without the complexity of Kerberos.

## Step 1: Generate SSL Certificates

First, create a Certificate Authority and broker certificates. Run these commands on your Kafka server:

```bash
#!/bin/bash
# generate-certs.sh - Creates CA and broker certificates

VALIDITY=365
PASSWORD="your-keystore-password"
CA_PASSWORD="your-ca-password"

# Create directory for certificates
mkdir -p /opt/kafka/ssl
cd /opt/kafka/ssl

# Generate Certificate Authority (CA) key and certificate
openssl req -new -x509 -keyout ca-key -out ca-cert -days $VALIDITY \
  -subj "/CN=kafka-ca/O=YourOrg" \
  -passout pass:$CA_PASSWORD

# Create broker keystore with private key
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -validity $VALIDITY -genkey -keyalg RSA -storepass $PASSWORD \
  -dname "CN=kafka-broker-1,O=YourOrg"

# Create certificate signing request (CSR)
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -certreq -file cert-file -storepass $PASSWORD

# Sign the certificate with our CA
openssl x509 -req -CA ca-cert -CAkey ca-key -in cert-file \
  -out cert-signed -days $VALIDITY -CAcreateserial \
  -passin pass:$CA_PASSWORD

# Import CA certificate into keystore
keytool -keystore kafka.server.keystore.jks -alias CARoot \
  -import -file ca-cert -storepass $PASSWORD -noprompt

# Import signed certificate into keystore
keytool -keystore kafka.server.keystore.jks -alias localhost \
  -import -file cert-signed -storepass $PASSWORD -noprompt

# Create truststore with CA certificate (for verifying clients)
keytool -keystore kafka.server.truststore.jks -alias CARoot \
  -import -file ca-cert -storepass $PASSWORD -noprompt

echo "Certificates generated in /opt/kafka/ssl"
```

## Step 2: Configure Kafka Broker for SASL/SSL

Update your broker configuration to enable both SASL authentication and SSL encryption.

```properties
# server.properties - Kafka broker configuration

# Enable SASL_SSL on port 9093
listeners=SASL_SSL://0.0.0.0:9093
advertised.listeners=SASL_SSL://kafka-broker-1.example.com:9093

# Security protocol mapping
security.inter.broker.protocol=SASL_SSL

# SSL Configuration
ssl.keystore.location=/opt/kafka/ssl/kafka.server.keystore.jks
ssl.keystore.password=your-keystore-password
ssl.key.password=your-keystore-password
ssl.truststore.location=/opt/kafka/ssl/kafka.server.truststore.jks
ssl.truststore.password=your-keystore-password

# Require client authentication (mutual TLS)
ssl.client.auth=required

# SASL Configuration - using SCRAM-SHA-512
sasl.enabled.mechanisms=SCRAM-SHA-512
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512

# Enable authorization with ACLs
authorizer.class.name=kafka.security.authorizer.AclAuthorizer

# Super users can bypass ACLs (for admin operations)
super.users=User:admin

# Deny access by default when no ACL matches
allow.everyone.if.no.acl.found=false
```

## Step 3: Create SASL Users with SCRAM

SCRAM stores user credentials in ZooKeeper with salted hashes. Create users using kafka-configs:

```bash
#!/bin/bash
# create-users.sh - Creates SASL users in ZooKeeper

KAFKA_HOME=/opt/kafka
ZOOKEEPER=localhost:2181

# Create admin user (for broker inter-communication and admin tasks)
$KAFKA_HOME/bin/kafka-configs.sh --zookeeper $ZOOKEEPER \
  --alter --add-config 'SCRAM-SHA-512=[password=admin-secret-password]' \
  --entity-type users --entity-name admin

# Create application user for producers
$KAFKA_HOME/bin/kafka-configs.sh --zookeeper $ZOOKEEPER \
  --alter --add-config 'SCRAM-SHA-512=[password=producer-password]' \
  --entity-type users --entity-name producer-app

# Create application user for consumers
$KAFKA_HOME/bin/kafka-configs.sh --zookeeper $ZOOKEEPER \
  --alter --add-config 'SCRAM-SHA-512=[password=consumer-password]' \
  --entity-type users --entity-name consumer-app

# Verify users were created
$KAFKA_HOME/bin/kafka-configs.sh --zookeeper $ZOOKEEPER \
  --describe --entity-type users

echo "Users created successfully"
```

## Step 4: Broker JAAS Configuration

Create a JAAS file for the broker to authenticate with other brokers and handle client authentication.

```
// /opt/kafka/config/kafka_server_jaas.conf
KafkaServer {
    org.apache.kafka.common.security.scram.ScramLoginModule required
    username="admin"
    password="admin-secret-password";
};

// For ZooKeeper authentication (if ZooKeeper requires auth)
Client {
    org.apache.kafka.common.security.plain.PlainLoginModule required
    username="kafka"
    password="kafka-zk-password";
};
```

Set the JAAS config when starting Kafka:

```bash
export KAFKA_OPTS="-Djava.security.auth.login.config=/opt/kafka/config/kafka_server_jaas.conf"
/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/server.properties
```

## Step 5: Configure ACLs

ACLs control which users can perform which operations on which resources.

```bash
#!/bin/bash
# setup-acls.sh - Configure access control lists

KAFKA_HOME=/opt/kafka
BOOTSTRAP=kafka-broker-1.example.com:9093
COMMAND_CONFIG=/opt/kafka/config/admin.properties

# Allow producer-app to write to orders topic
$KAFKA_HOME/bin/kafka-acls.sh --bootstrap-server $BOOTSTRAP \
  --command-config $COMMAND_CONFIG \
  --add --allow-principal User:producer-app \
  --operation Write --operation Describe \
  --topic orders

# Allow consumer-app to read from orders topic with consumer group
$KAFKA_HOME/bin/kafka-acls.sh --bootstrap-server $BOOTSTRAP \
  --command-config $COMMAND_CONFIG \
  --add --allow-principal User:consumer-app \
  --operation Read --operation Describe \
  --topic orders

$KAFKA_HOME/bin/kafka-acls.sh --bootstrap-server $BOOTSTRAP \
  --command-config $COMMAND_CONFIG \
  --add --allow-principal User:consumer-app \
  --operation Read \
  --group order-processors

# List all ACLs to verify
$KAFKA_HOME/bin/kafka-acls.sh --bootstrap-server $BOOTSTRAP \
  --command-config $COMMAND_CONFIG \
  --list
```

The admin.properties file for running admin commands:

```properties
# /opt/kafka/config/admin.properties
security.protocol=SASL_SSL
sasl.mechanism=SCRAM-SHA-512
ssl.truststore.location=/opt/kafka/ssl/kafka.server.truststore.jks
ssl.truststore.password=your-keystore-password
sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="admin" \
  password="admin-secret-password";
```

## Step 6: Java Producer Configuration

Configure your Java producer to connect with SASL/SSL:

```java
// KafkaProducerConfig.java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class SecureKafkaProducer {

    public static Producer<String, String> createProducer() {
        Properties props = new Properties();

        // Bootstrap servers with SASL_SSL port
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,
            "kafka-broker-1.example.com:9093");

        // Serializers
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Security protocol - SASL over SSL
        props.put("security.protocol", "SASL_SSL");

        // SASL mechanism
        props.put("sasl.mechanism", "SCRAM-SHA-512");

        // SASL credentials (in production, load from secure config)
        props.put("sasl.jaas.config",
            "org.apache.kafka.common.security.scram.ScramLoginModule required " +
            "username=\"producer-app\" " +
            "password=\"producer-password\";");

        // SSL truststore to verify broker certificate
        props.put("ssl.truststore.location", "/path/to/client.truststore.jks");
        props.put("ssl.truststore.password", "truststore-password");

        // Optional: enable hostname verification
        props.put("ssl.endpoint.identification.algorithm", "https");

        return new KafkaProducer<>(props);
    }

    public static void main(String[] args) {
        try (Producer<String, String> producer = createProducer()) {
            ProducerRecord<String, String> record =
                new ProducerRecord<>("orders", "order-123", "{\"item\":\"widget\"}");

            producer.send(record, (metadata, exception) -> {
                if (exception != null) {
                    System.err.println("Send failed: " + exception.getMessage());
                } else {
                    System.out.printf("Sent to partition %d, offset %d%n",
                        metadata.partition(), metadata.offset());
                }
            });
        }
    }
}
```

## Step 7: Java Consumer Configuration

```java
// SecureKafkaConsumer.java
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.StringDeserializer;
import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class SecureKafkaConsumer {

    public static Consumer<String, String> createConsumer() {
        Properties props = new Properties();

        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
            "kafka-broker-1.example.com:9093");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-processors");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        // Security settings - same pattern as producer
        props.put("security.protocol", "SASL_SSL");
        props.put("sasl.mechanism", "SCRAM-SHA-512");
        props.put("sasl.jaas.config",
            "org.apache.kafka.common.security.scram.ScramLoginModule required " +
            "username=\"consumer-app\" " +
            "password=\"consumer-password\";");
        props.put("ssl.truststore.location", "/path/to/client.truststore.jks");
        props.put("ssl.truststore.password", "truststore-password");

        return new KafkaConsumer<>(props);
    }

    public static void main(String[] args) {
        try (Consumer<String, String> consumer = createConsumer()) {
            consumer.subscribe(Collections.singletonList("orders"));

            while (true) {
                ConsumerRecords<String, String> records =
                    consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, String> record : records) {
                    System.out.printf("Received: key=%s, value=%s, partition=%d%n",
                        record.key(), record.value(), record.partition());
                }
            }
        }
    }
}
```

## Troubleshooting Common Issues

**Authentication failed**: Check that usernames and passwords match exactly between client config and what you created in ZooKeeper. SCRAM is case-sensitive.

**SSL handshake failed**: Verify the client truststore contains the CA certificate that signed the broker certificate. Test with:

```bash
openssl s_client -connect kafka-broker-1:9093 -CAfile ca-cert
```

**Authorization failed**: Run kafka-acls.sh --list to verify the ACLs exist. Make sure the principal name matches exactly (User:producer-app, not just producer-app).

**Connection timeout**: Ensure port 9093 is open in your firewall and the advertised.listeners hostname resolves correctly from the client.

## Summary

| Step | What You Configured |
|------|-------------------|
| SSL Certificates | Encryption for data in transit |
| SASL/SCRAM | User authentication with hashed passwords |
| Broker config | Enabled security protocols and ACL authorizer |
| ACLs | Fine-grained access control per user |
| Client config | Producer/consumer authentication settings |

Once you have this foundation, you can expand with more topics, users, and fine-grained ACLs as your system grows. The key is starting secure from day one - retrofitting security onto an existing insecure cluster is always harder than building it in from the start.
