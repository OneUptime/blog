# How to Set Up a Webhooks Server on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Webhooks, Automation, API, Tutorial

Description: Complete guide to setting up a webhooks server for automation on Ubuntu.

---

Webhooks are the backbone of modern automation. Instead of polling APIs endlessly, a webhook server sits quietly until an external service knocks on its door with fresh data. This guide walks you through setting up a production-ready webhook server on Ubuntu using the popular `webhook` tool by adnanh.

## 1. Understanding Webhooks

### What Are Webhooks?

Webhooks are HTTP callbacks - automated messages sent from one application to another when a specific event occurs. Think of them as reverse APIs: instead of your application requesting data, external services push data to your server.

**Traditional Polling:**
```
Your App ---> (every 30 seconds) ---> GitHub API: "Any new commits?"
GitHub API ---> "No"
Your App ---> (30 seconds later) ---> GitHub API: "Any new commits?"
GitHub API ---> "No"
... (wasteful)
```

**Webhooks:**
```
GitHub ---> (push event) ---> Your Webhook Server: "New commit arrived!"
Your Server ---> Executes deployment script
```

### Common Webhook Use Cases

- **Git deployments:** Auto-deploy when code is pushed to main branch
- **CI/CD triggers:** Start builds when pull requests are opened
- **Chat integrations:** Post notifications to Slack/Discord
- **Payment processing:** Handle Stripe/PayPal transaction events
- **Monitoring alerts:** Trigger remediation scripts on incidents

## 2. Installing webhook (adnanh/webhook)

The `webhook` tool is a lightweight, configurable server written in Go. It handles incoming HTTP requests and executes commands based on your configuration.

### Method 1: Using apt (Debian/Ubuntu repositories)

```bash
# Update package lists
sudo apt update

# Install webhook from official repositories
sudo apt install webhook -y

# Verify the installation
webhook --version
```

### Method 2: Download Pre-built Binary (Latest Version)

```bash
# Download the latest release for Linux amd64
# Check https://github.com/adnanh/webhook/releases for the latest version
WEBHOOK_VERSION="2.8.1"
wget https://github.com/adnanh/webhook/releases/download/${WEBHOOK_VERSION}/webhook-linux-amd64.tar.gz

# Extract the binary
tar -xzf webhook-linux-amd64.tar.gz

# Move to a directory in your PATH
sudo mv webhook-linux-amd64/webhook /usr/local/bin/

# Make it executable (usually already is)
sudo chmod +x /usr/local/bin/webhook

# Verify installation
webhook --version

# Clean up downloaded files
rm -rf webhook-linux-amd64.tar.gz webhook-linux-amd64
```

### Method 3: Build from Source

```bash
# Install Go if not already installed
sudo apt install golang-go -y

# Clone the repository
git clone https://github.com/adnanh/webhook.git
cd webhook

# Build the binary
go build -o webhook

# Install system-wide
sudo mv webhook /usr/local/bin/

# Verify
webhook --version
```

## 3. Configuration File (hooks.json)

The webhook server reads its configuration from a JSON file (typically `hooks.json`). This file defines what endpoints exist, what commands they execute, and under what conditions.

### Basic Configuration Structure

Create your configuration directory:

```bash
# Create a dedicated directory for webhook configuration
sudo mkdir -p /etc/webhook

# Create the hooks.json file
sudo nano /etc/webhook/hooks.json
```

### Minimal Example

```json
[
  {
    "id": "hello-world",
    "execute-command": "/usr/local/bin/hello.sh",
    "command-working-directory": "/tmp"
  }
]
```

Create the corresponding script:

```bash
# Create the script
sudo nano /usr/local/bin/hello.sh
```

```bash
#!/bin/bash
# hello.sh - Simple webhook test script
# This script logs the execution time to verify the webhook is working

echo "Webhook executed at $(date)" >> /var/log/webhook-hello.log
echo "Hello from webhook!"
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/hello.sh

# Create the log file with proper permissions
sudo touch /var/log/webhook-hello.log
sudo chmod 666 /var/log/webhook-hello.log
```

### Running the Server Manually (for testing)

```bash
# Start webhook server on port 9000
# -verbose enables detailed logging for debugging
# -hooks specifies the configuration file path
webhook -verbose -hooks /etc/webhook/hooks.json -port 9000
```

