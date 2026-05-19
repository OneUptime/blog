# How to Set Up Doppler for Secret Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Secret, DevOps, Environment Variable

Description: A complete guide to using Doppler for secret management on Ubuntu, covering CLI installation, project setup, environment injection, and CI/CD integration.

---

Doppler is a cloud-based secret management platform that centralizes environment variables across projects and environments. Instead of copying `.env` files between servers or storing secrets in CI/CD settings scattered across multiple systems, Doppler gives you a single place to manage secrets with access control, audit logs, and automatic secret rotation.

This guide covers the Doppler CLI on Ubuntu, integrating it with applications, and setting up service tokens for production servers.

## How Doppler Works

Doppler organizes secrets hierarchically:

```text
Workspace (your organization)
  └── Project (e.g., "my-api")
      ├── dev environment
      ├── staging environment
      └── production environment
```

Each environment holds key-value pairs. When you run your application with Doppler, it injects the appropriate environment's secrets as environment variables.

## Installing the Doppler CLI

```bash
# Add Doppler GPG key

curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
  'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg

# Add the Doppler repository
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] \
  https://packages.doppler.com/public/cli/deb/debian any-version main" \
  | sudo tee /etc/apt/sources.list.d/doppler-cli.list

# Install
sudo apt update && sudo apt install doppler -y

# Verify
doppler --version
```

## Authenticating with Doppler

```bash
# Log in to your Doppler account
doppler login

# This opens a browser for authentication
# After authenticating, the token is stored in ~/.config/doppler
```

## Setting Up a Project

If you do not have a Doppler project yet, create one in the dashboard or via CLI:

```bash
# List existing projects
doppler projects

# Set up the local CLI to use a specific project and environment
doppler setup
# This prompts you to select a project and environment

# Or specify directly
doppler setup --project my-api --config dev
```

The project and environment selection is scoped to the current directory and saved to `~/.doppler/.doppler.yaml`. The CLI looks up the active scope based on the directory you run commands from, walking up the directory tree until it finds a matching entry.

## Adding Secrets

Via the web dashboard at `https://dashboard.doppler.com`, navigate to your project and environment to add secrets.

Via CLI:

```bash
# Set a secret
doppler secrets set DATABASE_URL "postgres://user:pass@localhost/mydb"

# Set multiple secrets at once
doppler secrets set API_KEY=sk-abc123 SECRET_KEY=mysecretkey

# Import from an existing .env file
doppler secrets upload .env
```

View secrets:

```bash
# List all secrets (names and values) in a table
doppler secrets

# List only secret names, no values
doppler secrets --only-names

# Output secrets as JSON
doppler secrets --json
```

## Running Applications with Doppler

The `doppler run` command injects secrets as environment variables and runs your command:

```bash
# Run a Node.js application with secrets injected
doppler run -- node server.js

# Run a Python application
doppler run -- python manage.py runserver

# Run any command with secrets in scope
doppler run -- printenv | grep API_KEY
```

The double dash (`--`) separates the Doppler arguments from the command to run.

## Using Doppler with systemd Services

For production servers running systemd services, use a service token instead of personal credentials.

**Creating a service token:**

In the Doppler dashboard:
1. Go to your project and environment
2. Navigate to Access > Service Tokens
3. Create a token and copy it

Or via CLI:

```bash
# Create a service token for production
doppler configs tokens create prod-server-01 --project my-api --config production
```

**Configuring the systemd service:**

The Doppler CLI reads the token from the `DOPPLER_TOKEN` environment variable (there is no `--token-file` flag). The cleanest way to load it into a service is via systemd's `EnvironmentFile=` directive:

```bash
# Store the service token securely in a systemd env file
sudo mkdir -p /etc/doppler
sudo bash -c 'echo "DOPPLER_TOKEN=dp.st.production.YOURTOKEN" > /etc/doppler/env'
sudo chmod 600 /etc/doppler/env
sudo chown root:root /etc/doppler/env
```

