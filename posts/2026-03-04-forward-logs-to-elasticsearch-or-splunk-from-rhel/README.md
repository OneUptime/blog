# How to Forward Logs to Elasticsearch or Splunk from RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, Splunk, Rsyslog, Logging, Log Forwarding

Description: Configure RHEL to forward system logs to Elasticsearch or Splunk using rsyslog modules, enabling centralized log analysis and visualization.

---

Sending RHEL logs to a centralized platform like Elasticsearch or Splunk gives you powerful search, dashboards, and alerting. rsyslog has output modules for both.

## Forward Logs to Elasticsearch

### Install the Elasticsearch Output Module

```bash
# Install the rsyslog Elasticsearch module

sudo dnf install -y rsyslog-elasticsearch
```

### Configure rsyslog to Send to Elasticsearch

```bash
# Create /etc/rsyslog.d/elasticsearch.conf
sudo tee /etc/rsyslog.d/elasticsearch.conf << 'EOF'
# Load the Elasticsearch output module
module(load="omelasticsearch")

# Template for the JSON document sent to Elasticsearch
template(name="elastic-index" type="list") {
    constant(value="syslog-")
    property(name="timereported" dateFormat="rfc3339" position.from="1" position.to="10")
}

template(name="elastic-json" type="list" option.json="on") {
    constant(value="{")
    constant(value="\"@timestamp\":\"")    property(name="timereported" dateFormat="rfc3339")
    constant(value="\",\"host\":\"")       property(name="hostname")
    constant(value="\",\"severity\":\"")   property(name="syslogseverity-text")
    constant(value="\",\"facility\":\"")   property(name="syslogfacility-text")
    constant(value="\",\"program\":\"")    property(name="programname")
    constant(value="\",\"message\":\"")    property(name="msg")
    constant(value="\"}")
}

# Send all logs to Elasticsearch
action(
    type="omelasticsearch"
    server="elasticsearch.example.com"
    serverport="9200"
    template="elastic-json"
    searchIndex="elastic-index"
    dynSearchIndex="on"
    searchType="_doc"
    bulkmode="on"
    queue.type="LinkedList"
    queue.size="5000"
    queue.dequeuebatchsize="300"
    action.resumeretrycount="-1"
)
EOF

# Restart rsyslog
sudo systemctl restart rsyslog
```

## Forward Logs to Splunk

### Option 1: Splunk Universal Forwarder

```bash
# Download and install the Splunk Universal Forwarder
# (Download from splunk.com for your RHEL version)
sudo rpm -i splunkforwarder-9.x.x-linux-x86_64.rpm

# Start the forwarder and accept the license
sudo /opt/splunkforwarder/bin/splunk start --accept-license

# Configure the forwarder to send to your Splunk indexer
sudo /opt/splunkforwarder/bin/splunk add forward-server splunk.example.com:9997

# Monitor system log files
sudo /opt/splunkforwarder/bin/splunk add monitor /var/log/messages
sudo /opt/splunkforwarder/bin/splunk add monitor /var/log/secure

# Restart and enable the forwarder at boot
sudo /opt/splunkforwarder/bin/splunk restart
sudo /opt/splunkforwarder/bin/splunk enable boot-start
```

### Option 2: rsyslog to Splunk HEC (HTTP Event Collector)

```bash
# Install rsyslog, which includes the HTTP output module on supported RHEL versions
sudo dnf install -y rsyslog

# Create /etc/rsyslog.d/splunk-hec.conf
sudo tee /etc/rsyslog.d/splunk-hec.conf << 'EOF'
module(load="omhttp")

template(name="splunk_hec" type="list" option.json="on") {
    constant(value="{")
    constant(value="\"event\":\"")      property(name="msg")
    constant(value="\",\"sourcetype\":\"syslog\",\"host\":\"")
    property(name="hostname")
    constant(value="\"}")
}

template(name="splunk_hec_retry" type="string" string="%msg%")

ruleset(name="splunk_retry") {
    action(
        type="omhttp"
        server="splunk.example.com"
        serverport="8088"
        restpath="services/collector/event"
        template="splunk_hec_retry"
        httpheaderkey="Authorization"
        httpheadervalue="Splunk YOUR-HEC-TOKEN-HERE"
        batch="on"
        batch.format="newline"
        batch.maxsize="100"
        action.resumeretrycount="-1"
    )
}

action(
    type="omhttp"
    server="splunk.example.com"
    serverport="8088"
    restpath="services/collector/event"
    template="splunk_hec"
    httpheaderkey="Authorization"
    httpheadervalue="Splunk YOUR-HEC-TOKEN-HERE"
    batch="on"
    batch.format="newline"
    batch.maxsize="100"
    retry="on"
    retry.ruleset="splunk_retry"
    action.resumeretrycount="-1"
)
EOF

sudo systemctl restart rsyslog
```

## Verify Forwarding

```bash
# Generate a test log message
logger -t myapp "Test log forwarding from $(hostname)"

# Check rsyslog for errors
sudo journalctl -u rsyslog --since "5 minutes ago" | grep -i error
```

Both Elasticsearch and Splunk provide web interfaces where you can immediately search for your test message and confirm that log forwarding is working.