Test it with curl:

```bash
# Send a POST request to trigger the webhook
curl -X POST http://localhost:9000/hooks/hello-world

# Check the log to verify execution
cat /var/log/webhook-hello.log
```

## 4. Defining Hooks

Each hook in your `hooks.json` is an object that defines an endpoint and its behavior. Let's explore the available options.

### Hook Configuration Options

```json
[
  {
    "id": "deploy-production",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/myapp",
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "ref"
      }
    ],
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "repository.full_name",
        "envname": "REPO_NAME"
      }
    ],
    "response-message": "Deployment triggered successfully",
    "response-headers": [
      {
        "name": "Access-Control-Allow-Origin",
        "value": "*"
      }
    ],
    "include-command-output-in-response": true,
    "include-command-output-in-response-on-error": true,
    "trigger-rule-mismatch-http-response-code": 403
  }
]
```

### Complete Multi-Hook Example

```json
[
  {
    "id": "github-deploy",
    "execute-command": "/opt/scripts/github-deploy.sh",
    "command-working-directory": "/var/www/app",
    "response-message": "Deployment initiated",
    "include-command-output-in-response": false,
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "repository.name"
      },
      {
        "source": "payload",
        "name": "ref"
      }
    ]
  },
  {
    "id": "backup-trigger",
    "execute-command": "/opt/scripts/backup.sh",
    "command-working-directory": "/opt/backups",
    "response-message": "Backup started"
  },
  {
    "id": "slack-notify",
    "execute-command": "/opt/scripts/slack-notify.sh",
    "command-working-directory": "/tmp",
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "message",
        "envname": "SLACK_MESSAGE"
      }
    ]
  }
]
```

## 5. Trigger Rules and Conditions

Trigger rules let you control when a hook actually executes. You can match specific payload values, headers, or query parameters.

### Match Payload Value

Only trigger when a specific field in the JSON payload matches:

```json
[
  {
    "id": "deploy-on-main",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "refs/heads/main",
        "parameter": {
          "source": "payload",
          "name": "ref"
        }
      }
    }
  }
]
```

### Match Header Value

Useful for verifying the event type:

```json
[
  {
    "id": "github-push-only",
    "execute-command": "/opt/scripts/on-push.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "push",
        "parameter": {
          "source": "header",
          "name": "X-GitHub-Event"
        }
      }
    }
  }
]
```

### Combining Multiple Rules (AND logic)

Execute only when ALL conditions are met:

```json
[
  {
    "id": "deploy-main-push",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "value",
            "value": "push",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
```

### Using OR Logic

Execute when ANY condition is met:

```json
[
  {
    "id": "deploy-any-branch",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "or": [
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/staging",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
```

### Regex Matching

Use regular expressions for flexible pattern matching:

```json
[
  {
    "id": "deploy-release-tags",
    "execute-command": "/opt/scripts/deploy-release.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "match": {
        "type": "regex",
        "regex": "^refs/tags/v[0-9]+\\.[0-9]+\\.[0-9]+$",
        "parameter": {
          "source": "payload",
          "name": "ref"
        }
      }
    }
  }
]
```

## 6. Passing Parameters to Scripts

The webhook tool can extract data from incoming requests and pass them to your scripts as arguments or environment variables.

### Passing Command-Line Arguments

```json
[
  {
    "id": "parameterized-deploy",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "repository.name"
      },
      {
        "source": "payload",
        "name": "ref"
      },
      {
        "source": "payload",
        "name": "pusher.name"
      },
      {
        "source": "header",
        "name": "X-GitHub-Delivery"
      },
      {
        "source": "url",
        "name": "environment"
      }
    ]
  }
]
```

The corresponding deployment script:

```bash
#!/bin/bash
# deploy.sh - Deployment script with arguments
# Arguments:
#   $1 - Repository name
#   $2 - Git ref (branch/tag)
#   $3 - Pusher name
#   $4 - GitHub delivery ID
#   $5 - Environment (from URL query parameter)

REPO_NAME="$1"
GIT_REF="$2"
PUSHER="$3"
DELIVERY_ID="$4"
ENVIRONMENT="${5:-production}"  # Default to production if not specified

# Log file for deployment history
LOG_FILE="/var/log/deployments.log"

# Log the deployment start
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting deployment" >> "$LOG_FILE"
echo "  Repository: $REPO_NAME" >> "$LOG_FILE"
echo "  Ref: $GIT_REF" >> "$LOG_FILE"
echo "  Triggered by: $PUSHER" >> "$LOG_FILE"
echo "  Delivery ID: $DELIVERY_ID" >> "$LOG_FILE"
echo "  Environment: $ENVIRONMENT" >> "$LOG_FILE"

# Navigate to the repository directory
cd /var/www/"$REPO_NAME" || exit 1

# Pull latest changes
git fetch origin
git checkout "$GIT_REF"
git pull origin "$GIT_REF"

# Run deployment steps based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment
    npm ci --production
    npm run build
    pm2 restart "$REPO_NAME"
else
    # Staging/development deployment
    npm ci
    npm run build:dev
    pm2 restart "$REPO_NAME-staging"
fi

# Log completion
echo "  Status: SUCCESS" >> "$LOG_FILE"
echo "  Completed: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

echo "Deployment completed successfully"
```

### Passing Environment Variables

```json
[
  {
    "id": "env-deploy",
    "execute-command": "/opt/scripts/deploy-env.sh",
    "command-working-directory": "/var/www/app",
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "repository.full_name",
        "envname": "REPO_FULL_NAME"
      },
      {
        "source": "payload",
        "name": "sender.login",
        "envname": "TRIGGERED_BY"
      },
      {
        "source": "payload",
        "name": "head_commit.message",
        "envname": "COMMIT_MESSAGE"
      },
      {
        "source": "header",
        "name": "X-GitHub-Event",
        "envname": "EVENT_TYPE"
      }
    ]
  }
]
```

Script using environment variables:

```bash
#!/bin/bash
# deploy-env.sh - Deployment script using environment variables
# Environment variables are set by the webhook server

# Log the deployment with environment variable data
echo "[$(date)] Deployment triggered" >> /var/log/deploy.log
echo "  Repository: ${REPO_FULL_NAME}" >> /var/log/deploy.log
echo "  Triggered by: ${TRIGGERED_BY}" >> /var/log/deploy.log
echo "  Commit message: ${COMMIT_MESSAGE}" >> /var/log/deploy.log
echo "  Event type: ${EVENT_TYPE}" >> /var/log/deploy.log

# Validate that required variables are set
if [ -z "$REPO_FULL_NAME" ]; then
    echo "ERROR: REPO_FULL_NAME is not set" >> /var/log/deploy.log
    exit 1
fi

# Continue with deployment logic
cd /var/www/app || exit 1
git pull origin main
npm ci
npm run build

echo "  Status: Completed" >> /var/log/deploy.log
```

### Accessing the Entire Payload

For complex scenarios, pass the entire JSON payload:

```json
[
  {
    "id": "full-payload",
    "execute-command": "/opt/scripts/process-payload.sh",
    "command-working-directory": "/tmp",
    "pass-file-to-command": [
      {
        "source": "payload",
        "name": "payload.json"
      }
    ]
  }
]
```

## 7. Security: Secrets and Signatures

Never expose webhook endpoints without authentication. Most services support HMAC signature verification.

### GitHub Webhook Secret Validation

```json
[
  {
    "id": "secure-github-hook",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "your-super-secret-webhook-token",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "push",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        }
      ]
    }
  }
]
```

### GitLab Webhook Token Validation

```json
[
  {
    "id": "secure-gitlab-hook",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "your-gitlab-secret-token",
        "parameter": {
          "source": "header",
          "name": "X-Gitlab-Token"
        }
      }
    }
  }
]
```

### Using Environment Variables for Secrets

Instead of hardcoding secrets in your configuration, use environment variables:

```json
[
  {
    "id": "env-secret-hook",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "{{ getenv \"WEBHOOK_SECRET\" }}",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
```

### IP Whitelisting

Combine signature verification with IP restrictions for defense in depth:

```json
[
  {
    "id": "ip-restricted-hook",
    "execute-command": "/opt/scripts/deploy.sh",
    "command-working-directory": "/var/www/app",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "your-secret",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "ip-whitelist",
            "ip-range": "192.30.252.0/22"
          }
        }
      ]
    }
  }
]
```

