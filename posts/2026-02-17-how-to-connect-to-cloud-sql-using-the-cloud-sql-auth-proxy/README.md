# How to Connect to Cloud SQL Using the Cloud SQL Auth Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Auth Proxy, Database, Security

Description: A practical guide to setting up and using the Cloud SQL Auth Proxy for secure, IAM-based connections to your Cloud SQL instances without managing SSL certificates.

---

The Cloud SQL Auth Proxy is one of those tools that seems like extra overhead until you use it - then you wonder how you ever managed without it. It provides a secure tunnel to your Cloud SQL instance, handles SSL encryption automatically, and uses IAM for authentication instead of IP allowlists. This post covers everything you need to know to get it running.

## What the Auth Proxy Actually Does

When you connect to Cloud SQL directly, you need to manage:

- SSL certificates for encrypted connections
- IP allowlists for access control
- Certificate rotation when they expire

The Auth Proxy handles all of this for you. It runs as a local process (or sidecar container) and creates a secure tunnel to your Cloud SQL instance. Your application connects to `localhost` on a port you specify, and the proxy handles the rest.

Under the hood, the proxy:

1. Authenticates using IAM credentials (service account, user account, or workload identity)
2. Establishes an encrypted connection to Cloud SQL
3. Proxies your database traffic through that connection

## Installing the Auth Proxy

There are several ways to install it depending on your platform.

For Linux:

```bash
# Download the latest Cloud SQL Auth Proxy for Linux
curl -o cloud-sql-proxy \
    https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64

# Make it executable
chmod +x cloud-sql-proxy

# Optionally move it to your PATH
sudo mv cloud-sql-proxy /usr/local/bin/
```

For macOS:

```bash
# Download the Auth Proxy for macOS (Apple Silicon)
curl -o cloud-sql-proxy \
    https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.darwin.arm64

chmod +x cloud-sql-proxy
sudo mv cloud-sql-proxy /usr/local/bin/
```

Using Docker:

```bash
# Pull the official Auth Proxy Docker image
docker pull gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
```

## Finding Your Instance Connection Name

The Auth Proxy needs your instance connection name. This follows the format `project:region:instance`:

```bash
# Get the connection name for your Cloud SQL instance
gcloud sql instances describe my-instance \
    --format="value(connectionName)"
```

This will return something like `my-project:us-central1:my-instance`.

## Basic Usage

The simplest way to start the proxy is:

```bash
# Start the proxy for a single instance
# It will listen on the default database port (3306 for MySQL, 5432 for PostgreSQL)
cloud-sql-proxy my-project:us-central1:my-instance
```

Then in another terminal, connect as you normally would:

```bash
# Connect to MySQL through the proxy
mysql -h 127.0.0.1 -u myuser -p mydb

# Or for PostgreSQL
psql -h 127.0.0.1 -U myuser -d mydb
```

## Specifying Ports

If you need to connect to multiple instances or use a non-default port:

```bash
# Run the proxy with explicit port mappings
# MySQL instance on port 3306, PostgreSQL instance on port 5432
cloud-sql-proxy \
    --port=3306 my-project:us-central1:mysql-instance \
    --port=5432 my-project:us-central1:postgres-instance
```

You can also use a different port to avoid conflicts:

```bash
# Use port 3307 to avoid conflicting with a local MySQL installation
cloud-sql-proxy --port=3307 my-project:us-central1:my-instance
```

## Authentication Methods

The Auth Proxy supports several authentication mechanisms.

### Application Default Credentials

If you are running on a GCE VM, GKE, or Cloud Run, the proxy automatically picks up the service account attached to the resource:

```bash
# No extra auth config needed - uses the attached service account
cloud-sql-proxy my-project:us-central1:my-instance
```

### Service Account Key File

For local development or environments without attached service accounts:

```bash
# Use a specific service account key file
cloud-sql-proxy \
    --credentials-file=/path/to/service-account-key.json \
    my-project:us-central1:my-instance
```

### gcloud Authentication

For local development, you can use your own Google account:

```bash
# Login first
gcloud auth application-default login

# The proxy will use your user credentials
cloud-sql-proxy my-project:us-central1:my-instance
```

## Required IAM Permissions

The service account or user running the proxy needs these roles:

- `roles/cloudsql.client` - Required for connecting
- `roles/cloudsql.instanceUser` - Required for IAM database authentication (optional)

