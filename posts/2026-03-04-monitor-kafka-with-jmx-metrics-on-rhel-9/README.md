# How to Monitor Kafka with JMX Metrics on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Monitoring, Linux

Description: Step-by-step guide on monitor kafka with jmx metrics using Red Hat Enterprise Linux 9.

---

Kafka exposes detailed metrics through JMX (Java Management Extensions). Collecting these metrics with tools like Prometheus helps you monitor broker health, replication status, and topic throughput.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Apache Kafka installed under `/opt/kafka` and managed by a `kafka.service` systemd unit
- Prometheus JMX Exporter Java agent downloaded to `/opt/jmx-exporter/jmx_prometheus_javaagent.jar`

## Step 2: Configure the Service

Create a JMX Exporter configuration file to match your environment:

```bash
# Create the JMX Exporter configuration file
sudo mkdir -p /etc/kafka
sudo vi /etc/kafka/jmx-exporter.yml
```

Use a minimal configuration to expose Kafka broker JMX metrics in Prometheus format:

```yaml
lowercaseOutputName: true
lowercaseOutputLabelNames: true
rules:
  - pattern: ".*"
```

Add the JMX Exporter Java agent to the Kafka service. The example below exposes metrics on port `9404`:

```bash
# Add the Java agent to the Kafka JVM options
sudo systemctl edit kafka.service
```

Add the following override:

```ini
[Service]
Environment="KAFKA_OPTS=-javaagent:/opt/jmx-exporter/jmx_prometheus_javaagent.jar=9404:/etc/kafka/jmx-exporter.yml"
```

Reload systemd and restart Kafka to apply changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart kafka.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable kafka.service

# Start the service
sudo systemctl start kafka.service

# Check the status
sudo systemctl status kafka.service
```

## Step 4: Configure the Firewall

```bash
# Open the JMX Exporter metrics port
sudo firewall-cmd --permanent --add-port=9404/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-ports
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check that the Prometheus metrics endpoint is responding
curl http://localhost:9404/metrics

# Check Kafka broker status
/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092

# Create a test topic
/opt/kafka/bin/kafka-topics.sh --create --topic test --partitions 1 --replication-factor 1 --bootstrap-server localhost:9092

# List topics
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u kafka.service -e --no-pager`.
- If metrics are not exposed, verify that the JMX Exporter jar path, configuration file path, and port in `KAFKA_OPTS` are correct.
- SELinux or firewall rules may block remote access to the metrics port. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure Java, Kafka, and the JMX Exporter jar are installed in the paths used by the service.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
