# How to Install and Configure Apache ActiveMQ on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ActiveMQ, Message Broker, Linux

Description: Learn how to install and Configure Apache ActiveMQ on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Apache ActiveMQ is a popular open-source message broker that supports multiple protocols including AMQP, STOMP, MQTT, and OpenWire. It is widely used in enterprise Java applications for reliable messaging.

## Prerequisites

- RHEL 9
- Java 17 installed
- Root or sudo access

## Step 1: Install Java

```bash
sudo dnf install -y java-17-openjdk
```

## Step 2: Download and Install ActiveMQ

```bash
cd /opt
sudo curl -L https://downloads.apache.org/activemq/6.1.0/apache-activemq-6.1.0-bin.tar.gz | sudo tar xz
sudo ln -s apache-activemq-6.1.0 activemq
```

## Step 3: Create Service User

```bash
sudo useradd -r -s /sbin/nologin activemq
sudo chown -R activemq:activemq /opt/activemq* /opt/apache-activemq*
```

## Step 4: Configure ActiveMQ

```bash
sudo vi /opt/activemq/conf/activemq.xml
```

Key configuration sections include transport connectors, persistence, and memory limits.

## Step 5: Create systemd Service

```bash
sudo vi /etc/systemd/system/activemq.service
```

```ini
[Unit]
Description=Apache ActiveMQ
After=network.target

[Service]
Type=forking
User=activemq
Group=activemq
ExecStart=/opt/activemq/bin/activemq start
ExecStop=/opt/activemq/bin/activemq stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now activemq
```

## Step 6: Access the Web Console

Open `http://your-server:8161/admin/` (default credentials: admin/admin).

## Step 7: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=61616/tcp   # OpenWire
sudo firewall-cmd --permanent --add-port=8161/tcp     # Web console
sudo firewall-cmd --reload
```

## Step 8: Test Messaging

Use the web console to create a queue and send/receive test messages, or use the command-line producer/consumer tools.

## Conclusion

Apache ActiveMQ on RHEL 9 provides a mature, feature-rich message broker supporting multiple protocols. Its web console makes management straightforward, and its JMS support integrates naturally with Java enterprise applications.
