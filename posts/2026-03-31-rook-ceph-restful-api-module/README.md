# How to Set Up the Ceph RESTful API Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, REST API, Manager, Automation

Description: Enable and configure the Ceph Manager RESTful API module to programmatically manage your Ceph cluster using HTTP API calls.

---

The Ceph Manager (MGR) RESTful module exposes a JSON REST API for managing cluster resources. It provides an alternative to the CLI for automation, scripting, and integration with monitoring platforms.

## Enabling the RESTful Module

```bash
# Enable the RESTful module
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module enable restful

# Verify it is active
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- ceph mgr module ls | grep restful
```

## Creating API Credentials

The RESTful module uses key-based authentication:

```bash
# Create an API user and get credentials
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph restful create-key admin

# List existing API keys
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph restful list-keys
```

## Accessing the RESTful API

The API runs on port 8003 by default:

```bash
# Port-forward to access the API
kubectl -n rook-ceph port-forward deploy/rook-ceph-mgr-a 8003:8003

# List servers
curl -k https://localhost:8003/server \
  -u admin:YOUR_API_KEY | python3 -m json.tool

# List OSDs
curl -k https://localhost:8003/osd \
  -u admin:YOUR_API_KEY | python3 -m json.tool

# List pools
curl -k https://localhost:8003/pool \
  -u admin:YOUR_API_KEY | python3 -m json.tool
```

## Available API Endpoints

Key endpoints exposed by the RESTful module:

```bash
# OSD management
GET   /osd              # List all OSDs
GET   /osd/{id}         # Get specific OSD info
PATCH /osd/{id}         # Modify OSD (e.g., {"up": false} to mark down)

# Pool management
GET  /pool              # List pools
POST /pool              # Create pool

# Monitor info
GET  /mon               # List monitors

# Server info
GET  /server            # List servers

# Config options
GET  /config/cluster    # Get cluster config

# Performance
GET  /perf              # Get performance counters
```

## Configuring the Module

```bash
# Change the API port
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/restful/server_port 8003

# Bind to a specific IP
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/restful/server_addr ::
```

## Exposing via Kubernetes Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ceph-restful-api
  namespace: rook-ceph
spec:
  selector:
    app: rook-ceph-mgr
  ports:
  - name: restful
    port: 8003
    targetPort: 8003
  type: ClusterIP
```

## Python Client Example

```python
import requests
import urllib3
urllib3.disable_warnings()

BASE_URL = "https://localhost:8003"
AUTH = ("admin", "YOUR_API_KEY")

# List OSDs
response = requests.get(f"{BASE_URL}/osd", auth=AUTH, verify=False)
osds = response.json()
for osd_id, osd_info in osds.items():
    print(f"OSD {osd_id}: {osd_info}")
```

## Summary

The Ceph MGR RESTful module provides a JSON HTTP API for cluster management and automation. Enable it with `ceph mgr module enable restful`, create API keys with `ceph restful create-key`, and access endpoints on port 8003. Expose the service via a Kubernetes Service or port-forward to the MGR pod, and use HTTP Basic Auth with the generated key for all requests.
