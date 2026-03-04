# How to Deploy Kafka with KRaft Mode (Without ZooKeeper) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Linux

Description: Step-by-step guide on deploy kafka with kraft mode (without zookeeper) using Red Hat Enterprise Linux 9.

---

ZooKeeper has traditionally been Kafka's coordination service, managing broker metadata and leader elections. While KRaft mode is replacing ZooKeeper, many existing deployments still use this architecture.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Configure ZooKeeper and Kafka:

```bash
# Configure ZooKeeper
cat <<EOF > /opt/kafka/config/zookeeper.properties
dataDir=/var/lib/zookeeper
clientPort=2181
maxClientCnxns=0
EOF

# Start ZooKeeper
/opt/kafka/bin/zookeeper-server-start.sh -daemon /opt/kafka/config/zookeeper.properties

# Configure Kafka broker
cat <<EOF > /opt/kafka/config/server.properties
broker.id=0
listeners=PLAINTEXT://:9092
log.dirs=/var/lib/kafka-logs
zookeeper.connect=localhost:2181
EOF

# Start Kafka
/opt/kafka/bin/kafka-server-start.sh -daemon /opt/kafka/config/server.properties
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=<PORT>/tcp
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

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
