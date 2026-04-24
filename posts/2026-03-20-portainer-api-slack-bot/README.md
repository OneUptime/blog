# How to Build a Slack Bot That Deploys Containers via Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Slack, ChatOps, Automation

Description: Create a Slack bot that lets your team deploy containers and manage stacks through Portainer using simple Slack slash commands.

## Introduction

ChatOps brings deployment commands into team chat, providing visibility and convenience. This guide shows how to build a Slack bot that triggers deployments via the Portainer API, so your team can deploy containers without leaving Slack.

## Prerequisites

- Portainer CE or BE with API access
- Slack workspace with bot creation permissions
- Node.js 18+ or Python 3.8+
- A publicly reachable HTTPS endpoint for Slack requests

## Creating the Slack App

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch"
3. Configure Slash Commands and set each command's Request URL to `https://your-domain/slack/events`:
   - `/deploy <stack> [env]` - Deploy a stack
   - `/containers [env]` - List containers
   - `/restart <container> [env]` - Restart a container
4. Set OAuth scopes: `chat:write`, `commands`
5. Install the app to your workspace and copy the bot token and signing secret

## Building the Bot (Node.js)

```bash
# Initialize project

mkdir portainer-slack-bot && cd portainer-slack-bot
npm init -y
npm install @slack/bolt axios dotenv

# Create .env file
cat > .env << 'EOF'
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
PORTAINER_URL=https://portainer.example.com
PORTAINER_API_KEY=your-portainer-api-key
PORT=3000
EOF
```

```javascript
// app.js
require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Portainer API client
const portainer = axios.create({
    baseURL: process.env.PORTAINER_URL + '/api',
    headers: { 'X-API-Key': process.env.PORTAINER_API_KEY }
});

// Environment name to endpoint ID mapping
const ENVIRONMENTS = {
    'dev': 1,
    'staging': 2,
    'production': 3
};

// /containers command - List running containers
app.command('/containers', async ({ command, ack, respond }) => {
    await ack();

    const env = command.text.trim() || 'dev';
    const endpointId = ENVIRONMENTS[env];

    if (!endpointId) {
        await respond(`Unknown environment: ${env}. Available: ${Object.keys(ENVIRONMENTS).join(', ')}`);
        return;
    }

    try {
        const resp = await portainer.get(
            `/endpoints/${endpointId}/docker/containers/json`
        );
        const containers = resp.data;

        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `Containers in ${env} (${containers.length} running)`
                }
            },
            ...containers.slice(0, 10).map(c => ({
                type: 'section',
                fields: [
                    { type: 'mrkdwn', text: `*Name:* ${c.Names[0].replace('/', '')}` },
                    { type: 'mrkdwn', text: `*Status:* ${c.Status}` },
                    { type: 'mrkdwn', text: `*Image:* ${c.Image}` }
                ]
            }))
        ];

        await respond({
            text: `Containers in ${env} (${containers.length} running)`,
            blocks
        });
    } catch (err) {
        await respond(`Error: ${err.message}`);
    }
});

// /deploy command - Deploy a stack
app.command('/deploy', async ({ command, ack, respond }) => {
    await ack();

    const [stackName, inputEnv] = command.text.trim().split(/\s+/);
    const env = inputEnv || 'dev';
    const endpointId = ENVIRONMENTS[env];
    const userId = command.user_id;

    if (!stackName || !endpointId) {
        await respond('Usage: /deploy <stack-name> [environment]');
        return;
    }

    // Post confirmation message first
    await respond({
        response_type: 'ephemeral',
        text: `Deploying *${stackName}* to *${env}*...`,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:rocket: Deploying *${stackName}* to *${env}*...`
                }
            }
        ]
    });

    try {
        // Find existing stack in the selected environment
        const filters = encodeURIComponent(JSON.stringify({ EndpointID: endpointId }));
        const stacks = await portainer.get(`/stacks?filters=${filters}`);
        const stack = stacks.data.find(s => s.Name === stackName);

        if (!stack) {
            await respond(`Stack '${stackName}' not found in ${env}`);
            return;
        }

        if (stack.GitConfig) {
            // Git-based stacks use the dedicated redeploy endpoint.
            await portainer.put(
                `/stacks/${stack.Id}/git/redeploy?endpointId=${endpointId}`,
                { RepullImageAndRedeploy: true }
            );
        } else {
            // File-based stacks need their current compose file sent back on update.
            const stackFile = await portainer.get(`/stacks/${stack.Id}/file`);

            await portainer.put(
                `/stacks/${stack.Id}?endpointId=${endpointId}`,
                {
                    StackFileContent: stackFile.data.StackFileContent,
                    Prune: true,
                    RepullImageAndRedeploy: true
                }
            );
        }

        await respond({
            response_type: 'in_channel',
            text: `:white_check_mark: Stack *${stackName}* deployed to *${env}* by <@${userId}>`
        });
    } catch (err) {
        await respond({
            response_type: 'ephemeral',
            text: `:x: Failed to deploy *${stackName}* to *${env}*: ${err.message}`
        });
    }
});

// /restart command - Restart a container
app.command('/restart', async ({ command, ack, respond }) => {
    await ack();

    const [containerName, inputEnv] = command.text.trim().split(/\s+/);
    const env = inputEnv || 'dev';
    const endpointId = ENVIRONMENTS[env];

    if (!containerName || !endpointId) {
        await respond('Usage: /restart <container-name> [environment]');
        return;
    }

    try {
        // Find container by name
        const containers = await portainer.get(
            `/endpoints/${endpointId}/docker/containers/json?all=true`
        );
        const container = containers.data.find(
            c => c.Names.some(n => n.includes(containerName))
        );

        if (!container) {
            await respond(`Container '${containerName}' not found`);
            return;
        }

        // Restart the container
        await portainer.post(
            `/endpoints/${endpointId}/docker/containers/${container.Id}/restart`
        );

        await respond(`:recycle: Container *${containerName}* restarted in *${env}*`);
    } catch (err) {
        await respond(`Error restarting container: ${err.message}`);
    }
});

(async () => {
    await app.start(process.env.PORT || 3000);
    console.log('Portainer Slack bot is running!');
})();
```

## Running the Bot

```bash
# Start the bot
node app.js

# For production, use PM2
npm install -g pm2
pm2 start app.js --name portainer-bot
pm2 save
pm2 startup
```

## Deploying to Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY app.js .
CMD ["node", "app.js"]
```

```bash
docker build -t portainer-slack-bot:latest .

docker run -d \
  --name portainer-slack-bot \
  --restart=always \
  --env-file .env \
  -p 3000:3000 \
  portainer-slack-bot:latest
```

## Slack Command Examples

```text
# List running containers in staging
/containers staging

# Deploy a stack to production
/deploy my-app production

# Restart a container in dev
/restart nginx dev
```

## Conclusion

A Slack bot connected to the Portainer API creates a powerful ChatOps workflow. Your team can deploy, manage, and monitor containers directly from Slack with full audit trail of who deployed what and when. Extend this with approval workflows, deployment history, and integration with your monitoring stack for a complete ChatOps solution.
