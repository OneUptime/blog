# How to Install Apache ActiveMQ on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, ActiveMQ, Message Queue, JMS, Tutorial

Description: Complete guide to installing and configuring Apache ActiveMQ message broker on Ubuntu.

---

## Introduction

Apache ActiveMQ is one of the most popular open-source message brokers available today. Written in Java, it provides a robust, enterprise-grade messaging platform that supports multiple protocols including AMQP, STOMP, MQTT, OpenWire, and WebSocket. ActiveMQ implements the Java Message Service (JMS) API, making it an excellent choice for Java applications while also supporting clients in virtually any programming language.

In this comprehensive guide, we will walk through the complete process of installing, configuring, and managing Apache ActiveMQ on Ubuntu. Whether you are building a microservices architecture, implementing event-driven systems, or simply need reliable message queuing, this tutorial will help you get ActiveMQ up and running.

## Understanding Apache ActiveMQ

### What is a Message Broker?

A message broker is middleware that enables applications to communicate by translating messages between formal messaging protocols. It acts as an intermediary, receiving messages from senders (producers) and routing them to appropriate receivers (consumers).

### Key Features of ActiveMQ

- **JMS Compliance**: Full implementation of JMS 1.1 and JMS 2.0 specifications
- **Multiple Protocols**: Support for AMQP, STOMP, MQTT, OpenWire, and WebSocket
- **Persistence**: Messages can be persisted to disk using KahaDB or JDBC
- **High Availability**: Master-slave clustering and network of brokers
- **Web Console**: Built-in administration interface
- **Security**: Authentication, authorization, and SSL/TLS encryption
- **Flexible Routing**: Support for queues, topics, virtual destinations, and composite destinations

### Queues vs Topics

Understanding the difference between queues and topics is fundamental:

- **Queues (Point-to-Point)**: Each message is consumed by exactly one consumer. Messages remain in the queue until processed. Ideal for task distribution.

- **Topics (Publish-Subscribe)**: Messages are broadcast to all active subscribers. Each subscriber receives a copy. Ideal for event notification.

## Prerequisites

Before installing ActiveMQ, ensure your Ubuntu system meets the following requirements:

### System Requirements

- Ubuntu 20.04, 22.04, or 24.04 LTS
- Minimum 2 GB RAM (4 GB recommended for production)
- At least 10 GB of free disk space
- Root or sudo access

### Installing Java

ActiveMQ requires Java 11 or higher. Let us install OpenJDK 17, which is the current LTS version:

```bash
# Update the package index
sudo apt update

# Install OpenJDK 17 JDK
sudo apt install -y openjdk-17-jdk

# Verify the Java installation
java -version
```

You should see output similar to:

```
openjdk version "17.0.10" 2024-01-16
OpenJDK Runtime Environment (build 17.0.10+7-Ubuntu-122.04.1)
OpenJDK 64-Bit Server VM (build 17.0.10+7-Ubuntu-122.04.1, mixed mode, sharing)
```

Set the JAVA_HOME environment variable:

```bash
# Find the Java installation path
sudo update-alternatives --config java

# Add JAVA_HOME to your environment
# Edit the profile file
sudo nano /etc/environment

# Add the following line (adjust path if needed):
JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"

# Apply the changes
source /etc/environment

# Verify JAVA_HOME is set
echo $JAVA_HOME
```

## Downloading and Installing ActiveMQ

### Creating a System User

For security, we will create a dedicated system user to run ActiveMQ:

```bash
# Create a system user named 'activemq' with no login shell
# -r: Create a system account
# -s /bin/false: Disable shell login for security
sudo useradd -r -s /bin/false activemq
```

### Downloading ActiveMQ

Download the latest version of Apache ActiveMQ from the official website:

```bash
# Navigate to the /opt directory where we will install ActiveMQ
cd /opt

# Download ActiveMQ 5.18.3 (check for latest version at activemq.apache.org)
# Using wget to fetch the binary distribution
sudo wget https://archive.apache.org/dist/activemq/5.18.3/apache-activemq-5.18.3-bin.tar.gz

# Verify the download completed successfully
ls -la apache-activemq-5.18.3-bin.tar.gz
```

### Extracting and Setting Up

```bash
# Extract the downloaded archive
# -x: Extract files
# -z: Filter through gzip
# -f: Use archive file
sudo tar -xzf apache-activemq-5.18.3-bin.tar.gz

# Create a symbolic link for easier management and upgrades
# This allows us to update ActiveMQ without changing service configurations
sudo ln -s /opt/apache-activemq-5.18.3 /opt/activemq

# Set ownership to the activemq user
# -R: Recursive, applies to all files and subdirectories
sudo chown -R activemq:activemq /opt/apache-activemq-5.18.3
sudo chown -h activemq:activemq /opt/activemq

# Clean up the downloaded archive
sudo rm apache-activemq-5.18.3-bin.tar.gz
```

## Directory Structure

Understanding the ActiveMQ directory structure is essential for configuration and troubleshooting:

```
/opt/activemq/
├── bin/                    # Executable scripts and wrapper
│   ├── activemq            # Main startup script
│   ├── env                 # Environment variables configuration
│   └── linux-x86-64/       # Platform-specific wrapper binaries
├── conf/                   # Configuration files
│   ├── activemq.xml        # Main broker configuration
│   ├── jetty.xml           # Web console configuration
│   ├── jetty-realm.properties  # Web console authentication
│   ├── credentials.properties  # Encrypted credentials
│   ├── log4j2.properties   # Logging configuration
│   └── login.config        # JAAS authentication configuration
├── data/                   # Runtime data (created on first start)
│   ├── kahadb/             # Default message persistence store
│   └── activemq.log        # Main log file
├── lib/                    # Java libraries and dependencies
├── webapps/                # Web console application
│   ├── admin/              # Administration console
│   └── api/                # REST API
└── examples/               # Example configurations and code
```

### Key Files Explained

| File | Purpose |
|------|---------|
| `activemq.xml` | Main broker configuration including transport connectors, persistence, and security |
| `jetty.xml` | Web console server settings including ports and SSL |
| `jetty-realm.properties` | Username and password for web console access |
| `log4j2.properties` | Logging levels and output destinations |
| `credentials.properties` | Encrypted passwords for various integrations |

## Configuration

### Main Configuration (activemq.xml)

The primary configuration file is located at `/opt/activemq/conf/activemq.xml`. Let us examine and customize the key sections:

```bash
# Create a backup of the original configuration
sudo cp /opt/activemq/conf/activemq.xml /opt/activemq/conf/activemq.xml.backup

# Edit the configuration file
sudo nano /opt/activemq/conf/activemq.xml
```

Here is a well-commented configuration example:

