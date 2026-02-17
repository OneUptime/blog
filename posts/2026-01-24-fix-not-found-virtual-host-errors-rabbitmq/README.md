# How to Fix 'Not Found' Virtual Host Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Message Queue, Virtual Hosts, DevOps, Troubleshooting, Multi-tenancy

Description: Diagnose and resolve RabbitMQ virtual host not found errors by understanding vhost configuration, permissions, and connection settings.

---

When connecting to RabbitMQ, you might encounter a "NOT_FOUND - no vhost" error. This happens when your client tries to connect to a virtual host that does not exist or when the user lacks permissions to access it. This guide explains virtual hosts, common error causes, and step-by-step solutions.

## Understanding Virtual Hosts

Virtual hosts (vhosts) in RabbitMQ provide logical separation of resources. Each vhost contains its own exchanges, queues, bindings, and permissions. They enable multi-tenancy and environment isolation on a single RabbitMQ cluster.

```mermaid
flowchart TD
    subgraph "RabbitMQ Cluster"
        subgraph "vhost: /production"
            E1[orders exchange]
            Q1[orders queue]
        end

        subgraph "vhost: /staging"
            E2[orders exchange]
            Q2[orders queue]
        end

        subgraph "vhost: /development"
            E3[orders exchange]
            Q3[orders queue]
        end
    end

    C1[Production App] --> E1
    C2[Staging App] --> E2
    C3[Dev App] --> E3
```

## Common Error Messages

When a vhost error occurs, you will typically see one of these messages.

```text
# Error when vhost does not exist
pika.exceptions.ProbableAccessDeniedError: ConnectionClosedByBroker:
(530) 'NOT_FOUND - no vhost '/myapp' in this cluster'

# Error when user lacks permission
pika.exceptions.ProbableAccessDeniedError: ConnectionClosedByBroker:
(403) 'ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN'
```

## Diagnosing the Problem

First, check what virtual hosts exist on your RabbitMQ server.

```bash
# List all virtual hosts on the RabbitMQ server
# This shows the names of all configured vhosts
# The default installation only has '/' vhost
rabbitmqctl list_vhosts

# Get detailed information including limits and metadata
# The verbose flag shows tracing status and description
rabbitmqctl list_vhosts --verbose
```

Check if your user has permissions for the target vhost.

```bash
# List all permissions showing user, vhost, and access levels
# The configure, write, and read columns show regex patterns
# '.*' means full access, empty means no access
rabbitmqctl list_permissions --vhost /myapp

# List all vhosts a specific user can access
# This helps identify if the user is missing the required vhost
rabbitmqctl list_user_permissions myuser
```

## Solution 1: Create the Missing Virtual Host

If the vhost does not exist, create it.

```bash
# Create a new virtual host
# The name can include slashes but must be URL-encoded in connection strings
# Examples: /production, myapp, team1/project1
rabbitmqctl add_vhost /myapp

# Add a description and tags for documentation
# Tags help with management UI filtering and automation
rabbitmqctl add_vhost /myapp \
    --description "My Application Production Environment" \
    --tags production,team-a

# Verify the vhost was created
rabbitmqctl list_vhosts name
```

## Solution 2: Grant User Permissions

After creating the vhost, grant your user access to it.

```bash
# Grant permissions to a user on a vhost
# The three patterns control configure, write, and read access
# '.*' grants full access to all resources
# The pattern is a regex matching resource names
rabbitmqctl set_permissions -p /myapp myuser ".*" ".*" ".*"

# For restricted access, use specific patterns
# This example allows full access to resources prefixed with 'myapp.'
# Other resources in the vhost will be inaccessible
rabbitmqctl set_permissions -p /myapp myuser "^myapp\..*" "^myapp\..*" "^myapp\..*"

# Verify permissions were set correctly
rabbitmqctl list_permissions -p /myapp
```

## Solution 3: Fix Connection String

Ensure your application uses the correct connection string with the vhost specified.

```python
# connection_examples.py
# Demonstrates correct vhost specification in connection strings

import pika
from urllib.parse import quote

# Method 1: Using ConnectionParameters with explicit vhost
# The virtual_host parameter specifies which vhost to connect to
# This is the most explicit and readable approach
connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host='rabbitmq.example.com',
        port=5672,
        virtual_host='/myapp',  # Must match the vhost name exactly
        credentials=pika.PlainCredentials('myuser', 'mypassword')
    )
)

# Method 2: Using URL connection string
# The vhost appears after the host:port, URL-encoded
# Note: '/' becomes '%2F' in URL encoding
url = 'amqp://myuser:mypassword@rabbitmq.example.com:5672/%2Fmyapp'
connection = pika.BlockingConnection(pika.URLParameters(url))

# Method 3: For vhost names without leading slash
# Simpler URL since no encoding is needed
url = 'amqp://myuser:mypassword@rabbitmq.example.com:5672/myapp'
connection = pika.BlockingConnection(pika.URLParameters(url))

# Common mistake: Forgetting to URL-encode the vhost
# WRONG: amqp://user:pass@host:5672//myapp (double slash interpreted wrong)
# RIGHT: amqp://user:pass@host:5672/%2Fmyapp (properly encoded)
```

