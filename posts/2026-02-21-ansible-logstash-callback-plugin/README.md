# How to Use the Ansible logstash Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Logstash, ELK, Logging

Description: Configure the Ansible logstash callback plugin to send structured playbook events directly to Logstash for indexing in Elasticsearch and visualization in Kibana.

---

The `logstash` callback plugin sends Ansible playbook events directly to a Logstash instance as structured JSON messages. Unlike the syslog callback, which sends plain text messages, the logstash callback sends rich structured data that Logstash can index into Elasticsearch without additional parsing. This gives you a complete, searchable record of every Ansible action in your ELK stack.

## Prerequisites

You need:

- A Logstash instance with a TCP or UDP input configured
- The `community.general` Ansible collection
- Python's `python-logstash` or `python-logstash-async` library

```bash
# Install the required Python library
pip install python-logstash

# Install the Ansible collection
ansible-galaxy collection install community.general
```

## Enabling the Logstash Callback

```ini
# ansible.cfg - Enable the logstash callback
[defaults]
callback_whitelist = community.general.logstash

[callback_logstash]
server = logstash.example.com
port = 5000
type = ansible
pre_command = hostname -f
```

Environment variable configuration:

```bash
# Configure via environment
export ANSIBLE_CALLBACK_WHITELIST=community.general.logstash
export LOGSTASH_SERVER=logstash.example.com
export LOGSTASH_PORT=5000
export LOGSTASH_TYPE=ansible
```

## Logstash Input Configuration

Configure Logstash to receive Ansible events:

```ruby
# /etc/logstash/conf.d/ansible-input.conf
input {
  tcp {
    port => 5000
    codec => json_lines
    type => "ansible"
    tags => ["ansible"]
  }
}

filter {
  if [type] == "ansible" {
    # Parse the Ansible-specific fields
    date {
      match => ["ansible_timestamp", "ISO8601"]
      target => "@timestamp"
    }

    # Add useful derived fields
    if [status] == "FAILED" {
      mutate { add_tag => ["failure"] }
    }

    # Clean up the message for readability
    mutate {
      rename => { "ansible_host" => "target_host" }
      rename => { "ansible_task" => "task_name" }
      rename => { "ansible_playbook" => "playbook_name" }
    }
  }
}

output {
  if [type] == "ansible" {
    elasticsearch {
      hosts => ["elasticsearch:9200"]
      index => "ansible-%{+YYYY.MM.dd}"
      template_name => "ansible"
    }
  }
}
```

## What Gets Sent to Logstash

The logstash callback sends structured JSON events for each Ansible action. A typical event looks like:

```json
{
  "@timestamp": "2026-02-21T10:15:30.000Z",
  "type": "ansible",
  "ansible_type": "task",
  "ansible_playbook": "deploy.yml",
  "ansible_play": "Configure web servers",
  "ansible_task": "Install nginx",
  "ansible_host": "web-01",
  "status": "OK",
  "ansible_result": {
    "changed": false,
    "msg": "package already installed"
  },
  "ansible_changed": false,
  "session": "abc123-def456",
  "ansible_forks": 5
}
```

For failures, additional fields include the error message:

```json
{
  "status": "FAILED",
  "ansible_result": {
    "changed": false,
    "msg": "No package matching 'nginx' found",
    "rc": 100
  }
}
```

## Elasticsearch Index Template

Create an index template for Ansible data to optimize storage and search:

```json
{
  "index_patterns": ["ansible-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "ansible-policy",
      "index.lifecycle.rollover_alias": "ansible"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "ansible_playbook": { "type": "keyword" },
        "ansible_play": { "type": "keyword" },
        "ansible_task": { "type": "keyword" },
        "ansible_host": { "type": "keyword" },
        "status": { "type": "keyword" },
        "ansible_changed": { "type": "boolean" },
        "session": { "type": "keyword" },
        "ansible_result": { "type": "object", "enabled": false }
      }
    }
  }
}
```