```xml
<beans
  xmlns="http://www.springframework.org/schema/beans"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.springframework.org/schema/beans
  http://www.springframework.org/schema/beans/spring-beans.xsd
  http://activemq.apache.org/schema/core
  http://activemq.apache.org/schema/core/activemq-core.xsd">

    <!--
        Broker Configuration
        brokerName: Unique identifier for this broker instance
        dataDirectory: Where persistent data is stored
        useJmx: Enable Java Management Extensions for monitoring
    -->
    <broker xmlns="http://activemq.apache.org/schema/core"
            brokerName="localhost"
            dataDirectory="${activemq.data}"
            useJmx="true"
            advisorySupport="true">

        <!--
            Destination Policy
            Defines behavior for queues and topics
        -->
        <destinationPolicy>
            <policyMap>
                <policyEntries>
                    <!--
                        Default policy for all topics
                        producerFlowControl: Enable flow control to prevent memory exhaustion
                        memoryLimit: Maximum memory for pending messages (100 MB)
                    -->
                    <policyEntry topic=">"
                                 producerFlowControl="true"
                                 memoryLimit="100mb">
                        <!--
                            Subscription Recovery Policy
                            Allows late subscribers to receive recent messages
                        -->
                        <subscriptionRecoveryPolicy>
                            <timedSubscriptionRecoveryPolicy recoverDuration="60000"/>
                        </subscriptionRecoveryPolicy>
                    </policyEntry>

                    <!--
                        Default policy for all queues
                        Cursor type optimizes memory usage for queue operations
                    -->
                    <policyEntry queue=">"
                                 producerFlowControl="true"
                                 memoryLimit="100mb"
                                 optimizedDispatch="true">
                        <pendingQueuePolicy>
                            <storeCursor/>
                        </pendingQueuePolicy>
                    </policyEntry>
                </policyEntries>
            </policyMap>
        </destinationPolicy>

        <!--
            Management Context
            Enables JMX monitoring on specific port
        -->
        <managementContext>
            <managementContext createConnector="true"
                              connectorPort="1099"
                              rmiServerPort="1098"/>
        </managementContext>

        <!--
            Persistence Adapter
            KahaDB is the default high-performance file-based store
            journalMaxFileLength: Size of each journal file
            enableJournalDiskSyncs: Ensures durability at cost of performance
        -->
        <persistenceAdapter>
            <kahaDB directory="${activemq.data}/kahadb"
                    journalMaxFileLength="32mb"
                    enableJournalDiskSyncs="true"
                    cleanupInterval="30000"
                    checkpointInterval="5000"/>
        </persistenceAdapter>

        <!--
            System Usage Limits
            Controls memory, store, and temp storage usage
            Critical for preventing OutOfMemory errors
        -->
        <systemUsage>
            <systemUsage>
                <!-- Maximum heap memory for messages -->
                <memoryUsage>
                    <memoryUsage percentOfJvmHeap="70"/>
                </memoryUsage>
                <!-- Maximum disk space for persistent messages -->
                <storeUsage>
                    <storeUsage limit="50gb"/>
                </storeUsage>
                <!-- Maximum disk space for temporary storage -->
                <tempUsage>
                    <tempUsage limit="10gb"/>
                </tempUsage>
            </systemUsage>
        </systemUsage>

        <!--
            Transport Connectors
            Define how clients connect to the broker
        -->
        <transportConnectors>
            <!--
                OpenWire Protocol (default for Java clients)
                Port 61616 is the standard ActiveMQ port
            -->
            <transportConnector name="openwire"
                              uri="tcp://0.0.0.0:61616?maximumConnections=1000"/>

            <!--
                AMQP Protocol (for cross-platform messaging)
                Common port for AMQP is 5672
            -->
            <transportConnector name="amqp"
                              uri="amqp://0.0.0.0:5672?maximumConnections=1000"/>

            <!--
                STOMP Protocol (simple text-based protocol)
                Great for web applications and lightweight clients
            -->
            <transportConnector name="stomp"
                              uri="stomp://0.0.0.0:61613?maximumConnections=1000"/>

            <!--
                MQTT Protocol (for IoT devices)
                Lightweight protocol ideal for constrained devices
            -->
            <transportConnector name="mqtt"
                              uri="mqtt://0.0.0.0:1883?maximumConnections=1000"/>

            <!--
                WebSocket Protocol (for browser-based clients)
                Enables real-time messaging in web applications
            -->
            <transportConnector name="ws"
                              uri="ws://0.0.0.0:61614?maximumConnections=1000"/>
        </transportConnectors>

        <!--
            Destinations
            Pre-create queues and topics that your application needs
        -->
        <destinations>
            <!-- Pre-created queues -->
            <queue physicalName="orders.incoming"/>
            <queue physicalName="orders.processed"/>
            <queue physicalName="notifications.email"/>

            <!-- Pre-created topics -->
            <topic physicalName="events.system"/>
            <topic physicalName="events.user"/>
        </destinations>

    </broker>

</beans>
```

### Memory and JVM Configuration

Edit the environment configuration to optimize Java settings:

```bash
# Edit the wrapper configuration
sudo nano /opt/activemq/bin/env
```

Update the Java memory settings:

```bash
# Java Virtual Machine Settings
# -Xms: Initial heap size (allocate upfront for predictable performance)
# -Xmx: Maximum heap size (adjust based on available system memory)
# -Xss: Thread stack size
ACTIVEMQ_OPTS="-Xms512M -Xmx2G -Xss256K"

# Enable GC logging for performance analysis
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -Xlog:gc*:file=/opt/activemq/data/gc.log:time,uptime:filecount=10,filesize=10M"

# JMX Configuration for remote monitoring
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -Dcom.sun.management.jmxremote"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -Dcom.sun.management.jmxremote.port=1099"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -Dcom.sun.management.jmxremote.ssl=false"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -Dcom.sun.management.jmxremote.authenticate=false"

# Set the Java home directory
JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
```

## Web Console Access

### Configuring Web Console Authentication

The web console credentials are stored in `jetty-realm.properties`:

```bash
# Edit the web console authentication file
sudo nano /opt/activemq/conf/jetty-realm.properties
```

The file format is `username: password [,rolename ...]`:

```properties
# Web Console Users
# Format: username: password, role1, role2, ...
#
# Available roles:
# - admin: Full administrative access
# - user: Read-only access to console
#
# IMPORTANT: Change these default credentials in production!
admin: securePassword123!, admin
monitor: viewOnly456!, user
```

### Configuring the Jetty Web Server

Edit `jetty.xml` to customize the web console:

```bash
sudo nano /opt/activemq/conf/jetty.xml
```

Key configuration options:

