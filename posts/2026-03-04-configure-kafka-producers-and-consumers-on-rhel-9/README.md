# How to Configure Kafka Producers and Consumers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Linux

Description: Step-by-step guide on configure kafka producers and consumers using Red Hat Enterprise Linux 9.

---

Kafka producers send records to topics, and consumers read them. Understanding how to configure both sides is fundamental to building any Kafka-based application.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Kafka installed in `/opt/kafka` and a `kafka` service user
- Root or sudo access
- A terminal session

## Step 2: Configure the Kafka Clients

Edit the producer and consumer configuration files to match your environment:

```bash
# Open the producer configuration file
sudo vi /opt/kafka/config/producer.properties

# Open the consumer configuration file
sudo vi /opt/kafka/config/consumer.properties
```

Adjust the settings according to your requirements. Key parameters to configure include the Kafka bootstrap server, authentication settings, and client IDs.

```bash
# Example producer settings
bootstrap.servers=localhost:9092
client.id=rhel-producer
acks=all

# Example consumer settings
bootstrap.servers=localhost:9092
group.id=rhel-consumer-group
client.id=rhel-consumer
auto.offset.reset=earliest
```

## Step 3: Start Kafka

```bash
# Start the Kafka broker
sudo -u kafka /opt/kafka/bin/kafka-server-start.sh -daemon /opt/kafka/config/server.properties

# Check that Kafka is running
jcmd | grep kafka
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

Confirm everything is working by checking the broker and sending messages:

```bash
# Check Kafka broker status
/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Create a test topic
/opt/kafka/bin/kafka-topics.sh --create --topic test --bootstrap-server localhost:9092

# List topics
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# Start a producer and send messages to the topic
/opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --producer.config /opt/kafka/config/producer.properties --topic test

# Start a consumer in another terminal and read messages from the beginning
/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --consumer.config /opt/kafka/config/consumer.properties --topic test --from-beginning
```

## Troubleshooting

- If Kafka fails to start, check the logs in `/opt/kafka/logs/server.log`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Kafka is installed in `/opt/kafka` and Java is available on the system.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor Kafka and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
