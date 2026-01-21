# How to Implement Kafka SASL Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, SASL, Authentication, Security, SCRAM, Kerberos, PLAIN

Description: A comprehensive guide to implementing SASL authentication in Apache Kafka, covering PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, and Kerberos mechanisms.

---

SASL (Simple Authentication and Security Layer) provides authentication for Apache Kafka, ensuring that only authorized clients can connect to your cluster. This guide covers how to implement different SASL mechanisms including PLAIN, SCRAM, and Kerberos.

## Understanding SASL Mechanisms

Kafka supports several SASL mechanisms:

| Mechanism | Security Level | Use Case |
|-----------|---------------|----------|
| PLAIN | Basic (requires TLS) | Development, simple setups |
| SCRAM-SHA-256 | Good | Production without Kerberos |
| SCRAM-SHA-512 | Better | Production without Kerberos |
| GSSAPI (Kerberos) | Enterprise | Enterprise environments |
| OAUTHBEARER | Modern | Cloud-native, OAuth2 integration |

## Implementing SASL/PLAIN

SASL/PLAIN transmits credentials in clear text, so it must be used with TLS.

### Broker Configuration

```properties
# server.properties

# Enable SASL/PLAIN
listeners=SASL_SSL://0.0.0.0:9093
advertised.listeners=SASL_SSL://broker1.example.com:9093
security.inter.broker.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=PLAIN
sasl.enabled.mechanisms=PLAIN

# SSL configuration
ssl.keystore.location=/etc/kafka/ssl/kafka.keystore.jks
ssl.keystore.password=keystore-password
ssl.key.password=key-password
ssl.truststore.location=/etc/kafka/ssl/kafka.truststore.jks
ssl.truststore.password=truststore-password

# JAAS configuration file
listener.name.sasl_ssl.plain.sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required \
  username="admin" \
  password="admin-secret" \
  user_admin="admin-secret" \
  user_producer="producer-secret" \
  user_consumer="consumer-secret";
```