```xml
<bean id="securityConstraint" class="org.eclipse.jetty.util.security.Constraint">
    <property name="name" value="BASIC" />
    <property name="roles" value="admin,user" />
    <property name="authenticate" value="true" />
</bean>

<!--
    Web Console Port Configuration
    Default port is 8161
    Change this if it conflicts with other services
-->
<bean id="jettyPort" class="org.apache.activemq.web.WebConsolePort"
      init-method="start">
    <property name="host" value="0.0.0.0"/>
    <property name="port" value="8161"/>
</bean>
```

### Accessing the Web Console

After starting ActiveMQ, access the web console at:

```
http://your-server-ip:8161/admin
```

The web console provides:
- Queue and topic management
- Message browsing and deletion
- Connection monitoring
- Subscriber management
- Broker statistics

## Creating Queues and Topics

### Using the Web Console

1. Navigate to `http://localhost:8161/admin`
2. Log in with your credentials
3. Click on "Queues" or "Topics" in the navigation
4. Enter the destination name and click "Create"

### Using the CLI

ActiveMQ provides command-line tools for management:

```bash
# Start the ActiveMQ shell
cd /opt/activemq
sudo -u activemq ./bin/activemq shell

# In the shell, you can browse queues and topics
activemq> query --objname type=Broker,brokerName=*,destinationType=Queue,destinationName=*
activemq> exit
```

### Creating Destinations via Configuration

Add destinations directly in `activemq.xml`:

```xml
<destinations>
    <!-- Queues for order processing -->
    <queue physicalName="orders.new"/>
    <queue physicalName="orders.processing"/>
    <queue physicalName="orders.completed"/>
    <queue physicalName="orders.failed"/>

    <!-- Topics for real-time notifications -->
    <topic physicalName="notifications.system"/>
    <topic physicalName="notifications.users"/>

    <!-- Dead letter queue for failed messages -->
    <queue physicalName="ActiveMQ.DLQ"/>
</destinations>
```

### Virtual Destinations

Virtual destinations provide powerful routing capabilities:

```xml
<destinationInterceptors>
    <virtualDestinationInterceptor>
        <virtualDestinations>
            <!--
                Composite Queue
                Messages sent to 'orders.all' are copied to multiple queues
            -->
            <compositeQueue name="orders.all">
                <forwardTo>
                    <queue physicalName="orders.analytics"/>
                    <queue physicalName="orders.processing"/>
                    <queue physicalName="orders.archive"/>
                </forwardTo>
            </compositeQueue>

            <!--
                Virtual Topic
                Converts topic to queue for each consumer
                Enables load balancing across topic subscribers
            -->
            <virtualTopic name="VirtualTopic.>"
                         prefix="Consumer.*."
                         selectorAware="false"/>
        </virtualDestinations>
    </virtualDestinationInterceptor>
</destinationInterceptors>
```

## User Authentication and Authorization

### Configuring Authentication

ActiveMQ supports multiple authentication mechanisms. Here is a simple properties-based configuration:

```bash
# Edit the main configuration
sudo nano /opt/activemq/conf/activemq.xml
```

Add the authentication plugin inside the `<broker>` element:

```xml
<plugins>
    <!--
        Simple Authentication Plugin
        Defines users, groups, and their passwords
    -->
    <simpleAuthenticationPlugin anonymousAccessAllowed="false">
        <users>
            <!-- System administrator with full access -->
            <authenticationUser username="admin"
                               password="adminPassword123!"
                               groups="admins,publishers,consumers"/>

            <!-- Application user for sending messages -->
            <authenticationUser username="producer"
                               password="producerPass456!"
                               groups="publishers"/>

            <!-- Application user for receiving messages -->
            <authenticationUser username="consumer"
                               password="consumerPass789!"
                               groups="consumers"/>

            <!-- Monitoring user with read-only access -->
            <authenticationUser username="monitor"
                               password="monitorPass000!"
                               groups="monitors"/>
        </users>
    </simpleAuthenticationPlugin>

    <!--
        Authorization Plugin
        Controls access to destinations based on groups
    -->
    <authorizationPlugin>
        <map>
            <authorizationMap>
                <authorizationEntries>
                    <!-- Admin group has full access to everything -->
                    <authorizationEntry queue=">"
                                       read="admins"
                                       write="admins"
                                       admin="admins"/>
                    <authorizationEntry topic=">"
                                       read="admins"
                                       write="admins"
                                       admin="admins"/>

                    <!-- Publishers can write to order queues -->
                    <authorizationEntry queue="orders.>"
                                       read="admins,consumers"
                                       write="admins,publishers"
                                       admin="admins"/>

                    <!-- Consumers can read from notification topics -->
                    <authorizationEntry topic="notifications.>"
                                       read="admins,consumers"
                                       write="admins,publishers"
                                       admin="admins"/>

                    <!-- Advisory topics for monitoring -->
                    <authorizationEntry topic="ActiveMQ.Advisory.>"
                                       read="admins,monitors"
                                       write="admins"
                                       admin="admins"/>
                </authorizationEntries>
            </authorizationMap>
        </map>
    </authorizationPlugin>
</plugins>
```

### JAAS Authentication

For more advanced authentication, configure JAAS:

```bash
# Edit the JAAS configuration
sudo nano /opt/activemq/conf/login.config
```

```
activemq {
    org.apache.activemq.jaas.PropertiesLoginModule required
        org.apache.activemq.jaas.properties.user="users.properties"
        org.apache.activemq.jaas.properties.group="groups.properties";
};
```

Create the users file:

```bash
sudo nano /opt/activemq/conf/users.properties
```

```properties
# User credentials
# Format: username=password
admin=adminPassword123!
producer=producerPass456!
consumer=consumerPass789!
```

Create the groups file:

```bash
sudo nano /opt/activemq/conf/groups.properties
```

```properties
# Group memberships
# Format: groupname=user1,user2,...
admins=admin
publishers=admin,producer
consumers=admin,consumer
```

## Systemd Service Setup

Create a systemd service for automatic startup and management:

```bash
# Create the service file
sudo nano /etc/systemd/system/activemq.service
```

Add the following content:

```ini
[Unit]
# Service description and documentation
Description=Apache ActiveMQ Message Broker
Documentation=https://activemq.apache.org/

# Start after network is available
After=network.target

[Service]
# Service type - forking because ActiveMQ daemonizes
Type=forking

# Run as the dedicated activemq user
User=activemq
Group=activemq

# Environment variables
Environment="JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64"
Environment="ACTIVEMQ_HOME=/opt/activemq"
Environment="ACTIVEMQ_DATA=/opt/activemq/data"

# Working directory
WorkingDirectory=/opt/activemq

# Start and stop commands
ExecStart=/opt/activemq/bin/activemq start
ExecStop=/opt/activemq/bin/activemq stop

# PID file location for tracking the process
PIDFile=/opt/activemq/data/activemq.pid

# Restart policy
# on-failure: Restart only if the service exits with a non-zero code
Restart=on-failure
RestartSec=10

# Resource limits
# Increase file descriptor limits for high connection counts
LimitNOFILE=65536

# Timeout settings
TimeoutStartSec=60
TimeoutStopSec=60

[Install]
# Start in multi-user mode (standard server mode)
WantedBy=multi-user.target
```

