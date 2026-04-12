# How to Monitor Redis with Sensu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sensu, Monitoring

Description: Learn how to configure Sensu Go to monitor Redis health using the sensu-plugins-redis check, set thresholds, and route alerts to Slack or PagerDuty.

---

Sensu Go is a cloud-native monitoring platform that uses agents, checks, and handlers to monitor infrastructure. The `sensu-plugins-redis` collection provides checks for Redis availability, memory, replication, and slow logs with configurable thresholds.

## Install Sensu Go

```bash
# Add Sensu repository
curl -s https://packagecloud.io/install/repositories/sensu/stable/script.deb.sh | sudo bash

# Install Sensu Go backend and agent
sudo apt install sensu-go-backend sensu-go-agent sensu-go-cli -y

# Start backend
sudo systemctl start sensu-backend
sudo systemctl enable sensu-backend
```

## Install Redis Check Plugin

```bash
# Install sensu-plugins-redis via sensuctl
sensuctl asset add sensu/sensu-plugins-redis:5.0.0

# Or use the bonsai asset
cat <<EOF | sensuctl create
type: Asset
api_version: core/v2
metadata:
  name: sensu-plugins-redis
  namespace: default
spec:
  builds:
    - url: https://assets.bonsai.sensu.io/sensu-plugins/sensu-plugins-redis/sensu-plugins-redis_5.0.0_debian_linux_amd64.tar.gz
      sha512: <sha512-hash>
EOF
```

## Define a Redis Health Check

```yaml
# redis-check.yaml
type: CheckConfig
api_version: core/v2
metadata:
  name: redis-availability
  namespace: default
spec:
  command: check-redis-ping.rb -h 127.0.0.1 -p 6379
  interval: 30
  timeout: 10
  subscriptions:
    - redis-servers
  publish: true
  runtime_assets:
    - sensu-plugins-redis
  handlers:
    - slack
```

```bash
sensuctl create -f redis-check.yaml
```

## Check Redis Memory Usage

```yaml
# redis-memory-check.yaml
type: CheckConfig
api_version: core/v2
metadata:
  name: redis-memory
  namespace: default
spec:
  command: >
    check-redis-memory-percentage.rb -h 127.0.0.1 -p 6379
    -w 80 -c 90
  interval: 60
  timeout: 10
  subscriptions:
    - redis-servers
  publish: true
  runtime_assets:
    - sensu-plugins-redis
  handlers:
    - slack
```

```bash
sensuctl create -f redis-memory-check.yaml
```

## Check Replication Status

```yaml
# redis-replication-check.yaml
type: CheckConfig
api_version: core/v2
metadata:
  name: redis-replication-status
  namespace: default
spec:
  command: check-redis-slave-status.rb -h 127.0.0.1 -p 6379
  interval: 30
  subscriptions:
    - redis-servers
  publish: true
  runtime_assets:
    - sensu-plugins-redis
  handlers:
    - pagerduty
```

## Configure Slack Handler

```yaml
# slack-handler.yaml
type: Handler
api_version: core/v2
metadata:
  name: slack
  namespace: default
spec:
  type: pipe
  command: sensu-slack-handler --channel '#redis-alerts' --username sensu
  timeout: 10
  runtime_assets:
    - sensu/sensu-slack-handler
  env_vars:
    - SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
  filters:
    - is_incident
```

```bash
sensuctl create -f slack-handler.yaml
```

## Configure Sensu Agent on Redis Host

```yaml
# /etc/sensu/agent.yml
backend-url:
  - ws://sensu-backend:8081
name: redis-server-01
namespace: default
subscriptions:
  - redis-servers
  - linux
```

```bash
sudo systemctl start sensu-agent
```

## View Check Results

```bash
# List recent check results
sensuctl event list

# Filter by entity
sensuctl event list --field-selector "event.entity.name == redis-server-01"

# View specific check
sensuctl event info redis-server-01 redis-availability
```

## Silence an Alert During Maintenance

```bash
sensuctl silenced create \
  --subscription entity:redis-server-01 \
  --check redis-availability \
  --expire 3600 \
  --reason "Planned maintenance"
```

## Summary

Sensu Go monitors Redis with declarative YAML checks that run on agents deployed alongside Redis. The `sensu-plugins-redis` collection provides availability, memory, and replication checks. Handlers route alerts to Slack or PagerDuty, and silencing allows maintenance windows without alert noise. Sensu's subscription-based model scales well for fleets of Redis instances.
