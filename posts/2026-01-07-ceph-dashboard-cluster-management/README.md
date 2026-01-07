# How to Set Up Ceph Dashboard for Cluster Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ceph, Storage, Dashboard, Monitoring, Management, Cloud Native

Description: A guide to deploying and configuring the Ceph Dashboard for visual cluster management and monitoring.

---

The Ceph Dashboard is a powerful web-based management and monitoring interface built into Ceph. It provides administrators with a comprehensive view of their storage cluster, enabling real-time monitoring, configuration management, and operational tasks through an intuitive graphical interface. This guide walks you through setting up the Ceph Dashboard from scratch, including SSL configuration, user management, RBAC, and Grafana integration.

## Understanding the Ceph Dashboard Architecture

Before diving into the setup, let's understand how the Ceph Dashboard fits into the overall Ceph architecture:

```mermaid
graph TB
    subgraph "Ceph Dashboard Architecture"
        A[Web Browser] --> B[Ceph Dashboard]
        B --> C[Ceph Manager Daemon]
        C --> D[Ceph Monitors]
        C --> E[Ceph OSDs]
        C --> F[Ceph MDS]
        C --> G[RGW]

        subgraph "Dashboard Components"
            B --> H[REST API]
            B --> I[WebSocket]
            B --> J[Prometheus Module]
        end

        subgraph "External Integrations"
            J --> K[Prometheus Server]
            K --> L[Grafana]
        end
    end

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e9
    style K fill:#fce4ec
    style L fill:#f3e5f5
```

The Dashboard runs as a module within the Ceph Manager daemon (ceph-mgr) and communicates directly with all Ceph components through the internal APIs. It exposes a RESTful API for programmatic access and integrates seamlessly with monitoring tools like Prometheus and Grafana.

## Prerequisites

Before setting up the Ceph Dashboard, ensure you have:

- A running Ceph cluster (Quincy release or later recommended)
- At least one Ceph Manager daemon running
- Root or sudo access to the Ceph nodes
- Network access to the dashboard port (default: 8443)

Verify your cluster is healthy before proceeding:

```bash
# Check the overall cluster health status
# This command displays HEALTH_OK if everything is functioning properly
ceph health

# Get detailed cluster status including MON, OSD, and MGR information
# Useful for understanding the current state of all daemons
ceph status
```

## Enabling the Ceph Dashboard Module

The Dashboard module comes pre-installed with Ceph but must be explicitly enabled. Let's start by enabling it:

```bash
# Enable the dashboard module in the Ceph Manager
# This activates the dashboard service on all manager daemons
ceph mgr module enable dashboard

# Verify the module is enabled and running
# The output should show 'dashboard' in the list of enabled modules
ceph mgr module ls | grep -A 2 enabled_modules
```

You should see output similar to:

```
    "enabled_modules": [
        "dashboard",
        "prometheus",
        ...
    ],
```

## Setting Up SSL/TLS Certificates

Security is paramount when exposing management interfaces. The Dashboard supports SSL/TLS encryption to protect data in transit.

### Option 1: Generate a Self-Signed Certificate

For development or internal environments, you can use a self-signed certificate:

```bash
# Generate a self-signed SSL certificate and key
# The certificate will be valid for 365 days
# Replace 'ceph-dashboard.example.com' with your actual hostname
openssl req -new -nodes -x509 \
  -subj "/O=Ceph/CN=ceph-dashboard.example.com" \
  -days 365 \
  -keyout dashboard.key \
  -out dashboard.crt \
  -extensions v3_ca

# Import the certificate into Ceph
# This stores the certificate in the Ceph configuration store
ceph dashboard set-ssl-certificate -i dashboard.crt

# Import the private key into Ceph
# The key is securely stored and used for SSL termination
ceph dashboard set-ssl-certificate-key -i dashboard.key
```

### Option 2: Use Let's Encrypt Certificates

For production environments, use certificates from a trusted CA like Let's Encrypt:

```bash
# Install certbot for certificate management
# Certbot automates the process of obtaining and renewing certificates
apt-get update && apt-get install -y certbot

# Obtain a certificate from Let's Encrypt
# Make sure port 80 is accessible from the internet
certbot certonly --standalone \
  -d ceph-dashboard.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com

# Import the Let's Encrypt certificate into Ceph
ceph dashboard set-ssl-certificate \
  -i /etc/letsencrypt/live/ceph-dashboard.example.com/fullchain.pem

# Import the private key
ceph dashboard set-ssl-certificate-key \
  -i /etc/letsencrypt/live/ceph-dashboard.example.com/privkey.pem
```

