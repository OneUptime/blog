# How to Use Azure DevOps REST API to Automate Pipeline Creation and Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, REST API, CI/CD, Pipeline Automation, DevOps, Azure Pipelines, Automation

Description: Learn how to use the Azure DevOps REST API to programmatically create, trigger, and manage build and release pipelines at scale.

---

If you have worked with Azure DevOps for any length of time, you know that clicking through the UI to create and configure pipelines gets old fast. When you have dozens of projects or need to set up standardized pipelines across teams, doing things manually is not just tedious - it becomes a real bottleneck. That is where the Azure DevOps REST API comes in.

The REST API lets you do everything the portal does, but programmatically. You can create pipelines, trigger builds, update configurations, and pull status reports - all from scripts or custom applications. In this post, I will walk through the practical side of using this API to automate pipeline creation and management.

## Understanding the Azure DevOps REST API Structure

The Azure DevOps REST API follows a consistent URL pattern. Most endpoints look like this:

```
https://dev.azure.com/{organization}/{project}/_apis/{area}/{resource}?api-version=7.1
```

The API is versioned, so you always need to specify the `api-version` parameter. As of this writing, version 7.1 is the latest stable release. The API covers almost every aspect of Azure DevOps, including work items, repos, pipelines, test plans, and artifacts.

For pipeline operations specifically, you will be working with two main API areas: the Build API (for YAML pipelines and classic build definitions) and the Release API (for classic release pipelines, hosted on `vsrm.dev.azure.com`).

## Setting Up Authentication

Before making any API calls, you need a Personal Access Token (PAT). Head to your Azure DevOps organization, click on User Settings, and generate a new token with the appropriate scopes. For pipeline management, you will need at least Build (Read & Execute) and Release (Read, Write, & Execute) permissions.

Here is how to set up authentication in a script. The API uses Basic authentication with the PAT as the password:

```bash
# Set your organization details and PAT
ORG="myorganization"
PROJECT="myproject"
PAT="your-personal-access-token"

# Create the base64 encoded auth header
# The username can be anything - only the PAT matters
AUTH=$(echo -n ":${PAT}" | base64)

# Test the connection by listing projects
curl -s -H "Authorization: Basic ${AUTH}" \
  "https://dev.azure.com/${ORG}/_apis/projects?api-version=7.1" | jq '.value[].name'
```

If you prefer working in Python, the `requests` library handles this nicely:

```python
import requests
import json

# Configuration for Azure DevOps API access
org = "myorganization"
project = "myproject"
pat = "your-personal-access-token"

# Azure DevOps uses Basic auth with empty username and PAT as password
auth = ("", pat)
base_url = f"https://dev.azure.com/{org}/{project}/_apis"

# Verify the connection by fetching project info
response = requests.get(
    f"{base_url}/build/definitions?api-version=7.1",
    auth=auth
)
print(f"Found {response.json()['count']} pipeline definitions")
```

## Creating a Pipeline via the REST API

Let's say you have a YAML pipeline file already committed to a repository and you want to create the pipeline definition through the API. Here is how you would do that:

```python
import requests
import json

# Auth setup (same as above)
org = "myorganization"
project = "myproject"
pat = "your-pat"
auth = ("", pat)
base_url = f"https://dev.azure.com/{org}/{project}/_apis"

# Define the pipeline configuration
# This maps a YAML file in a repo to a new pipeline definition
pipeline_body = {
    "name": "my-service-ci",
    "folder": "\\CI Pipelines",
    "configuration": {
        "type": "yaml",
        "path": "/pipelines/ci-build.yml",
        "repository": {
            "id": "your-repo-id",  # GUID of the Azure Repos Git repository
            "name": "my-service",
            "type": "azureReposGit"
        }
    }
}

# Create the pipeline
response = requests.post(
    f"{base_url}/pipelines?api-version=7.1",
    auth=auth,
    json=pipeline_body
)

if response.status_code == 200:
    pipeline = response.json()
    print(f"Created pipeline: {pipeline['name']} (ID: {pipeline['id']})")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

You will need the repository ID, which you can fetch from the API as well:

```python
# Fetch all repositories in the project to find the right ID
repos_response = requests.get(
    f"https://dev.azure.com/{org}/{project}/_apis/git/repositories?api-version=7.1",
    auth=auth
)

for repo in repos_response.json()["value"]:
    print(f"{repo['name']}: {repo['id']}")
```

## Triggering Pipeline Runs Programmatically

Once a pipeline exists, you can trigger runs through the API. This is especially useful when you need to kick off builds from external systems or as part of a larger automation workflow.

```python
# Trigger a pipeline run with optional parameters
run_body = {
    "resources": {
        "repositories": {
            "self": {
                "refName": "refs/heads/main"  # Branch to build
            }
        }
    },
    "templateParameters": {
        "environment": "staging",  # Custom parameter defined in YAML
        "runTests": "true"
    }
}

pipeline_id = 42  # The ID returned when you created the pipeline

response = requests.post(
    f"{base_url}/pipelines/{pipeline_id}/runs?api-version=7.1",
    auth=auth,
    json=run_body
)

