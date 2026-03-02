# How to Install GoCD for Continuous Delivery on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, GoCD, DevOps, Continuous Delivery

Description: Install and configure GoCD server and agent on Ubuntu, covering pipeline setup, value stream mapping, and basic configuration for continuous delivery workflows.

---

GoCD is a continuous delivery platform from ThoughtWorks that focuses on modeling complex deployment pipelines. Unlike CI-focused tools, GoCD has native support for multi-stage pipelines, fan-in/fan-out dependencies between pipelines, and value stream mapping that gives you a visual representation of how code flows from commit to production.

This guide covers installing GoCD server and agent on Ubuntu, configuring the initial setup, and creating a basic pipeline.

## Installing GoCD Server

GoCD provides packages for Debian/Ubuntu systems through their APT repository.

### Add the GoCD Repository

```bash
# Import the GoCD GPG key
curl https://download.gocd.org/GOCD-GPG-KEY.asc | sudo gpg --dearmor -o /usr/share/keyrings/gocd.gpg

# Add the GoCD repository
echo "deb [signed-by=/usr/share/keyrings/gocd.gpg] https://download.gocd.org /" | sudo tee /etc/apt/sources.list.d/gocd.list

# Update package index
sudo apt update
```

### Install GoCD Server

```bash
sudo apt install go-server -y

# Enable and start the service
sudo systemctl enable go-server
sudo systemctl start go-server

# Check status
sudo systemctl status go-server
```

GoCD server starts on port 8153 (HTTP) and 8154 (HTTPS with self-signed cert). The web UI takes about 2-3 minutes to start up as GoCD initializes its database.

### Verify Installation

```bash
# Check if the server is listening
ss -tlnp | grep -E '8153|8154'

# Follow startup logs
sudo journalctl -u go-server -f
```

Once started, access the web UI at `http://your-server-ip:8153/go`.

## Installing GoCD Agent

Agents run the actual build and deployment tasks. Install one or more agents on the same server or separate machines.

### Install on the Same Server

```bash
sudo apt install go-agent -y

# Enable and start
sudo systemctl enable go-agent
sudo systemctl start go-agent
```

The agent registers with the server automatically. In the GoCD web UI, go to Agents and you will see the agent listed as "Pending." Click the checkmark to enable it.

### Install on a Separate Machine

On the agent machine:

```bash
# Add repository (same as server)
curl https://download.gocd.org/GOCD-GPG-KEY.asc | sudo gpg --dearmor -o /usr/share/keyrings/gocd.gpg
echo "deb [signed-by=/usr/share/keyrings/gocd.gpg] https://download.gocd.org /" | sudo tee /etc/apt/sources.list.d/gocd.list
sudo apt update

# Install agent
sudo apt install go-agent -y
```

Configure the agent to connect to the server:

```bash
sudo nano /etc/default/go-agent
```

```bash
# Set the server URL
GO_SERVER_URL=https://your-gocd-server:8154/go
```

```bash
sudo systemctl enable go-agent
sudo systemctl start go-agent
```

## Setting Up a Reverse Proxy

For production, put GoCD behind Nginx with proper TLS:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

