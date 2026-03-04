# How to Install and Configure Apache ActiveMQ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ActiveMQ, Message Broker, JMS, Java

Description: Learn how to install and configure Apache ActiveMQ Classic on RHEL as a JMS-compliant message broker.

---

Apache ActiveMQ is a popular open-source message broker that supports JMS, AMQP, STOMP, and MQTT protocols. It provides reliable messaging with features like persistent storage, clustering, and message filtering.

## Prerequisites

```bash
# Install Java
sudo dnf install -y java-17-openjdk
java -version
```

## Installing ActiveMQ

```bash
# Download ActiveMQ Classic
curl -L https://downloads.apache.org/activemq/6.1.0/apache-activemq-6.1.0-bin.tar.gz \
  -o /tmp/activemq.tar.gz
sudo tar xzf /tmp/activemq.tar.gz -C /opt/
sudo mv /opt/apache-activemq-6.1.0 /opt/activemq

# Create a system user
sudo useradd -r -s /sbin/nologin activemq
sudo chown -R activemq:activemq /opt/activemq
```

## Configuring ActiveMQ

Edit the main configuration file:

```xml
<!-- /opt/activemq/conf/activemq.xml -->
<!-- Key sections to configure: -->

<!-- Transport connectors - define how clients connect -->
<transportConnectors>
    <transportConnector name="openwire" uri="tcp://0.0.0.0:61616"/>
    <transportConnector name="amqp" uri="amqp://0.0.0.0:5672"/>
    <transportConnector name="stomp" uri="stomp://0.0.0.0:61613"/>
    <transportConnector name="mqtt" uri="mqtt://0.0.0.0:1883"/>
</transportConnectors>
```

## Setting Up Authentication

```bash
# Edit /opt/activemq/conf/jetty-realm.properties
# Format: username: password, role
# admin: admin123, admin
# user: user123, user
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/activemq.service
[Unit]
Description=Apache ActiveMQ
After=network.target

[Service]
Type=forking
User=activemq
ExecStart=/opt/activemq/bin/activemq start
ExecStop=/opt/activemq/bin/activemq stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now activemq
```

## Verifying the Installation

```bash
# Check ActiveMQ status
sudo systemctl status activemq

# Access the web console (default: http://localhost:8161/admin)
# Default credentials: admin/admin
curl -u admin:admin http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=61616/tcp --permanent  # OpenWire
sudo firewall-cmd --add-port=8161/tcp --permanent    # Web console
sudo firewall-cmd --add-port=5672/tcp --permanent    # AMQP
sudo firewall-cmd --reload
```

## Testing with Command Line

```bash
# Send a message
/opt/activemq/bin/activemq producer --destination queue://TEST.QUEUE --messageCount 10

# Receive messages
/opt/activemq/bin/activemq consumer --destination queue://TEST.QUEUE --messageCount 10
```

Change the default admin password before exposing the web console. Configure persistent storage with KahaDB (default) or a JDBC store for production environments.
