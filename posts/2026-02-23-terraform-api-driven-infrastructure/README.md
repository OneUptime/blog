# How to Use Terraform with API-Driven Infrastructure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, API, Infrastructure as Code, DevOps, Automation, REST

Description: Learn how to use Terraform Cloud and Enterprise APIs to build API-driven infrastructure workflows that provision and manage resources programmatically.

---

API-driven infrastructure takes Terraform beyond the command line. Instead of running `terraform plan` and `terraform apply` manually, external systems interact with Terraform through APIs to provision, modify, and destroy infrastructure programmatically. This approach powers self-service portals, CI/CD pipelines, and automated workflows that treat Terraform as a backend service rather than a CLI tool.

In this guide, we will explore how to use the Terraform Cloud API, the Terraform CLI in API mode, and custom API layers to build fully API-driven infrastructure workflows.

## Understanding the API-Driven Workflow

In a traditional workflow, a human runs Terraform commands. In an API-driven workflow, software makes HTTP requests to trigger the same operations. The Terraform Cloud API is the most common interface for this pattern, but you can also wrap the Terraform CLI in a custom API layer.

The typical flow looks like this: an application sends a POST request to create a workspace, sets variables through the API, triggers a run, monitors the run status, and reads the outputs when the run completes.

## Core Terraform Cloud API Operations

The Terraform Cloud API is comprehensive and well-documented. Here are the essential operations for API-driven infrastructure.

```bash
# Set up API authentication
export TFC_TOKEN="your-terraform-cloud-token"
export TFC_ORG="your-organization"
export TFC_API="https://app.terraform.io/api/v2"
```

### Creating Workspaces via API

```bash
# Create a new workspace
curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "name": "api-created-workspace",
        "auto-apply": false,
        "terraform-version": "1.7.0",
        "working-directory": "",
        "description": "Created via API for automated provisioning"
      }
    }
  }' \
  "$TFC_API/organizations/$TFC_ORG/workspaces"
```

### Setting Variables

```bash
# Set a Terraform variable on a workspace
WORKSPACE_ID="ws-abc123"

curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "instance_type",
        "value": "t3.medium",
        "category": "terraform",
        "hcl": false,
        "sensitive": false,
        "description": "EC2 instance type for the web server"
      }
    }
  }' \
  "$TFC_API/workspaces/$WORKSPACE_ID/vars"
```

### Triggering Runs

```bash
# Create and trigger a run
curl -s \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "attributes": {
        "message": "Triggered via API",
        "auto-apply": true
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "'"$WORKSPACE_ID"'"
          }
        }
      },
      "type": "runs"
    }
  }' \
  "$TFC_API/runs"
```

## Building a Python Client for Terraform Cloud

A structured client library makes API-driven Terraform workflows cleaner and more maintainable.

