# Using Portainer with Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Compose, Stack, Self-Hosted, Container Management

Description: Learn how to deploy and manage multi-container applications in Portainer using Docker Compose stacks, environment variables, and the Portainer web UI.

## What are Portainer Stacks?

In Portainer, a "Stack" is a Docker Compose application deployed and managed through the Portainer UI. Stacks allow you to:

- Deploy multi-service applications from a compose file
- Manage environment variables separately from the compose file
- Update, stop, and restart entire application groups at once
- Version-control your compose files in Git and deploy via GitOps

## Deploying a Stack from the Web UI

1. Log in to Portainer at `https://<server-ip>:9443` (or your configured Portainer URL)
2. Navigate to **Stacks → Add Stack**
3. Give the stack a name
4. Choose **Web editor** and paste your compose YAML

Example stack for a Docker Standalone or Podman environment:

```yaml
services:
  web:
    image: nginx:1.25.4
    ports:
      - "8080:80"
    volumes:
      - web_content:/usr/share/nginx/html
    restart: unless-stopped

  api:
    image: myapp/api:v1.2.0
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16.2-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  web_content:
  db_data:
```

## Using Environment Variables

In the Portainer stack editor, scroll down to **Environment variables** and add:

```text
DATABASE_URL=postgresql://myapp:secret@db:5432/myapp
SECRET_KEY=supersecretkey
DB_PASSWORD=secret
```

Variables defined here are available as `${VAR_NAME}` in the compose file.

## Deploying from a Git Repository

1. In **Add Stack**, choose **Git Repository**
2. Enter your repository URL
3. Set the Compose path (for example, `docker-compose.yml`)
4. Enable **GitOps updates** if you want Portainer to poll the repository for changes or redeploy from a webhook

This enables a GitOps workflow: Portainer can poll for compose changes or redeploy when its webhook is triggered.

## Managing the Stack

From the Stacks list, you can:

- **Start/Stop** the entire stack
- **Update** the stack (re-pull images, apply compose changes)
- **Delete** the stack
- **View logs** for services or containers in the stack

## Updating a Stack

To update an image version for a stack created with the Web editor or Upload:

1. Open the stack in Portainer
2. Edit the compose YAML (e.g., change `nginx:1.25.4` to `nginx:1.27.0`)
3. Click **Update the stack**
4. Check **Pull latest image versions** to force a pull

For Git-based stacks, edit the compose file in the repository and use GitOps updates or **Pull and redeploy**.

## Using .env Files

If deploying via Git, Portainer can also process a repository `.env` file if one exists and you have not already defined those environment variables in Portainer:

```bash
# .env

DATABASE_URL=postgresql://myapp:secret@db:5432/myapp
SECRET_KEY=supersecretkey
```

The **Load variables from .env file** option in Portainer uploads a local `.env` file into the stack configuration.

## Stack Templates

Portainer supports App Templates - pre-configured stacks you can deploy with one click. Navigate to **Templates** to browse the built-in catalog or add your own template repository.

## Troubleshooting

**Service not starting:**
```text
Stacks → [stack name] → [service name] → Logs
```

**Volume not persisting data:** Check the volume is correctly defined in both `services` and `volumes` sections.

**Environment variable not found:** Verify the variable is listed in the Portainer stack environment variables section.

## Best Practices

1. **Always pin image versions** in compose files - avoid `:latest` in production
2. **Prefer secrets for sensitive values**; if you use environment variables, avoid hard-coding them in the compose file or committing them to Git
3. **Use named volumes** for persistent data
4. **Use Git-based stacks** for version-controlled, auditable deployments
5. **Enable health checks** in your services so Portainer can show service health

## Conclusion

Portainer's Stacks feature brings the power of Docker Compose to a web UI, making multi-container application management accessible without the command line. Combined with GitOps-style Git repositories, Portainer becomes a complete deployment platform for self-hosted applications.
