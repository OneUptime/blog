# How to Set Up Concourse CI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, CI/CD, Concourse CI, Docker, DevOps

Description: Install and configure Concourse CI on Ubuntu using Docker Compose, covering web and worker components, pipeline basics, and integration with GitHub.

---

Concourse CI takes a different approach to CI/CD compared to Jenkins or Drone. It models everything as resources (things that change), tasks (things to run), and jobs (sequences of tasks). There is no plugin system - everything is a Docker image. There is no persistent state on the build machine - all builds run in isolated containers. This makes Concourse highly reproducible and declarative.

The trade-off is a steeper learning curve. But once the model clicks, Concourse is extremely powerful for complex multi-step pipelines.

## Concourse Architecture

A Concourse deployment has two main components:

- **Web (ATC):** The API server and web interface. Handles pipeline scheduling, stores state in PostgreSQL.
- **Worker:** Runs builds. Workers download inputs, execute containers, and publish outputs. Workers can be on different machines than the web component.

## Installing with Docker Compose

The quickest way to get Concourse running on Ubuntu is with Docker Compose using the official compose configuration.

### Install Docker

```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

### Create Concourse Configuration

```bash
mkdir -p /opt/concourse
cd /opt/concourse
```

Generate encryption keys. Concourse uses separate keys for different purposes:

```bash
# Create the keys directory
mkdir -p /opt/concourse/keys

# Generate the web component keys
# Session signing key - for signing user sessions
openssl genrsa -out /opt/concourse/keys/session_signing_key 2048

# TSA host key - for SSH communication with workers
ssh-keygen -t rsa -b 2048 -f /opt/concourse/keys/tsa_host_key -N ""

# Worker key pair - workers authenticate to the web component
ssh-keygen -t rsa -b 2048 -f /opt/concourse/keys/worker_key -N ""

