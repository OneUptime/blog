# How to Configure HTTP Backend for Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HTTP Backend, State Management, REST API, Infrastructure as Code

Description: Guide to configuring the HTTP backend for Terraform state, including building a custom state server, authentication, locking support, and real-world implementation patterns.

---

The HTTP backend is one of Terraform's most flexible state storage options. Instead of being tied to a specific cloud provider or service, it stores and retrieves state through a REST API. This means you can plug in any HTTP service that implements the right endpoints - a custom server, an internal API, or even a serverless function. If the standard backends do not fit your needs, the HTTP backend lets you build exactly what you want.

## How the HTTP Backend Works

The HTTP backend interacts with your state server through three HTTP methods:

- **GET** - Retrieve the current state
- **POST** - Store updated state
- **LOCK/UNLOCK** - Optional endpoints for state locking (using a separate URL)

Your server needs to handle these operations and return appropriate HTTP status codes.

## Basic Backend Configuration

Here is the minimal configuration:

```hcl
# backend.tf
terraform {
  backend "http" {
    # URL for GET and POST operations
    address = "https://state.example.com/terraform/myproject"

    # Optional: separate URLs for lock and unlock
    lock_address   = "https://state.example.com/terraform/myproject/lock"
    unlock_address = "https://state.example.com/terraform/myproject/unlock"

    # HTTP method for updating state (default is POST)
    update_method = "POST"
  }
}
```

Initialize the backend:

```bash
terraform init
```

## Authentication

The HTTP backend supports several authentication methods.

### Basic Authentication

```hcl
terraform {
  backend "http" {
    address        = "https://state.example.com/terraform/myproject"
    lock_address   = "https://state.example.com/terraform/myproject/lock"
    unlock_address = "https://state.example.com/terraform/myproject/unlock"

    # Basic auth credentials
    username = "terraform"
    password = "your-password-here"
  }
}
```

Use environment variables to avoid hardcoding credentials:

```bash
# Pass credentials at init time
terraform init \
  -backend-config="username=terraform" \
  -backend-config="password=${STATE_SERVER_PASSWORD}"
```

### Custom Headers

For token-based authentication, you can set custom headers in newer Terraform versions by passing them through a partial configuration file:

```hcl
# backend.hcl
address        = "https://state.example.com/terraform/myproject"
lock_address   = "https://state.example.com/terraform/myproject/lock"
unlock_address = "https://state.example.com/terraform/myproject/unlock"
```

## Building a Simple State Server

Let's build a minimal HTTP state server in Python to understand the protocol:

```python
# state_server.py
# A minimal Terraform HTTP state backend server

from flask import Flask, request, jsonify
import json
import os
import uuid
import threading

app = Flask(__name__)

# In-memory storage (use a database in production)
states = {}
locks = {}
lock_mutex = threading.Lock()

STATE_DIR = "states"
os.makedirs(STATE_DIR, exist_ok=True)

@app.route("/terraform/<project>", methods=["GET"])
def get_state(project):
    """Return the current state for a project."""
    state_file = os.path.join(STATE_DIR, f"{project}.tfstate")

    if not os.path.exists(state_file):
        # Return empty response for new projects
        return "", 200

    with open(state_file, "r") as f:
        return f.read(), 200, {"Content-Type": "application/json"}

@app.route("/terraform/<project>", methods=["POST"])
def update_state(project):
    """Store updated state for a project."""
    state_file = os.path.join(STATE_DIR, f"{project}.tfstate")

    # Get the lock ID from query params (if locking is used)
    lock_id = request.args.get("ID")

    # Verify the lock if one is held
    if project in locks and locks[project] != lock_id:
        return jsonify({"error": "state locked by another process"}), 409

    # Write the state data
    with open(state_file, "w") as f:
        f.write(request.data.decode("utf-8"))

    return "", 200

@app.route("/terraform/<project>/lock", methods=["LOCK"])
def lock_state(project):
    """Acquire a lock on the state."""
    with lock_mutex:
        if project in locks:
            # Already locked - return the existing lock info
            return jsonify({"error": "already locked"}), 409

        # Parse the lock info from Terraform
        lock_info = request.json
        lock_id = lock_info.get("ID", str(uuid.uuid4()))
        locks[project] = lock_id

        return "", 200

@app.route("/terraform/<project>/lock", methods=["UNLOCK"])
def unlock_state(project):
    """Release a lock on the state."""
    with lock_mutex:
        lock_info = request.json
        lock_id = lock_info.get("ID")

        if project not in locks:
            return "", 200

        if locks[project] != lock_id:
            return jsonify({"error": "lock ID mismatch"}), 409

        del locks[project]
        return "", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

Install dependencies and run:

```bash
# Install Flask
pip install flask

# Run the server
python state_server.py
```

## Building a State Server in Go

For production use, Go is a better choice:

```go
// main.go
// Production-grade Terraform HTTP state backend

package main

import (
    "encoding/json"
    "io"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "sync"
)