Enable and manage the service:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable ActiveMQ to start on boot
sudo systemctl enable activemq

# Start ActiveMQ
sudo systemctl start activemq

# Check the status
sudo systemctl status activemq

# View logs
sudo journalctl -u activemq -f
```

### Common Service Commands

```bash
# Start the service
sudo systemctl start activemq

# Stop the service
sudo systemctl stop activemq

# Restart the service
sudo systemctl restart activemq

# Check status
sudo systemctl status activemq

# View recent logs
sudo journalctl -u activemq --since "10 minutes ago"

# Follow logs in real-time
sudo journalctl -u activemq -f
```

## Firewall Configuration

If you are using UFW (Uncomplicated Firewall), open the necessary ports:

```bash
# OpenWire protocol (Java clients)
sudo ufw allow 61616/tcp comment 'ActiveMQ OpenWire'

# Web console
sudo ufw allow 8161/tcp comment 'ActiveMQ Web Console'

# STOMP protocol
sudo ufw allow 61613/tcp comment 'ActiveMQ STOMP'

# AMQP protocol
sudo ufw allow 5672/tcp comment 'ActiveMQ AMQP'

# MQTT protocol
sudo ufw allow 1883/tcp comment 'ActiveMQ MQTT'

# WebSocket
sudo ufw allow 61614/tcp comment 'ActiveMQ WebSocket'

# JMX monitoring (only if needed externally)
sudo ufw allow 1099/tcp comment 'ActiveMQ JMX'

# Reload the firewall
sudo ufw reload

# Verify the rules
sudo ufw status verbose
```

## Client Examples

### Python Client using STOMP

First, install the required library:

```bash
# Install the stomp.py library
pip install stomp.py
```

#### Producer Example (Python)

```python
#!/usr/bin/env python3
"""
ActiveMQ Producer Example
Demonstrates sending messages to a queue using STOMP protocol
"""

import stomp
import json
import time
from datetime import datetime


class MessageProducer:
    """
    A class to produce messages to ActiveMQ using STOMP protocol
    """

    def __init__(self, host='localhost', port=61613, username='producer', password='producerPass456!'):
        """
        Initialize the producer with connection parameters

        Args:
            host: ActiveMQ server hostname
            port: STOMP port (default 61613)
            username: Authentication username
            password: Authentication password
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.connection = None

    def connect(self):
        """
        Establish connection to ActiveMQ
        """
        # Create a STOMP connection
        self.connection = stomp.Connection([(self.host, self.port)])

        # Connect with authentication
        self.connection.connect(
            username=self.username,
            passcode=self.password,
            wait=True  # Wait for connection confirmation
        )
        print(f"Connected to ActiveMQ at {self.host}:{self.port}")

    def send_message(self, destination, message, headers=None):
        """
        Send a message to the specified destination

        Args:
            destination: Queue or topic name (e.g., '/queue/orders.new')
            message: Message content (will be JSON encoded if dict)
            headers: Optional dictionary of message headers
        """
        if headers is None:
            headers = {}

        # Add standard headers
        headers['content-type'] = 'application/json'
        headers['timestamp'] = str(int(time.time() * 1000))

        # Convert dict to JSON string if necessary
        if isinstance(message, dict):
            body = json.dumps(message)
        else:
            body = str(message)

        # Send the message
        self.connection.send(
            destination=destination,
            body=body,
            headers=headers
        )
        print(f"Sent message to {destination}: {body[:100]}...")

    def disconnect(self):
        """
        Close the connection to ActiveMQ
        """
        if self.connection:
            self.connection.disconnect()
            print("Disconnected from ActiveMQ")


def main():
    """
    Main function demonstrating message production
    """
    # Create a producer instance
    producer = MessageProducer(
        host='localhost',
        port=61613,
        username='producer',
        password='producerPass456!'
    )

    try:
        # Connect to the broker
        producer.connect()

        # Send multiple order messages
        for i in range(5):
            order = {
                'order_id': f'ORD-{i+1:05d}',
                'customer_id': f'CUST-{(i % 3) + 1:03d}',
                'product': f'Product-{chr(65 + i)}',
                'quantity': (i + 1) * 10,
                'price': round(99.99 + i * 10.50, 2),
                'timestamp': datetime.now().isoformat()
            }

            # Send to the orders queue
            producer.send_message(
                destination='/queue/orders.new',
                message=order,
                headers={
                    'priority': str(i % 10),  # Message priority
                    'persistent': 'true'       # Persist message to disk
                }
            )

            # Small delay between messages
            time.sleep(0.5)

        # Send a notification to a topic
        notification = {
            'type': 'ORDER_BATCH_COMPLETE',
            'count': 5,
            'timestamp': datetime.now().isoformat()
        }
        producer.send_message(
            destination='/topic/notifications.system',
            message=notification
        )

    finally:
        # Always disconnect when done
        producer.disconnect()


if __name__ == '__main__':
    main()
```

#### Consumer Example (Python)

```python
#!/usr/bin/env python3
"""
ActiveMQ Consumer Example
Demonstrates receiving messages from a queue using STOMP protocol
"""

import stomp
import json
import time
import signal
import sys


class MessageListener(stomp.ConnectionListener):
    """
    Listener class to handle incoming messages and connection events
    """

    def __init__(self, consumer):
        """
        Initialize with reference to parent consumer

        Args:
            consumer: Parent MessageConsumer instance
        """
        self.consumer = consumer
        self.message_count = 0

    def on_message(self, frame):
        """
        Called when a message is received

        Args:
            frame: STOMP frame containing message data
        """
        self.message_count += 1

        try:
            # Parse the message body
            body = json.loads(frame.body)

            # Extract useful headers
            message_id = frame.headers.get('message-id', 'unknown')
            destination = frame.headers.get('destination', 'unknown')
            timestamp = frame.headers.get('timestamp', 'unknown')

            print(f"\n{'='*60}")
            print(f"Message #{self.message_count} received")
            print(f"  ID: {message_id}")
            print(f"  Destination: {destination}")
            print(f"  Timestamp: {timestamp}")
            print(f"  Content: {json.dumps(body, indent=2)}")
            print(f"{'='*60}")

            # Process the message (add your business logic here)
            self.process_message(body)

            # Acknowledge the message (if using client acknowledgment)
            if self.consumer.ack_mode == 'client':
                self.consumer.connection.ack(message_id, frame.headers.get('subscription'))
                print("  Message acknowledged")

        except json.JSONDecodeError:
            print(f"Received non-JSON message: {frame.body}")
        except Exception as e:
            print(f"Error processing message: {e}")

    def process_message(self, message):
        """
        Process the received message

        Args:
            message: Parsed message content
        """
        # Simulate processing time
        time.sleep(0.1)

        if 'order_id' in message:
            print(f"  Processing order: {message['order_id']}")
            # Add your order processing logic here

    def on_error(self, frame):
        """
        Called when an error is received

        Args:
            frame: STOMP frame containing error information
        """
        print(f"Received error: {frame.body}")

    def on_disconnected(self):
        """
        Called when connection is lost
        """
        print("Disconnected from ActiveMQ")
        self.consumer.connected = False


class MessageConsumer:
    """
    A class to consume messages from ActiveMQ using STOMP protocol
    """

    def __init__(self, host='localhost', port=61613, username='consumer', password='consumerPass789!'):
        """
        Initialize the consumer with connection parameters

        Args:
            host: ActiveMQ server hostname
            port: STOMP port (default 61613)
            username: Authentication username
            password: Authentication password
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.connection = None
        self.connected = False
        self.ack_mode = 'auto'  # Options: 'auto', 'client', 'client-individual'
        self.listener = MessageListener(self)

    def connect(self):
        """
        Establish connection to ActiveMQ
        """
        # Create a STOMP connection with heartbeats
        self.connection = stomp.Connection(
            [(self.host, self.port)],
            heartbeats=(10000, 10000)  # Send/receive heartbeats every 10 seconds
        )

        # Register the listener
        self.connection.set_listener('message_listener', self.listener)

        # Connect with authentication
        self.connection.connect(
            username=self.username,
            passcode=self.password,
            wait=True
        )
        self.connected = True
        print(f"Connected to ActiveMQ at {self.host}:{self.port}")

    def subscribe(self, destination, subscription_id=None):
        """
        Subscribe to a destination (queue or topic)

        Args:
            destination: Queue or topic name (e.g., '/queue/orders.new')
            subscription_id: Unique identifier for this subscription
        """
        if subscription_id is None:
            subscription_id = f"sub-{destination.replace('/', '-')}"

        self.connection.subscribe(
            destination=destination,
            id=subscription_id,
            ack=self.ack_mode,
            headers={
                'activemq.prefetchSize': '10'  # Number of messages to prefetch
            }
        )
        print(f"Subscribed to {destination}")

    def run(self):
        """
        Main loop to keep the consumer running
        """
        print("Consumer is running. Press Ctrl+C to exit.")

        try:
            while self.connected:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")

    def disconnect(self):
        """
        Close the connection to ActiveMQ
        """
        if self.connection:
            self.connection.disconnect()
            self.connected = False
            print("Disconnected from ActiveMQ")