Edit your service file:

```bash
sudo nano /etc/systemd/system/my-api.service
```

```ini
[Unit]
Description=My API Service
After=network.target

[Service]
Type=simple
User=app

# Load DOPPLER_TOKEN from a protected env file
EnvironmentFile=/etc/doppler/env

# Use doppler run to inject secrets
ExecStart=/usr/bin/doppler run -- /opt/app/server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable my-api
sudo systemctl start my-api
```

## Downloading Secrets as an Environment File

If you cannot use `doppler run` (e.g., for Docker builds), download secrets as a `.env` file:

```bash
# Download secrets for dev environment
doppler secrets download --no-file --format env > .env

# For a specific environment
doppler secrets download --project my-api --config production --no-file --format env > .env.production
```

Be careful with this approach - the `.env` file contains plaintext secrets. Delete it after use and never commit it to version control.

## Doppler with Docker

For Docker-based applications, pass secrets via environment variables at runtime:

```bash
# Inject Doppler secrets into a Docker container
doppler run -- docker run --env-file <(doppler secrets download --no-file --format env) my-app:latest
```

Or use Docker Compose:

```bash
# Run docker compose with Doppler secrets injected into the shell
doppler run -- docker compose up
```

Since `doppler run` sets environment variables in the shell, Docker Compose picks them up via the `${VARIABLE}` syntax in `docker-compose.yaml`.

## CI/CD Integration

For GitHub Actions:

```yaml
name: Deploy
on: push

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v4

      - name: Deploy with Doppler secrets
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
        run: |
          # doppler run injects production secrets
          doppler run --token $DOPPLER_TOKEN -- ./deploy.sh
```

## Secret Versioning and Rollback

Doppler keeps an audit log of every change to a config. To view recent config changes from the CLI:

```bash
# List audit log entries for the current config
doppler configs logs

# Fetch a specific entry by ID
doppler configs logs get <LOG_ID>

# Roll a config back to a previous state by audit log ID
doppler configs logs rollback <LOG_ID>
```

You can also view the change history and roll back from the dashboard's audit log UI.

## Automatic Secret Rotation

Doppler integrates with cloud providers to rotate secrets automatically:

1. In the dashboard, go to Integrations
2. Connect to AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault
3. Configure rotation schedules and the secrets to sync

When Doppler rotates a secret, it can trigger a webhook to restart your services automatically.

## Environment Syncing

Doppler can sync secrets to other systems (AWS Parameter Store, AWS Secrets Manager, Azure Key Vault, Kubernetes, GitHub Actions, and others). Integrations are configured from the Doppler dashboard, not the CLI:

1. In the dashboard, open your project and select the **Integrations** tab
2. Pick a destination (e.g. AWS Parameter Store) and provide credentials such as the role ARN, region, and path prefix
3. Choose which config to sync and click **Set Up Integration**

Once configured, Doppler keeps the destination in sync automatically whenever secrets change.

## Access Control

In the dashboard, control who can access which secrets:

- **Viewer** - can see secret names but not values
- **Collaborator** - can read and write secrets
- **Admin** - full access including deleting secrets and managing tokens

Restrict production access to CI/CD service accounts and senior engineers only.

## Troubleshooting

**`doppler run` command not found:**
```bash
# Check if Doppler is in PATH
which doppler
echo $PATH
```

**Authentication token expired:**
```bash
doppler logout
doppler login
```

**Service token not working:**
```bash
# Test the token directly
doppler secrets --token dp.st.production.YOURTOKEN --project my-api --config production
```

**Secrets not updating in running application:**

Doppler injects secrets at startup via `doppler run`. The application reads environment variables once at launch. To pick up updated secrets, restart the application or implement dynamic secret fetching using the Doppler SDK.

Doppler significantly reduces secret sprawl. The audit log alone - showing who accessed or changed a secret and when - is worth the operational overhead of adding another tool to the stack.
