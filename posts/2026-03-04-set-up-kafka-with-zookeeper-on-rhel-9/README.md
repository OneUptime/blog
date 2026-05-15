# How to Set Up Kafka with ZooKeeper on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Linux

Description: Step-by-step guide on set up kafka with zookeeper using Red Hat Enterprise Linux 9.

---

ZooKeeper has traditionally been Kafka's coordination service, managing broker metadata and leader elections. While KRaft mode has replaced ZooKeeper in Apache Kafka 4.0 and later, many Kafka 3.x deployments still use this architecture.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Java installed and Apache Kafka 3.x extracted to `/opt/kafka`

## Step 2: Configure the Service

Configure ZooKeeper and Kafka:

```bash
# Configure ZooKeeper

sudo mkdir -p /var/lib/zookeeper /var/lib/kafka-logs

sudo tee /opt/kafka/config/zookeeper.properties >/dev/null <<EOF
dataDir=/var/lib/zookeeper
clientPort=2181
maxClientCnxns=0
EOF

# Configure Kafka broker
sudo tee /opt/kafka/config/server.properties >/dev/null <<EOF
broker.id=0
listeners=PLAINTEXT://:9092
advertised.listeners=PLAINTEXT://localhost:9092
log.dirs=/var/lib/kafka-logs
zookeeper.connect=localhost:2181
EOF
```

## Step 3: Enable and Start the Service

```bash
# Create a ZooKeeper systemd service
sudo tee /etc/systemd/system/zookeeper.service >/dev/null <<EOF
[Unit]
Description=Apache ZooKeeper server
After=network.target

[Service]
Type=simple
ExecStart=/opt/kafka/bin/zookeeper-server-start.sh /opt/kafka/config/zookeeper.properties
ExecStop=/opt/kafka/bin/zookeeper-server-stop.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Create a Kafka systemd service
sudo tee /etc/systemd/system/kafka.service >/dev/null <<EOF
[Unit]
Description=Apache Kafka broker
After=network.target zookeeper.service
Requires=zookeeper.service

[Service]
Type=simple
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable the services to start on boot
sudo systemctl daemon-reload
sudo systemctl enable zookeeper kafka

# Start the services
sudo systemctl start zookeeper kafka

# Check the status
sudo systemctl status zookeeper kafka
```

## Step 4: Configure the Firewall

```bash
# Open the Kafka broker port
sudo firewall-cmd --permanent --add-port=9092/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Kafka broker status
/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Create a test topic
/opt/kafka/bin/kafka-topics.sh --create --topic test --bootstrap-server localhost:9092

# List topics
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u zookeeper -u kafka -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Java is installed: `rpm -qa | grep java`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
