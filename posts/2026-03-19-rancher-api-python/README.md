# How to Use Rancher API with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Python, Automation

Description: Complete guide to interacting with the Rancher API using Python, including authentication, CRUD operations, error handling, and building reusable client libraries.

Python is an excellent choice for building Rancher automation tools and integrations. Its rich ecosystem of HTTP libraries and data processing tools makes it easy to interact with the Rancher API. This guide covers everything from basic requests to building a reusable client class for Rancher's previous `/v3` API.

Rancher v2.8.0 introduced the Rancher Kubernetes API (RK-API), but the previous `/v3` API is still available and is what the examples below use.

## Prerequisites

Install the required packages:

```bash
pip install requests urllib3
```

## Basic API Calls with Requests

### Setting Up Authentication

```python
import requests
import json
import urllib3

# Disable SSL warnings only when you intentionally skip verification

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

RANCHER_URL = "https://rancher.example.com"
RANCHER_TOKEN = "token-xxxxx:yyyyyyyyyyyyyyyy"

headers = {
    "Authorization": f"Bearer {RANCHER_TOKEN}",
    "Content-Type": "application/json"
}
```

### Listing Clusters

```python
response = requests.get(
    f"{RANCHER_URL}/v3/clusters",
    headers=headers,
    verify=False
)
response.raise_for_status()

clusters = response.json()["data"]
for cluster in clusters:
    print(f"{cluster['name']} - {cluster['state']} ({cluster['id']})")
```

### Getting a Specific Cluster

```python
cluster_id = "c-m-abc12345"
response = requests.get(
    f"{RANCHER_URL}/v3/clusters/{cluster_id}",
    headers=headers,
    verify=False
)
response.raise_for_status()

cluster = response.json()
print(f"Name: {cluster['name']}")
print(f"State: {cluster['state']}")
print(f"Kubernetes: {cluster['version']['gitVersion']}")
print(f"Nodes: {cluster['nodeCount']}")
```

## Building a Rancher API Client Class

A reusable client class makes your code cleaner:

```python
import requests
import urllib3
from typing import Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class RancherClient:
    def __init__(self, url: str, token: str, verify_ssl: bool = True):
        self.url = url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        })
        self.session.verify = verify_ssl

    def _request(self, method: str, endpoint: str, **kwargs):
        url = endpoint if endpoint.startswith(("http://", "https://")) else f"{self.url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        if response.content:
            return response.json()
        return None

    def get(self, endpoint: str, params: Optional[dict] = None):
        return self._request("GET", endpoint, params=params)

    def post(self, endpoint: str, data: dict):
        return self._request("POST", endpoint, json=data)

    def put(self, endpoint: str, data: dict):
        return self._request("PUT", endpoint, json=data)

    def delete(self, endpoint: str):
        return self._request("DELETE", endpoint)

    # Cluster operations
    def list_clusters(self, **filters):
        return self.get("/v3/clusters", params=filters)["data"]

    def get_cluster(self, cluster_id: str):
        return self.get(f"/v3/clusters/{cluster_id}")

    def get_cluster_nodes(self, cluster_id: str):
        return self.get(f"/v3/nodes", params={"clusterId": cluster_id})["data"]

    def generate_kubeconfig(self, cluster_id: str) -> str:
        cluster = self.get(f"/v3/clusters/{cluster_id}")
        result = self._request(
            "POST", cluster["actions"]["generateKubeconfig"], json={}
        )
        return result["config"]

    # User operations
    def list_users(self, **filters):
        return self.get("/v3/users", params=filters)["data"]

    def create_user(self, username: str, name: str, password: str,
                    must_change: bool = True):
        return self.post("/v3/users", {
            "username": username,
            "name": name,
            "password": password,
            "mustChangePassword": must_change,
            "enabled": True
        })

    def delete_user(self, user_id: str):
        return self.delete(f"/v3/users/{user_id}")

    # Project operations
    def list_projects(self, cluster_id: Optional[str] = None):
        params = {}
        if cluster_id:
            params["clusterId"] = cluster_id
        return self.get("/v3/projects", params=params)["data"]

    def create_project(self, name: str, cluster_id: str,
                       description: str = ""):
        return self.post("/v3/projects", {
            "name": name,
            "clusterId": cluster_id,
            "description": description
        })

    # Pagination helper
    def list_all(self, endpoint: str, page_size: int = 100):
        all_items = []
        url = f"{self.url}{endpoint}?limit={page_size}"
        while url:
            response = self.session.get(url)
            response.raise_for_status()
            data = response.json()
            all_items.extend(data.get("data", []))
            url = data.get("pagination", {}).get("next")
        return all_items
```

### Using the Client

```python
client = RancherClient(
    url="https://rancher.example.com",
    token="token-xxxxx:yyyyyyyyyyyyyyyy"
)

# List all active clusters
clusters = client.list_clusters(state="active")
for c in clusters:
    print(f"{c['name']}: {c['nodeCount']} nodes")

# Get kubeconfig
config = client.generate_kubeconfig("c-m-abc12345")
with open("kubeconfig.yaml", "w") as f:
    f.write(config)

# Create a user
user = client.create_user("alice", "Alice Smith", "TempPass123!")
print(f"Created user: {user['id']}")
```