### Security Best Practices

```bash
#!/bin/bash
# secure-webhook-setup.sh - Security hardening for webhook server

# 1. Create a dedicated service user (no login shell)
sudo useradd -r -s /usr/sbin/nologin webhook

# 2. Set restrictive permissions on configuration
sudo chown root:webhook /etc/webhook/hooks.json
sudo chmod 640 /etc/webhook/hooks.json

# 3. Create a secrets file (not in hooks.json)
sudo touch /etc/webhook/secrets.env
sudo chmod 600 /etc/webhook/secrets.env
echo "WEBHOOK_SECRET=your-secure-random-string" | sudo tee /etc/webhook/secrets.env

# 4. Secure log directory
sudo mkdir -p /var/log/webhook
sudo chown webhook:webhook /var/log/webhook
sudo chmod 750 /var/log/webhook

# 5. Secure scripts directory
sudo mkdir -p /opt/webhook-scripts
sudo chown root:webhook /opt/webhook-scripts
sudo chmod 750 /opt/webhook-scripts
```

## 8. Systemd Service Setup

Running webhook as a systemd service ensures it starts automatically and restarts on failure.

### Create the Systemd Service File

```bash
# Create the service file
sudo nano /etc/systemd/system/webhook.service
```

```ini
[Unit]
# Service description shown in systemctl status
Description=Webhook Server
# Documentation URL for reference
Documentation=https://github.com/adnanh/webhook
# Start after network is available
After=network.target

[Service]
# Type of service - simple means the process started is the main process
Type=simple

# User and group to run the service as (security: don't run as root)
User=webhook
Group=webhook

# Environment file containing secrets
EnvironmentFile=/etc/webhook/secrets.env

# The command to start the webhook server
# -verbose: Enable detailed logging
# -hotreload: Reload hooks.json when it changes (no restart needed)
# -hooks: Path to configuration file
# -port: Port to listen on (use high port, reverse proxy handles 80/443)
# -secure: Only bind to localhost (reverse proxy handles external traffic)
ExecStart=/usr/local/bin/webhook -verbose -hotreload -hooks /etc/webhook/hooks.json -port 9000 -ip 127.0.0.1

# Restart policy - always restart on failure
Restart=always
# Wait 5 seconds before restarting
RestartSec=5

# Security hardening options
# Prevent the service from gaining new privileges
NoNewPrivileges=true
# Make /home, /root, and /run/user inaccessible
ProtectHome=true
# Make /usr, /boot, /efi, and /etc read-only
ProtectSystem=strict
# Allow writes only to specific directories
ReadWritePaths=/var/log/webhook /var/www /opt/deployments

# Resource limits
# Maximum number of file descriptors
LimitNOFILE=65535

[Install]
# Start this service when the system reaches multi-user mode
WantedBy=multi-user.target
```

### Enable and Start the Service

```bash
# Create the webhook user if not already done
sudo useradd -r -s /usr/sbin/nologin webhook

# Ensure required directories exist with correct permissions
sudo mkdir -p /var/log/webhook
sudo chown webhook:webhook /var/log/webhook

# Reload systemd to pick up the new service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable webhook

# Start the service now
sudo systemctl start webhook

# Check the status to verify it's running
sudo systemctl status webhook
```

### Useful Systemd Commands

```bash
# View live logs from the webhook service
sudo journalctl -u webhook -f

# View logs from the last hour
sudo journalctl -u webhook --since "1 hour ago"

# Restart the service after configuration changes
sudo systemctl restart webhook

# Stop the service
sudo systemctl stop webhook

# Check if the service is enabled for boot
sudo systemctl is-enabled webhook
```

## 9. Nginx Reverse Proxy

Nginx provides SSL termination, rate limiting, and additional security for your webhook server.

### Install Nginx

```bash
# Install Nginx
sudo apt update
sudo apt install nginx -y

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Create Nginx Configuration

```bash
# Create a new site configuration
sudo nano /etc/nginx/sites-available/webhook
```

```nginx
# Rate limiting zone - 10 requests per second per IP
# Prevents abuse of webhook endpoints
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=10r/s;

# Upstream definition for the webhook server
upstream webhook_backend {
    server 127.0.0.1:9000;
    keepalive 32;
}