Push this template to Elasticsearch:

```bash
# Create the index template
curl -X PUT "elasticsearch:9200/_index_template/ansible" \
  -H 'Content-Type: application/json' \
  -d @ansible-template.json
```

## Kibana Dashboard

Once events flow into Elasticsearch, build a Kibana dashboard. Here are useful visualizations:

Create an index pattern for `ansible-*`, then build these:

**Playbook Run Status Over Time:**
- Visualization type: Area chart
- Y-axis: Count
- X-axis: @timestamp (Date Histogram)
- Split series: status.keyword

**Top Failed Tasks:**
- Visualization type: Data Table
- Metric: Count
- Buckets: ansible_task.keyword (Terms, descending)
- Filter: status: "FAILED"

**Host Activity Heatmap:**
- Visualization type: Heatmap
- Y-axis: ansible_host.keyword
- X-axis: @timestamp (Date Histogram)
- Value: Count

## Filtering by Playbook Run

Each playbook run gets a unique session ID. Use this to find all events from a single run:

```
# Kibana query - find all events from a specific run
session: "abc123-def456"

# Find all failures from today
status: "FAILED" AND @timestamp >= "now-1d"

# Find all changes to a specific host
ansible_host: "web-03" AND ansible_changed: true
```

## Advanced Logstash Filtering

Add more intelligence to your Logstash pipeline:

```ruby
# /etc/logstash/conf.d/ansible-advanced.conf
filter {
  if [type] == "ansible" {
    # Calculate task duration if available
    if [ansible_result][start] and [ansible_result][end] {
      ruby {
        code => "
          start_time = Time.parse(event.get('[ansible_result][start]'))
          end_time = Time.parse(event.get('[ansible_result][end]'))
          event.set('task_duration_seconds', (end_time - start_time).round(2))
        "
      }
    }

    # Tag slow tasks
    if [task_duration_seconds] and [task_duration_seconds] > 60 {
      mutate { add_tag => ["slow_task"] }
    }

    # Extract playbook directory for grouping
    grok {
      match => {
        "ansible_playbook" => "%{GREEDYDATA:playbook_dir}/%{DATA:playbook_file}$"
      }
    }

    # Drop noisy events (like gathering facts) in production
    if [ansible_task] == "Gathering Facts" {
      drop { }
    }
  }
}
```

## Alerting on Ansible Events

Use Elasticsearch Watcher or ElastAlert to alert on Ansible failures:

```json
{
  "trigger": {
    "schedule": { "interval": "5m" }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["ansible-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                { "match": { "status": "FAILED" } },
                { "range": { "@timestamp": { "gte": "now-5m" } } }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": { "ctx.payload.hits.total.value": { "gt": 0 } }
  },
  "actions": {
    "slack_notify": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "port": 443,
        "method": "post",
        "path": "/services/YOUR/WEBHOOK/URL",
        "body": "{\"text\": \"Ansible failures detected: {{ctx.payload.hits.total.value}} in the last 5 minutes\"}"
      }
    }
  }
}
```

## Combining with Other Callbacks

The logstash callback works as a notification alongside your preferred output:

```ini
# ansible.cfg - Logstash with other callbacks
[defaults]
stdout_callback = yaml
callback_whitelist = community.general.logstash, timer, profile_tasks
```

## Performance Considerations

The logstash callback sends a network request for each event. For large playbooks with many hosts, this can add up. Tips for managing the load:

- Use TCP transport (more reliable than UDP)
- Configure Logstash with a persistent queue to handle bursts
- Consider using the async logstash library: `pip install python-logstash-async`
- For very large inventories, use the logstash callback on critical playbooks only

The logstash callback turns Ansible from a "fire and forget" tool into one that builds a searchable, visualizable history of every action across your infrastructure. If you already run an ELK stack, adding the logstash callback is one of the highest-value integrations you can make.