Assign the role to a service account:

```bash
# Grant the Cloud SQL Client role to a service account
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

## Using Private IP

If your Cloud SQL instance has a private IP and you want the proxy to use it:

```bash
# Connect via private IP instead of public
cloud-sql-proxy --private-ip my-project:us-central1:my-instance
```

This is the recommended configuration for production. The proxy connects to Cloud SQL over your VPC's private network.

## Running as a Systemd Service

For production VMs, run the proxy as a systemd service so it starts automatically and restarts on failure:

```ini
# /etc/systemd/system/cloud-sql-proxy.service
[Unit]
Description=Cloud SQL Auth Proxy
After=network.target

[Service]
Type=simple
User=cloud-sql-proxy
ExecStart=/usr/local/bin/cloud-sql-proxy \
    --private-ip \
    --structured-logs \
    --port=5432 \
    my-project:us-central1:my-instance
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd, enable, and start the proxy service
sudo systemctl daemon-reload
sudo systemctl enable cloud-sql-proxy
sudo systemctl start cloud-sql-proxy

# Check the status
sudo systemctl status cloud-sql-proxy
```

## Running as a Docker Sidecar

In containerized environments, the proxy often runs as a sidecar container. Here is a Docker Compose example:

```yaml
# docker-compose.yml - Run the Auth Proxy alongside your application
version: '3.8'
services:
  app:
    image: my-app:latest
    environment:
      DB_HOST: 127.0.0.1
      DB_PORT: 5432
      DB_NAME: mydb
    network_mode: "service:cloud-sql-proxy"
    depends_on:
      - cloud-sql-proxy

  cloud-sql-proxy:
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.8.0
    command:
      - "--private-ip"
      - "--port=5432"
      - "my-project:us-central1:my-instance"
    volumes:
      - /path/to/service-account-key.json:/config/sa-key.json:ro
    environment:
      GOOGLE_APPLICATION_CREDENTIALS: /config/sa-key.json
```

## Health Checks

The Auth Proxy v2 supports health check endpoints:

```bash
# Start the proxy with health checks enabled
cloud-sql-proxy \
    --health-check \
    --http-port=9090 \
    my-project:us-central1:my-instance
```

The health check endpoints are:

- `/startup` - Returns 200 when the proxy is ready to accept connections
- `/readiness` - Returns 200 when connections to all instances are established
- `/liveness` - Returns 200 when the proxy process is running

These are essential for Kubernetes liveness and readiness probes.

## Structured Logging

For production environments, enable structured JSON logging:

```bash
# Enable structured JSON logs for easier parsing
cloud-sql-proxy \
    --structured-logs \
    my-project:us-central1:my-instance
```

This outputs logs in JSON format, making them easier to parse with Cloud Logging or any log aggregation tool.

## Troubleshooting Common Issues

### "Permission denied" Errors

Check that your service account has the `roles/cloudsql.client` role and that the Cloud SQL Admin API is enabled.

### "Connection refused" on localhost

Make sure the proxy is actually running and listening on the port you expect. Check with:

```bash
# Verify the proxy is listening on the expected port
ss -tlnp | grep 5432
```

### Proxy Exits Immediately

Usually a credential issue. Run with `--debug-logs` to see detailed output:

```bash
# Run with debug logging to diagnose issues
cloud-sql-proxy --debug-logs my-project:us-central1:my-instance
```

### Slow Connections

If initial connections are slow, the proxy might be doing IAM authentication on each connection. Consider using the `--auto-iam-authn` flag to cache IAM tokens.

## Auth Proxy vs Direct Connection

When should you use the proxy versus connecting directly?

**Use the Auth Proxy when:**
- You want IAM-based access control instead of IP allowlists
- You do not want to manage SSL certificates
- You are connecting from Kubernetes or serverless platforms
- You need to rotate credentials without application changes

**Direct connection is fine when:**
- You are using Private Service Connect or private IP with VPC-native access
- Your infrastructure already manages SSL certificates
- You need the absolute lowest latency (the proxy adds minimal overhead, but it is not zero)

## Summary

The Cloud SQL Auth Proxy simplifies secure database connectivity by handling encryption, authentication, and authorization through IAM. Install it, point it at your instance connection name, and connect to localhost. For production, run it as a systemd service or Kubernetes sidecar with health checks enabled. It is one of those Google Cloud tools that just works once you set it up.