### Java Producer with SASL/PLAIN

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class SaslPlainProducer {

    public static KafkaProducer<String, String> createProducer(
            String bootstrapServers,
            String username,
            String password,
            String truststorePath,
            String truststorePassword) {

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Security configuration
        props.put("security.protocol", "SASL_SSL");
        props.put("sasl.mechanism", "PLAIN");
        props.put("sasl.jaas.config",
            "org.apache.kafka.common.security.plain.PlainLoginModule required " +
            "username=\"" + username + "\" " +
            "password=\"" + password + "\";");

        // SSL configuration
        props.put("ssl.truststore.location", truststorePath);
        props.put("ssl.truststore.password", truststorePassword);

        return new KafkaProducer<>(props);
    }

    public static void main(String[] args) {
        try (KafkaProducer<String, String> producer = createProducer(
                "broker1:9093",
                "producer",
                "producer-secret",
                "/etc/kafka/ssl/client.truststore.jks",
                "truststore-password")) {

            producer.send(new ProducerRecord<>("test-topic", "key", "value")).get();
            System.out.println("Message sent successfully with SASL/PLAIN");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Python Client with SASL/PLAIN

```python
from confluent_kafka import Producer, Consumer

def create_sasl_plain_producer(bootstrap_servers: str,
                               username: str,
                               password: str,
                               ssl_ca_location: str) -> Producer:
    """Create a producer with SASL/PLAIN authentication."""
    config = {
        'bootstrap.servers': bootstrap_servers,
        'security.protocol': 'SASL_SSL',
        'sasl.mechanism': 'PLAIN',
        'sasl.username': username,
        'sasl.password': password,
        'ssl.ca.location': ssl_ca_location,
    }
    return Producer(config)


def create_sasl_plain_consumer(bootstrap_servers: str,
                               group_id: str,
                               username: str,
                               password: str,
                               ssl_ca_location: str) -> Consumer:
    """Create a consumer with SASL/PLAIN authentication."""
    config = {
        'bootstrap.servers': bootstrap_servers,
        'group.id': group_id,
        'security.protocol': 'SASL_SSL',
        'sasl.mechanism': 'PLAIN',
        'sasl.username': username,
        'sasl.password': password,
        'ssl.ca.location': ssl_ca_location,
        'auto.offset.reset': 'earliest',
    }
    return Consumer(config)


def main():
    producer = create_sasl_plain_producer(
        bootstrap_servers='broker1:9093',
        username='producer',
        password='producer-secret',
        ssl_ca_location='/etc/kafka/ssl/ca-cert.pem'
    )

    def delivery_callback(err, msg):
        if err:
            print(f'Delivery failed: {err}')
        else:
            print(f'Message delivered to {msg.topic()} [{msg.partition()}]')

    producer.produce('test-topic', key='key', value='value',
                    callback=delivery_callback)
    producer.flush()


if __name__ == '__main__':
    main()
```

## Implementing SASL/SCRAM

SCRAM (Salted Challenge Response Authentication Mechanism) is more secure than PLAIN as it does not transmit passwords.

### Creating SCRAM Users

```bash
# Create SCRAM-SHA-512 user
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=producer-secret]' \
  --entity-type users --entity-name producer

# Create SCRAM-SHA-256 user
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-256=[password=consumer-secret]' \
  --entity-type users --entity-name consumer

# List SCRAM credentials
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --describe --entity-type users --entity-name producer
```

### Broker Configuration for SCRAM

```properties
# server.properties

listeners=SASL_SSL://0.0.0.0:9093
advertised.listeners=SASL_SSL://broker1.example.com:9093
security.inter.broker.protocol=SASL_SSL
sasl.mechanism.inter.broker.protocol=SCRAM-SHA-512
sasl.enabled.mechanisms=SCRAM-SHA-256,SCRAM-SHA-512

# SSL configuration
ssl.keystore.location=/etc/kafka/ssl/kafka.keystore.jks
ssl.keystore.password=keystore-password
ssl.key.password=key-password
ssl.truststore.location=/etc/kafka/ssl/kafka.truststore.jks
ssl.truststore.password=truststore-password

# Inter-broker JAAS config
listener.name.sasl_ssl.scram-sha-512.sasl.jaas.config=org.apache.kafka.common.security.scram.ScramLoginModule required \
  username="admin" \
  password="admin-secret";
```

### Java Client with SCRAM

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.serialization.*;
import java.util.*;

public class SaslScramClient {

    public static Properties getScramConfig(String bootstrapServers,
                                            String username,
                                            String password,
                                            String mechanism) {
        Properties props = new Properties();
        props.put("bootstrap.servers", bootstrapServers);
        props.put("security.protocol", "SASL_SSL");
        props.put("sasl.mechanism", mechanism);

        String jaasConfig = String.format(
            "org.apache.kafka.common.security.scram.ScramLoginModule required " +
            "username=\"%s\" password=\"%s\";",
            username, password);
        props.put("sasl.jaas.config", jaasConfig);

        // SSL settings
        props.put("ssl.truststore.location", "/etc/kafka/ssl/client.truststore.jks");
        props.put("ssl.truststore.password", "truststore-password");

        return props;
    }

    public static KafkaProducer<String, String> createProducer(
            String bootstrapServers,
            String username,
            String password) {

        Properties props = getScramConfig(bootstrapServers, username, password,
            "SCRAM-SHA-512");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        return new KafkaProducer<>(props);
    }

    public static KafkaConsumer<String, String> createConsumer(
            String bootstrapServers,
            String groupId,
            String username,
            String password) {

        Properties props = getScramConfig(bootstrapServers, username, password,
            "SCRAM-SHA-512");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            StringDeserializer.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return new KafkaConsumer<>(props);
    }

    public static void main(String[] args) throws Exception {
        // Producer example
        try (KafkaProducer<String, String> producer = createProducer(
                "broker1:9093", "producer", "producer-secret")) {

            producer.send(new ProducerRecord<>("secure-topic", "key", "value")).get();
            System.out.println("Message sent with SCRAM authentication");
        }

        // Consumer example
        try (KafkaConsumer<String, String> consumer = createConsumer(
                "broker1:9093", "secure-group", "consumer", "consumer-secret")) {

            consumer.subscribe(Collections.singletonList("secure-topic"));
            ConsumerRecords<String, String> records = consumer.poll(
                java.time.Duration.ofSeconds(10));

            for (ConsumerRecord<String, String> record : records) {
                System.out.printf("Received: %s%n", record.value());
            }
        }
    }
}
```

### Python Client with SCRAM

```python
from confluent_kafka import Producer, Consumer, KafkaError

class ScramKafkaClient:
    def __init__(self, bootstrap_servers: str, username: str, password: str,
                 mechanism: str = 'SCRAM-SHA-512',
                 ssl_ca_location: str = '/etc/kafka/ssl/ca-cert.pem'):
        self.base_config = {
            'bootstrap.servers': bootstrap_servers,
            'security.protocol': 'SASL_SSL',
            'sasl.mechanism': mechanism,
            'sasl.username': username,
            'sasl.password': password,
            'ssl.ca.location': ssl_ca_location,
        }

    def create_producer(self) -> Producer:
        """Create a SCRAM-authenticated producer."""
        config = self.base_config.copy()
        config.update({
            'acks': 'all',
            'retries': 3,
        })
        return Producer(config)

    def create_consumer(self, group_id: str) -> Consumer:
        """Create a SCRAM-authenticated consumer."""
        config = self.base_config.copy()
        config.update({
            'group.id': group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': True,
        })
        return Consumer(config)


def main():
    client = ScramKafkaClient(
        bootstrap_servers='broker1:9093',
        username='producer',
        password='producer-secret'
    )

    producer = client.create_producer()

    def delivery_callback(err, msg):
        if err:
            print(f'Delivery failed: {err}')
        else:
            print(f'Message delivered')

    producer.produce('secure-topic', key='key', value='value',
                    callback=delivery_callback)
    producer.flush()


if __name__ == '__main__':
    main()
```

## Implementing SASL/GSSAPI (Kerberos)

Kerberos provides enterprise-grade authentication.

### Prerequisites

```bash
# Install Kerberos client
apt-get install krb5-user

# Configure /etc/krb5.conf
[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = false
    dns_lookup_kdc = false

[realms]
    EXAMPLE.COM = {
        kdc = kdc.example.com
        admin_server = kdc.example.com
    }

[domain_realm]
    .example.com = EXAMPLE.COM
    example.com = EXAMPLE.COM
```

### Creating Kerberos Principals

```bash
# Create Kafka broker principal
kadmin -q "addprinc -randkey kafka/broker1.example.com@EXAMPLE.COM"
kadmin -q "ktadd -k /etc/kafka/kafka.keytab kafka/broker1.example.com@EXAMPLE.COM"

# Create client principals
kadmin -q "addprinc -randkey kafkaproducer@EXAMPLE.COM"
kadmin -q "ktadd -k /etc/kafka/producer.keytab kafkaproducer@EXAMPLE.COM"
```

### Broker Configuration for Kerberos

```properties
# server.properties

listeners=SASL_PLAINTEXT://0.0.0.0:9092
advertised.listeners=SASL_PLAINTEXT://broker1.example.com:9092
security.inter.broker.protocol=SASL_PLAINTEXT
sasl.mechanism.inter.broker.protocol=GSSAPI
sasl.enabled.mechanisms=GSSAPI
sasl.kerberos.service.name=kafka

# JAAS config
listener.name.sasl_plaintext.gssapi.sasl.jaas.config=com.sun.security.auth.module.Krb5LoginModule required \
  useKeyTab=true \
  storeKey=true \
  keyTab="/etc/kafka/kafka.keytab" \
  principal="kafka/broker1.example.com@EXAMPLE.COM";
```

### Java Client with Kerberos

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class KerberosProducer {

    public static KafkaProducer<String, String> createProducer(
            String bootstrapServers,
            String keytabPath,
            String principal) {

        // Set system properties for Kerberos
        System.setProperty("java.security.krb5.conf", "/etc/krb5.conf");
        System.setProperty("sun.security.krb5.debug", "false");

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());

        // Kerberos configuration
        props.put("security.protocol", "SASL_PLAINTEXT");
        props.put("sasl.mechanism", "GSSAPI");
        props.put("sasl.kerberos.service.name", "kafka");

        String jaasConfig = String.format(
            "com.sun.security.auth.module.Krb5LoginModule required " +
            "useKeyTab=true " +
            "storeKey=true " +
            "keyTab=\"%s\" " +
            "principal=\"%s\";",
            keytabPath, principal);
        props.put("sasl.jaas.config", jaasConfig);

        return new KafkaProducer<>(props);
    }

    public static void main(String[] args) {
        try (KafkaProducer<String, String> producer = createProducer(
                "broker1:9092",
                "/etc/kafka/producer.keytab",
                "kafkaproducer@EXAMPLE.COM")) {

            producer.send(new ProducerRecord<>("test-topic", "key", "value")).get();
            System.out.println("Message sent with Kerberos authentication");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

## User Management Utility

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.config.ConfigResource;

import java.util.*;
import java.util.concurrent.ExecutionException;

public class KafkaUserManager {

    private final AdminClient adminClient;

    public KafkaUserManager(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        this.adminClient = AdminClient.create(props);
    }

    public void createScramUser(String username, String password, String mechanism)
            throws ExecutionException, InterruptedException {

        // mechanism should be "SCRAM-SHA-256" or "SCRAM-SHA-512"
        String configKey = mechanism + "=[password=" + password + "]";

        ConfigResource resource = new ConfigResource(
            ConfigResource.Type.USER, username);

        AlterConfigOp op = new AlterConfigOp(
            new ConfigEntry(mechanism, "[password=" + password + "]"),
            AlterConfigOp.OpType.SET);

        Map<ConfigResource, Collection<AlterConfigOp>> configs = new HashMap<>();
        configs.put(resource, Collections.singletonList(op));

        adminClient.incrementalAlterConfigs(configs).all().get();
        System.out.println("Created SCRAM user: " + username);
    }

    public void deleteScramUser(String username, String mechanism)
            throws ExecutionException, InterruptedException {

        ConfigResource resource = new ConfigResource(
            ConfigResource.Type.USER, username);

        AlterConfigOp op = new AlterConfigOp(
            new ConfigEntry(mechanism, ""),
            AlterConfigOp.OpType.DELETE);

        Map<ConfigResource, Collection<AlterConfigOp>> configs = new HashMap<>();
        configs.put(resource, Collections.singletonList(op));

        adminClient.incrementalAlterConfigs(configs).all().get();
        System.out.println("Deleted SCRAM user: " + username);
    }

    public void listScramUsers() throws ExecutionException, InterruptedException {
        DescribeUserScramCredentialsResult result =
            adminClient.describeUserScramCredentials();

        Map<String, UserScramCredentialsDescription> descriptions =
            result.all().get();

        System.out.println("\nSCRAM Users:");
        System.out.printf("%-20s %-20s%n", "Username", "Mechanisms");
        System.out.println("-".repeat(40));

        for (Map.Entry<String, UserScramCredentialsDescription> entry :
                descriptions.entrySet()) {
            String mechanisms = entry.getValue().credentialInfos().stream()
                .map(info -> info.mechanism().mechanismName())
                .reduce((a, b) -> a + ", " + b)
                .orElse("none");

            System.out.printf("%-20s %-20s%n", entry.getKey(), mechanisms);
        }
    }

    public void close() {
        adminClient.close();
    }

    public static void main(String[] args) throws Exception {
        KafkaUserManager manager = new KafkaUserManager("localhost:9092");

        try {
            // Create users
            manager.createScramUser("app-producer", "secret123", "SCRAM-SHA-512");
            manager.createScramUser("app-consumer", "secret456", "SCRAM-SHA-512");

            // List users
            manager.listScramUsers();

        } finally {
            manager.close();
        }
    }
}
```

## Best Practices

### 1. Always Use TLS with SASL

```properties
# Use SASL_SSL, not SASL_PLAINTEXT in production
listeners=SASL_SSL://0.0.0.0:9093
```

### 2. Rotate Credentials Regularly

```bash
# Update SCRAM password
bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --alter --add-config 'SCRAM-SHA-512=[password=new-password]' \
  --entity-type users --entity-name producer
```

### 3. Use Strong Passwords

```python
import secrets
import string

def generate_kafka_password(length: int = 32) -> str:
    """Generate a strong password for Kafka SASL."""
    alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))
```

### 4. Implement Least Privilege

Combine SASL with ACLs to restrict access:

```bash
# Grant produce permission only
bin/kafka-acls.sh --bootstrap-server localhost:9093 \
  --add --allow-principal User:producer \
  --operation Write --topic my-topic
```

## Troubleshooting

### Common Errors

```bash
# Authentication failed
# Check: username/password, mechanism, JAAS config

# GSSAPI error
# Check: keytab permissions, principal name, KDC connectivity

# SSL handshake failed
# Check: truststore, certificates, hostname verification
```

### Debug Logging

```properties
# Enable SASL debug logging
log4j.logger.org.apache.kafka.common.security=DEBUG
```

## Conclusion

SASL authentication is essential for securing Kafka clusters in production. Choose the mechanism that fits your environment - SCRAM for modern deployments without Kerberos infrastructure, or GSSAPI for enterprise environments with existing Kerberos. Always combine SASL authentication with TLS encryption and ACL authorization for comprehensive security.
