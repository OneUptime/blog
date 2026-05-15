# How to Deploy Kafka with KRaft Mode (Without ZooKeeper) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Linux

Description: Step-by-step guide on deploy kafka with kraft mode (without zookeeper) using Red Hat Enterprise Linux 9.

---

ZooKeeper has traditionally been Kafka's coordination service, managing broker metadata and leader elections. KRaft mode removes the ZooKeeper dependency by managing cluster metadata inside Kafka itself.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Apache Kafka extracted under `/opt/kafka` and Java installed
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Configure Kafka in KRaft mode:

```bash
# Create the KRaft configuration directory
sudo mkdir -p /opt/kafka/config/kraft /var/lib/kafka-logs

# Configure a single-node Kafka broker and controller
sudo tee /opt/kafka/config/kraft/server.properties > /dev/null <<EOF
node.id=1
process.roles=broker,controller
listeners=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
advertised.listeners=PLAINTEXT://localhost:9092
listener.security.protocol.map=PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
inter.broker.listener.name=PLAINTEXT
controller.listener.names=CONTROLLER
controller.quorum.voters=1@localhost:9093
log.dirs=/var/lib/kafka-logs
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1
EOF

# Format the KRaft metadata storage before the first startup
KAFKA_CLUSTER_ID="$(/opt/kafka/bin/kafka-storage.sh random-uuid)"
sudo /opt/kafka/bin/kafka-storage.sh format --cluster-id "$KAFKA_CLUSTER_ID" --config /opt/kafka/config/kraft/server.properties
```

## Step 3: Enable and Start the Service

```bash
# Create a systemd service for Kafka
sudo tee /etc/systemd/system/kafka.service > /dev/null <<EOF
[Unit]
Description=Apache Kafka Server
After=network.target

[Service]
Type=simple
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd after adding the unit file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable kafka.service

# Start the service
sudo systemctl start kafka.service

# Check the status
sudo systemctl status kafka.service
```

## Step 4: Configure the Firewall

```bash
# Open the Kafka client port
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

- If the service fails to start, check the logs with `journalctl -u kafka.service -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Java is installed: `java -version`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