### Enabling SSL on the Dashboard

Once certificates are configured, enable SSL:

```bash
# Enable SSL mode for the dashboard
# When enabled, all HTTP requests are redirected to HTTPS
ceph config set mgr mgr/dashboard/ssl true

# Restart the dashboard module to apply SSL settings
ceph mgr module disable dashboard
ceph mgr module enable dashboard
```

## Configuring Dashboard Network Settings

Configure the dashboard to listen on specific addresses and ports:

```bash
# Set the dashboard server address
# Use 0.0.0.0 to listen on all interfaces, or specify a particular IP
ceph config set mgr mgr/dashboard/server_addr 0.0.0.0

# Set the SSL port (default is 8443)
# Choose a port that doesn't conflict with other services
ceph config set mgr mgr/dashboard/server_port 8443

# Set the HTTP port for non-SSL connections (if SSL is disabled)
# This is typically used for development only
ceph config set mgr mgr/dashboard/ssl_server_port 8443

# Verify the configuration
ceph config get mgr mgr/dashboard/server_port
```

## Creating Dashboard Administrator Account

The dashboard requires user accounts for authentication. Let's create an administrator account:

```bash
# Create the admin user password file
# Use a strong password with mixed characters
echo 'YourSecurePassword123!' > /tmp/dashboard_password.txt

# Create the admin user with administrator privileges
# The -i flag reads the password from the file for security
ceph dashboard ac-user-create admin -i /tmp/dashboard_password.txt administrator

# Remove the password file for security
rm -f /tmp/dashboard_password.txt

# Verify the user was created
ceph dashboard ac-user-show admin
```

## User Management and Role-Based Access Control (RBAC)

The Ceph Dashboard implements a comprehensive RBAC system that allows fine-grained access control.

### Understanding Dashboard Roles

The Dashboard comes with predefined roles:

```mermaid
graph LR
    subgraph "RBAC Hierarchy"
        A[Administrator] --> B[Pool Manager]
        A --> C[Block Manager]
        A --> D[Object Gateway Manager]
        A --> E[Cluster Manager]
        A --> F[Read-Only]

        B --> G[Pool Operations]
        C --> H[RBD Operations]
        D --> I[RGW Operations]
        E --> J[OSD/MON Operations]
        F --> K[View Only]
    end

    style A fill:#ffcdd2
    style F fill:#c8e6c9
```

### Viewing Available Roles

```bash
# List all available roles in the dashboard
# Each role has specific permissions for different components
ceph dashboard ac-role-show

# View details of a specific role
# This shows what permissions are granted
ceph dashboard ac-role-show administrator
```

### Creating Custom Roles

Create custom roles tailored to your organization's needs:

```bash
# Create a new role for monitoring users
# This role will have read-only access to cluster information
ceph dashboard ac-role-create monitoring-team

# Add permissions to the custom role
# 'read' scope allows viewing but not modifying resources
ceph dashboard ac-role-add-scope-perms monitoring-team \
  cluster read

# Add additional scopes for comprehensive monitoring access
ceph dashboard ac-role-add-scope-perms monitoring-team \
  pool read

ceph dashboard ac-role-add-scope-perms monitoring-team \
  osd read

ceph dashboard ac-role-add-scope-perms monitoring-team \
  monitor read

ceph dashboard ac-role-add-scope-perms monitoring-team \
  hosts read

# Verify the role configuration
ceph dashboard ac-role-show monitoring-team
```

### Managing Users

Create users and assign them to appropriate roles:

```bash
# Create a monitoring user with the custom role
echo 'MonitoringPass456!' > /tmp/monitor_pass.txt

ceph dashboard ac-user-create monitor-user \
  -i /tmp/monitor_pass.txt \
  monitoring-team

rm -f /tmp/monitor_pass.txt

# Create a storage admin with block manager role
echo 'StorageAdmin789!' > /tmp/storage_pass.txt

ceph dashboard ac-user-create storage-admin \
  -i /tmp/storage_pass.txt \
  block-manager

rm -f /tmp/storage_pass.txt

# List all users
ceph dashboard ac-user-show

# Modify user role assignment
# Useful when user responsibilities change
ceph dashboard ac-user-set-roles storage-admin pool-manager block-manager
```