server {
    # Listen on port 80 for initial setup (redirect to HTTPS in production)
    listen 80;
    listen [::]:80;

    # Your domain name
    server_name webhooks.yourdomain.com;

    # Access and error logs
    access_log /var/log/nginx/webhook_access.log;
    error_log /var/log/nginx/webhook_error.log;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Webhook endpoint location
    location /hooks/ {
        # Apply rate limiting - burst allows 20 requests, nodelay returns 503 immediately
        limit_req zone=webhook_limit burst=20 nodelay;

        # Proxy settings
        proxy_pass http://webhook_backend;
        proxy_http_version 1.1;

        # Pass original client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Connection settings
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings for webhook payloads
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # Max payload size (adjust based on your needs)
        client_max_body_size 10M;
    }

    # Health check endpoint (for monitoring)
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    # Deny access to any other paths
    location / {
        return 404;
    }
}
```

### Enable the Site and Add SSL

```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx

# Install Certbot for free SSL certificates
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install SSL certificate (follow the prompts)
sudo certbot --nginx -d webhooks.yourdomain.com

# Certbot automatically configures HTTPS and sets up auto-renewal
# Verify auto-renewal is configured
sudo systemctl status certbot.timer
```

### Production-Ready HTTPS Configuration

After running Certbot, your configuration will be updated. Here's what a production HTTPS configuration looks like:

```nginx
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=10r/s;

upstream webhook_backend {
    server 127.0.0.1:9000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name webhooks.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webhooks.yourdomain.com;

    # SSL certificate paths (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/webhooks.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webhooks.yourdomain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS header - enforce HTTPS for 1 year
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Other security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Logging
    access_log /var/log/nginx/webhook_access.log;
    error_log /var/log/nginx/webhook_error.log;

    location /hooks/ {
        limit_req zone=webhook_limit burst=20 nodelay;
        proxy_pass http://webhook_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        client_max_body_size 10M;
    }

    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }

    location / {
        return 404;
    }
}
```

## 10. Common Use Cases

### Use Case 1: Automated Git Deployment

```json
[
  {
    "id": "git-auto-deploy",
    "execute-command": "/opt/scripts/git-deploy.sh",
    "command-working-directory": "/var/www/myapp",
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "repository.name"
      },
      {
        "source": "payload",
        "name": "ref"
      }
    ],
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "push",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
```

Deployment script:

```bash
#!/bin/bash
# git-deploy.sh - Automated deployment on git push
# Arguments:
#   $1 - Repository name
#   $2 - Git ref being pushed

set -e  # Exit immediately if any command fails

REPO_NAME="$1"
GIT_REF="$2"
DEPLOY_DIR="/var/www/${REPO_NAME}"
LOG_FILE="/var/log/deployments/${REPO_NAME}.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Logging function
log() {
    echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log "=== Starting deployment ==="
log "Repository: $REPO_NAME"
log "Ref: $GIT_REF"

# Navigate to deployment directory
cd "$DEPLOY_DIR" || { log "ERROR: Cannot access $DEPLOY_DIR"; exit 1; }

# Create backup of current version (last 5 backups kept)
BACKUP_DIR="/var/backups/${REPO_NAME}"
mkdir -p "$BACKUP_DIR"
log "Creating backup..."
tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" . 2>/dev/null || true
ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm --

# Pull latest changes
log "Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Install dependencies (Node.js example)
if [ -f "package.json" ]; then
    log "Installing npm dependencies..."
    npm ci --production
fi

# Build the application
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    log "Building application..."
    npm run build
fi

# Restart the application (PM2 example)
if command -v pm2 &> /dev/null; then
    log "Restarting application with PM2..."
    pm2 restart "$REPO_NAME" --update-env || pm2 start npm --name "$REPO_NAME" -- start
fi

# Clear cache if applicable (example for Laravel)
if [ -f "artisan" ]; then
    log "Clearing Laravel cache..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

log "=== Deployment completed successfully ==="
```

### Use Case 2: CI/CD Pipeline Trigger

```json
[
  {
    "id": "trigger-ci-pipeline",
    "execute-command": "/opt/scripts/trigger-ci.sh",
    "command-working-directory": "/tmp",
    "response-message": "CI pipeline triggered",
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "pull_request.number",
        "envname": "PR_NUMBER"
      },
      {
        "source": "payload",
        "name": "pull_request.head.sha",
        "envname": "COMMIT_SHA"
      },
      {
        "source": "payload",
        "name": "repository.full_name",
        "envname": "REPO_NAME"
      }
    ],
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "pull_request",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        },
        {
          "or": [
            {
              "match": {
                "type": "value",
                "value": "opened",
                "parameter": {
                  "source": "payload",
                  "name": "action"
                }
              }
            },
            {
              "match": {
                "type": "value",
                "value": "synchronize",
                "parameter": {
                  "source": "payload",
                  "name": "action"
                }
              }
            }
          ]
        }
      ]
    }
  }
]
```

CI trigger script:

```bash
#!/bin/bash
# trigger-ci.sh - Trigger CI/CD pipeline for pull requests
# Environment variables:
#   PR_NUMBER - Pull request number
#   COMMIT_SHA - Commit SHA to build
#   REPO_NAME - Repository full name (owner/repo)