### URL Encoding for Vhost Names

Vhost names with special characters must be URL-encoded.

```python
# url_encoding.py
# Properly encode vhost names for connection URLs

from urllib.parse import quote

# Table of common vhost names and their URL-encoded forms
vhosts = [
    '/',                # Default vhost
    '/production',      # Leading slash
    '/my-app/team1',    # Multiple slashes
    'staging',          # No leading slash
]

for vhost in vhosts:
    # quote with safe='' encodes all special characters including /
    encoded = quote(vhost, safe='')
    print(f"Vhost: {vhost:20} -> Encoded: {encoded}")

# Output:
# Vhost: /                    -> Encoded: %2F
# Vhost: /production          -> Encoded: %2Fproduction
# Vhost: /my-app/team1        -> Encoded: %2Fmy-app%2Fteam1
# Vhost: staging              -> Encoded: staging
```

## Solution 4: Environment-Specific Configuration

Use configuration management to ensure vhosts exist across environments.

```yaml
# rabbitmq-definitions.json
# RabbitMQ definitions file for automated setup
# Import with: rabbitmqctl import_definitions rabbitmq-definitions.json
{
  "vhosts": [
    {
      "name": "/",
      "description": "Default virtual host",
      "tags": ["default"]
    },
    {
      "name": "/production",
      "description": "Production environment",
      "tags": ["production", "critical"]
    },
    {
      "name": "/staging",
      "description": "Staging environment",
      "tags": ["staging", "testing"]
    }
  ],
  "users": [
    {
      "name": "app_user",
      "password_hash": "REPLACE_WITH_HASHED_PASSWORD",
      "tags": ["management"]
    }
  ],
  "permissions": [
    {
      "user": "app_user",
      "vhost": "/production",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    },
    {
      "user": "app_user",
      "vhost": "/staging",
      "configure": ".*",
      "write": ".*",
      "read": ".*"
    }
  ]
}
```

Import the definitions to configure RabbitMQ.

```bash
# Import definitions from a JSON file
# This creates all vhosts, users, permissions, exchanges, and queues
# Existing resources are updated, not duplicated
rabbitmqctl import_definitions /path/to/rabbitmq-definitions.json

# Export current definitions for backup or migration
# Useful for replicating configuration across environments
rabbitmqctl export_definitions /path/to/backup-definitions.json
```

## Automating Vhost Setup

Create a script to ensure vhosts and permissions are configured correctly.

```bash
#!/bin/bash
# setup_vhost.sh
# Idempotent script to create vhost and set permissions
# Usage: ./setup_vhost.sh <vhost_name> <username>

set -e

VHOST="${1:-/myapp}"
USER="${2:-myuser}"

echo "Setting up RabbitMQ vhost: $VHOST for user: $USER"

# Check if vhost exists, create if not
# The grep -q suppresses output, using exit code for logic
if rabbitmqctl list_vhosts --quiet | grep -q "^${VHOST}$"; then
    echo "Vhost '$VHOST' already exists"
else
    echo "Creating vhost '$VHOST'"
    rabbitmqctl add_vhost "$VHOST"
fi

# Check if user exists
if ! rabbitmqctl list_users --quiet | grep -q "^${USER}"; then
    echo "Error: User '$USER' does not exist"
    echo "Create user first: rabbitmqctl add_user $USER <password>"
    exit 1
fi

# Set permissions (idempotent - safe to run multiple times)
# This grants full access; modify patterns for restricted access
echo "Setting permissions for '$USER' on '$VHOST'"
rabbitmqctl set_permissions -p "$VHOST" "$USER" ".*" ".*" ".*"

# Verify setup
echo ""
echo "Verification:"
echo "Vhost exists:"
rabbitmqctl list_vhosts | grep "$VHOST"
echo ""
echo "User permissions:"
rabbitmqctl list_user_permissions "$USER" | grep "$VHOST"

echo ""
echo "Setup complete. Connection string:"
echo "amqp://${USER}:<password>@localhost:5672/$(python3 -c "from urllib.parse import quote; print(quote('$VHOST', safe=''))")"
```

## Kubernetes Deployment with Init Container

When deploying to Kubernetes, use an init container to ensure vhosts exist before your application starts.