### Password and Security Policies

Configure password policies for enhanced security:

```bash
# Enable password expiration (value in days)
# Users must change passwords periodically
ceph dashboard set-pwd-policy-enabled true

# Set minimum password length
ceph dashboard set-pwd-policy-min-length 12

# Require password complexity
# Must include uppercase, lowercase, numbers, and special characters
ceph dashboard set-pwd-policy-check-complexity-enabled true

# Set password expiration period (in days)
ceph dashboard set-pwd-policy-expiration-days 90

# View current password policy settings
ceph dashboard get-pwd-policy-enabled
```

## Exploring Dashboard Features

Once logged in, the Ceph Dashboard provides numerous features for cluster management:

### Cluster Overview

The main dashboard displays:

```mermaid
graph TB
    subgraph "Dashboard Overview"
        A[Health Status] --> B[Capacity Usage]
        A --> C[Performance Metrics]

        subgraph "Key Metrics"
            D[IOPS]
            E[Throughput]
            F[Latency]
        end

        subgraph "Capacity"
            G[Raw Capacity]
            H[Used Space]
            I[Available Space]
        end

        subgraph "Component Status"
            J[MON Status]
            K[OSD Status]
            L[MDS Status]
            M[RGW Status]
        end
    end

    B --> G
    B --> H
    B --> I
    C --> D
    C --> E
    C --> F
```

### Managing Pools via Dashboard CLI

While the GUI is intuitive, you can also manage pools via CLI:

```bash
# Create a replicated pool through the dashboard backend
# This creates a pool with 3 replicas for data redundancy
ceph osd pool create mydata 128 128 replicated

# Enable the pool for RBD usage
# Required before creating RBD images in this pool
ceph osd pool application enable mydata rbd

# Set pool quota to prevent runaway usage
# This limits the pool to 1TB of data
ceph osd pool set-quota mydata max_bytes 1099511627776
```

### RBD (Block Storage) Management

The Dashboard provides comprehensive RBD management:

```bash
# View RBD images through the dashboard API
# Uses the RESTful API endpoint for RBD operations
curl -k -u admin:YourSecurePassword123! \
  https://localhost:8443/api/block/image

# Create an RBD image using the CLI
# The dashboard displays images created through any method
rbd create mydata/myimage --size 100G

# Enable RBD image features for advanced functionality
rbd feature enable mydata/myimage journaling
rbd feature enable mydata/myimage deep-flatten
```

### OSD Management

Monitor and manage OSDs through the dashboard:

```bash
# View OSD tree showing the CRUSH hierarchy
ceph osd tree

# Mark an OSD as out for maintenance
# The dashboard reflects this status change immediately
ceph osd out osd.1

# View OSD performance metrics
ceph osd perf

# Check OSD utilization
ceph osd df
```

## Enabling Prometheus Metrics Export

The Dashboard can export metrics to Prometheus for advanced monitoring:

```bash
# Enable the Prometheus module
# This exposes metrics on port 9283 by default
ceph mgr module enable prometheus

# Configure the Prometheus endpoint address
ceph config set mgr mgr/prometheus/server_addr 0.0.0.0

# Set the Prometheus metrics port
ceph config set mgr mgr/prometheus/server_port 9283

# Verify Prometheus module is running
curl -s http://localhost:9283/metrics | head -20
```

Create a Prometheus scrape configuration:

```yaml
# prometheus.yml - Add this job to your Prometheus configuration
# This scrape config collects Ceph cluster metrics
scrape_configs:
  - job_name: 'ceph'
    # Scrape interval determines metric freshness
    # 15 seconds provides good granularity without excessive load
    scrape_interval: 15s

    # Static targets for Ceph manager nodes
    # Add all manager hosts for high availability
    static_configs:
      - targets:
          - 'ceph-mgr-1:9283'
          - 'ceph-mgr-2:9283'
        labels:
          cluster: 'production-ceph'

    # Honor labels prevents metric label collisions
    honor_labels: true

    # Metric relabeling for consistency
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'ceph_(.+)'
        target_label: '__name__'
        replacement: 'ceph_${1}'
```

