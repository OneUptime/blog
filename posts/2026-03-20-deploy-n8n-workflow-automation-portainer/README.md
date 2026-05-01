# How to Deploy n8n Workflow Automation via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, n8n, Workflow Automation, Docker, Self-Hosting, No-Code, Zapier Alternative

Description: Learn how to deploy n8n, the self-hosted workflow automation platform, via Portainer with PostgreSQL for persistent workflow storage.

---

n8n is a powerful self-hosted workflow automation tool similar to Zapier and Make. It supports 400+ integrations and allows custom code execution in JavaScript or Python. Portainer makes deploying and managing n8n simple.

## Prerequisites

- Portainer running
- Enough RAM for your workload
- A domain and reverse proxy for the `N8N_HOST` and `WEBHOOK_URL` settings

## Compose Stack

n8n can use SQLite for small deployments, but PostgreSQL is a better fit for production deployments:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: n8npass          # Change this
      POSTGRES_DB: n8n
    volumes:
      - n8n_db:/var/lib/postgresql/data

  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: unless-stopped
    depends_on:
      - postgres
    ports:
      - "5678:5678"
    environment:
      N8N_HOST: n8n.example.com
      N8N_PORT: 5678
      N8N_PROTOCOL: https
      WEBHOOK_URL: https://n8n.example.com/
      N8N_PROXY_HOPS: 1
      N8N_RUNNERS_ENABLED: "true"
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: n8npass    # Must match postgres service
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_db:
  n8n_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `n8n`.
3. Update all passwords and set `N8N_HOST` and `WEBHOOK_URL` to your domain.
4. Click **Deploy the stack**.

Open `https://n8n.example.com` and create your owner account.

## Example Workflow: HTTP Webhook to Slack

Create a simple workflow that sends a Slack message when an HTTP webhook is triggered:

1. Add a **Webhook** trigger node - copy the production URL.
2. Add a **Slack** node with Slack credentials.
3. Set the Slack message to `{{ $json.body.message }}`.
4. Publish the workflow.

Test by POSTing to the webhook URL:

```bash
curl -X POST https://n8n.example.com/webhook/your-uuid \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from n8n!"}'
```

## Monitoring

Use OneUptime to monitor `https://n8n.example.com/healthz/readiness`. Alert on any non-200 response, as this endpoint checks that n8n is reachable and its database is ready.