run = response.json()
print(f"Pipeline run started: {run['id']} - State: {run['state']}")
```

## Monitoring Pipeline Runs and Getting Results

After triggering a run, you usually want to monitor its progress. Here is a polling approach that waits for completion:

```python
import time

def wait_for_pipeline_run(pipeline_id, run_id, timeout_minutes=30):
    """Poll the pipeline run status until it completes or times out."""
    start_time = time.time()
    timeout_seconds = timeout_minutes * 60

    while True:
        response = requests.get(
            f"{base_url}/pipelines/{pipeline_id}/runs/{run_id}?api-version=7.1",
            auth=auth
        )
        run = response.json()
        state = run["state"]
        result = run.get("result", "pending")

        print(f"Run {run_id}: state={state}, result={result}")

        if state == "completed":
            return run

        # Check for timeout
        elapsed = time.time() - start_time
        if elapsed > timeout_seconds:
            raise TimeoutError(f"Pipeline run did not complete within {timeout_minutes} minutes")

        time.sleep(30)  # Poll every 30 seconds to avoid rate limits
```

## Bulk Pipeline Creation for Standardized Projects

Here is where the automation really pays off. Suppose you have 20 microservices that all need the same CI pipeline setup. Instead of clicking through the UI 20 times, you can script the whole thing:

```python
# List of services that all follow the same repo and pipeline pattern
services = [
    "user-service",
    "order-service",
    "payment-service",
    "notification-service",
    "inventory-service",
]

created_pipelines = []

for service in services:
    # Look up the repository ID for this service
    repo_resp = requests.get(
        f"https://dev.azure.com/{org}/{project}/_apis/git/repositories/{service}?api-version=7.1",
        auth=auth
    )

    if repo_resp.status_code != 200:
        print(f"Repository {service} not found, skipping")
        continue

    repo_id = repo_resp.json()["id"]

    # Create the pipeline definition pointing to the shared YAML template
    pipeline_body = {
        "name": f"{service}-ci",
        "folder": "\\Microservices",
        "configuration": {
            "type": "yaml",
            "path": "/azure-pipelines.yml",
            "repository": {
                "id": repo_id,
                "name": service,
                "type": "azureReposGit"
            }
        }
    }

    resp = requests.post(
        f"{base_url}/pipelines?api-version=7.1",
        auth=auth,
        json=pipeline_body
    )

    if resp.status_code == 200:
        pipeline = resp.json()
        created_pipelines.append(pipeline)
        print(f"Created: {pipeline['name']} (ID: {pipeline['id']})")
    else:
        print(f"Failed to create pipeline for {service}: {resp.text}")

print(f"\nSuccessfully created {len(created_pipelines)} pipelines")
```

## Updating Pipeline Variables and Settings

You might also need to update pipeline variables after creation. The Build Definitions API handles this:

```python
# Fetch the current build definition
def_id = 42
response = requests.get(
    f"{base_url}/build/definitions/{def_id}?api-version=7.1",
    auth=auth
)
definition = response.json()

# Add or update variables on the definition
definition["variables"] = {
    "DOCKER_REGISTRY": {"value": "myregistry.azurecr.io", "isSecret": False},
    "IMAGE_TAG": {"value": "$(Build.BuildId)", "isSecret": False},
    "REGISTRY_PASSWORD": {"value": None, "isSecret": True}  # Secret variables
}

# Push the updated definition back
update_resp = requests.put(
    f"{base_url}/build/definitions/{def_id}?api-version=7.1",
    auth=auth,
    json=definition
)

print(f"Updated definition: {update_resp.status_code}")
```

## Handling Rate Limits and Errors

The Azure DevOps API has rate limits, and if you are doing bulk operations, you will run into them. A simple retry mechanism helps:

```python
import time

def api_request(method, url, retries=3, **kwargs):
    """Make an API request with automatic retry on rate limiting."""
    for attempt in range(retries):
        response = requests.request(method, url, auth=auth, **kwargs)

        if response.status_code == 429:
            # Rate limited - wait and retry
            retry_after = int(response.headers.get("Retry-After", 30))
            print(f"Rate limited, waiting {retry_after}s (attempt {attempt + 1})")
            time.sleep(retry_after)
            continue

        return response

    raise Exception(f"Failed after {retries} retries: {url}")
```

## Wrapping Up

The Azure DevOps REST API is a powerful tool for anyone managing pipelines at scale. Whether you need to create pipelines in bulk, trigger builds from external systems, or build custom dashboards that pull pipeline status, the API gives you full control without touching the portal.

Start with small automations - maybe a script that triggers your nightly builds or one that reports on failed pipelines. Once you get comfortable with the API patterns, you can build more sophisticated workflows that tie together pipeline creation, configuration, execution, and monitoring into a single automated process.

The key thing to remember is to always pin your `api-version`, handle rate limits gracefully, and store your PAT securely (use environment variables or a secrets manager, never hardcode it in your scripts). With those basics covered, you can automate just about anything in Azure DevOps.