## Grafana Integration

Grafana provides advanced visualization capabilities for Ceph metrics. Here's how to integrate them:

### Setting Up Grafana

```bash
# Install Grafana on your monitoring server
apt-get update && apt-get install -y grafana

# Enable and start Grafana service
systemctl enable grafana-server
systemctl start grafana-server
```

### Configuring Ceph Dashboard to Embed Grafana

```bash
# Set the Grafana API URL
# This enables the dashboard to embed Grafana panels
ceph dashboard set-grafana-api-url https://grafana.example.com:3000

# Set the Grafana admin credentials for API access
ceph dashboard set-grafana-api-username admin
ceph dashboard set-grafana-api-password GrafanaPassword123

# Enable Grafana SSL verification (set to false for self-signed certs)
ceph dashboard set-grafana-api-ssl-verify false

# Set the Grafana frontend URL for iframe embedding
ceph dashboard set-grafana-frontend-api-url https://grafana.example.com:3000
```

### Importing Ceph Dashboards into Grafana

```bash
# Download the official Ceph Grafana dashboards
# These dashboards are maintained by the Ceph community
git clone https://github.com/ceph/ceph.git /tmp/ceph-source

# The dashboard JSON files are located in:
# /tmp/ceph-source/monitoring/ceph-mixin/dashboards_out/

# Import dashboards using Grafana API
# First, create an API key in Grafana
GRAFANA_API_KEY="your-api-key"
GRAFANA_URL="https://grafana.example.com:3000"

# Import the cluster overview dashboard
curl -X POST \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @/tmp/ceph-source/monitoring/ceph-mixin/dashboards_out/ceph-cluster.json \
  "${GRAFANA_URL}/api/dashboards/db"
```

### Grafana Dashboard Architecture

```mermaid
graph TB
    subgraph "Monitoring Stack"
        A[Ceph Cluster] --> B[Prometheus Exporter]
        B --> C[Prometheus Server]
        C --> D[Grafana]

        subgraph "Grafana Dashboards"
            E[Cluster Overview]
            F[OSD Performance]
            G[Pool Statistics]
            H[RBD Metrics]
            I[RGW Metrics]
        end

        D --> E
        D --> F
        D --> G
        D --> H
        D --> I

        subgraph "Ceph Dashboard"
            J[Embedded Grafana Panels]
            K[Native Metrics View]
        end

        D -.-> J
        A --> K
    end

    style A fill:#e8f5e9
    style C fill:#fce4ec
    style D fill:#f3e5f5
```

## Enabling Object Gateway (RGW) Management

If you use Ceph Object Gateway, enable its management in the dashboard:

```bash
# Create RGW admin credentials for dashboard access
radosgw-admin user create \
  --uid=dashboard \
  --display-name="Dashboard Admin" \
  --system

# Get the access key and secret key from the output
# Store them for the next step

# Configure RGW credentials in the dashboard
ceph dashboard set-rgw-api-access-key <access-key>
ceph dashboard set-rgw-api-secret-key <secret-key>

# Set the RGW API host and port
ceph dashboard set-rgw-api-host rgw.example.com
ceph dashboard set-rgw-api-port 443
ceph dashboard set-rgw-api-scheme https

# Enable SSL verification for RGW API
ceph dashboard set-rgw-api-ssl-verify true
```

## Enabling iSCSI Management

For iSCSI gateway management through the dashboard:

```bash
# Install the iSCSI gateway package
apt-get install -y ceph-iscsi

# Configure iSCSI API credentials
ceph dashboard iscsi-gateway-add \
  https://admin:password@iscsi-gw-1.example.com:5000

# Add additional gateways for high availability
ceph dashboard iscsi-gateway-add \
  https://admin:password@iscsi-gw-2.example.com:5000

# List configured iSCSI gateways
ceph dashboard iscsi-gateway-list
```

## Dashboard High Availability

The Dashboard runs on the active manager daemon. Configure HA for continuous availability:

```mermaid
graph TB
    subgraph "High Availability Setup"
        A[Load Balancer] --> B[Active MGR]
        A --> C[Standby MGR 1]
        A --> D[Standby MGR 2]

        B --> E[Dashboard Instance]
        C -.-> F[Standby Dashboard]
        D -.-> G[Standby Dashboard]

        subgraph "Failover"
            H[VIP or DNS]
            I[Health Checks]
        end

        A --> H
        A --> I
    end

    style B fill:#c8e6c9
    style C fill:#fff9c4
    style D fill:#fff9c4
```

