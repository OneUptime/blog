# How to Deploy ActiveMQ Artemis as a High-Performance Message Broker on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ActiveMQ, Message Broker, Linux

Description: Learn how to deploy ActiveMQ Artemis as a High-Performance Message Broker on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Apache ActiveMQ Artemis is the next-generation message broker from the ActiveMQ project, designed for high performance and low latency. It features a non-blocking architecture, persistent messaging with journal-based storage, and supports AMQP 1.0, MQTT, STOMP, and OpenWire protocols.

## Prerequisites

- RHEL 9
- Java 17 installed
- Root or sudo access

## Step 1: Download Artemis

```bash
cd /opt
sudo curl -L https://downloads.apache.org/activemq/activemq-artemis/2.33.0/apache-artemis-2.33.0-bin.tar.gz | sudo tar xz
sudo ln -s apache-artemis-2.33.0 artemis
```

## Step 2: Create a Broker Instance

```bash
sudo /opt/artemis/bin/artemis create /var/lib/artemis/broker   --user admin --password admin123   --allow-anonymous --http-host 0.0.0.0
```

## Step 3: Create Service User and systemd Unit

```bash
sudo useradd -r -s /sbin/nologin artemis
sudo chown -R artemis:artemis /var/lib/artemis

sudo vi /etc/systemd/system/artemis.service
```

```ini
[Unit]
Description=Apache ActiveMQ Artemis
After=network.target

[Service]
Type=forking
User=artemis
Group=artemis
ExecStart=/var/lib/artemis/broker/bin/artemis-service start
ExecStop=/var/lib/artemis/broker/bin/artemis-service stop
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now artemis
```

## Step 4: Access the Web Console

Open `http://your-server:8161/console/`.

## Step 5: Test with the CLI

Produce messages:

```bash
/var/lib/artemis/broker/bin/artemis producer --url tcp://localhost:61616 --message-count 100
```

Consume messages:

```bash
/var/lib/artemis/broker/bin/artemis consumer --url tcp://localhost:61616 --message-count 100
```

## Conclusion

ActiveMQ Artemis provides a high-performance, modern message broker on RHEL 9 with journal-based persistence and support for multiple messaging protocols. It is the recommended choice for new ActiveMQ deployments.