def signal_handler(signum, frame):
    """
    Handle shutdown signals gracefully
    """
    print("\nReceived shutdown signal...")
    sys.exit(0)


def main():
    """
    Main function demonstrating message consumption
    """
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create a consumer instance
    consumer = MessageConsumer(
        host='localhost',
        port=61613,
        username='consumer',
        password='consumerPass789!'
    )

    try:
        # Connect to the broker
        consumer.connect()

        # Subscribe to the orders queue
        consumer.subscribe('/queue/orders.new')

        # Subscribe to system notifications topic
        consumer.subscribe('/topic/notifications.system')

        # Run the consumer (blocks until interrupted)
        consumer.run()

    finally:
        # Always disconnect when done
        consumer.disconnect()


if __name__ == '__main__':
    main()
```

### Java Client Example

Add the ActiveMQ dependency to your `pom.xml`:

```xml
<dependencies>
    <!-- ActiveMQ Client -->
    <dependency>
        <groupId>org.apache.activemq</groupId>
        <artifactId>activemq-client</artifactId>
        <version>5.18.3</version>
    </dependency>

    <!-- SLF4J for logging -->
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-simple</artifactId>
        <version>2.0.9</version>
    </dependency>
</dependencies>
```

#### Producer Example (Java)

```java
package com.example.activemq;

import org.apache.activemq.ActiveMQConnectionFactory;
import javax.jms.*;
import java.util.UUID;

/**
 * ActiveMQ Producer Example
 * Demonstrates sending messages to a queue using JMS API
 */
public class MessageProducer {

    // Connection parameters
    private static final String BROKER_URL = "tcp://localhost:61616";
    private static final String USERNAME = "producer";
    private static final String PASSWORD = "producerPass456!";
    private static final String QUEUE_NAME = "orders.new";

    private Connection connection;
    private Session session;
    private javax.jms.MessageProducer producer;

    /**
     * Initialize the producer with connection to ActiveMQ
     */
    public void initialize() throws JMSException {
        // Create a connection factory with authentication
        ActiveMQConnectionFactory factory = new ActiveMQConnectionFactory(
            USERNAME,
            PASSWORD,
            BROKER_URL
        );

        // Configure the factory for reliability
        factory.setTrustAllPackages(true);  // Allow object serialization
        factory.setUseAsyncSend(false);     // Synchronous sends for reliability

        // Create and start the connection
        connection = factory.createConnection();
        connection.start();
        System.out.println("Connected to ActiveMQ at " + BROKER_URL);

        // Create a session with AUTO_ACKNOWLEDGE mode
        // AUTO_ACKNOWLEDGE: Messages are acknowledged automatically upon receipt
        // CLIENT_ACKNOWLEDGE: Messages must be explicitly acknowledged
        // SESSION_TRANSACTED: Messages are part of a transaction
        session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);

        // Create the destination queue
        Destination destination = session.createQueue(QUEUE_NAME);

        // Create the message producer
        producer = session.createProducer(destination);

        // Set delivery mode to PERSISTENT for message durability
        producer.setDeliveryMode(DeliveryMode.PERSISTENT);