```yaml
# deployment.yaml
# Kubernetes deployment with RabbitMQ vhost initialization
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Init container runs before the main application
      # It ensures the vhost and permissions exist
      initContainers:
        - name: init-rabbitmq
          image: rabbitmq:3.12-management
          command:
            - /bin/bash
            - -c
            - |
              # Wait for RabbitMQ to be ready
              until rabbitmqctl -n rabbit@rabbitmq-0.rabbitmq-headless status; do
                echo "Waiting for RabbitMQ..."
                sleep 5
              done

              # Create vhost if it does not exist
              rabbitmqctl -n rabbit@rabbitmq-0.rabbitmq-headless add_vhost /myapp || true

              # Set permissions for the application user
              rabbitmqctl -n rabbit@rabbitmq-0.rabbitmq-headless \
                set_permissions -p /myapp appuser ".*" ".*" ".*"

              echo "RabbitMQ vhost initialized"
          env:
            - name: RABBITMQ_ERLANG_COOKIE
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: erlang-cookie

      containers:
        - name: myapp
          image: myapp:latest
          env:
            - name: RABBITMQ_URL
              value: "amqp://appuser:$(RABBITMQ_PASSWORD)@rabbitmq:5672/%2Fmyapp"
            - name: RABBITMQ_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: password
```

## Debugging Connection Issues

```mermaid
flowchart TD
    A[Connection Error] --> B{Vhost Exists?}
    B -->|No| C[Create Vhost]
    C --> D[Set Permissions]
    D --> E[Test Connection]

    B -->|Yes| F{User Has Permission?}
    F -->|No| D
    F -->|Yes| G{Connection String Correct?}

    G -->|No| H[Fix URL Encoding]
    H --> E
    G -->|Yes| I[Check Network/Firewall]

    E --> J{Success?}
    J -->|Yes| K[Done]
    J -->|No| L[Check RabbitMQ Logs]
```

Use this diagnostic script to identify the exact issue.

```python
# diagnose_vhost.py
# Diagnostic script to identify vhost connection issues
# Run this to get detailed error information

import pika
import sys

def diagnose_connection(host, port, vhost, username, password):
    """
    Attempt connection and provide detailed diagnostics.

    Args:
        host: RabbitMQ hostname
        port: RabbitMQ port (usually 5672)
        vhost: Virtual host name
        username: RabbitMQ username
        password: RabbitMQ password
    """
    print(f"Diagnosing connection to {host}:{port}")
    print(f"  Virtual Host: {vhost}")
    print(f"  Username: {username}")
    print()

    try:
        # Attempt connection with detailed error handling
        credentials = pika.PlainCredentials(username, password)
        parameters = pika.ConnectionParameters(
            host=host,
            port=port,
            virtual_host=vhost,
            credentials=credentials,
            # Short timeout for quick diagnosis
            connection_attempts=1,
            retry_delay=1,
            socket_timeout=5
        )

        connection = pika.BlockingConnection(parameters)
        print("SUCCESS: Connection established!")

        # Test basic operations
        channel = connection.channel()
        print("SUCCESS: Channel created")

        connection.close()
        print("SUCCESS: Connection closed cleanly")

    except pika.exceptions.ProbableAccessDeniedError as e:
        print(f"ACCESS DENIED: {e}")
        print()
        print("Possible causes:")
        print("  1. Virtual host does not exist")
        print("     Fix: rabbitmqctl add_vhost {vhost}")
        print("  2. User does not have permission to access vhost")
        print("     Fix: rabbitmqctl set_permissions -p {vhost} {username} '.*' '.*' '.*'")
        print("  3. Invalid credentials")
        print("     Fix: Verify username and password")

    except pika.exceptions.AMQPConnectionError as e:
        print(f"CONNECTION ERROR: {e}")
        print()
        print("Possible causes:")
        print("  1. RabbitMQ server not running")
        print("  2. Network connectivity issue")
        print("  3. Firewall blocking port")
        print("  4. Incorrect host or port")

    except Exception as e:
        print(f"UNEXPECTED ERROR: {type(e).__name__}: {e}")

if __name__ == '__main__':
    # Default values for testing
    diagnose_connection(
        host='localhost',
        port=5672,
        vhost='/myapp',
        username='myuser',
        password='mypassword'
    )
```

## Summary

Virtual host errors in RabbitMQ typically occur due to missing vhosts, insufficient permissions, or incorrect connection strings. To resolve these issues, verify the vhost exists with `rabbitmqctl list_vhosts`, create missing vhosts with `rabbitmqctl add_vhost`, grant permissions with `rabbitmqctl set_permissions`, and ensure connection strings properly URL-encode vhost names. For production environments, automate vhost setup using definitions files or init containers to prevent these errors from occurring in the first place.
