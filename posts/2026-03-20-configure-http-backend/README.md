# How to Configure the HTTP Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to configure the OpenTofu HTTP backend to store state in any custom HTTP-based state storage service with support for locking and TLS authentication.

## Introduction

The HTTP backend allows OpenTofu to store state in any system that exposes a RESTful HTTP API. It's highly flexible - you can use it with custom state storage services, GitLab's built-in Terraform state backend, or any API that implements the required protocol. This guide covers configuration, authentication, and locking.

## HTTP Backend Protocol

The HTTP backend expects a server that implements these endpoints:
- `GET /state` - Retrieve the current state
- `POST /state` - Update the state
- `DELETE /state` - Delete the state (optional)
- `LOCK /state` - Acquire a lock (optional)
- `UNLOCK /state` - Release a lock (optional)

## Basic Configuration

```hcl
# backend.tf

terraform {
  backend "http" {
    address        = "https://state-server.example.com/terraform/state/prod"
    lock_address   = "https://state-server.example.com/terraform/state/prod/lock"
    unlock_address = "https://state-server.example.com/terraform/state/prod/unlock"
  }
}
```

## Authentication Options

### Basic Authentication

```hcl
terraform {
  backend "http" {
    address  = "https://state-server.example.com/state/prod"
    username = "terraform"
    password = var.state_server_password  # Or use env var
  }
}
```

```bash
# Environment variables
export TF_HTTP_USERNAME="terraform"
export TF_HTTP_PASSWORD="your-password"
```

### Client Certificate Authentication

```hcl
terraform {
  backend "http" {
    address          = "https://state-server.example.com/state/prod"
    client_ca_certificate_pem  = file("/etc/certs/ca.pem")
    client_certificate_pem     = file("/etc/certs/client.pem")
    client_private_key_pem     = file("/etc/certs/client-key.pem")
  }
}
```

### Custom Header (API Key)

```hcl
terraform {
  backend "http" {
    address = "https://state-server.example.com/state/prod"

    # Map of additional headers sent with every request to the backend
    headers = {
      "X-API-Key"   = "your-api-key"
      "X-Tenant-ID" = "team-platform"
    }
  }
}
```

## GitLab Managed Terraform State

GitLab provides a built-in HTTP-compatible Terraform state backend:

```hcl
# backend.tf
terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME"
    lock_address   = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"

    username = "your-gitlab-username"
    password = var.gitlab_token  # Use a GitLab Personal Access Token
  }
}
```

```bash
# Set GitLab token via environment
export TF_HTTP_PASSWORD="glpat-XXXX"
export TF_HTTP_USERNAME="your-username"

tofu init
```

## Lock and Unlock Method Configuration

```hcl
terraform {
  backend "http" {
    address        = "https://state-server.example.com/state"
    lock_address   = "https://state-server.example.com/state/lock"
    unlock_address = "https://state-server.example.com/state/unlock"

    # HTTP methods for lock/unlock
    lock_method   = "LOCK"    # Or POST, PUT
    unlock_method = "UNLOCK"  # Or DELETE, POST

    # Retry behavior
    retry_max     = 5
    retry_wait_min = 1
    retry_wait_max = 30
  }
}
```

## TLS Configuration

```hcl
terraform {
  backend "http" {
    address = "https://state-server.example.com/state"

    # Skip TLS verification (dev only - never in production!)
    skip_cert_verification = false

    # Custom CA certificate for self-signed certs
    client_ca_certificate_pem = file("/etc/certs/ca.pem")
  }
}
```

## Building a Simple HTTP State Server

Here's a minimal Python example implementing the HTTP backend protocol:

```python
from flask import Flask, request, jsonify
import json, os, threading

app = Flask(__name__)
STATES_DIR = "/var/terraform/states"
locks = {}
lock_mutex = threading.Lock()

@app.route('/state/<name>', methods=['GET'])
def get_state(name):
    path = f"{STATES_DIR}/{name}.tfstate"
    if os.path.exists(path):
        return open(path).read(), 200, {'Content-Type': 'application/json'}
    return '{}', 200

@app.route('/state/<name>', methods=['POST'])
def update_state(name):
    path = f"{STATES_DIR}/{name}.tfstate"
    os.makedirs(STATES_DIR, exist_ok=True)
    with open(path, 'w') as f:
        f.write(request.get_data(as_text=True))
    return '', 200

@app.route('/state/<name>/lock', methods=['LOCK', 'POST'])
def lock_state(name):
    with lock_mutex:
        if name in locks:
            return jsonify(locks[name]), 423  # Locked
        lock_info = request.get_json()
        locks[name] = lock_info
        return '', 200

@app.route('/state/<name>/lock', methods=['UNLOCK', 'DELETE'])
def unlock_state(name):
    with lock_mutex:
        locks.pop(name, None)
    return '', 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, ssl_context='adhoc')
```

## Conclusion

The HTTP backend's flexibility makes it the right choice when you need to integrate with a custom state storage system, use GitLab's managed state, or build your own state server. It supports authentication via basic auth or client certificates, optional locking, and retry logic. For production use, always enable TLS and implement proper locking to prevent concurrent state modifications.