```python
# terraform_client.py - Python client for Terraform Cloud API

import requests
import time
import json
from typing import Dict, Optional, List

class TerraformCloudClient:
    """Client for the Terraform Cloud API."""

    def __init__(self, token: str, organization: str, base_url: str = "https://app.terraform.io/api/v2"):
        self.base_url = base_url
        self.organization = organization
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/vnd.api+json"
        }

    def create_workspace(self, name: str, vcs_repo: Optional[Dict] = None,
                         auto_apply: bool = False, terraform_version: str = "1.7.0") -> str:
        """Create a new workspace and return its ID."""
        attributes = {
            "name": name,
            "auto-apply": auto_apply,
            "terraform-version": terraform_version
        }

        if vcs_repo:
            attributes["vcs-repo"] = vcs_repo

        data = {
            "data": {
                "type": "workspaces",
                "attributes": attributes
            }
        }

        response = requests.post(
            f"{self.base_url}/organizations/{self.organization}/workspaces",
            json=data, headers=self.headers
        )
        response.raise_for_status()
        return response.json()["data"]["id"]

    def set_variable(self, workspace_id: str, key: str, value: str,
                     sensitive: bool = False, category: str = "terraform") -> str:
        """Set a variable on a workspace."""
        data = {
            "data": {
                "type": "vars",
                "attributes": {
                    "key": key,
                    "value": value,
                    "category": category,
                    "sensitive": sensitive,
                    "hcl": False
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/workspaces/{workspace_id}/vars",
            json=data, headers=self.headers
        )
        response.raise_for_status()
        return response.json()["data"]["id"]

    def trigger_run(self, workspace_id: str, message: str = "API-triggered run",
                    auto_apply: bool = False) -> str:
        """Trigger a new Terraform run and return the run ID."""
        data = {
            "data": {
                "type": "runs",
                "attributes": {
                    "message": message,
                    "auto-apply": auto_apply
                },
                "relationships": {
                    "workspace": {
                        "data": {"type": "workspaces", "id": workspace_id}
                    }
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/runs",
            json=data, headers=self.headers
        )
        response.raise_for_status()
        return response.json()["data"]["id"]

    def wait_for_run(self, run_id: str, timeout: int = 600) -> Dict:
        """Wait for a run to complete and return its final status."""
        terminal_states = [
            "applied", "planned_and_finished", "errored",
            "discarded", "canceled", "force_canceled"
        ]

        start_time = time.time()
        while time.time() - start_time < timeout:
            response = requests.get(
                f"{self.base_url}/runs/{run_id}",
                headers=self.headers
            )
            response.raise_for_status()
            run_data = response.json()["data"]
            status = run_data["attributes"]["status"]

            if status in terminal_states:
                return {
                    "status": status,
                    "run_id": run_id,
                    "has_changes": run_data["attributes"].get("has-changes", False)
                }

            time.sleep(10)

        raise TimeoutError(f"Run {run_id} did not complete within {timeout} seconds")

    def get_outputs(self, workspace_id: str) -> Dict:
        """Get the current state outputs for a workspace."""
        # First get the current state version
        response = requests.get(
            f"{self.base_url}/workspaces/{workspace_id}/current-state-version",
            headers=self.headers
        )
        response.raise_for_status()

        state_version_id = response.json()["data"]["id"]

        # Then get the outputs
        response = requests.get(
            f"{self.base_url}/state-versions/{state_version_id}/outputs",
            headers=self.headers
        )
        response.raise_for_status()

        outputs = {}
        for output in response.json()["data"]:
            name = output["attributes"]["name"]
            value = output["attributes"]["value"]
            outputs[name] = value

        return outputs

    def destroy_workspace(self, workspace_id: str) -> str:
        """Trigger a destroy run on a workspace."""
        data = {
            "data": {
                "type": "runs",
                "attributes": {
                    "message": "Destroy triggered via API",
                    "is-destroy": True,
                    "auto-apply": True
                },
                "relationships": {
                    "workspace": {
                        "data": {"type": "workspaces", "id": workspace_id}
                    }
                }
            }
        }

        response = requests.post(
            f"{self.base_url}/runs",
            json=data, headers=self.headers
        )
        response.raise_for_status()
        return response.json()["data"]["id"]
```

## Using the Client for End-to-End Provisioning

```python
# provision_service.py - Complete API-driven provisioning workflow

from terraform_client import TerraformCloudClient

def provision_web_service(service_name, environment, size="small"):
    """Provision a complete web service through the API."""
    client = TerraformCloudClient(
        token="your-tfc-token",
        organization="your-org"
    )

    # Step 1: Create a workspace
    workspace_name = f"{service_name}-{environment}"
    workspace_id = client.create_workspace(
        name=workspace_name,
        vcs_repo={
            "identifier": "company/infrastructure-modules",
            "branch": "main",
            "oauth-token-id": "ot-abc123"
        },
        auto_apply=(environment != "production")
    )
    print(f"Created workspace: {workspace_name} ({workspace_id})")

    # Step 2: Set variables
    variables = {
        "service_name": service_name,
        "environment": environment,
        "size": size,
        "enable_monitoring": "true",
        "enable_logging": "true"
    }

    for key, value in variables.items():
        client.set_variable(workspace_id, key, value)

    # Set sensitive variables
    client.set_variable(workspace_id, "database_password", "generated-secret", sensitive=True)

    # Step 3: Trigger a run
    run_id = client.trigger_run(
        workspace_id,
        message=f"Provisioning {service_name} for {environment}",
        auto_apply=(environment != "production")
    )
    print(f"Triggered run: {run_id}")

    # Step 4: Wait for completion
    result = client.wait_for_run(run_id, timeout=900)
    print(f"Run completed with status: {result['status']}")

    if result["status"] == "applied":
        # Step 5: Get outputs
        outputs = client.get_outputs(workspace_id)
        print(f"Service URL: {outputs.get('service_url')}")
        print(f"Dashboard: {outputs.get('dashboard_url')}")
        return outputs

    return None

# Usage
outputs = provision_web_service("user-api", "staging", "medium")
```