## Error Handling

### Handling HTTP Errors

```python
from requests.exceptions import HTTPError, ConnectionError, Timeout

def safe_api_call(client, operation, *args, **kwargs):
    try:
        return operation(*args, **kwargs)
    except HTTPError as e:
        status = e.response.status_code
        try:
            message = e.response.json().get("message", str(e))
        except ValueError:
            message = str(e)

        if status == 401:
            print("Authentication failed. Check your API token.")
        elif status == 403:
            print(f"Permission denied: {message}")
        elif status == 404:
            print(f"Resource not found: {message}")
        elif status == 409:
            print(f"Conflict: {message}")
        elif status == 422:
            print(f"Validation error: {message}")
        else:
            print(f"API error {status}: {message}")
        return None
    except ConnectionError:
        print(f"Cannot connect to {client.url}")
        return None
    except Timeout:
        print("Request timed out")
        return None

# Usage
clusters = safe_api_call(client, client.list_clusters)
if clusters:
    for c in clusters:
        print(c["name"])
```

### Retry Logic

```python
import time
from requests.exceptions import HTTPError

def retry_api_call(func, max_retries=3, backoff=2):
    for attempt in range(max_retries):
        try:
            return func()
        except HTTPError as e:
            if e.response.status_code == 429:
                wait = backoff ** attempt
                print(f"Rate limited. Retrying in {wait}s...")
                time.sleep(wait)
            elif e.response.status_code >= 500:
                wait = backoff ** attempt
                print(f"Server error. Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise
    raise Exception("Max retries exceeded")

# Usage
clusters = retry_api_call(lambda: client.list_clusters())
```

## Practical Automation Scripts

### Cluster Health Report

```python
def cluster_health_report(client):
    clusters = client.list_clusters()

    print("Cluster Health Report")
    print("=" * 60)

    for cluster in clusters:
        name = cluster["name"]
        state = cluster["state"]
        nodes = client.get_cluster_nodes(cluster["id"])

        healthy_nodes = sum(1 for n in nodes if n["state"] == "active")
        total_nodes = len(nodes)

        status = "OK" if state == "active" and healthy_nodes == total_nodes else "WARN"

        print(f"\n[{status}] {name}")
        print(f"  State: {state}")
        print(f"  Nodes: {healthy_nodes}/{total_nodes} healthy")

        if cluster.get("conditions"):
            failing = [c for c in cluster["conditions"]
                       if c.get("status") != "True"]
            if failing:
                print(f"  Failing conditions:")
                for c in failing:
                    print(f"    - {c['type']}: {c.get('message', 'N/A')}")

client = RancherClient("https://rancher.example.com", "token-xxxxx:yyyy")
cluster_health_report(client)
```

### Batch User Onboarding

```python
import csv

def onboard_users(client, csv_file, cluster_id, role="cluster-member"):
    with open(csv_file) as f:
        reader = csv.DictReader(f)
        for row in reader:
            username = row["username"]
            name = row["name"]

            print(f"Onboarding {username}...")

            # Create user
            user = client.create_user(username, name, "TempPass123!")
            user_id = user["id"]

            # Assign global role
            client.post("/v3/globalRoleBindings", {
                "globalRoleId": "user",
                "userId": user_id
            })

            # Assign cluster role
            client.post("/v3/clusterRoleTemplateBindings", {
                "clusterId": cluster_id,
                "roleTemplateId": role,
                "userId": user_id
            })

            print(f"  Created {username} with {role} on {cluster_id}")

# users.csv: username,name
# alice,Alice Smith
# bob,Bob Jones
onboard_users(client, "users.csv", "c-m-abc12345")
```

Resource Inventory Export

```python
import json

def export_inventory(client, output_file="inventory.json"):
    inventory = {"clusters": []}

    for cluster in client.list_clusters():
        cluster_data = {
            "name": cluster["name"],
            "id": cluster["id"],
            "state": cluster["state"],
            "kubernetes_version": cluster.get("version", {}).get("gitVersion"),
            "nodes": [],
            "projects": []
        }

        # Get nodes
        for node in client.get_cluster_nodes(cluster["id"]):
            cluster_data["nodes"].append({
                "name": node["nodeName"],
                "ip": node.get("ipAddress"),
                "state": node["state"],
                "roles": {
                    "controlplane": node.get("controlPlane", False),
                    "etcd": node.get("etcd", False),
                    "worker": node.get("worker", False)
                }
            })

        # Get projects
        for project in client.list_projects(cluster["id"]):
            cluster_data["projects"].append({
                "name": project["name"],
                "id": project["id"]
            })

        inventory["clusters"].append(cluster_data)

    with open(output_file, "w") as f:
        json.dump(inventory, f, indent=2)

    print(f"Inventory exported to {output_file}")

export_inventory(client)
```

## Summary

Python and the `requests` library provide a clean and powerful way to interact with Rancher's previous `/v3` API. Build a reusable client class to keep your code organized, implement proper error handling with retries for production scripts, and use pagination helpers when dealing with large datasets. These patterns work for everything from quick one-off scripts to full automation frameworks.