### Configure HAProxy for Dashboard HA

```bash
# Install HAProxy for load balancing
apt-get install -y haproxy
```

Create the HAProxy configuration:

```bash
# /etc/haproxy/haproxy.cfg
# HAProxy configuration for Ceph Dashboard high availability
cat << 'EOF' > /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client 50000
    timeout server 50000

# Ceph Dashboard frontend
frontend ceph_dashboard_front
    # Listen on the standard HTTPS port
    bind *:443 ssl crt /etc/haproxy/certs/dashboard.pem
    default_backend ceph_dashboard_back

# Ceph Dashboard backend with health checks
backend ceph_dashboard_back
    balance roundrobin
    option httpchk GET /api/health
    http-check expect status 200

    # Dashboard servers - only the active manager responds
    # Use 'backup' keyword for standby managers
    server ceph-mgr-1 10.0.0.11:8443 ssl verify none check
    server ceph-mgr-2 10.0.0.12:8443 ssl verify none check backup
    server ceph-mgr-3 10.0.0.13:8443 ssl verify none check backup
EOF

# Restart HAProxy to apply configuration
systemctl restart haproxy
```

## Troubleshooting Common Issues

### Dashboard Not Accessible

```bash
# Check if the dashboard module is enabled
ceph mgr module ls | grep dashboard

# Verify the manager daemon is running
ceph mgr stat

# Check the dashboard URL
ceph mgr services

# View dashboard-specific logs
ceph log last 100 | grep dashboard
```

### SSL Certificate Issues

```bash
# Verify certificate is correctly configured
ceph config-key get mgr/dashboard/crt

# Check SSL is enabled
ceph config get mgr mgr/dashboard/ssl

# Test SSL connection
openssl s_client -connect localhost:8443 -servername ceph-dashboard.example.com
```

### User Authentication Problems

```bash
# Reset admin password
echo 'NewPassword123!' > /tmp/new_pass.txt
ceph dashboard ac-user-set-password admin -i /tmp/new_pass.txt
rm -f /tmp/new_pass.txt

# Check user exists
ceph dashboard ac-user-show admin

# View user roles
ceph dashboard ac-user-show admin | grep roles
```

## Security Best Practices

```mermaid
graph TB
    subgraph "Security Layers"
        A[Network Firewall] --> B[SSL/TLS Encryption]
        B --> C[Authentication]
        C --> D[RBAC Authorization]
        D --> E[Audit Logging]

        subgraph "Additional Measures"
            F[Password Policies]
            G[Session Timeout]
            H[IP Whitelisting]
            I[2FA Optional]
        end
    end

    style A fill:#ffcdd2
    style B fill:#f8bbd9
    style C fill:#e1bee7
    style D fill:#d1c4e9
    style E fill:#c5cae9
```

Implement these security best practices:

```bash
# Enable audit logging to track user actions
ceph config set mgr mgr/dashboard/audit_api_enabled true
ceph config set mgr mgr/dashboard/audit_api_log_payload true

# Set session timeout (in seconds)
# Sessions expire after 30 minutes of inactivity
ceph dashboard set-session-expire 1800

# Restrict dashboard access by network
# Configure firewall rules
ufw allow from 10.0.0.0/8 to any port 8443 proto tcp
ufw deny 8443

# Enable CORS restrictions for API security
ceph dashboard set-cors-origin https://dashboard.example.com
```

## Conclusion

The Ceph Dashboard provides a powerful, integrated solution for managing and monitoring your Ceph storage cluster. By following this guide, you have:

1. **Enabled and configured** the Dashboard module with SSL encryption
2. **Set up user authentication** with strong password policies
3. **Implemented RBAC** for fine-grained access control
4. **Integrated with Prometheus and Grafana** for advanced monitoring
5. **Configured high availability** for production deployments
6. **Applied security best practices** to protect your cluster

The Dashboard continues to evolve with each Ceph release, adding new features and improving the user experience. Keep your cluster updated to benefit from the latest enhancements and security patches.

For more information, refer to the official Ceph Dashboard documentation at https://docs.ceph.com/en/latest/mgr/dashboard/.