## Building a Custom API Layer

If you do not use Terraform Cloud, you can build a custom API that wraps the Terraform CLI.

```python
# api_server.py - Custom API server that wraps Terraform CLI

from flask import Flask, request, jsonify
import subprocess
import json
import os
import threading
import uuid

app = Flask(__name__)

# In-memory job tracking (use Redis or a database in production)
jobs = {}

@app.route("/api/v1/workspaces/<workspace>/plan", methods=["POST"])
def create_plan(workspace):
    """Create a Terraform plan for a workspace."""
    job_id = str(uuid.uuid4())
    variables = request.json.get("variables", {})

    jobs[job_id] = {"status": "running", "workspace": workspace}

    threading.Thread(
        target=run_plan,
        args=(job_id, workspace, variables)
    ).start()

    return jsonify({"job_id": job_id, "status": "running"})

def run_plan(job_id, workspace, variables):
    """Execute terraform plan in a workspace directory."""
    workspace_dir = f"/opt/terraform/workspaces/{workspace}"

    # Build variable arguments
    var_args = []
    for key, value in variables.items():
        var_args.extend(["-var", f"{key}={value}"])

    result = subprocess.run(
        ["terraform", "plan", "-json", "-out=tfplan"] + var_args,
        capture_output=True, text=True,
        cwd=workspace_dir
    )

    jobs[job_id] = {
        "status": "completed" if result.returncode == 0 else "failed",
        "workspace": workspace,
        "output": result.stdout,
        "errors": result.stderr
    }

@app.route("/api/v1/workspaces/<workspace>/apply", methods=["POST"])
def create_apply(workspace):
    """Apply a Terraform plan for a workspace."""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "running", "workspace": workspace}

    threading.Thread(
        target=run_apply,
        args=(job_id, workspace)
    ).start()

    return jsonify({"job_id": job_id, "status": "running"})

@app.route("/api/v1/jobs/<job_id>", methods=["GET"])
def get_job(job_id):
    """Get the status of a job."""
    if job_id not in jobs:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(jobs[job_id])
```

## Best Practices

Always use workspace-level isolation. Each API-provisioned service should get its own workspace. This prevents one service's Terraform run from affecting another.

Implement proper authentication. Terraform Cloud API tokens should be scoped to the minimum permissions needed. Use team tokens for automated systems rather than user tokens.

Handle long-running operations asynchronously. Terraform runs can take minutes or longer. Return a job ID immediately and let clients poll for completion.

Store run history. Keep records of every API-triggered run, including who triggered it, what variables were set, and the result. This provides the audit trail that compliance teams need.

Set up state locking. When using the CLI-based approach, ensure state locking prevents concurrent modifications to the same workspace.

For more on Terraform backend configuration, see our guide on [Terraform Backend Setup](https://oneuptime.com/blog/post/2025-12-18-terraform-backend-setup/view).

## Conclusion

API-driven infrastructure transforms Terraform from a CLI tool into a programmable backend that any system can interact with. Whether you use the Terraform Cloud API, build a custom wrapper, or combine both approaches, the key is abstracting Terraform operations behind a clean API that external systems can consume. This pattern enables self-service portals, automated scaling systems, and event-driven workflows that provision infrastructure without human intervention.
