# How to Set Up Amazon MQ with ActiveMQ

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon MQ, ActiveMQ, Messaging, Infrastructure

Description: A complete guide to setting up Amazon MQ with the ActiveMQ engine, including broker configuration, security setup, and connecting your applications.

---

If you've ever run your own ActiveMQ broker on EC2, you know the pain. There's patching, failover configuration, storage management, and a dozen other operational headaches that have nothing to do with actually building your application. Amazon MQ takes that burden off your plate by giving you a fully managed ActiveMQ (or RabbitMQ) broker.

In this post, we'll walk through setting up Amazon MQ with the ActiveMQ engine from scratch. By the end, you'll have a working broker that your applications can connect to.

## Why Amazon MQ?

Amazon MQ isn't trying to reinvent messaging. It's a managed service that runs standard message brokers - ActiveMQ and RabbitMQ - so your existing code keeps working. You don't need to rewrite your producers and consumers. You don't need to learn a new protocol. If your app already speaks JMS, AMQP, STOMP, MQTT, or OpenWire, it'll work with Amazon MQ out of the box.

The big win is operational. AWS handles broker provisioning, patching, high availability, and durability. You focus on your application logic.

## Step 1: Create the Broker

You can create a broker through the AWS Console, CLI, or infrastructure-as-code tools. Let's start with the CLI approach since it's the most reproducible.

This command creates a single-instance ActiveMQ broker suitable for development and testing.

```bash
aws mq create-broker \
  --broker-name my-activemq-broker \
  --engine-type ACTIVEMQ \
  --engine-version "5.17.6" \
  --host-instance-type mq.m5.large \
  --deployment-mode SINGLE_INSTANCE \
  --publicly-accessible \
  --users '[{"username":"admin","password":"MyStr0ngP@ss!","consoleAccess":true,"groups":["admins"]}]'
```

A few things to note:

- **Engine version**: Check the AWS docs for the latest supported ActiveMQ version. As of writing, 5.17.x is well supported.
- **Instance type**: `mq.m5.large` is a solid starting point. For dev/test, you can use `mq.t3.micro` to save money.
- **Deployment mode**: `SINGLE_INSTANCE` is fine for development. For production, use `ACTIVE_STANDBY_MULTI_AZ`.
- **Publicly accessible**: Set this to `false` for production. We're using `true` here for easier initial testing.

## Step 2: Configure Security Groups

Your broker needs a security group that allows inbound traffic on the right ports. ActiveMQ uses several ports depending on the protocol.

Here's a Terraform snippet that covers the common protocols.

```hcl
resource "aws_security_group" "mq_sg" {
  name        = "amazon-mq-sg"
  description = "Security group for Amazon MQ ActiveMQ broker"
  vpc_id      = var.vpc_id

  # OpenWire
  ingress {
    from_port   = 61617
    to_port     = 61617
    protocol    = "tcp"
    cidr_blocks = [var.app_cidr]
  }

  # AMQP
  ingress {
    from_port   = 5671
    to_port     = 5671
    protocol    = "tcp"
    cidr_blocks = [var.app_cidr]
  }

  # STOMP
  ingress {
    from_port   = 61614
    to_port     = 61614
    protocol    = "tcp"
    cidr_blocks = [var.app_cidr]
  }

  # MQTT
  ingress {
    from_port   = 8883
    to_port     = 8883
    protocol    = "tcp"
    cidr_blocks = [var.app_cidr]
  }

  # Web Console
  ingress {
    from_port   = 8162
    to_port     = 8162
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

Notice that Amazon MQ uses TLS-enabled ports by default. Port 61617 is the SSL version of the standard OpenWire port 61616. This is a good thing - your messages are encrypted in transit without any extra configuration on your part.

## Step 3: Wait for the Broker to Start

After creating the broker, it takes a few minutes to provision. You can check the status with the CLI.

```bash
aws mq describe-broker --broker-id <broker-id> --query 'BrokerState'
```

Once it returns `RUNNING`, you're good to go. The describe command also gives you the connection endpoints you'll need.

```bash
# Get the broker endpoints
aws mq describe-broker --broker-id <broker-id> \
  --query 'BrokerInstances[*].Endpoints'
```

## Step 4: Connect a Producer

Let's connect a simple Java producer using the JMS API. This is probably the most common way to interact with ActiveMQ.

This Java producer sends a text message to a queue on your Amazon MQ broker.

```java
import org.apache.activemq.ActiveMQSslConnectionFactory;
import javax.jms.*;

