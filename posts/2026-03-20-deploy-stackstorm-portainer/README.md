# How to Deploy StackStorm via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, StackStorm, Automation, Docker, DevOps

Description: Deploy StackStorm event-driven automation platform using Portainer for IT operations automation and ChatOps.

## Introduction

StackStorm (ST2) is an event-driven automation platform for DevOps and IT operations. It connects sensors (event sources) to actions (automated responses) via rules, with support for workflows, packs (integrations), and ChatOps via Slack.

## Prerequisites

- Portainer installed with Docker
- Portainer Business Edition if deploying the official StackStorm Docker stack directly from Git, because it uses relative path volumes
- At least 2 GB RAM for testing

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**, select **Git Repository**, and use the official StackStorm Docker deployment:

```text
Repository URL: https://github.com/StackStorm/st2-docker
Repository reference: use the repository's default branch
Compose path: docker-compose.yml
```

The official `st2-docker` compose file uses relative bind mounts under `./files` and `./scripts`, so enable **Relative path volumes** and provide a writable **Local filesystem path** when deploying from Git in Portainer.

## Step 2: Set Environment Variables in Portainer

```text
ST2_EXPOSE_HTTP=0.0.0.0:80

# Optional: override the StackStorm image tag
ST2_VERSION=latest

# Optional: enable Slack ChatOps after the initial deployment
ST2_CHATOPS_ENABLE=1
HUBOT_ADAPTER=slack
HUBOT_SLACK_TOKEN=your-slack-bot-token
ST2_API_KEY=your-st2-chatops-api-key
```

## Step 3: Access the StackStorm UI

Open `http://<host>` and log in with `st2admin` / `Ch@ngeMe` unless you changed `files/htpasswd` in the StackStorm deployment repo.

## Step 4: Use the ST2 CLI

```bash
# Find the st2client container
docker ps --format '{{.Names}}' | grep st2client

# Open a shell in the st2client container
docker exec -it <st2client-container> bash

# Inside the container, list available packs
st2 pack list

# Run an action
st2 run core.local cmd="echo Hello from StackStorm"

# List triggers
st2 trigger list

# Optional: create a ChatOps API key, then add it to ST2_API_KEY in Portainer and redeploy
st2 apikey create -k -m '{"used_by": "st2chatops"}'
```

## Step 5: Install a Pack

```bash
# Inside the st2client container, install the Slack integration pack
st2 pack install slack

# Configure the pack
st2 pack config slack
```

## Step 6: Create a Rule

```bash
# Inside the st2client container, create a rule file
cat > /tmp/my_rule.yaml << 'EOF'
name: "on_timer_hello"
pack: "default"
description: "Say hello every minute"
trigger:
  type: "core.st2.IntervalTimer"
  parameters:
    delta: 60
    unit: "seconds"
criteria: {}
action:
  ref: "core.local"
  parameters:
    cmd: "echo Hello from rule at $(date)"
enabled: true
EOF

# Deploy the rule
st2 rule create /tmp/my_rule.yaml
```

## Conclusion

StackStorm's event-driven model works via three components: Sensors (detect events), Triggers (events that rules react to), and Actions (automated tasks). Rules wire triggers to actions with optional criteria filters. Packs bundle sensors, actions, rules, workflows, and aliases for specific services (AWS, PagerDuty, Slack, Jira). StackStorm uses MongoDB for persistence, RabbitMQ for messaging, and Redis for coordination in the Docker deployment.
