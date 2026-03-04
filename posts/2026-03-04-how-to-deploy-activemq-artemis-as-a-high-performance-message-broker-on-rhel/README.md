# How to Deploy ActiveMQ Artemis as a High-Performance Message Broker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ActiveMQ Artemis, Message Broker, JMS, High Performance

Description: Learn how to install and configure Apache ActiveMQ Artemis on RHEL as a high-performance message broker with journal-based persistence.

---

Apache ActiveMQ Artemis is the next-generation message broker from the ActiveMQ project. It features a high-performance journal for persistence, non-blocking architecture, and support for multiple protocols including AMQP, STOMP, MQTT, and OpenWire.

## Prerequisites

```bash
sudo dnf install -y java-17-openjdk
java -version
```

## Installing Artemis

```bash
# Download Artemis
curl -L https://downloads.apache.org/activemq/activemq-artemis/2.33.0/apache-artemis-2.33.0-bin.tar.gz \
  -o /tmp/artemis.tar.gz
sudo tar xzf /tmp/artemis.tar.gz -C /opt/
sudo mv /opt/apache-artemis-2.33.0 /opt/artemis

# Create a system user
sudo useradd -r -s /sbin/nologin artemis
```

## Creating a Broker Instance

```bash
# Create a broker instance with specific settings
sudo /opt/artemis/bin/artemis create /var/lib/artemis-broker \
  --user admin \
  --password admin123 \
  --role admin \
  --allow-anonymous \
  --http-host 0.0.0.0

sudo chown -R artemis:artemis /var/lib/artemis-broker
```

## Configuring the Broker

```xml
<!-- Key sections in /var/lib/artemis-broker/etc/broker.xml -->

<!-- Acceptors define how clients connect -->
<acceptors>
  <acceptor name="artemis">tcp://0.0.0.0:61616?tcpSendBufferSize=1048576;tcpReceiveBufferSize=1048576</acceptor>
  <acceptor name="amqp">tcp://0.0.0.0:5672?protocols=AMQP</acceptor>
  <acceptor name="stomp">tcp://0.0.0.0:61613?protocols=STOMP</acceptor>
  <acceptor name="mqtt">tcp://0.0.0.0:1883?protocols=MQTT</acceptor>
</acceptors>

<!-- Address settings for queues -->
<address-settings>
  <address-setting match="#">
    <max-size-bytes>100MB</max-size-bytes>
    <page-size-bytes>10MB</page-size-bytes>
    <redelivery-delay>5000</redelivery-delay>
    <max-delivery-attempts>5</max-delivery-attempts>
  </address-setting>
</address-settings>
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/artemis.service
[Unit]
Description=Apache ActiveMQ Artemis
After=network.target

[Service]
Type=forking
User=artemis
ExecStart=/var/lib/artemis-broker/bin/artemis-service start
ExecStop=/var/lib/artemis-broker/bin/artemis-service stop
Restart=on-failure
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now artemis
```

## Testing the Broker

```bash
# Produce messages
/var/lib/artemis-broker/bin/artemis producer \
  --destination queue://TEST \
  --message-count 1000 \
  --message-size 1024

# Consume messages
/var/lib/artemis-broker/bin/artemis consumer \
  --destination queue://TEST \
  --message-count 1000
```

## Accessing the Web Console

```bash
# The web console runs on port 8161 by default
# Access at http://your-server:8161/console
sudo firewall-cmd --add-port=8161/tcp --permanent
sudo firewall-cmd --add-port=61616/tcp --permanent
sudo firewall-cmd --reload
```

Artemis uses an append-only journal for persistence, which provides much higher throughput than traditional database-backed stores. For production, configure the journal to use Linux AIO (libaio) for best performance.