        System.out.println("Producer initialized for queue: " + QUEUE_NAME);
    }

    /**
     * Send a text message to the queue
     *
     * @param messageContent The content of the message
     * @throws JMSException If an error occurs during sending
     */
    public void sendTextMessage(String messageContent) throws JMSException {
        // Create a text message
        TextMessage message = session.createTextMessage(messageContent);

        // Set custom properties for routing or filtering
        message.setStringProperty("MessageType", "ORDER");
        message.setStringProperty("CorrelationID", UUID.randomUUID().toString());
        message.setLongProperty("Timestamp", System.currentTimeMillis());

        // Send the message
        producer.send(message);
        System.out.println("Sent message: " + messageContent);
    }

    /**
     * Send a map message with structured data
     *
     * @param orderId    The order ID
     * @param customerId The customer ID
     * @param product    The product name
     * @param quantity   The quantity ordered
     * @param price      The unit price
     * @throws JMSException If an error occurs during sending
     */
    public void sendOrderMessage(String orderId, String customerId,
                                  String product, int quantity, double price)
                                  throws JMSException {
        // Create a map message for structured data
        MapMessage message = session.createMapMessage();

        // Set the order details
        message.setString("orderId", orderId);
        message.setString("customerId", customerId);
        message.setString("product", product);
        message.setInt("quantity", quantity);
        message.setDouble("price", price);
        message.setDouble("total", quantity * price);
        message.setLong("timestamp", System.currentTimeMillis());

        // Set message priority (0-9, default is 4)
        producer.setPriority(6);

        // Send the message
        producer.send(message);
        System.out.println("Sent order: " + orderId);
    }

    /**
     * Close all resources
     */
    public void close() {
        try {
            if (producer != null) producer.close();
            if (session != null) session.close();
            if (connection != null) connection.close();
            System.out.println("Producer closed");
        } catch (JMSException e) {
            System.err.println("Error closing producer: " + e.getMessage());
        }
    }

    /**
     * Main method demonstrating message production
     */
    public static void main(String[] args) {
        MessageProducer producer = new MessageProducer();

        try {
            // Initialize the producer
            producer.initialize();

            // Send some text messages
            for (int i = 1; i <= 5; i++) {
                String json = String.format(
                    "{\"messageId\": %d, \"content\": \"Test message %d\"}",
                    i, i
                );
                producer.sendTextMessage(json);
            }

            // Send some order messages
            producer.sendOrderMessage("ORD-001", "CUST-101", "Widget", 5, 29.99);
            producer.sendOrderMessage("ORD-002", "CUST-102", "Gadget", 2, 149.99);
            producer.sendOrderMessage("ORD-003", "CUST-103", "Tool", 10, 9.99);

            System.out.println("All messages sent successfully");

        } catch (JMSException e) {
            System.err.println("JMS Error: " + e.getMessage());
            e.printStackTrace();
        } finally {
            // Always close the producer
            producer.close();
        }
    }
}
```

#### Consumer Example (Java)

```java
package com.example.activemq;

import org.apache.activemq.ActiveMQConnectionFactory;
import javax.jms.*;
import java.util.concurrent.CountDownLatch;

/**
 * ActiveMQ Consumer Example
 * Demonstrates receiving messages from a queue using JMS API
 */
public class MessageConsumer implements MessageListener, ExceptionListener {

    // Connection parameters
    private static final String BROKER_URL = "tcp://localhost:61616";
    private static final String USERNAME = "consumer";
    private static final String PASSWORD = "consumerPass789!";
    private static final String QUEUE_NAME = "orders.new";

    private Connection connection;
    private Session session;
    private javax.jms.MessageConsumer consumer;
    private CountDownLatch shutdownLatch = new CountDownLatch(1);
    private int messageCount = 0;

    /**
     * Initialize the consumer with connection to ActiveMQ
     */
    public void initialize() throws JMSException {
        // Create a connection factory with authentication
        ActiveMQConnectionFactory factory = new ActiveMQConnectionFactory(
            USERNAME,
            PASSWORD,
            BROKER_URL
        );

        // Configure the factory
        factory.setTrustAllPackages(true);

        // Create and configure the connection
        connection = factory.createConnection();
        connection.setExceptionListener(this);  // Handle connection errors

        // Set a client ID for durable subscriptions (optional)
        connection.setClientID("OrderConsumer-1");

        System.out.println("Connected to ActiveMQ at " + BROKER_URL);

        // Create a session
        session = connection.createSession(false, Session.AUTO_ACKNOWLEDGE);

        // Create the destination queue
        Destination destination = session.createQueue(QUEUE_NAME);

        // Create the message consumer
        consumer = session.createConsumer(destination);

        // Set the message listener (asynchronous processing)
        consumer.setMessageListener(this);

        // Start the connection to begin receiving messages
        connection.start();

        System.out.println("Consumer listening on queue: " + QUEUE_NAME);
    }

    /**
     * Handle incoming messages (MessageListener interface)
     *
     * @param message The received JMS message
     */
    @Override
    public void onMessage(Message message) {
        messageCount++;

        try {
            System.out.println("\n" + "=".repeat(60));
            System.out.println("Message #" + messageCount + " received");
            System.out.println("  Message ID: " + message.getJMSMessageID());
            System.out.println("  Correlation ID: " + message.getJMSCorrelationID());
            System.out.println("  Timestamp: " + message.getJMSTimestamp());
            System.out.println("  Priority: " + message.getJMSPriority());

            // Handle different message types
            if (message instanceof TextMessage) {
                TextMessage textMessage = (TextMessage) message;
                System.out.println("  Type: TextMessage");
                System.out.println("  Content: " + textMessage.getText());
                processTextMessage(textMessage);

            } else if (message instanceof MapMessage) {
                MapMessage mapMessage = (MapMessage) message;
                System.out.println("  Type: MapMessage");
                processMapMessage(mapMessage);

            } else if (message instanceof ObjectMessage) {
                ObjectMessage objectMessage = (ObjectMessage) message;
                System.out.println("  Type: ObjectMessage");
                System.out.println("  Object: " + objectMessage.getObject());

            } else if (message instanceof BytesMessage) {
                BytesMessage bytesMessage = (BytesMessage) message;
                System.out.println("  Type: BytesMessage");
                System.out.println("  Length: " + bytesMessage.getBodyLength() + " bytes");

            } else {
                System.out.println("  Type: Unknown message type");
            }

            System.out.println("=".repeat(60));

        } catch (JMSException e) {
            System.err.println("Error processing message: " + e.getMessage());
        }
    }

    /**
     * Process a text message
     */
    private void processTextMessage(TextMessage message) throws JMSException {
        String content = message.getText();
        // Add your text message processing logic here
        System.out.println("  Processing text message...");
    }

    /**
     * Process a map message containing order data
     */
    private void processMapMessage(MapMessage message) throws JMSException {
        String orderId = message.getString("orderId");
        String customerId = message.getString("customerId");
        String product = message.getString("product");
        int quantity = message.getInt("quantity");
        double price = message.getDouble("price");
        double total = message.getDouble("total");

        System.out.println("  Order Details:");
        System.out.println("    Order ID: " + orderId);
        System.out.println("    Customer ID: " + customerId);
        System.out.println("    Product: " + product);
        System.out.println("    Quantity: " + quantity);
        System.out.println("    Price: $" + price);
        System.out.println("    Total: $" + total);

        // Add your order processing logic here
        System.out.println("  Processing order " + orderId + "...");
    }

    /**
     * Handle connection exceptions (ExceptionListener interface)
     */
    @Override
    public void onException(JMSException exception) {
        System.err.println("JMS Exception occurred: " + exception.getMessage());
        exception.printStackTrace();
    }