set -e

LOG_FILE="/var/log/ci-triggers.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log "CI triggered for $REPO_NAME PR #$PR_NUMBER (commit: $COMMIT_SHA)"

# Option 1: Trigger Jenkins build
curl -X POST "https://jenkins.internal/job/${REPO_NAME}/buildWithParameters" \
    --user "${JENKINS_USER}:${JENKINS_TOKEN}" \
    --data "PR_NUMBER=${PR_NUMBER}&COMMIT_SHA=${COMMIT_SHA}"

# Option 2: Trigger GitLab CI
# curl -X POST "https://gitlab.com/api/v4/projects/${PROJECT_ID}/trigger/pipeline" \
#     --form "token=${GITLAB_TRIGGER_TOKEN}" \
#     --form "ref=${COMMIT_SHA}" \
#     --form "variables[PR_NUMBER]=${PR_NUMBER}"

# Option 3: Run local tests
# cd "/var/ci/${REPO_NAME}"
# git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"
# git checkout "pr-${PR_NUMBER}"
# npm ci && npm test

log "CI trigger completed for PR #$PR_NUMBER"
```

### Use Case 3: Slack Notifications

```json
[
  {
    "id": "slack-deployment-notify",
    "execute-command": "/opt/scripts/slack-notify.sh",
    "command-working-directory": "/tmp",
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "repository.name",
        "envname": "REPO_NAME"
      },
      {
        "source": "payload",
        "name": "pusher.name",
        "envname": "PUSHER"
      },
      {
        "source": "payload",
        "name": "head_commit.message",
        "envname": "COMMIT_MSG"
      },
      {
        "source": "payload",
        "name": "compare",
        "envname": "COMPARE_URL"
      }
    ],
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
```

Slack notification script:

```bash
#!/bin/bash
# slack-notify.sh - Send deployment notifications to Slack
# Environment variables:
#   REPO_NAME - Repository name
#   PUSHER - User who pushed
#   COMMIT_MSG - Commit message
#   COMPARE_URL - URL to view changes
#   SLACK_WEBHOOK_URL - Slack incoming webhook URL (set in secrets.env)

# Escape special characters in commit message for JSON
ESCAPED_MSG=$(echo "$COMMIT_MSG" | head -1 | sed 's/"/\\"/g' | sed "s/'/\\'/g")

# Construct the Slack message payload
# Using Slack Block Kit for rich formatting
PAYLOAD=$(cat <<EOF
{
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Deployment Triggered",
                "emoji": true
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Repository:*\n${REPO_NAME}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Triggered by:*\n${PUSHER}"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Commit:*\n${ESCAPED_MSG}"
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View Changes"
                    },
                    "url": "${COMPARE_URL}"
                }
            ]
        }
    ]
}
EOF
)

# Send to Slack
curl -X POST "$SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"

