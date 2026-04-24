# How to Create a Custom Deployment Tool Using the Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Deployment, CI/CD, Automation

Description: Build a custom command-line deployment tool that uses the Portainer API to deploy and update container stacks across multiple environments.

## Introduction

Teams often need deployment tools tailored to their workflows. By wrapping the Portainer API in a custom CLI tool, you can standardize deployments, enforce policies, and integrate with existing CI/CD pipelines without exposing Portainer credentials directly to developers.

## Prerequisites

- Portainer CE or BE
- Python 3.8+
- `requests` library
- API access token

## Project Structure

```text
portainer-deploy/
├── deploy.py        # Main CLI tool
├── config.yaml      # Configuration file
├── requirements.txt
└── stacks/
    ├── app.yml
    └── database.yml
```

## Setting Up Dependencies

```bash
# Create project directory

mkdir portainer-deploy && cd portainer-deploy

# Create requirements.txt
cat > requirements.txt << 'EOF'
requests==2.31.0
click==8.1.7
pyyaml==6.0.1
rich==13.7.0
EOF

# Install dependencies
pip install -r requirements.txt
```

## Configuration File

```yaml
# config.yaml
portainer:
  url: https://portainer.example.com
  api_key: your-api-key-here  # Or set PORTAINER_API_KEY in the environment

environments:
  development:
    endpoint_id: 1
    tag: dev
  staging:
    endpoint_id: 2
    tag: staging
  production:
    endpoint_id: 3
    tag: latest
```

## Building the Deployment Tool

```python
#!/usr/bin/env python3
# deploy.py

import click
import yaml
import requests
import json
import os
import sys
from rich.console import Console
from rich.table import Table
from rich.progress import Progress

console = Console()

def load_config(config_file='config.yaml'):
    """Load configuration from YAML file."""
    with open(config_file) as f:
        return yaml.safe_load(f)

class PortainerClient:
    def __init__(self, url, api_key):
        self.url = url.rstrip('/')
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }

    def get_stacks(self, endpoint_id):
        """List all stacks for an endpoint."""
        resp = requests.get(
            f"{self.url}/api/stacks",
            headers=self.headers,
            params={
                "filters": json.dumps({"EndpointID": str(endpoint_id)})
            }
        )
        resp.raise_for_status()
        return resp.json()

    def get_stack_by_name(self, name, endpoint_id):
        """Find a stack by name."""
        stacks = self.get_stacks(endpoint_id)
        for stack in stacks:
            if stack['Name'] == name:
                return stack
        return None

    def deploy_stack(self, name, compose_content, endpoint_id, env_vars=None):
        """Deploy a new stack."""
        payload = {
            "Name": name,
            "StackFileContent": compose_content,
            "Env": env_vars or []
        }
        resp = requests.post(
            f"{self.url}/api/stacks/create/standalone/string?endpointId={endpoint_id}",
            headers=self.headers,
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def update_stack(self, stack_id, compose_content, endpoint_id, env_vars=None):
        """Update an existing stack."""
        payload = {
            "StackFileContent": compose_content,
            "Env": env_vars or []
        }
        resp = requests.put(
            f"{self.url}/api/stacks/{stack_id}?endpointId={endpoint_id}",
            headers=self.headers,
            json=payload
        )
        resp.raise_for_status()
        return resp.json()

    def delete_stack(self, stack_id, endpoint_id):
        """Delete a stack."""
        resp = requests.delete(
            f"{self.url}/api/stacks/{stack_id}?endpointId={endpoint_id}",
            headers=self.headers
        )
        resp.raise_for_status()
        return True


@click.group()
@click.option('--config', default='config.yaml', help='Config file path')
@click.pass_context
def cli(ctx, config):
    """Portainer Deployment Tool"""
    ctx.ensure_object(dict)
    ctx.obj['config'] = load_config(config)
    cfg = ctx.obj['config']
    api_key = os.environ.get('PORTAINER_API_KEY') or cfg['portainer'].get('api_key')
    if not api_key:
        raise click.ClickException(
            "Set portainer.api_key in config.yaml or PORTAINER_API_KEY in the environment"
        )
    ctx.obj['client'] = PortainerClient(
        cfg['portainer']['url'],
        api_key
    )


@cli.command()
@click.argument('environment')
@click.pass_context
def list_stacks(ctx, environment):
    """List all stacks in an environment."""
    config = ctx.obj['config']
    client = ctx.obj['client']

    if environment not in config['environments']:
        console.print(f"[red]Unknown environment: {environment}[/red]")
        sys.exit(1)

    endpoint_id = config['environments'][environment]['endpoint_id']
    stacks = client.get_stacks(endpoint_id)

    table = Table(title=f"Stacks in {environment}")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="green")
    table.add_column("Status", style="yellow")

    for stack in stacks:
        if stack.get('Status') == 1:
            status = "Active"
        elif stack.get('Status') == 2:
            status = "Inactive"
        else:
            status = "Unknown"
        table.add_row(str(stack['Id']), stack['Name'], status)

    console.print(table)


@cli.command()
@click.argument('stack_name')
@click.argument('environment')
@click.option('--file', required=True, help='Compose file path')
@click.option('--var', multiple=True, help='Environment variables (KEY=VALUE)')
@click.pass_context
def deploy(ctx, stack_name, environment, file, var):
    """Deploy or update a stack."""
    config = ctx.obj['config']
    client = ctx.obj['client']

    if environment not in config['environments']:
        console.print(f"[red]Unknown environment: {environment}[/red]")
        sys.exit(1)

    endpoint_id = config['environments'][environment]['endpoint_id']

    # Read compose file
    with open(file) as f:
        compose_content = f.read()

    # Parse env vars
    env_vars = []
    for v in var:
        key, value = v.split('=', 1)
        env_vars.append({"name": key, "value": value})

    # Check if stack exists
    existing = client.get_stack_by_name(stack_name, endpoint_id)

    with Progress() as progress:
        task = progress.add_task(f"Deploying {stack_name}...", total=None)

        if existing:
            result = client.update_stack(existing['Id'], compose_content, endpoint_id, env_vars)
            console.print(f"[green]Stack '{stack_name}' updated in {environment}[/green]")
        else:
            result = client.deploy_stack(stack_name, compose_content, endpoint_id, env_vars)
            console.print(f"[green]Stack '{stack_name}' deployed to {environment}[/green]")

        progress.update(task, completed=True)


if __name__ == '__main__':
    cli()
```

## Usage Examples

```bash
# List stacks in production
python deploy.py list-stacks production

# Deploy a new stack
python deploy.py deploy my-app production \
  --file stacks/app.yml \
  --var APP_VERSION=1.2.3 \
  --var DB_PASSWORD=secret

# Update an existing stack with a new image tag
python deploy.py deploy my-app staging \
  --file stacks/app.yml \
  --var APP_VERSION=1.3.0-rc1
```

## Integrating with CI/CD

```yaml
# GitHub Actions workflow
- name: Deploy to Production
  run: |
    python deploy.py deploy ${{ env.APP_NAME }} production \
      --file stacks/app.yml \
      --var APP_VERSION=${{ github.sha }}
  env:
    PORTAINER_API_KEY: ${{ secrets.PORTAINER_API_KEY }}
```

## Conclusion

A custom deployment tool wrapping the Portainer API gives you full control over your deployment workflow. You can extend this foundation with approval workflows, rollback capabilities, deployment notifications, and multi-environment promotion pipelines. This approach keeps Portainer as the deployment engine while providing a developer-friendly interface tailored to your team.
