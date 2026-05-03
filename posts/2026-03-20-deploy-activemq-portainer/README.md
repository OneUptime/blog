# How to Deploy ActiveMQ via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, ActiveMQ, Messaging, Docker, JMS, AMQP

Description: Deploy Apache ActiveMQ Classic or ActiveMQ Artemis message broker as a Docker container using Portainer Stacks for enterprise messaging and JMS-based applications.

## Introduction

Apache ActiveMQ is a popular open-source message broker supporting JMS, AMQP, STOMP, MQTT, and WebSocket protocols. This guide deploys ActiveMQ Classic (v5) and ActiveMQ Artemis (next-gen) via Portainer Stacks.

## Prerequisites

- Portainer installed with Docker
- At least 1 GB RAM available
- Basic understanding of message brokers

## Option 1: Deploy ActiveMQ Classic (v5)

ActiveMQ Classic is the traditional broker widely used in Java EE environments.

```yaml
# docker-compose.yml - ActiveMQ Classic

version: "3.8"

services:
  activemq:
    image: rmohr/activemq:latest
    container_name: activemq
    restart: unless-stopped
    ports:
      - "61616:61616"   # JMS/AMQP/STOMP/MQTT transport
      - "8161:8161"     # Web console
      - "5672:5672"     # AMQP
      - "61613:61613"   # STOMP
      - "1883:1883"     # MQTT
    volumes:
      - activemq_data:/opt/activemq/data
      - activemq_conf:/opt/activemq/conf
    environment:
      - ACTIVEMQ_ADMIN_LOGIN=admin
      - ACTIVEMQ_ADMIN_PASSWORD=admin123
      - ACTIVEMQ_CONFIG_MINMEMORY=512
      - ACTIVEMQ_CONFIG_MAXMEMORY=2048
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8161/admin"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - messaging_net

volumes:
  activemq_data:
  activemq_conf:

networks:
  messaging_net:
    driver: bridge
```

### Access the Web Console

1. Open `http://<server-ip>:8161/admin`
2. Login with `admin` / `admin123`
3. Navigate to **Queues** or **Topics** to manage destinations

## Option 2: Deploy ActiveMQ Artemis (Next-Gen)

ActiveMQ Artemis is the successor with improved performance and multi-protocol support.

```yaml
# docker-compose.yml - ActiveMQ Artemis
version: "3.8"

services:
  artemis:
    image: apache/activemq-artemis:latest
    container_name: artemis
    restart: unless-stopped
    ports:
      - "61616:61616"   # All protocols (AMQP, CORE, STOMP, MQTT)
      - "8161:8161"     # Web console
      - "5672:5672"     # AMQP
      - "1883:1883"     # MQTT
    volumes:
      - artemis_data:/var/lib/artemis-instance
    environment:
      - ARTEMIS_USER=admin
      - ARTEMIS_PASSWORD=admin123
      - ANONYMOUS_LOGIN=false
      - EXTRA_ARGS=--relax-jolokia
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8161/console"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - messaging_net

volumes:
  artemis_data:

networks:
  messaging_net:
    driver: bridge
```

## Step 3: Test the Connection

After deployment, test from the Portainer container console:

```bash
# Test from inside a container on the same network
docker run --rm --network messaging_net \
  eclipse-mosquitto:latest \
  mosquitto_pub -h artemis -p 1883 -t test/topic -m "hello"

# Test AMQP connectivity
docker exec artemis /var/lib/artemis-instance/bin/artemis producer \
  --url "tcp://localhost:61616" \
  --user admin --password admin123 \
  --destination queue://test.queue \
  --message-count 10
```

## Step 4: Create Queues and Topics

```bash
# Using the Artemis CLI inside the container
docker exec artemis /var/lib/artemis-instance/bin/artemis queue create \
  --name order.queue \
  --address order.queue \
  --anycast \
  --url tcp://localhost:61616 \
  --user admin --password admin123

# View all queues
docker exec artemis /var/lib/artemis-instance/bin/artemis queue stat \
  --url tcp://localhost:61616 \
  --user admin --password admin123
```

## Step 5: Java Client Example

```java
// Maven dependency: org.apache.activemq:activemq-client:6.1.4
import org.apache.activemq.ActiveMQConnectionFactory;
import jakarta.jms.*;

ConnectionFactory factory = new ActiveMQConnectionFactory(
    "admin", "admin123",
    "tcp://localhost:61616"
);
Connection connection = factory.createConnection();
connection.start();

Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
Queue queue = session.createQueue("order.queue");

MessageProducer producer = session.createProducer(queue);
TextMessage message = session.createTextMessage("Order #1234");
producer.send(message);
System.out.println("Message sent!");
connection.close();
```

## Step 6: Monitor with Portainer

- View ActiveMQ container logs: **Portainer > Containers > activemq/artemis > Logs**
- Check memory usage: **Portainer > Containers > Stats**
- Access the management console at `http://<server-ip>:8161`

## Conclusion

ActiveMQ Classic is best for existing JMS applications requiring backward compatibility. ActiveMQ Artemis offers better performance, multi-protocol support (JMS, AMQP, STOMP, MQTT), and is recommended for new deployments. Both run well as Portainer-managed Docker containers with persistent volumes for message durability.