public class MQProducer {
    public static void main(String[] args) throws Exception {
        // Use the SSL endpoint from your broker
        String brokerUrl = "ssl://b-xxxx-xxxx.mq.us-east-1.amazonaws.com:61617";

        ActiveMQSslConnectionFactory factory = new ActiveMQSslConnectionFactory(brokerUrl);
        factory.setUserName("admin");
        factory.setPassword("MyStr0ngP@ss!");

        Connection connection = factory.createConnection();
        connection.start();

        Session session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);
        Destination destination = session.createQueue("orders");

        MessageProducer producer = session.createProducer(destination);
        TextMessage message = session.createTextMessage("Order #12345 placed");
        producer.send(message);

        System.out.println("Message sent: " + message.getText());

        producer.close();
        session.close();
        connection.close();
    }
}
```

If you prefer Python, you can use the `stomp.py` library to connect via the STOMP protocol.

This Python script connects to the broker using STOMP and sends a message.

```python
import stomp
import ssl

conn = stomp.Connection(
    host_and_ports=[("b-xxxx-xxxx.mq.us-east-1.amazonaws.com", 61614)]
)

# Enable SSL
conn.set_ssl(
    for_hosts=[("b-xxxx-xxxx.mq.us-east-1.amazonaws.com", 61614)],
    ssl_version=ssl.PROTOCOL_TLSv1_2
)

conn.connect("admin", "MyStr0ngP@ss!", wait=True)
conn.send(destination="/queue/orders", body="Order #12345 placed")
conn.disconnect()

print("Message sent successfully")
```

## Step 5: Connect a Consumer

Here's the consumer side in Python using STOMP.

This listener class handles incoming messages from the queue.

```python
import stomp
import ssl
import time

class OrderListener(stomp.ConnectionListener):
    def on_message(self, frame):
        print(f"Received: {frame.body}")

conn = stomp.Connection(
    host_and_ports=[("b-xxxx-xxxx.mq.us-east-1.amazonaws.com", 61614)]
)
conn.set_ssl(
    for_hosts=[("b-xxxx-xxxx.mq.us-east-1.amazonaws.com", 61614)],
    ssl_version=ssl.PROTOCOL_TLSv1_2
)
conn.set_listener("", OrderListener())
conn.connect("admin", "MyStr0ngP@ss!", wait=True)
conn.subscribe(destination="/queue/orders", id=1, ack="client-individual")

# Keep the consumer running
while True:
    time.sleep(1)
```

## Step 6: Set Up for Production

For production workloads, you want a multi-AZ deployment. Change the deployment mode when creating your broker.

```bash
aws mq create-broker \
  --broker-name prod-activemq-broker \
  --engine-type ACTIVEMQ \
  --engine-version "5.17.6" \
  --host-instance-type mq.m5.large \
  --deployment-mode ACTIVE_STANDBY_MULTI_AZ \
  --no-publicly-accessible \
  --subnet-ids subnet-abc123 subnet-def456 \
  --security-groups sg-xxx123 \
  --users '[{"username":"admin","password":"Pr0dP@ssw0rd!","consoleAccess":true,"groups":["admins"]}]'
```

With `ACTIVE_STANDBY_MULTI_AZ`, AWS runs two broker instances across different Availability Zones. If one goes down, the standby takes over automatically. Your connection URL stays the same since it uses a failover transport.

## Monitoring Your Broker

Once you have messages flowing, you'll want to keep an eye on things. Amazon MQ publishes metrics to CloudWatch automatically. Key metrics to watch include:

- **CpuUtilization**: If this consistently exceeds 70%, consider upgrading your instance type.
- **CurrentConnectionsCount**: Track this to understand your connection patterns.
- **TotalMessageCount**: Useful for spotting message buildups.
- **StorePercentUsage**: If your broker's storage fills up, it'll stop accepting messages.

For a deeper dive into monitoring messaging infrastructure, check out our post on [monitoring AWS services with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-sns-cloudwatch/view).

## Common Pitfalls

**Forgetting to configure VPC access**: If your broker isn't publicly accessible (and it shouldn't be in production), make sure your application's VPC can reach the broker's VPC. You might need VPC peering or a transit gateway.

**Using weak passwords**: Amazon MQ requires passwords of at least 12 characters with mixed case, numbers, and special characters. Don't skimp on this.

**Not setting up encryption at rest**: Enable KMS encryption when creating your broker. It's a one-time setting that you can't change later.

**Ignoring connection pooling**: Creating a new JMS connection for every message is expensive. Use connection pooling in production. The `PooledConnectionFactory` in ActiveMQ handles this nicely.

## Wrapping Up

Amazon MQ with ActiveMQ gives you the familiarity of a standard message broker without the operational overhead. The setup is straightforward - create a broker, configure security, and connect your applications using the same protocols you already know.

Start with a single-instance broker for development, then move to multi-AZ for production. Keep an eye on your CloudWatch metrics, and you'll have a reliable messaging layer that just works.
