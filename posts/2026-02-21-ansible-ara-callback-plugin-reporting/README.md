# How to Use the Ansible ara Callback Plugin for Reporting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ARA, Callback Plugins, Reporting, Dashboard

Description: Set up the ARA callback plugin to record and browse Ansible playbook results through a web interface with searchable history and detailed reports.

---

ARA (Ansible Run Analysis) is an open-source project that records Ansible playbook runs and provides a web interface to browse the results. The ARA callback plugin captures every detail of your playbook executions: tasks, results, host facts, files, and timing data. You get a searchable, browsable history of every Ansible run instead of scrolling through terminal output or log files.

## What ARA Gives You

ARA provides:

- A web dashboard showing all playbook runs with status and duration
- Drill-down into individual runs, plays, tasks, and host results
- Search by playbook name, host, status, or date range
- Task timing data and failure details
- Recording of files used during the run (templates, variables)
- REST API for programmatic access

## Installing ARA

ARA can run as a simple SQLite-based recorder or a full server with a web UI:

```bash
# Install ARA with its API server
pip install "ara[server]"

# For just the callback (no web UI), install the base package
pip install ara
```

## Quick Start: SQLite Mode

The simplest setup uses SQLite and lets you browse results with a built-in server:

```bash
# Install ARA
pip install "ara[server]"

# Configure Ansible to use the ARA callback
export ANSIBLE_CALLBACK_PLUGINS=$(python3 -m ara.setup.callback_plugins)

# Run a playbook - results are automatically recorded
ansible-playbook site.yml

# Start the ARA web server to browse results
ara-manage runserver
# Open http://localhost:8000 in your browser
```

## Configuring ARA in ansible.cfg

For a permanent setup:

```ini
# ansible.cfg - Enable ARA callback
[defaults]
# The callback plugin path from ARA
callback_plugins = /path/to/ara/plugins/callback

# Or let ARA tell you the path
# Run: python3 -m ara.setup.callback_plugins

[ara]
# API client type: offline (SQLite) or http (ARA server)
api_client = offline

# Database location for offline mode
api_server = http://localhost:8000
database = /var/lib/ara/ansible.sqlite
```

Get the correct callback path:

```bash
# Find ARA callback path
python3 -m ara.setup.callback_plugins
# Output: /usr/lib/python3/dist-packages/ara/plugins/callback

# Find ARA action plugins path (also needed)
python3 -m ara.setup.action_plugins
```

## ARA Server Mode

For teams, run ARA as a persistent server that multiple users can access:

```bash
# Initialize the ARA database
ara-manage migrate

# Create a superuser for the web interface
ara-manage createsuperuser

# Run the server (for production, use gunicorn behind nginx)
ara-manage runserver 0.0.0.0:8000
```

Configure Ansible to send data to the server:

```ini
# ansible.cfg - Point to ARA server
[ara]
api_client = http
api_server = http://ara.example.com:8000
```

## Production ARA Server Setup

For production, run ARA with gunicorn and nginx:

```bash
# Install gunicorn
pip install gunicorn

# Run ARA with gunicorn
gunicorn --workers 4 --bind 0.0.0.0:8000 ara.server.wsgi
```

Nginx configuration:

```nginx
# /etc/nginx/sites-available/ara
server {
    listen 80;
    server_name ara.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /static/ {
        alias /var/lib/ara/static/;
    }
}
```

Collect static files:

```bash
ara-manage collectstatic
```

## Docker-Based ARA Server

The easiest production setup uses Docker:

```yaml
# docker-compose.yml - ARA server with PostgreSQL
version: '3'
services:
  ara-api:
    image: quay.io/recordsansible/ara-api:latest
    environment:
      - ARA_DATABASE_ENGINE=django.db.backends.postgresql
      - ARA_DATABASE_NAME=ara
      - ARA_DATABASE_USER=ara
      - ARA_DATABASE_PASSWORD=secret
      - ARA_DATABASE_HOST=postgres
      - ARA_DATABASE_PORT=5432
      - ARA_ALLOWED_HOSTS=["*"]
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=ara
      - POSTGRES_USER=ara
      - POSTGRES_PASSWORD=secret
    volumes:
      - ara_data:/var/lib/postgresql/data

volumes:
  ara_data:
```

```bash
# Start ARA server
docker compose up -d

# Run migrations
docker compose exec ara-api ara-manage migrate
```

## Browsing Results

The ARA web interface provides several views:

**Playbook list**: Shows all recorded playbook runs with status, duration, host count, and task count. Click any run to drill in.

**Playbook detail**: Shows plays, tasks, and results for a specific run. Color-coded by status (green for ok, yellow for changed, red for failed).

**Task detail**: Shows per-host results for a specific task, including the return data.

**Host detail**: Shows all task results for a specific host across a playbook run.

## Using the ARA CLI

ARA includes a CLI for querying results without the web interface:

```bash
# List recent playbook runs
ara playbook list

# Show details of a specific run
ara playbook show 1

# List tasks from a specific playbook run
ara task list --playbook 1

# List results with errors
ara result list --status failed

# Get result details
ara result show 42
```

The CLI output can be formatted as table, JSON, YAML, or CSV:

```bash
# Get playbook list as JSON
ara playbook list -f json

# Export failed results as CSV
ara result list --status failed -f csv > failures.csv
```

## ARA REST API

ARA exposes a REST API for integration:

```bash
# List playbooks via API
curl http://ara.example.com:8000/api/v1/playbooks

# Get specific playbook details
curl http://ara.example.com:8000/api/v1/playbooks/1

# List failed results
curl "http://ara.example.com:8000/api/v1/results?status=failed"

# Search playbooks by name
curl "http://ara.example.com:8000/api/v1/playbooks?name=deploy"
```

## Integrating ARA with CI/CD

In CI/CD pipelines, configure ARA to send results to a central server:

```yaml
# .gitlab-ci.yml - ARA integration
deploy:
  stage: deploy
  variables:
    ARA_API_CLIENT: http
    ARA_API_SERVER: http://ara.example.com:8000
    ANSIBLE_CALLBACK_PLUGINS: /usr/lib/python3/dist-packages/ara/plugins/callback
  script:
    - ansible-playbook -i inventory/production deploy.yml
    # Print the ARA URL for this run
    - echo "Results at http://ara.example.com:8000"
```

## ARA Labels for Organization

Tag your playbook runs with labels for better organization:

```bash
# Set labels via environment
export ARA_DEFAULT_LABELS="environment:production,team:platform"
ansible-playbook deploy.yml
```

Or in ansible.cfg:

```ini
[ara]
default_labels = environment:production,team:platform
```

Labels appear in the ARA interface and can be used for filtering.

## Data Retention

Configure data retention to prevent the database from growing indefinitely:

```bash
# Delete playbook data older than 90 days
ara playbook prune --days 90 --confirm

# Set up as a cron job
# /etc/cron.daily/ara-prune
#!/bin/bash
ara playbook prune --days 90 --confirm
```

ARA transforms Ansible from "run and forget" into "run and review." Having a searchable, browsable history of every playbook run is invaluable for troubleshooting, auditing, and understanding what changed on your infrastructure. If you run Ansible regularly, ARA should be part of your toolkit.
