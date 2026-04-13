# How to Use Atlas CLI for MongoDB Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, DevOps, Automation

Description: Learn how to use the Atlas CLI to manage clusters, users, backups, and monitoring from the command line for scripting and automation workflows.

---

## What Is the Atlas CLI?

The Atlas CLI (`atlas`) is the official command-line interface for managing MongoDB Atlas resources. Use it to create and manage clusters, configure security, run backups, view metrics, and automate operations in CI/CD pipelines.

## Installation

```bash
# macOS with Homebrew
brew install mongodb-atlas-cli

# Linux (Debian/Ubuntu)
curl -fsSL https://www.mongodb.org/static/pgp/server-cli.asc | sudo gpg --dearmor -o /usr/share/keyrings/atlas-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/atlas-archive-keyring.gpg] https://www.mongodb.org/repo/ubuntu $(lsb_release -cs)/mongodb-atlas-cli multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-atlas-cli.list
sudo apt-get update && sudo apt-get install -y mongodb-atlas-cli

# Windows (Chocolatey)
choco install mongodb-atlas

# Verify installation
atlas --version
```

## Authentication

### Interactive Login

```bash
atlas auth login
# Opens browser for OAuth login
```

### API Key Authentication (for scripts)

```bash
# Set credentials via environment variables
export MONGODB_ATLAS_PUBLIC_API_KEY="your-public-key"
export MONGODB_ATLAS_PRIVATE_API_KEY="your-private-key"
export MONGODB_ATLAS_ORG_ID="your-org-id"
export MONGODB_ATLAS_PROJECT_ID="your-project-id"
```

Or configure a profile:

```bash
atlas config set public_api_key "your-public-key"
atlas config set private_api_key "your-private-key"
atlas config set org_id "your-org-id"
atlas config set project_id "your-project-id"
```

## Cluster Operations

### Create a Cluster

```bash
atlas clusters create myCluster \
  --provider AWS \
  --region US_EAST_1 \
  --tier M30 \
  --mdbVersion 7.0 \
  --diskSizeGB 100
```

### List Clusters

```bash
atlas clusters list
atlas clusters describe myCluster
```

### Pause and Resume

```bash
atlas clusters pause myCluster
atlas clusters start myCluster
```

### Delete a Cluster

```bash
atlas clusters delete myCluster --force
```

## Database User Management

```bash
# Create a user
atlas dbusers create \
  --username appUser \
  --password "SecurePass123!" \
  --role readWrite@appdb

# List users
atlas dbusers list

# Delete a user
atlas dbusers delete appUser
```

## Network Access

```bash
# Add an IP
atlas accessLists create "10.0.0.0/8" \
  --type cidrBlock \
  --comment "Internal network"

# List access list
atlas accessLists list

# Delete an entry
atlas accessLists delete "10.0.0.0/8"
```

## Backup Operations

```bash
# List snapshots
atlas backups snapshots list myCluster

# Create on-demand snapshot
atlas backups snapshots create myCluster \
  --desc "Before schema migration" \
  --retention 7

# Restore from snapshot
atlas backups restores start automated \
  --clusterName myCluster \
  --snapshotId <snapshotId> \
  --targetClusterName myRestoredCluster \
  --targetProjectId <targetProjectId>
```

## Monitoring and Metrics

```bash
# View current processes (use atlas processes list to find hostname:port)
atlas metrics processes <hostname:port> \
  --period PT1H \
  --granularity PT5M \
  --type CONNECTIONS,OPCOUNTERS_CMD,SYSTEM_CPU_PERCENT

# List recent events
atlas events projects list --limit 20

# View alerts
atlas alerts list --status OPEN
```

## Logs

```bash
# Download cluster logs (use atlas processes list to find hostname)
atlas logs download <hostname> mongodb.gz \
  --out /tmp/mongod.log.gz \
  --decompress

# View recent log lines
gunzip -c /tmp/mongod.log.gz | tail -100
```

## Performance Advisor

```bash
# Get index recommendations (use atlas processes list to find hostname:port)
atlas performanceAdvisor suggestedIndexes list \
  --processName <hostname:port>

# Get slow queries
atlas performanceAdvisor slowQueryLogs list \
  --processName <hostname:port> \
  --since $(date -d "24 hours ago" +%s) \
  --duration 86400000
```

## Atlas CLI in CI/CD Pipelines

Automate deployment in a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to MongoDB Atlas

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Atlas CLI
        run: |
          curl -L https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_latest_linux_x86_64.tar.gz -o atlas.tar.gz
          tar -xvf atlas.tar.gz
          sudo mv mongodb-atlas-cli_*/bin/atlas /usr/local/bin/

      - name: Create snapshot before deployment
        env:
          MONGODB_ATLAS_PUBLIC_API_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          MONGODB_ATLAS_PRIVATE_API_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
          MONGODB_ATLAS_PROJECT_ID: ${{ secrets.ATLAS_PROJECT_ID }}
        run: |
          atlas backups snapshots create myCluster \
            --desc "Pre-deploy $(date -I)" \
            --retention 3
```

## Switching Between Projects

```bash
# List projects
atlas projects list

# Set default project
atlas config set project_id <projectId>

# Or use --projectId flag per command
atlas clusters list --projectId <projectId>
```

## Summary

The Atlas CLI provides full command-line access to Atlas operations including cluster lifecycle management, user and network configuration, backup operations, metrics monitoring, and log downloads. Authenticate using API keys for CI/CD pipelines, use environment variables for credentials in scripts, and integrate commands into GitHub Actions or other automation workflows to manage Atlas infrastructure as code.