# Set permissions
chmod 600 /opt/concourse/keys/*

# The worker needs to know the TSA host public key
cp /opt/concourse/keys/tsa_host_key.pub /opt/concourse/keys/authorized_worker_keys
```

Create the Docker Compose file:

```bash
nano /opt/concourse/docker-compose.yml
```

```yaml
version: '3.8'

services:
  concourse-db:
    image: postgres:15
    container_name: concourse-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: concourse
      POSTGRES_USER: concourse_user
      POSTGRES_PASSWORD: concourse_pass
    volumes:
      - postgres-data:/var/lib/postgresql/data

  concourse-web:
    image: concourse/concourse
    container_name: concourse-web
    command: web
    depends_on:
      - concourse-db
    restart: unless-stopped
    ports:
      - "8080:8080"    # Web interface
    volumes:
      - /opt/concourse/keys/tsa_host_key:/concourse-keys/tsa_host_key
      - /opt/concourse/keys/tsa_host_key.pub:/concourse-keys/tsa_host_key.pub
      - /opt/concourse/keys/session_signing_key:/concourse-keys/session_signing_key
      - /opt/concourse/keys/authorized_worker_keys:/concourse-keys/authorized_worker_keys
    environment:
      CONCOURSE_EXTERNAL_URL: https://ci.example.com
      CONCOURSE_POSTGRES_HOST: concourse-db
      CONCOURSE_POSTGRES_PORT: 5432
      CONCOURSE_POSTGRES_DATABASE: concourse
      CONCOURSE_POSTGRES_USER: concourse_user
      CONCOURSE_POSTGRES_PASSWORD: concourse_pass

      # Session signing key
      CONCOURSE_SESSION_SIGNING_KEY: /concourse-keys/session_signing_key

      # TSA keys for worker registration
      CONCOURSE_TSA_HOST_KEY: /concourse-keys/tsa_host_key
      CONCOURSE_TSA_AUTHORIZED_KEYS: /concourse-keys/authorized_worker_keys

      # Local user for initial access
      CONCOURSE_ADD_LOCAL_USER: admin:yoursecurepassword
      CONCOURSE_MAIN_TEAM_LOCAL_USER: admin

      # Log level
      CONCOURSE_LOG_LEVEL: info

  concourse-worker:
    image: concourse/concourse
    container_name: concourse-worker
    command: worker
    depends_on:
      - concourse-web
    restart: unless-stopped
    privileged: true   # Required for container operations
    volumes:
      - /opt/concourse/keys/worker_key:/concourse-keys/worker_key
      - /opt/concourse/keys/tsa_host_key.pub:/concourse-keys/tsa_host_key.pub
      - worker-data:/worker-state
    environment:
      CONCOURSE_TSA_HOST: concourse-web:2222
      CONCOURSE_TSA_PUBLIC_KEY: /concourse-keys/tsa_host_key.pub
      CONCOURSE_TSA_WORKER_PRIVATE_KEY: /concourse-keys/worker_key
      CONCOURSE_WORK_DIR: /worker-state
      CONCOURSE_RUNTIME: containerd

volumes:
  postgres-data:
  worker-data:
```

Start Concourse:

```bash
cd /opt/concourse
docker-compose up -d

# Watch startup logs
docker-compose logs -f
```

## Setting Up the Reverse Proxy

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

sudo nano /etc/nginx/sites-available/concourse
```

```nginx
server {
    listen 80;
    server_name ci.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ci.example.com;

    ssl_certificate /etc/letsencrypt/live/ci.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ci.example.com/privkey.pem;

    # Allow large artifact uploads
    client_max_body_size 1G;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # WebSocket support for live build output
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 3600;
        proxy_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/concourse /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ci.example.com
```

## Installing the Concourse CLI (fly)

`fly` is the CLI for interacting with Concourse:

```bash
# Download fly matching the server version
curl -O https://ci.example.com/api/v1/cli?arch=amd64&platform=linux -o fly

# Or download from the web interface - click the fly icon in the bottom right corner

sudo mv fly /usr/local/bin/
sudo chmod +x /usr/local/bin/fly

# Log in to the Concourse server
fly --target main login --concourse-url https://ci.example.com -u admin -p yoursecurepassword

# Verify connection
fly --target main workers
```

## Writing a Basic Pipeline

Concourse pipelines are defined in YAML. Create a simple pipeline:

```bash
nano /tmp/hello-pipeline.yml
```

```yaml
# A simple Concourse pipeline

# Resources - things that change over time
resources:
  - name: repo
    type: git
    source:
      uri: https://github.com/yourusername/yourrepo.git
      branch: main

  - name: every-5-minutes
    type: time
    source:
      interval: 5m

# Jobs - sequences of tasks
jobs:
  - name: run-tests
    plan:
      # Get the latest code (trigger on new commits)
      - get: repo
        trigger: true

      # Run the task defined inline
      - task: test
        config:
          platform: linux
          image_resource:
            type: docker-image
            source:
              repository: node
              tag: "20-alpine"
          inputs:
            - name: repo
          run:
            path: sh
            args:
              - -exc
              - |
                cd repo
                npm ci
                npm test
```

Set the pipeline in Concourse:

```bash
fly --target main set-pipeline \
    --pipeline hello \
    --config /tmp/hello-pipeline.yml

# Unpause the pipeline (new pipelines start paused)
fly --target main unpause-pipeline --pipeline hello

# Trigger a build manually
fly --target main trigger-job --job hello/run-tests --watch
```

## A More Complete Pipeline

```yaml
# full-pipeline.yml

resources:
  - name: source-repo
    type: git
    source:
      uri: https://github.com/myorg/myapp.git
      branch: main
      private_key: ((github_private_key))

  - name: docker-image
    type: registry-image
    source:
      repository: registry.example.com/myapp
      username: ((registry_user))
      password: ((registry_password))

jobs:
  - name: test
    plan:
      - get: source-repo
        trigger: true
      - task: run-tests
        config:
          platform: linux
          image_resource:
            type: docker-image
            source:
              repository: python
              tag: "3.11-slim"
          inputs:
            - name: source-repo
          run:
            path: bash
            args:
              - -c
              - |
                cd source-repo
                pip install -r requirements.txt
                pytest tests/

  - name: build-and-push
    depends_on: [test]
    plan:
      - get: source-repo
        trigger: true
        passed: [test]     # Only run if test passed
      - task: build
        privileged: true
        config:
          platform: linux
          image_resource:
            type: registry-image
            source:
              repository: concourse/oci-build-task
          inputs:
            - name: source-repo
              path: .
          outputs:
            - name: image
          run:
            path: build
          params:
            CONTEXT: source-repo
      - put: docker-image
        params:
          image: image/image.tar
```

## Managing Credentials

Concourse uses `((variable))` syntax for credentials. Configure a credential manager (e.g., Vault, or Concourse's built-in credential storage):

```bash
# Set credentials via fly
fly --target main set-pipeline \
    --pipeline myapp \
    --config pipeline.yml \
    --var "registry_user=myuser" \
    --var "registry_password=mypassword"

# Or use a variables file
nano vars.yml
```

```yaml
# vars.yml
registry_user: myuser
registry_password: mypassword
```

```bash
fly --target main set-pipeline \
    --pipeline myapp \
    --config pipeline.yml \
    --load-vars-from vars.yml
```

## Monitoring and Operations

```bash
# List pipelines
fly --target main pipelines

# List builds
fly --target main builds -j myapp/test

# Watch a running build
fly --target main watch --job myapp/test

# Check worker health
fly --target main workers

# Check container resource usage
fly --target main containers

# Intercept (SSH into) a running or failed build
fly --target main intercept --job myapp/test
```

## Troubleshooting

**Workers not registering:** Check that the TSA port (2222) is accessible between worker and web containers. Verify the worker private key matches the authorized keys file.

**Pipeline not triggering:** Pipelines start paused. Run `fly unpause-pipeline` after setting a new pipeline. Resources also need to be checked at least once - trigger a manual check with `fly check-resource`.

**Build fails with "could not fetch resource":** Verify the resource credentials (repository URL, keys) are correct. Use `fly check-resource` to test resource connectivity independently.

**Web container crashes at startup:** Check the database connection. Ensure the postgres container is healthy before the web container starts. The `depends_on` in docker-compose handles ordering, but not readiness - consider adding a healthcheck to the postgres service.

Concourse's resource model requires a mental shift from traditional CI systems, but it pays off with reproducible, pipeline-as-code workflows that are version controlled and auditable from the start.
