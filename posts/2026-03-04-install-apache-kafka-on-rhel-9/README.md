# How to Install Apache Kafka on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Linux

Description: Step-by-step guide on install apache kafka using Red Hat Enterprise Linux 9.

---

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and streaming applications. Installing it on RHEL provides a solid foundation for event-driven architectures.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install Java (required for Kafka) and wget
sudo dnf install -y java-17-openjdk java-17-openjdk-devel wget

# Download Apache Kafka
cd /opt
sudo wget https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz
sudo tar -xzf kafka_2.13-3.7.0.tgz
sudo mv kafka_2.13-3.7.0 kafka
sudo useradd -r -s /sbin/nologin kafka
sudo chown -R kafka:kafka /opt/kafka
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /opt/kafka/config/kraft/server.properties
```

Adjust the settings according to your requirements. Key parameters to configure include `listeners`, `advertised.listeners`, `log.dirs`, authentication settings, and logging options.

```bash
# Generate a cluster ID and format the Kafka storage directory
KAFKA_CLUSTER_ID="$(/opt/kafka/bin/kafka-storage.sh random-uuid)"
sudo -u kafka /opt/kafka/bin/kafka-storage.sh format -t "$KAFKA_CLUSTER_ID" -c /opt/kafka/config/kraft/server.properties

# Create a systemd service
sudo tee /etc/systemd/system/kafka.service > /dev/null <<'EOF'
[Unit]
Description=Apache Kafka Server
After=network.target

[Service]
Type=simple
User=kafka
Group=kafka
WorkingDirectory=/opt/kafka
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd after creating the service file
sudo systemctl daemon-reload
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable kafka

# Start the service
sudo systemctl start kafka

# Check the status
sudo systemctl status kafka
```

## Step 4: Configure the Firewall

```bash
# Open the required port
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

- If the service fails to start, check the logs with `journalctl -u kafka -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep -E 'java-17-openjdk|wget'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
