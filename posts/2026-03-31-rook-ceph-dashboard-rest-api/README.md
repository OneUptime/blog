# How to Use the Ceph Dashboard REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Dashboard, API, Automation, REST

Description: Use the Ceph Dashboard REST API to automate cluster management tasks, query health status, and integrate Ceph monitoring into custom tools and scripts.

---

## Overview

The Ceph Dashboard exposes a REST API that provides programmatic access to all dashboard functionality. You can query cluster health, manage pools, create RBD images, and manage RGW users without using the web interface. This enables automation and integration with external systems.

## Authenticate with the REST API

All API requests require a JWT token. Obtain it with:

```bash
DASHBOARD_URL="https://localhost:8443"

# Get authentication token
TOKEN=$(curl -sk -X POST "$DASHBOARD_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-password"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"
```

## Explore the API with Swagger

The Dashboard provides a built-in Swagger UI:

```yaml
https://localhost:8443/docs
```

Or access the raw OpenAPI spec:

```bash
curl -sk "$DASHBOARD_URL/docs/api.json" | python3 -m json.tool | head -100
```

## Query Cluster Health

```bash
# Get cluster health summary
curl -sk "$DASHBOARD_URL/api/health/minimal" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Full health status
curl -sk "$DASHBOARD_URL/api/health/full" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Get cluster capacity
curl -sk "$DASHBOARD_URL/api/health/get_cluster_capacity" \
  -H "Authorization: Bearer $TOKEN"
```

## Manage Pools via API

```bash
# List all pools
curl -sk "$DASHBOARD_URL/api/pool" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; [print(p['pool_name'], p['size']) for p in json.load(sys.stdin)]"

# Create a pool
curl -sk -X POST "$DASHBOARD_URL/api/pool" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pool": "new-pool",
    "pool_type": "replicated",
    "size": 3,
    "pg_autoscale_mode": "on",
    "application_metadata": ["rbd"]
  }'
```

## Manage RBD Images via API

```bash
# List RBD images in a pool
curl -sk "$DASHBOARD_URL/api/block/image/replicapool" \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; [print(i['name'], i['size']) for i in json.load(sys.stdin)]"

# Create an RBD image
curl -sk -X POST "$DASHBOARD_URL/api/block/image" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pool_name": "replicapool",
    "name": "new-image",
    "size": 107374182400,
    "obj_size": 4194304,
    "features": ["layering", "fast-diff", "object-map"]
  }'
```

## Create a Python Client

```python
import requests
import urllib3
urllib3.disable_warnings()

class CephDashboardAPI:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.verify = False
        self._authenticate(username, password)

    def _authenticate(self, username, password):
        resp = self.session.post(
            f"{self.base_url}/api/auth",
            json={"username": username, "password": password}
        )
        token = resp.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get_health(self):
        return self.session.get(f"{self.base_url}/api/health/minimal").json()

    def list_pools(self):
        return self.session.get(f"{self.base_url}/api/pool").json()

api = CephDashboardAPI("https://localhost:8443", "admin", "password")
health = api.get_health()
print(f"Cluster status: {health['health']['status']}")
```

## Summary

The Ceph Dashboard REST API enables full automation of cluster management tasks using standard HTTP requests and JWT authentication. The Swagger UI at `/docs` documents all available endpoints. Building Python clients around the API allows integration of Ceph health data and management actions into CI/CD pipelines, chatbots, and custom monitoring dashboards.