    /**
     * Wait for shutdown signal
     */
    public void run() throws InterruptedException {
        System.out.println("Consumer is running. Press Ctrl+C to exit.");

        // Add shutdown hook for graceful termination
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("\nShutdown requested...");
            shutdownLatch.countDown();
        }));

        // Wait until shutdown is requested
        shutdownLatch.await();
    }

    /**
     * Close all resources
     */
    public void close() {
        try {
            if (consumer != null) consumer.close();
            if (session != null) session.close();
            if (connection != null) connection.close();
            System.out.println("Consumer closed. Processed " + messageCount + " messages.");
        } catch (JMSException e) {
            System.err.println("Error closing consumer: " + e.getMessage());
        }
    }

    /**
     * Main method demonstrating message consumption
     */
    public static void main(String[] args) {
        MessageConsumer consumer = new MessageConsumer();

        try {
            // Initialize the consumer
            consumer.initialize();

            // Run until shutdown
            consumer.run();

        } catch (JMSException e) {
            System.err.println("JMS Error: " + e.getMessage());
            e.printStackTrace();
        } catch (InterruptedException e) {
            System.out.println("Consumer interrupted");
        } finally {
            // Always close the consumer
            consumer.close();
        }
    }
}
```

## Monitoring and Management

### JMX Monitoring

ActiveMQ exposes extensive metrics via JMX. Connect using JConsole:

```bash
# Launch JConsole
jconsole localhost:1099
```

Key MBeans to monitor:

| MBean | Description |
|-------|-------------|
| `org.apache.activemq:type=Broker` | Overall broker statistics |
| `org.apache.activemq:type=Queue` | Queue-specific metrics |
| `org.apache.activemq:type=Topic` | Topic-specific metrics |
| `org.apache.activemq:type=Connection` | Active connections |

### REST API

ActiveMQ provides a REST API for monitoring and management:

```bash
# Get broker information
curl -u admin:adminPassword123! \
  http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost

# List all queues
curl -u admin:adminPassword123! \
  http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost/Queues

# Get queue statistics
curl -u admin:adminPassword123! \
  "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=orders.new"

# Get queue depth (number of pending messages)
curl -u admin:adminPassword123! \
  "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=orders.new/QueueSize"
```

### Log Analysis

ActiveMQ logs are stored in `/opt/activemq/data/`:

```bash
# View the main log file
tail -f /opt/activemq/data/activemq.log

# Search for errors
grep -i error /opt/activemq/data/activemq.log

# Search for connection issues
grep -i "connection" /opt/activemq/data/activemq.log
```

Configure logging levels in `/opt/activemq/conf/log4j2.properties`:

```properties
# Root logger level
rootLogger.level = INFO

# ActiveMQ specific logging
logger.activemq.name = org.apache.activemq
logger.activemq.level = INFO

# Connection logging (useful for debugging)
logger.transport.name = org.apache.activemq.transport
logger.transport.level = DEBUG

# Persistence logging
logger.kahadb.name = org.apache.activemq.store.kahadb
logger.kahadb.level = INFO
```

### Health Check Script

Create a simple health check script:

```bash
#!/bin/bash
# ActiveMQ Health Check Script
# Save as: /opt/activemq/bin/healthcheck.sh

BROKER_URL="http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost"
USERNAME="admin"
PASSWORD="adminPassword123!"

# Check if ActiveMQ is responding
response=$(curl -s -u ${USERNAME}:${PASSWORD} ${BROKER_URL} 2>&1)

if [ $? -ne 0 ]; then
    echo "CRITICAL: ActiveMQ is not responding"
    exit 2
fi

# Parse the response to check broker status
status=$(echo $response | grep -o '"BrokerName":"localhost"')

if [ -z "$status" ]; then
    echo "WARNING: Unable to verify broker status"
    exit 1
fi

echo "OK: ActiveMQ broker is healthy"
exit 0
```

Make it executable:

```bash
chmod +x /opt/activemq/bin/healthcheck.sh
```

## Clustering for High Availability

### Master-Slave Configuration

ActiveMQ supports multiple clustering topologies. Here is a shared storage master-slave configuration:

#### Master Broker Configuration

```xml
<!-- File: activemq-master.xml -->
<broker xmlns="http://activemq.apache.org/schema/core"
        brokerName="master-broker"
        dataDirectory="${activemq.data}"
        useJmx="true">

    <!--
        Shared Storage Master-Slave
        Uses a shared file system for failover
        Only one broker can acquire the lock and become active
    -->
    <persistenceAdapter>
        <kahaDB directory="/shared/activemq/kahadb"
                lockKeepAlivePeriod="5000"
                enableIndexWriteAsync="true"/>
    </persistenceAdapter>

    <!-- Transport connectors -->
    <transportConnectors>
        <transportConnector name="openwire"
                          uri="tcp://0.0.0.0:61616?maximumConnections=1000"/>
    </transportConnectors>

</broker>
```

#### Slave Broker Configuration

```xml
<!-- File: activemq-slave.xml -->
<broker xmlns="http://activemq.apache.org/schema/core"
        brokerName="slave-broker"
        dataDirectory="${activemq.data}"
        useJmx="true">

    <!--
        Same shared storage location as master
        Slave will wait until it can acquire the lock
    -->
    <persistenceAdapter>
        <kahaDB directory="/shared/activemq/kahadb"
                lockKeepAlivePeriod="5000"
                enableIndexWriteAsync="true"/>
    </persistenceAdapter>

    <!-- Same transport configuration -->
    <transportConnectors>
        <transportConnector name="openwire"
                          uri="tcp://0.0.0.0:61616?maximumConnections=1000"/>
    </transportConnectors>

</broker>
```

### Network of Brokers

For horizontal scaling and geographic distribution, configure a network of brokers:

```xml
<broker xmlns="http://activemq.apache.org/schema/core"
        brokerName="broker-east"
        dataDirectory="${activemq.data}">

    <!--
        Network Connectors
        Define connections to other brokers in the network
    -->
    <networkConnectors>
        <!--
            Duplex connector to broker-west
            duplex="true": Messages flow in both directions
            decreaseNetworkConsumerPriority="true": Prefer local consumers
            networkTTL="2": Maximum hops for forwarding messages
        -->
        <networkConnector name="broker-east-to-west"
                         uri="static:(tcp://broker-west:61616)"
                         duplex="true"
                         decreaseNetworkConsumerPriority="true"
                         networkTTL="2"
                         dynamicOnly="true">
            <!-- Only forward messages for specific destinations -->
            <dynamicallyIncludedDestinations>
                <queue physicalName="orders.>"/>
                <topic physicalName="notifications.>"/>
            </dynamicallyIncludedDestinations>
            <!-- Exclude advisory messages from forwarding -->
            <excludedDestinations>
                <topic physicalName="ActiveMQ.Advisory.>"/>
            </excludedDestinations>
        </networkConnector>
    </networkConnectors>

    <transportConnectors>
        <transportConnector name="openwire"
                          uri="tcp://0.0.0.0:61616"/>
    </transportConnectors>