echo "Slack notification sent"
```

### Use Case 4: Database Backup on Schedule

```json
[
  {
    "id": "trigger-backup",
    "execute-command": "/opt/scripts/backup-database.sh",
    "command-working-directory": "/opt/backups",
    "pass-arguments-to-command": [
      {
        "source": "url",
        "name": "database"
      }
    ],
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "{{ getenv \"BACKUP_API_KEY\" }}",
        "parameter": {
          "source": "header",
          "name": "X-API-Key"
        }
      }
    }
  }
]
```

## 11. Debugging and Logging

### Enable Verbose Logging

When running the webhook server, use the `-verbose` flag for detailed output:

```bash
# Run with verbose logging to see all incoming requests
webhook -verbose -hooks /etc/webhook/hooks.json -port 9000
```

### View Real-Time Logs

```bash
# View webhook service logs in real-time
sudo journalctl -u webhook -f

# View last 100 lines of logs
sudo journalctl -u webhook -n 100

# View logs from a specific time period
sudo journalctl -u webhook --since "2024-01-15 10:00" --until "2024-01-15 12:00"

# Filter for errors only
sudo journalctl -u webhook -p err
```

### Debug Script for Inspecting Payloads

Create a debug hook to see exactly what data you're receiving:

```json
[
  {
    "id": "debug-webhook",
    "execute-command": "/opt/scripts/debug-webhook.sh",
    "command-working-directory": "/tmp",
    "pass-file-to-command": [
      {
        "source": "payload",
        "name": "payload.json"
      }
    ],
    "include-command-output-in-response": true
  }
]
```

Debug script:

```bash
#!/bin/bash
# debug-webhook.sh - Debug script to inspect incoming webhook payloads
# The payload is passed as a file path in $1

PAYLOAD_FILE="$1"
DEBUG_LOG="/var/log/webhook-debug.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== Debug Webhook Received ===" >> "$DEBUG_LOG"
echo "Timestamp: $TIMESTAMP" >> "$DEBUG_LOG"
echo "Payload file: $PAYLOAD_FILE" >> "$DEBUG_LOG"

# Check if payload file exists
if [ -f "$PAYLOAD_FILE" ]; then
    echo "Payload content:" >> "$DEBUG_LOG"
    # Pretty print JSON if jq is available
    if command -v jq &> /dev/null; then
        jq '.' "$PAYLOAD_FILE" >> "$DEBUG_LOG" 2>&1
    else
        cat "$PAYLOAD_FILE" >> "$DEBUG_LOG"
    fi
else
    echo "No payload file received" >> "$DEBUG_LOG"
fi

echo "---" >> "$DEBUG_LOG"

# Output for response
echo "Debug info logged to $DEBUG_LOG"
echo "Timestamp: $TIMESTAMP"
```

### Testing Webhooks Locally

Use curl to simulate webhook requests:

```bash
# Simple POST request
curl -X POST http://localhost:9000/hooks/hello-world

# POST with JSON payload
curl -X POST http://localhost:9000/hooks/deploy \
    -H "Content-Type: application/json" \
    -d '{"ref": "refs/heads/main", "repository": {"name": "myapp"}}'

# POST with headers (simulating GitHub)
curl -X POST http://localhost:9000/hooks/github-deploy \
    -H "Content-Type: application/json" \
    -H "X-GitHub-Event: push" \
    -H "X-Hub-Signature-256: sha256=..." \
    -d @test-payload.json

# Using query parameters
curl -X POST "http://localhost:9000/hooks/deploy?environment=staging"
```

### Generating Test Signatures

For testing HMAC signature verification:

```bash
#!/bin/bash
# generate-signature.sh - Generate HMAC signature for testing
# Usage: ./generate-signature.sh <secret> <payload-file>

SECRET="$1"
PAYLOAD_FILE="$2"

