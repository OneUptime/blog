# How to Automate Tasks with Rundeck on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, DevOps, Rundeck

Description: Install and configure Rundeck on Ubuntu to create, schedule, and manage automation jobs across multiple servers with access control and audit logging.

---

Rundeck is an open-source runbook automation platform that lets you define jobs, run them on demand or on a schedule, target specific nodes, and track execution history. It fills the gap between ad-hoc scripts and a full-blown workflow engine, and it integrates well with existing shell scripts, Ansible playbooks, and Docker commands.

## Installing Rundeck on Ubuntu

Rundeck requires Java 11 or newer.

```bash
# Install Java
sudo apt update
sudo apt install openjdk-11-jdk -y
java -version

# Add the Rundeck repository
sudo apt install apt-transport-https gnupg -y
curl -fsSL https://packages.rundeck.com/pagerduty/rundeck/gpgkey | \
    sudo gpg --dearmor -o /usr/share/keyrings/rundeck.gpg

echo "deb [signed-by=/usr/share/keyrings/rundeck.gpg] \
    https://packages.rundeck.com/pagerduty/rundeck/any/ any main" | \
    sudo tee /etc/apt/sources.list.d/rundeck.list

sudo apt update
sudo apt install rundeck -y
```

## Starting and Configuring Rundeck

```bash
# Start and enable Rundeck
sudo systemctl start rundeckd
sudo systemctl enable rundeckd

# Check status
sudo systemctl status rundeckd

# Rundeck takes a minute to start. Watch the log
sudo tail -f /var/log/rundeck/service.log
# Wait for: Rundeck is ready
```

By default, Rundeck listens on port 4440. The main configuration file is `/etc/rundeck/rundeck-config.properties`.

```bash
sudo nano /etc/rundeck/rundeck-config.properties
```

Key settings:

```properties
# The URL Rundeck uses to generate links in notifications
grails.serverURL=http://your-server-ip:4440

# Database configuration (default uses H2 embedded DB)
# For production, switch to MySQL or PostgreSQL
dataSource.url=jdbc:h2:file:/var/lib/rundeck/data/rundeckdb;MVCC=true

# Increase job history retention
rundeck.execution.logs.fileStoragePlugin=
```

```bash
sudo systemctl restart rundeckd
```

## Accessing the Web Interface

Open a browser to `http://your-server-ip:4440`. Default credentials are `admin / admin`. Change the password immediately.

```bash
# Or change admin password via the config file
# Edit /etc/rundeck/realm.properties
sudo nano /etc/rundeck/realm.properties

# Change this line to update the admin password
# admin: MD5:YOUR_HASHED_PASSWORD,user,admin,architect,deploy,build
# Generate hash: echo -n 'newpassword' | md5sum
```

## Creating Your First Project

Projects in Rundeck are containers for jobs and node configurations.

```bash
# You can also manage Rundeck via the CLI (rd)
# Install the rd CLI
curl -s https://packagecloud.io/install/repositories/pagerduty/rundeck/script.deb.sh | sudo bash
sudo apt install rundeck-cli -y

# Configure CLI credentials
export RD_URL=http://localhost:4440
export RD_USER=admin
export RD_PASSWORD=admin

# Create a project
rd projects create --project myproject
```

## Defining Nodes

Nodes are the servers Rundeck can run jobs on. Define them in a resource file.

```bash
# Create a nodes directory for the project
sudo mkdir -p /var/rundeck/projects/myproject/etc

# Create a node inventory file
sudo nano /var/rundeck/projects/myproject/etc/resources.yaml
```

```yaml
# resources.yaml - node definitions
web01:
  nodename: web01
  hostname: 10.0.0.1
  username: rundeck
  description: Web Server 01
  tags: web,production
  osFamily: unix
  osName: Linux

web02:
  nodename: web02
  hostname: 10.0.0.2
  username: rundeck
  description: Web Server 02
  tags: web,production
  osFamily: unix
  osName: Linux

db01:
  nodename: db01
  hostname: 10.0.0.10
  username: rundeck
  description: Database Server
  tags: database,production
  osFamily: unix
  osName: Linux
```

Set up SSH key-based access so Rundeck can reach the nodes:

```bash
# Generate an SSH key for the rundeck user
sudo -u rundeck ssh-keygen -t rsa -b 4096 -f /var/lib/rundeck/.ssh/id_rsa -N ''

# Copy the public key to each node
cat /var/lib/rundeck/.ssh/id_rsa.pub
# Add this to ~/.ssh/authorized_keys on each target server

# Or use ssh-copy-id
sudo -u rundeck ssh-copy-id rundeck@10.0.0.1
```

## Creating a Job via YAML

Jobs can be defined as YAML files and imported.

```bash
sudo nano /tmp/deploy-job.yaml
```

```yaml
# deploy-job.yaml
- name: Deploy Application
  description: Pull latest code and restart the application service
  group: deployment
  project: myproject
  loglevel: INFO

  # Run on all nodes tagged 'web'
  nodefilters:
    filter: 'tags: web'
  nodesSelectedByDefault: true
  nodeKeepgoing: false

  # Job options (parameters)
  options:
    - name: version
      label: Version
      description: Application version to deploy
      required: true
      regex: '^[0-9]+\.[0-9]+\.[0-9]+$'

    - name: environment
      label: Environment
      values:
        - staging
        - production
      required: true
      default: staging

  sequence:
    keepgoing: false
    strategy: node-first
    commands:
      # Step 1: Pull the new version
      - script: |
          #!/bin/bash
          set -e
          cd /opt/myapp
          git fetch origin
          git checkout tags/v@option.version@
          echo "Checked out version @option.version@"

      # Step 2: Install dependencies
      - exec: "cd /opt/myapp && npm ci --production"

      # Step 3: Restart the service
      - exec: "sudo systemctl restart myapp"

      # Step 4: Health check
      - script: |
          #!/bin/bash
          # Wait for service to be healthy
          for i in $(seq 1 10); do
              if curl -sf http://localhost:8080/health; then
                  echo "Health check passed"
                  exit 0
              fi
              sleep 3
          done
          echo "Health check failed after 30 seconds"
          exit 1

  # Notifications
  notification:
    onfailure:
      email:
        recipients: ops@example.com
        subject: 'FAILED: Deploy @option.version@ to @option.environment@'
    onsuccess:
      email:
        recipients: ops@example.com
        subject: 'SUCCESS: Deployed @option.version@ to @option.environment@'
```

Import the job:

```bash
rd jobs load --project myproject --file /tmp/deploy-job.yaml --format yaml
```

## Scheduling Jobs

Add a schedule block to run a job on a cron schedule.

```yaml
# Add to your job definition
schedule:
  crontab: "0 0 2 * * ?"   # Run at 2 AM every day
  # Cron format: second minute hour day-of-month month day-of-week year
```

Or set it via the web UI under Job > Edit > Schedule.

## Running Jobs via the API

Rundeck has a full REST API for triggering jobs from CI/CD pipelines.

```bash
# Get the Job ID
JOB_ID=$(rd jobs list --project myproject --format json | \
    python3 -c "import sys,json; jobs=json.load(sys.stdin); \
    print(next(j['id'] for j in jobs if j['name']=='Deploy Application'))")

echo "Job ID: $JOB_ID"

# Run the job with options
rd run --job "$JOB_ID" \
    -p myproject \
    -- -version 1.2.3 -environment staging

# Or use the REST API directly
curl -X POST \
    -H "Accept: application/json" \
    -H "X-Rundeck-Auth-Token: YOUR_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"options": {"version": "1.2.3", "environment": "staging"}}' \
    http://localhost:4440/api/42/job/${JOB_ID}/run
```

Generate an API token in the Rundeck UI under User Settings > User API Tokens.

## Viewing Execution History and Logs

Rundeck stores complete execution logs for every job run.

```bash
# List recent executions for a project
rd executions list --project myproject --max 10

# View output of a specific execution
rd executions output --id 42

# Download execution log
rd executions output --id 42 > /tmp/execution-42.log
```

In the web UI, go to Activity to see a full execution history with real-time streaming logs for running jobs.

## Access Control

Rundeck uses YAML-based Access Control Policies (ACPs) to restrict what users and groups can do.

```yaml
# /etc/rundeck/admin.aclpolicy (example restrictive policy)
description: Developers can run jobs but not create or delete them
context:
  project: myproject
for:
  job:
    - allow: [run, read]
    - deny: [create, delete, update]
  execution:
    - allow: [read, view]
by:
  group: developers
```

Rundeck is particularly valuable for teams that want to give non-sysadmin team members safe, audited access to run specific operational tasks without granting full SSH access to production servers.