</broker>
```

### Client Failover Configuration

Configure clients to automatically reconnect during failover:

```java
// Java client with failover configuration
String brokerUrl = "failover:(tcp://broker1:61616,tcp://broker2:61616)?" +
    "randomize=false&" +           // Try brokers in order
    "maxReconnectAttempts=10&" +   // Maximum reconnection attempts
    "maxReconnectDelay=30000&" +   // Maximum delay between attempts (30s)
    "initialReconnectDelay=1000&"  // Initial delay (1s)
    "backup=true";                 // Maintain backup connection

ActiveMQConnectionFactory factory = new ActiveMQConnectionFactory(brokerUrl);
```

Python client with failover:

```python
import stomp

# Define multiple hosts for failover
hosts = [
    ('broker1.example.com', 61613),
    ('broker2.example.com', 61613),
    ('broker3.example.com', 61613)
]

# Create connection with failover support
connection = stomp.Connection(
    host_and_ports=hosts,
    reconnect_attempts_max=10,     # Maximum reconnection attempts
    reconnect_sleep_initial=1.0,   # Initial sleep between attempts
    reconnect_sleep_increase=0.5,  # Increase sleep time per attempt
    reconnect_sleep_max=30.0       # Maximum sleep time (30 seconds)
)
```

## Security Best Practices

### Enable SSL/TLS

Configure SSL for secure communication:

```xml
<transportConnectors>
    <!-- SSL-enabled OpenWire connector -->
    <transportConnector name="ssl"
        uri="ssl://0.0.0.0:61617?needClientAuth=true"/>
</transportConnectors>

<sslContext>
    <sslContext
        keyStore="/opt/activemq/conf/broker.ks"
        keyStorePassword="password123"
        trustStore="/opt/activemq/conf/broker.ts"
        trustStorePassword="password123"/>
</sslContext>
```

Generate SSL certificates:

```bash
# Generate a keystore with a self-signed certificate
keytool -genkey -alias broker -keyalg RSA -keysize 2048 \
  -validity 365 -keystore /opt/activemq/conf/broker.ks \
  -storepass password123 -keypass password123 \
  -dname "CN=activemq.example.com, OU=IT, O=Company, L=City, ST=State, C=US"

# Export the certificate
keytool -export -alias broker -file /tmp/broker.cer \
  -keystore /opt/activemq/conf/broker.ks -storepass password123

# Create a truststore and import the certificate
keytool -import -alias broker -file /tmp/broker.cer \
  -keystore /opt/activemq/conf/broker.ts -storepass password123 -noprompt
```

### Network Security

```bash
# Restrict access to specific IP addresses using iptables
# Allow only internal network to access ActiveMQ
sudo iptables -A INPUT -p tcp --dport 61616 -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 61616 -j DROP

# Or configure in activemq.xml with IP filtering
```

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | ActiveMQ not running | Check service status: `systemctl status activemq` |
| Authentication failed | Wrong credentials | Verify username/password in configuration |
| Out of memory | Insufficient heap | Increase `-Xmx` in env configuration |
| Slow performance | Too many pending messages | Increase consumer count or reduce producer rate |
| Disk full | KahaDB growth | Configure message expiration or increase disk space |

### Diagnostic Commands

```bash
# Check ActiveMQ process
ps aux | grep activemq

# Check port availability
netstat -tlnp | grep -E "(61616|8161|61613)"

# Check disk usage
df -h /opt/activemq/data

# Check memory usage
free -m

# View system journal for ActiveMQ
journalctl -u activemq --since "1 hour ago"

# Test connectivity
telnet localhost 61616
```

## Performance Tuning

### Optimizing for High Throughput

```xml
<broker>
    <!-- Enable producer flow control -->
    <destinationPolicy>
        <policyMap>
            <policyEntries>
                <policyEntry queue=">"
                    producerFlowControl="false"
                    memoryLimit="500mb"
                    optimizedDispatch="true"
                    expireMessagesPeriod="0"
                    prioritizedMessages="false">
                    <pendingQueuePolicy>
                        <vmQueueCursor/>
                    </pendingQueuePolicy>
                </policyEntry>
            </policyEntries>
        </policyMap>
    </destinationPolicy>

    <!-- Optimize persistence -->
    <persistenceAdapter>
        <kahaDB directory="${activemq.data}/kahadb"
            journalMaxFileLength="128mb"
            enableJournalDiskSyncs="false"
            indexWriteBatchSize="10000"
            concurrentStoreAndDispatchQueues="true"/>
    </persistenceAdapter>
</broker>
```

### JVM Tuning for Production

```bash
# Production JVM settings
ACTIVEMQ_OPTS="-Xms4G -Xmx4G"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -XX:+UseG1GC"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -XX:MaxGCPauseMillis=200"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -XX:+ParallelRefProcEnabled"
ACTIVEMQ_OPTS="$ACTIVEMQ_OPTS -XX:+UseStringDeduplication"
```

## Monitoring with OneUptime

While ActiveMQ provides built-in monitoring capabilities, production deployments require comprehensive monitoring and alerting. OneUptime offers a complete solution for monitoring your ActiveMQ infrastructure:

- **Uptime Monitoring**: Track the availability of your ActiveMQ brokers with automatic health checks
- **Performance Metrics**: Monitor queue depths, message throughput, and consumer lag in real-time
- **Alerting**: Receive instant notifications via email, Slack, or PagerDuty when issues arise
- **Incident Management**: Coordinate response to ActiveMQ outages with built-in incident workflows
- **Status Pages**: Keep stakeholders informed about your messaging infrastructure status

Visit [OneUptime](https://oneuptime.com) to set up comprehensive monitoring for your ActiveMQ deployment and ensure your message queues remain healthy and performant.

## Conclusion

You have now learned how to install, configure, and manage Apache ActiveMQ on Ubuntu. This guide covered:

- Understanding message broker concepts and ActiveMQ architecture
- Installing Java and ActiveMQ with proper system configuration
- Configuring transport connectors, persistence, and security
- Creating and managing queues and topics
- Implementing authentication and authorization
- Setting up systemd for production deployment
- Writing producer and consumer applications in Python and Java
- Monitoring and troubleshooting techniques
- Clustering for high availability

ActiveMQ provides a robust foundation for building scalable, event-driven applications. With proper configuration and monitoring, it can handle millions of messages per day while maintaining reliability and performance.

For further learning, explore the official Apache ActiveMQ documentation and consider implementing additional features such as virtual destinations, message selectors, and dead letter queues to build more sophisticated messaging patterns.