// StateServer handles Terraform state operations
type StateServer struct {
    stateDir string
    locks    map[string]string
    mu       sync.RWMutex
}

// LockInfo represents Terraform lock information
type LockInfo struct {
    ID        string `json:"ID"`
    Operation string `json:"Operation"`
    Info      string `json:"Info"`
    Who       string `json:"Who"`
    Version   string `json:"Version"`
    Created   string `json:"Created"`
    Path      string `json:"Path"`
}

func NewStateServer(stateDir string) *StateServer {
    // Create the state directory if it doesn't exist
    os.MkdirAll(stateDir, 0700)
    return &StateServer{
        stateDir: stateDir,
        locks:    make(map[string]string),
    }
}

func (s *StateServer) handleState(w http.ResponseWriter, r *http.Request) {
    project := r.URL.Path[len("/terraform/"):]

    switch r.Method {
    case "GET":
        s.getState(w, project)
    case "POST":
        s.updateState(w, r, project)
    default:
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    }
}

func (s *StateServer) getState(w http.ResponseWriter, project string) {
    statePath := filepath.Join(s.stateDir, project+".tfstate")

    data, err := os.ReadFile(statePath)
    if err != nil {
        // Return empty for missing state
        w.WriteHeader(http.StatusOK)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(data)
}

func (s *StateServer) updateState(w http.ResponseWriter, r *http.Request, project string) {
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "failed to read body", http.StatusBadRequest)
        return
    }

    statePath := filepath.Join(s.stateDir, project+".tfstate")
    if err := os.WriteFile(statePath, body, 0600); err != nil {
        http.Error(w, "failed to write state", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    server := NewStateServer("./states")

    http.HandleFunc("/terraform/", server.handleState)

    log.Println("State server listening on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Configuration Options Reference

Here is the full set of configuration options:

```hcl
terraform {
  backend "http" {
    # Primary URL for state operations (GET/POST)
    address = "https://state.example.com/terraform/myproject"

    # Separate URLs for lock operations
    lock_address   = "https://state.example.com/terraform/myproject/lock"
    unlock_address = "https://state.example.com/terraform/myproject/unlock"

    # HTTP method for state updates (default: POST)
    update_method = "POST"

    # HTTP method for lock operations (default: LOCK)
    lock_method = "LOCK"

    # HTTP method for unlock operations (default: UNLOCK)
    unlock_method = "UNLOCK"

    # Basic authentication
    username = "terraform"
    password = "password"

    # Skip TLS verification (not recommended for production)
    skip_cert_verification = false

    # Retry configuration
    retry_max     = 2
    retry_wait_min = 1
    retry_wait_max = 30
  }
}
```

## Using with GitLab Managed State

GitLab provides a built-in HTTP state backend. You can use it without setting up your own server:

```hcl
terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME"
    lock_address   = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/PROJECT_ID/terraform/state/STATE_NAME/lock"

    lock_method   = "POST"
    unlock_method = "DELETE"

    username = "gitlab-ci-token"
    password = "your-personal-access-token"
  }
}
```

## Using with Terraform Cloud API

You can even point the HTTP backend at Terraform Cloud's API (though the native Terraform Cloud backend is usually better):

```hcl
terraform {
  backend "http" {
    address = "https://app.terraform.io/api/v2/organizations/ORG/workspaces/WORKSPACE/current-state-version"

    # Token-based auth through init
    # terraform init -backend-config="username=token" -backend-config="password=YOUR_TFC_TOKEN"
  }
}
```

## Partial Configuration

For security, use partial configuration to keep credentials out of source code:

```hcl
# backend.tf
terraform {
  backend "http" {
    # Only non-sensitive configuration here
  }
}
```

```bash
# Pass all configuration at init time
terraform init \
  -backend-config="address=https://state.example.com/terraform/myproject" \
  -backend-config="lock_address=https://state.example.com/terraform/myproject/lock" \
  -backend-config="unlock_address=https://state.example.com/terraform/myproject/unlock" \
  -backend-config="username=terraform" \
  -backend-config="password=${STATE_PASSWORD}"
```

## Error Handling

Your HTTP server should return appropriate status codes:

| Status Code | Meaning |
|------------|---------|
| 200 | Success |
| 404 | State not found (Terraform treats as empty state) |
| 409 | Lock conflict |
| 423 | Resource locked |
| 500 | Server error |

Terraform will retry on 5xx errors based on the retry configuration.

## Summary

The HTTP backend gives you total control over how and where Terraform state is stored. Whether you build a custom server, use a service like GitLab, or integrate with an existing internal API, the HTTP backend adapts to your needs. The protocol is simple - just GET, POST, LOCK, and UNLOCK - making it straightforward to implement. The trade-off is that you are responsible for the reliability, security, and durability of your state storage. For simpler setups, consider a managed backend like [Azure Blob Storage](https://oneuptime.com/blog/post/2026-02-23-terraform-azure-blob-storage-backend/view) or [GCS](https://oneuptime.com/blog/post/2026-02-23-terraform-gcs-backend/view).