# Generate SHA-256 HMAC signature
SIGNATURE=$(cat "$PAYLOAD_FILE" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

echo "X-Hub-Signature-256: sha256=$SIGNATURE"
```

### Common Issues and Solutions

**Issue: Webhook returns 200 but script doesn't run**
```bash
# Check if the script is executable
ls -la /opt/scripts/deploy.sh

# Check script permissions
sudo chmod +x /opt/scripts/deploy.sh

# Check if the webhook user can execute it
sudo -u webhook /opt/scripts/deploy.sh
```

**Issue: Trigger rule never matches**
```bash
# Use the debug hook to see actual payload structure
# Common issues:
# - Case sensitivity in field names
# - Nested vs flat field paths (use repository.name not repository_name)
# - Missing headers
```

**Issue: Script runs but deployment fails**
```bash
# Check script logs
tail -f /var/log/deployments.log

# Test script manually with same user
sudo -u webhook /opt/scripts/deploy.sh arg1 arg2

# Check working directory permissions
ls -la /var/www/myapp
```

### Monitoring Webhook Health

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor-webhook.sh - Health check script for webhook server

WEBHOOK_URL="http://localhost:9000/hooks/health-check"
LOG_FILE="/var/log/webhook-monitor.log"

# Check if webhook is responding
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" 2>/dev/null)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "[$(date)] Webhook server is healthy (HTTP $HTTP_CODE)" >> "$LOG_FILE"
else
    echo "[$(date)] WARNING: Webhook server returned HTTP $HTTP_CODE" >> "$LOG_FILE"
    # Send alert (example using curl to a notification service)
    # curl -X POST "https://alerts.example.com/webhook-down"
fi
```

Add a health check hook:

```json
[
  {
    "id": "health-check",
    "execute-command": "/bin/echo",
    "pass-arguments-to-command": [
      {
        "source": "string",
        "name": "healthy"
      }
    ],
    "response-message": "OK"
  }
]
```

## Complete Production Configuration Example

Here's a complete, production-ready `hooks.json` with multiple hooks:

```json
[
  {
    "id": "github-production-deploy",
    "execute-command": "/opt/scripts/deploy-production.sh",
    "command-working-directory": "/var/www/production",
    "response-message": "Production deployment initiated",
    "include-command-output-in-response": false,
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "repository.name"
      },
      {
        "source": "payload",
        "name": "after"
      }
    ],
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "pusher.name",
        "envname": "DEPLOYER"
      }
    ],
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "push",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  },
  {
    "id": "github-staging-deploy",
    "execute-command": "/opt/scripts/deploy-staging.sh",
    "command-working-directory": "/var/www/staging",
    "response-message": "Staging deployment initiated",
    "pass-arguments-to-command": [
      {
        "source": "payload",
        "name": "repository.name"
      }
    ],
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hmac-sha256",
            "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature-256"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "push",
            "parameter": {
              "source": "header",
              "name": "X-GitHub-Event"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/develop",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  },
  {
    "id": "slack-notify",
    "execute-command": "/opt/scripts/slack-notify.sh",
    "command-working-directory": "/tmp",
    "pass-environment-to-command": [
      {
        "source": "payload",
        "name": "repository.name",
        "envname": "REPO_NAME"
      },
      {
        "source": "payload",
        "name": "pusher.name",
        "envname": "PUSHER"
      },
      {
        "source": "payload",
        "name": "head_commit.message",
        "envname": "COMMIT_MSG"
      }
    ],
    "trigger-rule": {
      "match": {
        "type": "payload-hmac-sha256",
        "secret": "{{ getenv \"GITHUB_WEBHOOK_SECRET\" }}",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  },
  {
    "id": "health-check",
    "execute-command": "/bin/echo",
    "pass-arguments-to-command": [
      {
        "source": "string",
        "name": "healthy"
      }
    ],
    "response-message": "OK"
  }
]
```

---

## Monitoring Your Webhook Server with OneUptime

Once your webhook server is running in production, monitoring becomes essential. You need to know immediately if your webhook endpoint goes down, if deployments are failing, or if response times are degrading.

[OneUptime](https://oneuptime.com) provides comprehensive monitoring for your webhook infrastructure:

- **Uptime Monitoring:** Set up HTTP monitors to check your webhook endpoints every minute. Get alerted instantly if your `/hooks/` endpoints become unreachable.

- **Response Time Tracking:** Monitor the latency of your webhook responses. Slow webhooks can cause timeouts and missed events from services like GitHub.

- **Log Management:** Aggregate logs from your webhook server and deployment scripts. Search and analyze logs to debug failed deployments.

- **Alerting:** Configure alerts via Slack, email, SMS, or PagerDuty when your webhook server experiences issues.

- **Status Pages:** Create a public or private status page showing the health of your deployment infrastructure.

- **Incident Management:** When webhook failures occur, OneUptime helps you track incidents, coordinate responses, and conduct post-mortems.

With webhooks being critical to your CI/CD pipeline, having proper monitoring in place ensures you catch issues before they impact your development workflow. OneUptime's open-source platform gives you the observability you need to keep your automation running smoothly.
