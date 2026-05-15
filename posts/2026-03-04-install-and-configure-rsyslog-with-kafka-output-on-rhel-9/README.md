# How to Install and Configure rsyslog with Kafka Output on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Logging, Linux

Description: Step-by-step guide on install and configure rsyslog with kafka output using Red Hat Enterprise Linux 9.

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

# Install rsyslog Kafka support, Java, and download tools
sudo dnf install -y rsyslog rsyslog-kafka java-17-openjdk java-17-openjdk-devel wget firewalld

# Download Apache Kafka
cd /opt
sudo wget https://archive.apache.org/dist/kafka/3.7.0/kafka_2.13-3.7.0.tgz
sudo tar -xzf kafka_2.13-3.7.0.tgz
sudo mv kafka_2.13-3.7.0 kafka

# Initialize Kafka storage for KRaft mode
cd /opt/kafka
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
sudo bin/kafka-storage.sh format -t "$KAFKA_CLUSTER_ID" -c config/kraft/server.properties
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Create a systemd unit for Kafka
sudo vi /etc/systemd/system/kafka.service
```

Add the following service definition:

```ini
[Unit]
Description=Apache Kafka Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/kafka
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Configure rsyslog to send logs to Kafka:

```bash
sudo vi /etc/rsyslog.d/10-kafka.conf
```

Add the following configuration:

```conf
module(load="omkafka")

*.* action(
  type="omkafka"
  broker=["localhost:9092"]
  topic="rsyslog"
  template="RSYSLOG_SyslogProtocol23Format"
)
```

Verify the rsyslog configuration syntax:

```bash
sudo rsyslogd -N 1
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd after adding the Kafka unit
sudo systemctl daemon-reload

# Enable and start Kafka
sudo systemctl enable --now kafka

# Create the topic used by rsyslog
/opt/kafka/bin/kafka-topics.sh --create --topic rsyslog --bootstrap-server localhost:9092

# Enable and restart rsyslog
sudo systemctl enable --now rsyslog
sudo systemctl restart rsyslog

# Check the status
sudo systemctl status kafka
sudo systemctl status rsyslog
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

# Send a test log message through rsyslog
logger "rsyslog Kafka output test"

# Read messages from the rsyslog topic
/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic rsyslog --from-beginning --timeout-ms 10000
```

## Troubleshooting

- If Kafka fails to start, check the logs with `journalctl -u kafka -e --no-pager`.
- If rsyslog fails to start, check the logs with `journalctl -u rsyslog -e --no-pager` and validate the configuration with `rsyslogd -N 1`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep -E 'rsyslog|java-17-openjdk'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