sudo nano /etc/nginx/sites-available/gocd
```

```nginx
server {
    listen 80;
    server_name gocd.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gocd.example.com;

    ssl_certificate /etc/letsencrypt/live/gocd.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gocd.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;

    # Allow large artifact uploads
    client_max_body_size 500M;

    location /go {
        proxy_pass http://localhost:8153;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket support for build console output
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gocd /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d gocd.example.com
```

Update GoCD server to know its public URL:

```bash
sudo nano /etc/go/go-site.sh
```

Set the site URL through the GoCD admin interface: Admin > Server Configuration > Site URL > `https://gocd.example.com/go`.

## Creating a Basic Pipeline

GoCD pipelines are configured through the web UI or as YAML files. This example uses YAML configuration, which is version-controllable.

### Enable YAML Configuration

In the GoCD web UI:
1. Go to Admin > Plugins
2. Install the "GoCD YAML Configuration Plugin" if not already installed
3. Go to Admin > Config Repositories
4. Add a new config repository pointing to your pipeline definition repository

### Pipeline YAML Definition

Create a repository for your GoCD configurations:

```yaml
# gocd-pipelines/my-app.gocd.yaml

format_version: 10
common:
  deploy_job: &deploy_job
    timeout: 300
    resources:
      - deploy-capable

pipelines:
  my-app-build:
    group: my-app
    label_template: "${COUNT}"
    display_order: 1
    locking: single

    environment_variables:
      APP_NAME: my-app

    materials:
      app-source:
        git: https://github.com/myorg/my-app.git
        branch: main
        destination: app

    stages:
      - build:
          jobs:
            compile-and-test:
              timeout: 30
              tasks:
                - exec:
                    command: sh
                    arguments:
                      - -c
                      - |
                        cd app
                        npm ci
                        npm run build
                        npm test
              artifacts:
                - build:
                    source: app/dist/**
                    destination: dist

      - docker-build:
          jobs:
            build-image:
              timeout: 30
              tasks:
                - exec:
                    command: sh
                    arguments:
                      - -c
                      - |
                        docker build -t myregistry.example.com/my-app:${GO_PIPELINE_LABEL} .
                        docker push myregistry.example.com/my-app:${GO_PIPELINE_LABEL}
                        docker tag myregistry.example.com/my-app:${GO_PIPELINE_LABEL} myregistry.example.com/my-app:latest
                        docker push myregistry.example.com/my-app:latest

  my-app-deploy-staging:
    group: my-app
    display_order: 2
    locking: single

    materials:
      upstream:
        pipeline: my-app-build
        stage: docker-build    # Triggers after this stage passes

    stages:
      - deploy:
          approval:
            type: success    # Auto-deploy to staging
          jobs:
            deploy-to-staging:
              <<: *deploy_job
              tasks:
                - exec:
                    command: sh
                    arguments:
                      - -c
                      - |
                        ssh deploy@staging.example.com \
                          "docker pull myregistry.example.com/my-app:${GO_PIPELINE_LABEL} && \
                           docker-compose -f /opt/my-app/docker-compose.yml up -d"

  my-app-deploy-production:
    group: my-app
    display_order: 3
    locking: single

    materials:
      upstream:
        pipeline: my-app-deploy-staging
        stage: deploy    # Only after staging deployment

    stages:
      - deploy:
          approval:
            type: manual    # Require manual approval for production
          jobs:
            deploy-to-production:
              <<: *deploy_job
              tasks:
                - exec:
                    command: sh
                    arguments:
                      - -c
                      - |
                        ssh deploy@prod.example.com \
                          "docker pull myregistry.example.com/my-app:${GO_PIPELINE_LABEL} && \
                           docker-compose -f /opt/my-app/docker-compose.yml up -d"
```

## Agent Resource Management

Agents can be tagged with resources to ensure jobs run on appropriate machines:

In the web UI: Agents > Select Agent > Add Resource:
- `docker` - agents with Docker access
- `deploy-capable` - agents with production SSH keys
- `large-memory` - agents with enough RAM for big builds

Jobs can then require specific resources:

```yaml
jobs:
  my-job:
    resources:
      - docker
      - large-memory
```

## Environment Variables and Secure Variables

GoCD has Environments (groups of agents and pipelines sharing configurations):

In Admin > Environments, create environments like `staging`, `production` with:
- Pipelines assigned to the environment
- Agents assigned to the environment
- Environment variables (including secure/encrypted ones)

Pipeline-level variables can also be encrypted:

In the web UI, when configuring a pipeline, add a variable and check the "secure" checkbox. The value is stored encrypted.

## Built-in Artifact Management

GoCD stores build artifacts and makes them available to downstream pipelines:

```bash
# In GoCD YAML
artifacts:
  - build:
      source: target/*.jar
      destination: jars
```

Downstream pipelines fetch artifacts:

```yaml
tasks:
  - fetch:
      pipeline: my-app-build
      stage: build
      job: compile-and-test
      source: dist
      destination: upstream-dist
```

## Monitoring GoCD

```bash
# Server logs
sudo journalctl -u go-server -f
sudo tail -f /var/log/go-server/go-server.log

# Agent logs
sudo journalctl -u go-agent -f
sudo tail -f /var/log/go-agent/go-agent.log

# Server health API
curl http://localhost:8153/go/api/v1/health
```

## Resource Requirements

GoCD server requires reasonable resources. For a small team:

- Minimum: 2 CPU cores, 2GB RAM
- Recommended: 4 CPU cores, 4GB RAM
- Storage: At least 10GB for artifacts and database

Configure Java heap size for the server:

```bash
sudo nano /etc/default/go-server
```

```bash
# Increase heap size for larger installations
GO_SERVER_SYSTEM_PROPERTIES="-Xms512m -Xmx2048m"
```

## Troubleshooting

**Agent stays in pending state:** Click the checkmark icon next to the agent in the Agents page to enable it. GoCD does not auto-enable agents as a security measure.

**Pipeline does not trigger:** Check that the material (Git URL, branch) is correctly configured and accessible from the agent. Check Go Server logs for material polling errors.

**Build fails with "no agent available":** Check that at least one agent is enabled and idle. If jobs require resources (tags), ensure at least one agent has the required resource tags assigned.

**YAML configuration not loading:** Verify the config repository is correctly configured in GoCD's Config Repositories section. Check the GoCD server logs for YAML parsing errors.

GoCD's value stream map is one of its best features for understanding complex delivery pipelines - it visually shows the entire flow from code commit through all testing and deployment stages, making it easy to identify where delays or failures occur.
