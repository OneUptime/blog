# How to Set Up Keycloak for Single Sign-On (SSO) on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Keycloak, SSO, Identity Management, OAuth, OIDC, Tutorial

Description: Complete guide to installing and configuring Keycloak identity and access management on Ubuntu for SSO.

---

Single Sign-On (SSO) has become essential for modern organizations managing multiple applications and services. Keycloak, an open-source identity and access management solution developed by Red Hat, provides enterprise-grade SSO capabilities with support for standard protocols like OpenID Connect (OIDC) and SAML 2.0. This comprehensive guide walks you through setting up Keycloak on Ubuntu, from basic installation to advanced configurations for production environments.

## Table of Contents

1. [Understanding Keycloak Concepts](#understanding-keycloak-concepts)
2. [Prerequisites](#prerequisites)
3. [Installation Methods](#installation-methods)
4. [Initial Admin Setup](#initial-admin-setup)
5. [Creating Realms and Clients](#creating-realms-and-clients)
6. [Configuring Identity Providers](#configuring-identity-providers)
7. [OIDC and SAML Configuration](#oidc-and-saml-configuration)
8. [User Federation](#user-federation)
9. [Role-Based Access Control](#role-based-access-control)
10. [Reverse Proxy Configuration with Nginx](#reverse-proxy-configuration-with-nginx)
11. [Database Configuration with PostgreSQL](#database-configuration-with-postgresql)
12. [High Availability Setup](#high-availability-setup)
13. [Backup and Restore](#backup-and-restore)
14. [Monitoring with OneUptime](#monitoring-with-oneuptime)

---

## Understanding Keycloak Concepts

Before diving into the installation, it is important to understand the core concepts that form the foundation of Keycloak's architecture.

### Realms

A realm is the top-level container in Keycloak that manages a set of users, credentials, roles, and groups. Think of a realm as a tenant in a multi-tenant system. Each realm is isolated from other realms, meaning users and configurations in one realm do not affect another.

```
Keycloak Instance
├── Master Realm (administrative)
├── Production Realm
│   ├── Users
│   ├── Clients
│   ├── Roles
│   └── Identity Providers
└── Development Realm
    ├── Users
    ├── Clients
    ├── Roles
    └── Identity Providers
```

### Clients

Clients are applications or services that request Keycloak to authenticate users. Each client has a unique client ID and can be configured with different authentication flows, redirect URIs, and access policies.

**Types of Clients:**
- **Confidential Clients**: Server-side applications that can securely store credentials
- **Public Clients**: Browser-based or mobile applications that cannot securely store credentials
- **Bearer-only Clients**: Services that only validate access tokens

### Users

Users are entities that can authenticate to Keycloak. Users can be created directly in Keycloak or synchronized from external sources like LDAP or Active Directory.

### Roles

Roles define permissions and access levels. Keycloak supports two types of roles:
- **Realm Roles**: Apply across all clients in a realm
- **Client Roles**: Specific to a particular client

### Groups

Groups allow you to organize users and apply common attributes and role mappings to multiple users simultaneously.

---

## Prerequisites

### System Requirements

For a production Keycloak deployment on Ubuntu, ensure your system meets these requirements:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2 GB | 4+ GB |
| Disk | 10 GB | 50+ GB SSD |
| Ubuntu | 22.04 LTS | 24.04 LTS |

### Installing Java

Keycloak requires Java 17 or higher. Install OpenJDK on Ubuntu:

```bash
# Update package index to ensure we get the latest package information
sudo apt update

# Install OpenJDK 17 (LTS version recommended for Keycloak)
sudo apt install -y openjdk-17-jdk

# Verify the installation was successful
java -version
# Expected output: openjdk version "17.x.x"

# Set JAVA_HOME environment variable for Keycloak to locate Java
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Apply the changes to the current session
source ~/.bashrc

# Verify JAVA_HOME is set correctly
echo $JAVA_HOME
# Expected output: /usr/lib/jvm/java-17-openjdk-amd64
```

### Installing Required Utilities

```bash
# Install essential utilities for downloading, extracting, and managing Keycloak
sudo apt install -y wget curl unzip

# Install jq for parsing JSON responses from Keycloak API
sudo apt install -y jq
```

---

## Installation Methods

### Method 1: Standalone Installation (Bare Metal)

This method installs Keycloak directly on your Ubuntu server, providing full control over the configuration.

```bash
# Define the Keycloak version to install (check https://www.keycloak.org for latest)
KEYCLOAK_VERSION="24.0.1"

# Create a dedicated directory for Keycloak installation
sudo mkdir -p /opt/keycloak

# Download Keycloak distribution from the official GitHub releases
# Using wget with progress bar for visibility during download
wget -q --show-progress \
    "https://github.com/keycloak/keycloak/releases/download/${KEYCLOAK_VERSION}/keycloak-${KEYCLOAK_VERSION}.tar.gz" \
    -O /tmp/keycloak.tar.gz

# Extract the archive to the installation directory
# --strip-components=1 removes the top-level directory from the archive
sudo tar -xzf /tmp/keycloak.tar.gz -C /opt/keycloak --strip-components=1

# Create a dedicated system user for running Keycloak
# Using --system creates a system account without home directory login capabilities
sudo useradd --system --no-create-home --shell /usr/sbin/nologin keycloak

# Set ownership of Keycloak directory to the keycloak user
sudo chown -R keycloak:keycloak /opt/keycloak

# Clean up the downloaded archive
rm /tmp/keycloak.tar.gz
```

Create a systemd service file for managing Keycloak:

```bash
# Create the systemd service unit file
sudo tee /etc/systemd/system/keycloak.service > /dev/null << 'EOF'
[Unit]
# Description helps identify the service in logs and status outputs
Description=Keycloak Identity and Access Management Server
# Ensure network is available before starting Keycloak
After=network.target

[Service]
# Type=idle ensures the service starts after other jobs are dispatched
Type=idle

# Run Keycloak as the dedicated keycloak user for security
User=keycloak
Group=keycloak

# Set the working directory to Keycloak installation
WorkingDirectory=/opt/keycloak

# Environment variables for Keycloak configuration
# KEYCLOAK_ADMIN: Initial admin username (only used on first start)
Environment=KEYCLOAK_ADMIN=admin
# KEYCLOAK_ADMIN_PASSWORD: Initial admin password (change immediately after setup)
Environment=KEYCLOAK_ADMIN_PASSWORD=changeme

# Start Keycloak in production mode
# --optimized: Use pre-built optimized configuration
# --hostname-strict=false: Allow access from any hostname (configure properly for production)
ExecStart=/opt/keycloak/bin/kc.sh start --optimized --hostname-strict=false

# Restart policy: always restart unless explicitly stopped
Restart=always
RestartSec=10

# Security hardening options
# Prevent the service from gaining new privileges
NoNewPrivileges=true

# Limit file descriptor usage
LimitNOFILE=65535

[Install]
# Enable the service to start at boot in multi-user mode
WantedBy=multi-user.target
EOF
```

Build and start Keycloak:

```bash
# Build Keycloak with production optimizations
# This step pre-compiles templates and optimizes startup time
sudo -u keycloak /opt/keycloak/bin/kc.sh build

# Reload systemd to recognize the new service file
sudo systemctl daemon-reload

# Enable Keycloak to start automatically on system boot
sudo systemctl enable keycloak

# Start the Keycloak service
sudo systemctl start keycloak

# Verify the service is running
sudo systemctl status keycloak

# View real-time logs if troubleshooting is needed
# sudo journalctl -u keycloak -f
```

### Method 2: Docker Installation

Docker provides a convenient way to deploy Keycloak with minimal system configuration.

```bash
# Install Docker if not already installed
# This script detects your distribution and installs Docker CE
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group to run Docker without sudo
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker

# Clean up installation script
rm get-docker.sh
```

Create a Docker Compose file for Keycloak:

```bash
# Create directory for Keycloak Docker configuration
mkdir -p ~/keycloak-docker
cd ~/keycloak-docker

# Create Docker Compose configuration file
cat > docker-compose.yml << 'EOF'
# Docker Compose version (use version 3.8 for broad compatibility)
version: '3.8'

services:
  # PostgreSQL database service for Keycloak persistence
  postgres:
    # Use PostgreSQL 15 Alpine for smaller image size
    image: postgres:15-alpine
    container_name: keycloak-postgres

    # Environment variables for PostgreSQL initialization
    environment:
      # Database name for Keycloak
      POSTGRES_DB: keycloak
      # Database user (should match Keycloak configuration)
      POSTGRES_USER: keycloak
      # Database password (use secrets in production)
      POSTGRES_PASSWORD: keycloak_db_password

    # Persist database data across container restarts
    volumes:
      - postgres_data:/var/lib/postgresql/data

    # Use internal network for database isolation
    networks:
      - keycloak-network

    # Health check to ensure database is ready before Keycloak starts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak -d keycloak"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Keycloak identity provider service
  keycloak:
    # Use official Keycloak image
    image: quay.io/keycloak/keycloak:24.0.1
    container_name: keycloak

    # Environment variables for Keycloak configuration
    environment:
      # Initial admin credentials (change after first login)
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: changeme

      # Database connection settings
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak_db_password

      # Hostname configuration for proper URL generation
      KC_HOSTNAME_STRICT: "false"
      KC_PROXY: edge

      # Enable health and metrics endpoints
      KC_HEALTH_ENABLED: "true"
      KC_METRICS_ENABLED: "true"

    # Start Keycloak in production mode
    command: start --optimized

    # Expose Keycloak on port 8080
    ports:
      - "8080:8080"

    # Wait for PostgreSQL to be healthy before starting
    depends_on:
      postgres:
        condition: service_healthy

    # Use internal network
    networks:
      - keycloak-network

# Define named volumes for data persistence
volumes:
  postgres_data:
    driver: local

# Define internal network for service communication
networks:
  keycloak-network:
    driver: bridge
EOF
```

Build and start the Docker containers:

```bash
# Build the Keycloak image with optimizations
# This creates a custom image with pre-built configuration
docker compose build

# Start all services in detached mode
docker compose up -d

# View logs to monitor startup progress
docker compose logs -f keycloak

# Check container status
docker compose ps
```

---

## Initial Admin Setup

After installation, access the Keycloak admin console to complete initial setup.

### Accessing the Admin Console

```bash
# For standalone installation, Keycloak runs on port 8080 by default
# Open in browser: http://your-server-ip:8080

# Verify Keycloak is responding
curl -s http://localhost:8080/health/ready | jq .
# Expected output: {"status": "UP", "checks": [...]}

# For Docker installation, same URL applies
# http://localhost:8080
```

### Creating Initial Admin User (if not set via environment)

If you did not set admin credentials via environment variables:

```bash
# Navigate to Keycloak installation directory
cd /opt/keycloak

# Create initial admin user using the CLI
# This command is only available on first startup before any admin exists
sudo -u keycloak ./bin/kc.sh bootstrap-admin user \
    --username admin \
    --password 'YourSecurePassword123!'

# Alternative: Use environment variables and restart
sudo systemctl stop keycloak
sudo sed -i 's/KEYCLOAK_ADMIN_PASSWORD=changeme/KEYCLOAK_ADMIN_PASSWORD=YourSecurePassword123!/' \
    /etc/systemd/system/keycloak.service
sudo systemctl daemon-reload
sudo systemctl start keycloak
```

### Securing the Admin Console

```bash
# Create a configuration file to restrict admin console access
# This should be done after initial setup is complete

cat > /opt/keycloak/conf/keycloak.conf << 'EOF'
# Database configuration (update for production)
db=postgres
db-url=jdbc:postgresql://localhost:5432/keycloak
db-username=keycloak
db-password=your_secure_db_password

# HTTP/HTTPS configuration
# Disable HTTP in production, use only HTTPS
http-enabled=false
https-port=8443

# Hostname configuration
# Set to your actual domain in production
hostname=auth.yourdomain.com
hostname-strict=true
hostname-strict-https=true

# Proxy configuration (when behind reverse proxy)
proxy=edge

# Admin console restrictions
# Only allow admin access from specific IP ranges
# http-management-relative-path=/admin

# Metrics and health endpoints
metrics-enabled=true
health-enabled=true

# Logging configuration
log=console,file
log-level=INFO
log-file=/opt/keycloak/data/log/keycloak.log
EOF

# Set proper permissions on configuration file
sudo chown keycloak:keycloak /opt/keycloak/conf/keycloak.conf
sudo chmod 600 /opt/keycloak/conf/keycloak.conf
```

---

## Creating Realms and Clients

### Creating a New Realm via Admin Console

While realms can be created through the web interface, here is how to automate realm creation using the Keycloak Admin CLI:

```bash
# First, obtain an admin access token for API authentication
# Store credentials securely - never hardcode in production scripts
KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="YourSecurePassword123!"

# Get access token using password grant
# This token is used for subsequent API calls
ACCESS_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${ADMIN_USER}" \
    -d "password=${ADMIN_PASS}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | jq -r '.access_token')

# Verify token was obtained successfully
if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo "Failed to obtain access token. Check credentials."
    exit 1
fi

echo "Successfully obtained admin access token"
```

### Creating a Realm Programmatically

```bash
# Define the realm configuration as JSON
# This configuration sets up a production-ready realm
cat > /tmp/realm-config.json << 'EOF'
{
    "realm": "mycompany",
    "enabled": true,
    "displayName": "My Company",
    "displayNameHtml": "<h1>My Company Authentication</h1>",

    "registrationAllowed": false,
    "registrationEmailAsUsername": true,
    "rememberMe": true,
    "verifyEmail": true,
    "resetPasswordAllowed": true,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,

    "sslRequired": "external",

    "accessTokenLifespan": 300,
    "accessTokenLifespanForImplicitFlow": 900,
    "ssoSessionIdleTimeout": 1800,
    "ssoSessionMaxLifespan": 36000,
    "offlineSessionIdleTimeout": 2592000,
    "accessCodeLifespan": 60,
    "accessCodeLifespanUserAction": 300,
    "accessCodeLifespanLogin": 1800,

    "bruteForceProtected": true,
    "permanentLockout": false,
    "maxFailureWaitSeconds": 900,
    "minimumQuickLoginWaitSeconds": 60,
    "waitIncrementSeconds": 60,
    "quickLoginCheckMilliSeconds": 1000,
    "maxDeltaTimeSeconds": 43200,
    "failureFactor": 5,

    "passwordPolicy": "length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and notUsername(undefined)",

    "smtpServer": {
        "host": "smtp.yourdomain.com",
        "port": "587",
        "from": "noreply@yourdomain.com",
        "fromDisplayName": "My Company Auth",
        "auth": "true",
        "starttls": "true",
        "user": "smtp-user",
        "password": "smtp-password"
    },

    "internationalizationEnabled": true,
    "supportedLocales": ["en", "es", "fr", "de"],
    "defaultLocale": "en"
}
EOF

# Create the realm using the Admin REST API
curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/realm-config.json

echo "Realm 'mycompany' created successfully"
```

### Creating Clients

```bash
# Create a confidential client for a backend application
# Confidential clients can securely store secrets
cat > /tmp/backend-client.json << 'EOF'
{
    "clientId": "backend-api",
    "name": "Backend API Service",
    "description": "Internal backend API that validates tokens",
    "enabled": true,

    "clientAuthenticatorType": "client-secret",
    "secret": "your-client-secret-here",

    "protocol": "openid-connect",

    "publicClient": false,
    "bearerOnly": false,
    "consentRequired": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,

    "redirectUris": [
        "https://api.yourdomain.com/callback",
        "https://api.yourdomain.com/oauth2/callback"
    ],

    "webOrigins": [
        "https://api.yourdomain.com"
    ],

    "attributes": {
        "access.token.lifespan": "300",
        "oauth2.device.authorization.grant.enabled": "false",
        "backchannel.logout.session.required": "true",
        "backchannel.logout.revoke.offline.tokens": "false"
    },

    "defaultClientScopes": [
        "openid",
        "profile",
        "email",
        "roles"
    ],

    "optionalClientScopes": [
        "address",
        "phone",
        "offline_access"
    ]
}
EOF

# Create the backend client
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/clients" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/backend-client.json

echo "Backend API client created"

# Create a public client for a frontend SPA application
# Public clients cannot store secrets securely
cat > /tmp/frontend-client.json << 'EOF'
{
    "clientId": "frontend-app",
    "name": "Frontend Web Application",
    "description": "React/Vue/Angular SPA that authenticates users",
    "enabled": true,

    "protocol": "openid-connect",

    "publicClient": true,
    "bearerOnly": false,
    "consentRequired": false,
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": false,
    "serviceAccountsEnabled": false,

    "rootUrl": "https://app.yourdomain.com",
    "baseUrl": "/",

    "redirectUris": [
        "https://app.yourdomain.com/*",
        "http://localhost:3000/*"
    ],

    "webOrigins": [
        "https://app.yourdomain.com",
        "http://localhost:3000"
    ],

    "attributes": {
        "pkce.code.challenge.method": "S256",
        "post.logout.redirect.uris": "https://app.yourdomain.com/*"
    },

    "defaultClientScopes": [
        "openid",
        "profile",
        "email"
    ]
}
EOF

# Create the frontend client
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/clients" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/frontend-client.json

echo "Frontend SPA client created"
```

---

## Configuring Identity Providers

Keycloak supports various external identity providers for social login and enterprise federation.

### Google Identity Provider

```bash
# Configure Google as an identity provider
# First, create OAuth credentials in Google Cloud Console:
# https://console.cloud.google.com/apis/credentials

cat > /tmp/google-idp.json << 'EOF'
{
    "alias": "google",
    "displayName": "Sign in with Google",
    "providerId": "google",
    "enabled": true,
    "trustEmail": true,
    "storeToken": false,
    "addReadTokenRoleOnCreate": false,
    "firstBrokerLoginFlowAlias": "first broker login",
    "postBrokerLoginFlowAlias": "",

    "config": {
        "clientId": "your-google-client-id.apps.googleusercontent.com",
        "clientSecret": "your-google-client-secret",
        "hostedDomain": "yourdomain.com",
        "userIp": "false",
        "offlineAccess": "false",
        "syncMode": "IMPORT",
        "defaultScope": "openid profile email"
    }
}
EOF

# Create Google identity provider
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/identity-provider/instances" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/google-idp.json

echo "Google identity provider configured"

# Create mapper to extract Google user attributes
cat > /tmp/google-mapper.json << 'EOF'
{
    "name": "google-email-mapper",
    "identityProviderAlias": "google",
    "identityProviderMapper": "hardcoded-attribute-idp-mapper",
    "config": {
        "syncMode": "INHERIT",
        "attribute": "email_verified",
        "attribute.value": "true"
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/identity-provider/instances/google/mappers" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/google-mapper.json
```

### GitHub Identity Provider

```bash
# Configure GitHub as an identity provider
# Create OAuth App in GitHub: Settings > Developer Settings > OAuth Apps

cat > /tmp/github-idp.json << 'EOF'
{
    "alias": "github",
    "displayName": "Sign in with GitHub",
    "providerId": "github",
    "enabled": true,
    "trustEmail": true,
    "storeToken": true,
    "addReadTokenRoleOnCreate": false,
    "firstBrokerLoginFlowAlias": "first broker login",

    "config": {
        "clientId": "your-github-client-id",
        "clientSecret": "your-github-client-secret",
        "syncMode": "IMPORT",
        "defaultScope": "user:email read:org"
    }
}
EOF

# Create GitHub identity provider
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/identity-provider/instances" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/github-idp.json

echo "GitHub identity provider configured"

# Create mapper for GitHub organization membership
# This allows role assignment based on GitHub organization
cat > /tmp/github-org-mapper.json << 'EOF'
{
    "name": "github-org-role-mapper",
    "identityProviderAlias": "github",
    "identityProviderMapper": "hardcoded-role-idp-mapper",
    "config": {
        "syncMode": "INHERIT",
        "role": "github-user"
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/identity-provider/instances/github/mappers" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/github-org-mapper.json
```

### LDAP Identity Provider

```bash
# Configure LDAP/Active Directory as a user federation provider
# This synchronizes users from your corporate directory

cat > /tmp/ldap-federation.json << 'EOF'
{
    "name": "corporate-ldap",
    "providerId": "ldap",
    "providerType": "org.keycloak.storage.UserStorageProvider",

    "config": {
        "enabled": ["true"],
        "priority": ["0"],

        "editMode": ["READ_ONLY"],
        "syncRegistrations": ["false"],
        "vendor": ["ad"],

        "connectionUrl": ["ldap://ldap.yourdomain.com:389"],
        "startTls": ["true"],
        "authType": ["simple"],
        "bindDn": ["cn=keycloak-bind,ou=Service Accounts,dc=yourdomain,dc=com"],
        "bindCredential": ["your-ldap-bind-password"],

        "usersDn": ["ou=Users,dc=yourdomain,dc=com"],
        "usernameLDAPAttribute": ["sAMAccountName"],
        "rdnLDAPAttribute": ["cn"],
        "uuidLDAPAttribute": ["objectGUID"],
        "userObjectClasses": ["person, organizationalPerson, user"],

        "searchScope": ["2"],
        "pagination": ["true"],
        "batchSizeForSync": ["1000"],

        "importEnabled": ["true"],
        "syncPeriod": ["-1"],
        "fullSyncPeriod": ["604800"],
        "changedSyncPeriod": ["86400"],

        "connectionPooling": ["true"],
        "connectionTimeout": ["30000"],
        "readTimeout": ["30000"],

        "trustEmail": ["true"],
        "validatePasswordPolicy": ["false"]
    }
}
EOF

# Get realm ID for the federation endpoint
REALM_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.id')

# Create LDAP user federation
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/components" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/ldap-federation.json

echo "LDAP federation configured"

# Get the LDAP component ID for adding mappers
LDAP_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/components?type=org.keycloak.storage.UserStorageProvider" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].id')

# Create LDAP attribute mappers for user synchronization
# Email mapper
cat > /tmp/ldap-email-mapper.json << 'EOF'
{
    "name": "email",
    "providerId": "user-attribute-ldap-mapper",
    "providerType": "org.keycloak.storage.ldap.mappers.LDAPStorageMapper",
    "config": {
        "ldap.attribute": ["mail"],
        "user.model.attribute": ["email"],
        "is.mandatory.in.ldap": ["false"],
        "always.read.value.from.ldap": ["true"],
        "read.only": ["true"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/components?parent=${LDAP_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/ldap-email-mapper.json

# Group mapper for LDAP group synchronization
cat > /tmp/ldap-group-mapper.json << 'EOF'
{
    "name": "groups",
    "providerId": "group-ldap-mapper",
    "providerType": "org.keycloak.storage.ldap.mappers.LDAPStorageMapper",
    "config": {
        "groups.dn": ["ou=Groups,dc=yourdomain,dc=com"],
        "group.name.ldap.attribute": ["cn"],
        "group.object.classes": ["group"],
        "membership.ldap.attribute": ["member"],
        "membership.attribute.type": ["DN"],
        "membership.user.ldap.attribute": ["cn"],
        "mode": ["READ_ONLY"],
        "user.roles.retrieve.strategy": ["LOAD_GROUPS_BY_MEMBER_ATTRIBUTE"],
        "memberof.ldap.attribute": ["memberOf"],
        "groups.path": ["/"],
        "drop.non.existing.groups.during.sync": ["false"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/components?parent=${LDAP_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/ldap-group-mapper.json

echo "LDAP mappers configured"
```

---

## OIDC and SAML Configuration

### OpenID Connect (OIDC) Configuration

OIDC is the recommended protocol for modern applications. Here is a complete example of integrating a Node.js application:

```javascript
// Example: Node.js Express application with Keycloak OIDC
// File: app.js

const express = require('express');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const app = express();

// Configure session storage
// In production, use Redis or another persistent store
const memoryStore = new session.MemoryStore();

app.use(session({
    // Secret for signing session cookies - use environment variable in production
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

// Keycloak configuration object
// These values come from your Keycloak client configuration
const keycloakConfig = {
    // The realm containing your client
    realm: 'mycompany',

    // URL to your Keycloak server
    'auth-server-url': 'https://auth.yourdomain.com/',

    // Enable SSL requirement (should be true in production)
    'ssl-required': 'external',

    // Your client ID from Keycloak
    resource: 'backend-api',

    // Client credentials for confidential clients
    credentials: {
        secret: process.env.KEYCLOAK_CLIENT_SECRET || 'your-client-secret'
    },

    // Use cookies for session management
    'bearer-only': false,

    // Confidential client type
    'confidential-port': 0
};

// Initialize Keycloak middleware
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

// Apply Keycloak middleware to all routes
app.use(keycloak.middleware({
    // Endpoint for logging out
    logout: '/logout',
    // Enable admin functionality
    admin: '/'
}));

// Public route - no authentication required
app.get('/', (req, res) => {
    res.send('Welcome! <a href="/protected">Access Protected Resource</a>');
});

// Protected route - requires authentication
// keycloak.protect() redirects unauthenticated users to login
app.get('/protected', keycloak.protect(), (req, res) => {
    // Access token information is available in req.kauth.grant
    const token = req.kauth.grant.access_token;

    res.json({
        message: 'This is a protected resource',
        user: {
            username: token.content.preferred_username,
            email: token.content.email,
            roles: token.content.realm_access?.roles || []
        }
    });
});

// Route protected by specific role
// Only users with 'admin' role can access this endpoint
app.get('/admin', keycloak.protect('realm:admin'), (req, res) => {
    res.json({
        message: 'Welcome, administrator!',
        adminData: {
            // Admin-specific data here
        }
    });
});

// API endpoint with role-based access
// Requires 'api-access' client role
app.get('/api/data', keycloak.protect('backend-api:api-access'), (req, res) => {
    res.json({
        data: ['item1', 'item2', 'item3']
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Keycloak configured for realm: ${keycloakConfig.realm}`);
});
```

### SAML 2.0 Configuration

For applications requiring SAML authentication:

```bash
# Create a SAML client in Keycloak
cat > /tmp/saml-client.json << 'EOF'
{
    "clientId": "https://app.yourdomain.com/saml/metadata",
    "name": "Legacy SAML Application",
    "description": "Enterprise application using SAML 2.0",
    "enabled": true,

    "protocol": "saml",

    "frontchannelLogout": true,
    "forcePostBinding": true,
    "samlServerSignature": true,
    "samlServerSignatureKeyInfoExt": false,
    "samlClientSignature": true,
    "samlForceNameIdFormat": false,

    "attributes": {
        "saml.assertion.signature": "true",
        "saml.server.signature": "true",
        "saml.server.signature.keyinfo.ext": "false",
        "saml.signature.algorithm": "RSA_SHA256",
        "saml.client.signature": "true",
        "saml_force_name_id_format": "false",
        "saml_name_id_format": "username",
        "saml_signature_canonicalization_method": "http://www.w3.org/2001/10/xml-exc-c14n#",
        "saml.authnstatement": "true",
        "saml.onetimeuse.condition": "false",
        "saml.artifact.binding": "false",
        "saml_idp_initiated_sso_url_name": "legacy-app"
    },

    "redirectUris": [
        "https://app.yourdomain.com/saml/acs"
    ],

    "adminUrl": "https://app.yourdomain.com/saml/metadata",
    "rootUrl": "https://app.yourdomain.com",
    "baseUrl": "/"
}
EOF

# Create the SAML client
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/clients" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/saml-client.json

echo "SAML client created"

# Download SAML metadata for the client
# This XML file is provided to your SAML service provider
curl -s "${KEYCLOAK_URL}/realms/mycompany/protocol/saml/descriptor" \
    -o /tmp/keycloak-saml-metadata.xml

echo "SAML IdP metadata saved to /tmp/keycloak-saml-metadata.xml"
```

Example SAML SP configuration for a Java application:

```xml
<!-- Example: Spring Security SAML Configuration -->
<!-- File: application.yml -->
<!--
spring:
  security:
    saml2:
      relyingparty:
        registration:
          keycloak:
            # Identity Provider metadata URL
            assertingparty:
              metadata-uri: https://auth.yourdomain.com/realms/mycompany/protocol/saml/descriptor
            # Service Provider entity ID
            entity-id: https://app.yourdomain.com/saml/metadata
            # Assertion Consumer Service URL
            acs:
              location: https://app.yourdomain.com/login/saml2/sso/keycloak
            # Signing credentials
            signing:
              credentials:
                - private-key-location: classpath:saml/private-key.pem
                  certificate-location: classpath:saml/certificate.pem
-->
```

---

## User Federation

User federation allows Keycloak to synchronize users from external sources.

### LDAP Federation Synchronization

```bash
# Trigger manual LDAP sync
# First, get the LDAP federation component ID
LDAP_COMPONENT_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/components?type=org.keycloak.storage.UserStorageProvider" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].id')

# Trigger full sync (synchronizes all users)
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/user-storage/${LDAP_COMPONENT_ID}/sync?action=triggerFullSync" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo "Full LDAP sync triggered"

# Trigger changed users sync (only synchronizes modified users)
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/user-storage/${LDAP_COMPONENT_ID}/sync?action=triggerChangedUsersSync" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo "Changed users sync triggered"

# Check sync status
curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/user-storage/${LDAP_COMPONENT_ID}/sync" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq .
```

### Custom User Storage Provider

For integrating with custom user databases:

```java
// Example: Custom User Storage Provider (SPI)
// File: CustomUserStorageProviderFactory.java

package com.example.keycloak;

import org.keycloak.component.ComponentModel;
import org.keycloak.models.KeycloakSession;
import org.keycloak.storage.UserStorageProviderFactory;

/**
 * Factory for creating custom user storage provider instances.
 * Implements Keycloak SPI for external user database integration.
 */
public class CustomUserStorageProviderFactory
        implements UserStorageProviderFactory<CustomUserStorageProvider> {

    // Unique identifier for this provider
    public static final String PROVIDER_ID = "custom-user-provider";

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public CustomUserStorageProvider create(KeycloakSession session, ComponentModel model) {
        // Initialize your custom data source connection here
        // Example: Connect to external REST API, custom database, etc.
        return new CustomUserStorageProvider(session, model);
    }

    @Override
    public String getHelpText() {
        return "Custom User Storage Provider for external user database";
    }
}
```

---

## Role-Based Access Control

### Creating Realm Roles

```bash
# Create realm-level roles that apply across all clients
# Admin role with full access
cat > /tmp/admin-role.json << 'EOF'
{
    "name": "admin",
    "description": "Administrator role with full system access",
    "composite": true,
    "composites": {
        "realm": ["user", "manager"]
    },
    "attributes": {
        "access_level": ["full"],
        "can_manage_users": ["true"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/admin-role.json

# Manager role
cat > /tmp/manager-role.json << 'EOF'
{
    "name": "manager",
    "description": "Manager role with team management capabilities",
    "composite": true,
    "composites": {
        "realm": ["user"]
    },
    "attributes": {
        "access_level": ["elevated"],
        "can_view_reports": ["true"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/manager-role.json

# Basic user role
cat > /tmp/user-role.json << 'EOF'
{
    "name": "user",
    "description": "Basic user role with standard access",
    "composite": false,
    "attributes": {
        "access_level": ["standard"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/user-role.json

echo "Realm roles created"
```

### Creating Client Roles

```bash
# Get the client ID (UUID) for the backend-api client
CLIENT_UUID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/clients?clientId=backend-api" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].id')

# Create client-specific roles
# API read access
cat > /tmp/api-read-role.json << 'EOF'
{
    "name": "api-read",
    "description": "Read-only access to API endpoints",
    "composite": false
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/clients/${CLIENT_UUID}/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/api-read-role.json

# API write access
cat > /tmp/api-write-role.json << 'EOF'
{
    "name": "api-write",
    "description": "Full read-write access to API endpoints",
    "composite": true,
    "composites": {
        "client": {
            "backend-api": ["api-read"]
        }
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/clients/${CLIENT_UUID}/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/api-write-role.json

echo "Client roles created"
```

### Assigning Roles to Users

```bash
# Create a test user
cat > /tmp/test-user.json << 'EOF'
{
    "username": "john.doe",
    "enabled": true,
    "emailVerified": true,
    "email": "john.doe@yourdomain.com",
    "firstName": "John",
    "lastName": "Doe",
    "credentials": [
        {
            "type": "password",
            "value": "TempPassword123!",
            "temporary": true
        }
    ],
    "requiredActions": ["UPDATE_PASSWORD"]
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/users" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/test-user.json

# Get the user ID
USER_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/users?username=john.doe" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].id')

# Get role IDs
ADMIN_ROLE=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/roles/admin" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

# Assign realm role to user
curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/users/${USER_ID}/role-mappings/realm" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "[${ADMIN_ROLE}]"

echo "Roles assigned to user john.doe"

# Assign client role to user
API_WRITE_ROLE=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/clients/${CLIENT_UUID}/roles/api-write" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/users/${USER_ID}/role-mappings/clients/${CLIENT_UUID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "[${API_WRITE_ROLE}]"

echo "Client roles assigned to user john.doe"
```

### Creating Groups with Role Assignments

```bash
# Create a group for developers
cat > /tmp/dev-group.json << 'EOF'
{
    "name": "developers",
    "path": "/developers",
    "attributes": {
        "department": ["engineering"],
        "cost_center": ["ENG001"]
    }
}
EOF

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/groups" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @/tmp/dev-group.json

# Get the group ID
GROUP_ID=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/groups?search=developers" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[0].id')

# Assign roles to the group (all group members inherit these roles)
USER_ROLE=$(curl -s "${KEYCLOAK_URL}/admin/realms/mycompany/roles/user" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

curl -s -X POST "${KEYCLOAK_URL}/admin/realms/mycompany/groups/${GROUP_ID}/role-mappings/realm" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "[${USER_ROLE}]"

# Add user to group
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/mycompany/users/${USER_ID}/groups/${GROUP_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}"

echo "User added to developers group"
```

---

## Reverse Proxy Configuration with Nginx

For production deployments, Keycloak should be behind a reverse proxy that handles TLS termination.

### Installing Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Install Certbot for Let's Encrypt certificates
sudo apt install -y certbot python3-certbot-nginx
```

### Nginx Configuration for Keycloak

```bash
# Create Nginx configuration for Keycloak
sudo tee /etc/nginx/sites-available/keycloak << 'EOF'
# Upstream configuration for Keycloak backend
# This defines the backend server(s) that Nginx will proxy to
upstream keycloak_backend {
    # Keycloak server address and port
    # For high availability, add multiple server entries
    server 127.0.0.1:8080;

    # Keepalive connections to backend for better performance
    keepalive 32;
}

# HTTP server - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name auth.yourdomain.com;

    # Redirect all HTTP requests to HTTPS
    # 301 permanent redirect for SEO and caching
    return 301 https://$server_name$request_uri;
}

# HTTPS server - main Keycloak proxy configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name auth.yourdomain.com;

    # SSL certificate configuration
    # Use Let's Encrypt or your own certificates
    ssl_certificate /etc/letsencrypt/live/auth.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.yourdomain.com/privkey.pem;

    # SSL security settings
    # Use strong TLS versions only
    ssl_protocols TLSv1.2 TLSv1.3;

    # Prefer server cipher suites for better security
    ssl_prefer_server_ciphers on;

    # Strong cipher suite configuration
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # SSL session configuration for performance
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling for faster TLS handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    # Prevent clickjacking attacks
    add_header X-Frame-Options "SAMEORIGIN" always;

    # Prevent MIME type sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Enable XSS filter
    add_header X-XSS-Protection "1; mode=block" always;

    # HTTP Strict Transport Security
    # max-age=31536000 (1 year) for production
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Referrer policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Request size limits
    # Increase if users upload large files or have many roles
    client_max_body_size 10m;
    client_body_buffer_size 128k;

    # Proxy buffer settings for Keycloak responses
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;

    # Timeouts for long-running requests
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Main location block - proxy all requests to Keycloak
    location / {
        # Proxy to Keycloak backend
        proxy_pass http://keycloak_backend;

        # HTTP version for backend connection
        proxy_http_version 1.1;

        # Headers for proper client identification
        # X-Real-IP: Original client IP address
        proxy_set_header X-Real-IP $remote_addr;

        # X-Forwarded-For: Client IP chain through proxies
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # X-Forwarded-Proto: Original protocol (https)
        proxy_set_header X-Forwarded-Proto $scheme;

        # X-Forwarded-Host: Original host header
        proxy_set_header X-Forwarded-Host $host;

        # X-Forwarded-Port: Original port
        proxy_set_header X-Forwarded-Port $server_port;

        # Host header for virtual hosting
        proxy_set_header Host $host;

        # Upgrade headers for WebSocket support (admin console)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable buffering for real-time responses
        proxy_buffering off;

        # Don't intercept errors, let Keycloak handle them
        proxy_intercept_errors off;
    }

    # Health check endpoint
    # Useful for load balancers and monitoring
    location /health {
        proxy_pass http://keycloak_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Allow health checks from internal networks only
        # Adjust these to match your monitoring infrastructure
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        allow 127.0.0.1;
        deny all;
    }

    # Metrics endpoint (if enabled in Keycloak)
    location /metrics {
        proxy_pass http://keycloak_backend/metrics;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Restrict access to monitoring systems
        allow 10.0.0.0/8;
        allow 127.0.0.1;
        deny all;
    }

    # Access and error logs
    access_log /var/log/nginx/keycloak_access.log;
    error_log /var/log/nginx/keycloak_error.log warn;
}
EOF

# Enable the site configuration
sudo ln -sf /etc/nginx/sites-available/keycloak /etc/nginx/sites-enabled/

# Test Nginx configuration for syntax errors
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

### Obtaining SSL Certificates

```bash
# Obtain Let's Encrypt certificate
# Make sure DNS is configured and port 80 is accessible
sudo certbot --nginx -d auth.yourdomain.com \
    --non-interactive \
    --agree-tos \
    --email admin@yourdomain.com \
    --redirect

# Verify certificate renewal is configured
sudo certbot renew --dry-run

# Set up automatic renewal via cron
# Certbot typically installs a timer, but you can verify:
sudo systemctl status certbot.timer
```

### Keycloak Proxy Configuration

Update Keycloak configuration to work behind the proxy:

```bash
# Update Keycloak configuration for reverse proxy
sudo tee -a /opt/keycloak/conf/keycloak.conf << 'EOF'

# Proxy configuration
# 'edge' mode: TLS terminated at proxy, HTTP to Keycloak
proxy=edge

# Hostname settings for proper URL generation
hostname=auth.yourdomain.com
hostname-strict=true

# HTTP settings when behind proxy
http-enabled=true
http-host=127.0.0.1
http-port=8080

# Disable HTTPS on Keycloak since proxy handles TLS
https-port=-1
EOF

# Rebuild Keycloak with new configuration
sudo -u keycloak /opt/keycloak/bin/kc.sh build

# Restart Keycloak
sudo systemctl restart keycloak
```

---

## Database Configuration with PostgreSQL

For production deployments, use PostgreSQL instead of the default H2 database.

### Installing PostgreSQL

```bash
# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql
```

### Creating Keycloak Database

```bash
# Switch to postgres user and create database
sudo -u postgres psql << 'EOF'
-- Create dedicated database user for Keycloak
-- Use a strong, randomly generated password in production
CREATE USER keycloak WITH PASSWORD 'your_secure_db_password';

-- Create the Keycloak database
CREATE DATABASE keycloak WITH OWNER = keycloak
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

-- Grant all privileges on the database to keycloak user
GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;

-- Connect to keycloak database to set schema permissions
\c keycloak

-- Grant schema permissions (required for Keycloak 17+)
GRANT ALL ON SCHEMA public TO keycloak;

-- Verify user was created
\du keycloak

-- Exit psql
\q
EOF

echo "PostgreSQL database and user created successfully"
```

### Configuring PostgreSQL for Performance

```bash
# Optimize PostgreSQL for Keycloak workload
# Edit PostgreSQL configuration
sudo tee -a /etc/postgresql/15/main/conf.d/keycloak.conf << 'EOF'
# Connection settings
# Adjust based on expected concurrent users
max_connections = 200

# Memory settings
# shared_buffers: 25% of total RAM (max 8GB)
shared_buffers = 1GB

# effective_cache_size: 50-75% of total RAM
effective_cache_size = 3GB

# work_mem: RAM per query operation (be careful with high values)
work_mem = 16MB

# maintenance_work_mem: RAM for maintenance operations
maintenance_work_mem = 256MB

# WAL settings for better write performance
wal_buffers = 64MB
checkpoint_completion_target = 0.9

# Query planner settings
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging settings for monitoring
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
EOF

# Allow connections from Keycloak server
# Edit pg_hba.conf to add authentication rules
sudo tee -a /etc/postgresql/15/main/pg_hba.conf << 'EOF'

# Allow Keycloak connection from localhost
# TYPE  DATABASE    USER        ADDRESS         METHOD
host    keycloak    keycloak    127.0.0.1/32    scram-sha-256

# For remote Keycloak servers (adjust IP as needed)
# host  keycloak    keycloak    10.0.0.0/8      scram-sha-256
EOF

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql

# Verify PostgreSQL is listening
sudo -u postgres psql -c "SHOW max_connections;"
```

### Updating Keycloak Database Configuration

```bash
# Update Keycloak configuration for PostgreSQL
sudo tee /opt/keycloak/conf/keycloak.conf << 'EOF'
# Database configuration for PostgreSQL
# Specify PostgreSQL as the database vendor
db=postgres

# JDBC connection URL
# Format: jdbc:postgresql://host:port/database
db-url=jdbc:postgresql://localhost:5432/keycloak

# Database credentials
db-username=keycloak
db-password=your_secure_db_password

# Connection pool settings
# Minimum connections to maintain
db-pool-min-size=5
# Maximum connections allowed
db-pool-max-size=50
# Initial pool size
db-pool-initial-size=10

# Schema migration settings
# 'update' automatically applies schema changes
db-schema=update

# Transaction settings
transaction-xa-enabled=false

# Hostname configuration
hostname=auth.yourdomain.com
hostname-strict=true

# Proxy configuration
proxy=edge

# HTTP settings
http-enabled=true
http-host=127.0.0.1
http-port=8080

# Disable HTTPS (handled by reverse proxy)
https-port=-1

# Metrics and health endpoints
metrics-enabled=true
health-enabled=true

# Cache settings
cache=local

# Logging
log=console,file
log-level=INFO
log-file=/opt/keycloak/data/log/keycloak.log
EOF

# Set secure permissions on configuration file
sudo chown keycloak:keycloak /opt/keycloak/conf/keycloak.conf
sudo chmod 600 /opt/keycloak/conf/keycloak.conf

# Rebuild Keycloak with PostgreSQL configuration
sudo -u keycloak /opt/keycloak/bin/kc.sh build

# Restart Keycloak to apply database changes
sudo systemctl restart keycloak

# Monitor startup logs for database connection
sudo journalctl -u keycloak -f
```

---

## High Availability Setup

For production environments requiring high availability, deploy multiple Keycloak nodes behind a load balancer.

### Architecture Overview

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx/HAProxy)│
                    └────────┬────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼───────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Keycloak 1   │ │ Keycloak 2  │ │ Keycloak 3  │
    │  (Active)     │ │ (Active)    │ │ (Active)    │
    └───────┬───────┘ └──────┬──────┘ └──────┬──────┘
            │                │                │
            └────────────────┼────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (Primary)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │   (Replica)     │
                    └─────────────────┘
```

### Configuring Keycloak Cluster

```bash
# Create cluster configuration for Keycloak
# Each node needs similar configuration with unique node identifiers

sudo tee /opt/keycloak/conf/keycloak.conf << 'EOF'
# Database configuration (shared across all nodes)
db=postgres
db-url=jdbc:postgresql://db.yourdomain.com:5432/keycloak
db-username=keycloak
db-password=your_secure_db_password
db-pool-min-size=10
db-pool-max-size=100

# Hostname configuration
hostname=auth.yourdomain.com
hostname-strict=true

# Proxy settings (all nodes behind load balancer)
proxy=edge

# HTTP configuration
http-enabled=true
http-host=0.0.0.0
http-port=8080

# Clustering configuration
# Use 'ispn' (Infinispan) for distributed cache
cache=ispn

# Cache stack for network discovery
# Options: tcp, udp, kubernetes, ec2, azure, google
cache-stack=tcp

# Enable cluster health checks
health-enabled=true
metrics-enabled=true

# Logging
log=console
log-level=INFO
EOF

# Create Infinispan cluster configuration
sudo tee /opt/keycloak/conf/cache-ispn.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!-- Infinispan distributed cache configuration for Keycloak cluster -->
<infinispan
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="urn:infinispan:config:14.0 https://infinispan.org/schemas/infinispan-config-14.0.xsd"
        xmlns="urn:infinispan:config:14.0">

    <!-- JGroups configuration for cluster communication -->
    <jgroups>
        <!-- TCP stack for cloud/container deployments -->
        <stack name="tcp-custom" extends="tcp">
            <!-- TCPPING for static cluster membership -->
            <!-- List all node IPs for cluster discovery -->
            <TCPPING
                initial_hosts="keycloak1.internal:7800,keycloak2.internal:7800,keycloak3.internal:7800"
                port_range="0"
                stack.combine="REPLACE"
                stack.position="MPING"/>
        </stack>
    </jgroups>

    <!-- Cache container configuration -->
    <cache-container name="keycloak">
        <!-- Use custom TCP stack for transport -->
        <transport lock-timeout="60000" stack="tcp-custom"/>

        <!-- Local caches (not replicated) -->
        <local-cache name="realms">
            <encoding>
                <key media-type="application/x-java-object"/>
                <value media-type="application/x-java-object"/>
            </encoding>
            <memory max-count="10000"/>
        </local-cache>

        <local-cache name="users">
            <encoding>
                <key media-type="application/x-java-object"/>
                <value media-type="application/x-java-object"/>
            </encoding>
            <memory max-count="10000"/>
        </local-cache>

        <!-- Distributed caches (replicated across nodes) -->
        <!-- Sessions must be distributed for HA -->
        <distributed-cache name="sessions" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="authenticationSessions" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="offlineSessions" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="clientSessions" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="offlineClientSessions" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="loginFailures" owners="2">
            <expiration lifespan="-1"/>
        </distributed-cache>

        <distributed-cache name="actionTokens" owners="2">
            <encoding>
                <key media-type="application/x-java-object"/>
                <value media-type="application/x-java-object"/>
            </encoding>
            <expiration max-idle="-1" lifespan="-1" interval="300000"/>
            <memory max-count="-1"/>
        </distributed-cache>

        <!-- Replicated cache for work distribution -->
        <replicated-cache name="work">
            <expiration lifespan="-1"/>
        </replicated-cache>
    </cache-container>
</infinispan>
EOF
```

### Load Balancer Configuration (HAProxy)

```bash
# Install HAProxy for load balancing
sudo apt install -y haproxy

# Configure HAProxy for Keycloak cluster
sudo tee /etc/haproxy/haproxy.cfg << 'EOF'
# Global settings
global
    # Logging to syslog
    log /dev/log local0
    log /dev/log local1 notice

    # Run as haproxy user
    user haproxy
    group haproxy

    # Security settings
    chroot /var/lib/haproxy

    # Stats socket for runtime management
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s

    # SSL/TLS settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

    # Daemon mode
    daemon

    # Maximum connections
    maxconn 4096

# Default settings applied to all backends
defaults
    log     global
    mode    http

    # Enable HTTP logging
    option  httplog
    option  dontlognull

    # Health check logging
    option  log-health-checks

    # Timeouts
    timeout connect 10s
    timeout client  60s
    timeout server  60s
    timeout http-request 10s
    timeout http-keep-alive 10s

    # Retry settings
    retries 3
    option  redispatch

# Frontend for HTTPS traffic
frontend keycloak_https
    # Listen on port 443 with SSL
    bind *:443 ssl crt /etc/haproxy/certs/auth.yourdomain.com.pem

    # HTTP mode
    mode http

    # Add forwarded headers
    option forwardfor

    # Set X-Forwarded-Proto header
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Forwarded-Port 443

    # Default backend
    default_backend keycloak_servers

# Frontend for HTTP redirect
frontend keycloak_http
    bind *:80
    mode http

    # Redirect all HTTP to HTTPS
    http-request redirect scheme https code 301

# Backend configuration for Keycloak servers
backend keycloak_servers
    mode http

    # Load balancing algorithm
    # 'leastconn' routes to server with least connections
    balance leastconn

    # Sticky sessions based on AUTH_SESSION_ID cookie
    # This ensures session consistency during authentication flows
    cookie AUTH_SESSION_ID insert indirect nocache

    # Health check configuration
    option httpchk GET /health/ready
    http-check expect status 200

    # Backend servers
    # Each server has:
    # - check: enable health checks
    # - cookie: sticky session cookie value
    # - inter: health check interval (5s)
    # - fall: failures before marking down (3)
    # - rise: successes before marking up (2)
    server keycloak1 10.0.1.10:8080 check cookie kc1 inter 5s fall 3 rise 2
    server keycloak2 10.0.1.11:8080 check cookie kc2 inter 5s fall 3 rise 2
    server keycloak3 10.0.1.12:8080 check cookie kc3 inter 5s fall 3 rise 2

# Stats page for monitoring
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:your_stats_password
    stats admin if LOCALHOST
EOF

# Test HAProxy configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Restart HAProxy
sudo systemctl restart haproxy
sudo systemctl enable haproxy
```

---

## Backup and Restore

### Automated Backup Script

```bash
# Create backup script for Keycloak
sudo tee /opt/keycloak/scripts/backup.sh << 'EOF'
#!/bin/bash
# Keycloak Backup Script
# This script creates backups of the Keycloak database and configuration

set -euo pipefail

# Configuration variables
BACKUP_DIR="/opt/keycloak/backups"
KEYCLOAK_DIR="/opt/keycloak"
DB_HOST="localhost"
DB_NAME="keycloak"
DB_USER="keycloak"
DB_PASS="your_secure_db_password"
RETENTION_DAYS=30

# Timestamp for backup files
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="keycloak_backup_${TIMESTAMP}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Starting Keycloak backup: ${BACKUP_NAME}"

# Export database using pg_dump
# Options:
#   -Fc: Custom format (compressed, allows selective restore)
#   -v: Verbose output
#   -b: Include large objects
echo "Backing up PostgreSQL database..."
PGPASSWORD="${DB_PASS}" pg_dump \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -Fc \
    -v \
    -b \
    -f "${BACKUP_DIR}/${BACKUP_NAME}_database.dump"

echo "Database backup completed: ${BACKUP_DIR}/${BACKUP_NAME}_database.dump"

# Backup Keycloak configuration files
echo "Backing up configuration files..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz" \
    -C "${KEYCLOAK_DIR}" \
    conf/ \
    providers/ \
    themes/ 2>/dev/null || true

echo "Configuration backup completed: ${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz"

# Export realm configurations using Admin CLI
# This provides human-readable JSON exports
echo "Exporting realm configurations..."
KEYCLOAK_URL="http://localhost:8080"
ADMIN_USER="admin"
ADMIN_PASS="YourSecurePassword123!"

# Get access token
ACCESS_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=${ADMIN_USER}" \
    -d "password=${ADMIN_PASS}" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" | jq -r '.access_token')

if [ "${ACCESS_TOKEN}" != "null" ] && [ -n "${ACCESS_TOKEN}" ]; then
    # Get list of realms
    REALMS=$(curl -s "${KEYCLOAK_URL}/admin/realms" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq -r '.[].realm')

    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}_realms"

    for REALM in ${REALMS}; do
        echo "Exporting realm: ${REALM}"
        curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            | jq '.' > "${BACKUP_DIR}/${BACKUP_NAME}_realms/${REALM}.json"

        # Export users for each realm
        curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/users?max=10000" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            | jq '.' > "${BACKUP_DIR}/${BACKUP_NAME}_realms/${REALM}_users.json"
    done

    # Compress realm exports
    tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_realms.tar.gz" \
        -C "${BACKUP_DIR}" "${BACKUP_NAME}_realms"
    rm -rf "${BACKUP_DIR}/${BACKUP_NAME}_realms"

    echo "Realm export completed: ${BACKUP_DIR}/${BACKUP_NAME}_realms.tar.gz"
else
    echo "Warning: Could not obtain access token, skipping realm export"
fi

# Create checksum file for integrity verification
echo "Creating checksums..."
cd "${BACKUP_DIR}"
sha256sum ${BACKUP_NAME}* > "${BACKUP_NAME}_checksums.sha256"

# Clean up old backups
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "keycloak_backup_*" -type f -mtime +${RETENTION_DAYS} -delete

# Calculate total backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}"* 2>/dev/null | cut -f1 | head -1)

echo "========================================"
echo "Backup completed successfully!"
echo "Backup name: ${BACKUP_NAME}"
echo "Backup size: ${BACKUP_SIZE}"
echo "Location: ${BACKUP_DIR}"
echo "========================================"

# Optional: Upload to remote storage (S3, GCS, etc.)
# aws s3 sync "${BACKUP_DIR}/" "s3://your-bucket/keycloak-backups/" --exclude "*" --include "${BACKUP_NAME}*"
EOF

# Make script executable
sudo chmod +x /opt/keycloak/scripts/backup.sh
sudo chown keycloak:keycloak /opt/keycloak/scripts/backup.sh

# Create backup directory
sudo mkdir -p /opt/keycloak/backups
sudo chown keycloak:keycloak /opt/keycloak/backups
```

### Scheduled Backups with Cron

```bash
# Create cron job for daily backups
sudo tee /etc/cron.d/keycloak-backup << 'EOF'
# Keycloak database backup
# Runs daily at 2:00 AM
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Daily backup at 2:00 AM
0 2 * * * keycloak /opt/keycloak/scripts/backup.sh >> /var/log/keycloak-backup.log 2>&1

# Weekly full export on Sunday at 3:00 AM
0 3 * * 0 keycloak /opt/keycloak/scripts/full-export.sh >> /var/log/keycloak-backup.log 2>&1
EOF

# Set proper permissions
sudo chmod 644 /etc/cron.d/keycloak-backup
```

### Restore Script

```bash
# Create restore script
sudo tee /opt/keycloak/scripts/restore.sh << 'EOF'
#!/bin/bash
# Keycloak Restore Script
# This script restores Keycloak from a backup

set -euo pipefail

# Check if backup name is provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_name>"
    echo "Example: $0 keycloak_backup_20240115_020000"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="/opt/keycloak/backups"
KEYCLOAK_DIR="/opt/keycloak"
DB_HOST="localhost"
DB_NAME="keycloak"
DB_USER="keycloak"
DB_PASS="your_secure_db_password"

echo "========================================"
echo "Keycloak Restore Process"
echo "Backup: ${BACKUP_NAME}"
echo "========================================"

# Verify backup files exist
if [ ! -f "${BACKUP_DIR}/${BACKUP_NAME}_database.dump" ]; then
    echo "Error: Database backup not found: ${BACKUP_DIR}/${BACKUP_NAME}_database.dump"
    exit 1
fi

# Verify checksums
echo "Verifying backup integrity..."
cd "${BACKUP_DIR}"
if [ -f "${BACKUP_NAME}_checksums.sha256" ]; then
    sha256sum -c "${BACKUP_NAME}_checksums.sha256"
    echo "Checksum verification passed"
else
    echo "Warning: Checksum file not found, skipping verification"
fi

# Confirm restore
echo ""
echo "WARNING: This will overwrite the current Keycloak database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop Keycloak service
echo "Stopping Keycloak service..."
sudo systemctl stop keycloak

# Drop and recreate database
echo "Recreating database..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U postgres << EOSQL
-- Terminate existing connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();

-- Drop existing database
DROP DATABASE IF EXISTS ${DB_NAME};

-- Create fresh database
CREATE DATABASE ${DB_NAME} WITH OWNER = ${DB_USER}
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8';
EOSQL

# Restore database from backup
echo "Restoring database from backup..."
PGPASSWORD="${DB_PASS}" pg_restore \
    -h "${DB_HOST}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -v \
    "${BACKUP_DIR}/${BACKUP_NAME}_database.dump"

echo "Database restored successfully"

# Restore configuration files if available
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz" ]; then
    echo "Restoring configuration files..."

    # Backup current config
    sudo mv "${KEYCLOAK_DIR}/conf" "${KEYCLOAK_DIR}/conf.old.$(date +%Y%m%d)" 2>/dev/null || true

    # Extract backup config
    sudo tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz" -C "${KEYCLOAK_DIR}"

    # Fix permissions
    sudo chown -R keycloak:keycloak "${KEYCLOAK_DIR}/conf"

    echo "Configuration restored successfully"
fi

# Rebuild Keycloak
echo "Rebuilding Keycloak..."
sudo -u keycloak "${KEYCLOAK_DIR}/bin/kc.sh" build

# Start Keycloak service
echo "Starting Keycloak service..."
sudo systemctl start keycloak

# Wait for Keycloak to start
echo "Waiting for Keycloak to become ready..."
for i in {1..60}; do
    if curl -s http://localhost:8080/health/ready | grep -q '"status":"UP"'; then
        echo "Keycloak is ready!"
        break
    fi
    echo "Waiting... ($i/60)"
    sleep 5
done

echo "========================================"
echo "Restore completed successfully!"
echo "Please verify the restored data in the admin console"
echo "========================================"
EOF

# Make script executable
sudo chmod +x /opt/keycloak/scripts/restore.sh
sudo chown keycloak:keycloak /opt/keycloak/scripts/restore.sh
```

---

## Security Best Practices

### Hardening Keycloak

```bash
# Security hardening configuration
sudo tee -a /opt/keycloak/conf/keycloak.conf << 'EOF'

# Security settings
# Force HTTPS for external requests
hostname-strict-https=true

# Limit admin console access
# Only allow from specific IP ranges
# http-management-interface=127.0.0.1

# Content Security Policy
# http-headers-content-security-policy="frame-src 'self'; frame-ancestors 'self'; object-src 'none';"

# Hide server version
# http-headers-x-content-type-options=nosniff

# Session settings
# Reduce session timeout for sensitive operations
spi-sticky-session-encoder-infinispan-should-attach-route=false
EOF

# Create security-focused realm settings script
cat > /tmp/security-settings.sh << 'EOF'
#!/bin/bash
# Apply security settings to a realm

KEYCLOAK_URL="http://localhost:8080"
REALM="mycompany"
ACCESS_TOKEN="$1"

# Update realm security settings
curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "bruteForceProtected": true,
        "permanentLockout": false,
        "maxFailureWaitSeconds": 900,
        "minimumQuickLoginWaitSeconds": 60,
        "waitIncrementSeconds": 60,
        "quickLoginCheckMilliSeconds": 1000,
        "maxDeltaTimeSeconds": 43200,
        "failureFactor": 5,

        "passwordPolicy": "length(14) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1) and notUsername(undefined) and passwordHistory(5)",

        "otpPolicyType": "totp",
        "otpPolicyAlgorithm": "HmacSHA256",
        "otpPolicyDigits": 6,
        "otpPolicyPeriod": 30,

        "accessTokenLifespan": 300,
        "accessTokenLifespanForImplicitFlow": 300,
        "ssoSessionIdleTimeout": 1800,
        "ssoSessionMaxLifespan": 36000,

        "actionTokenGeneratedByAdminLifespan": 43200,
        "actionTokenGeneratedByUserLifespan": 300
    }'

echo "Security settings applied to realm: ${REALM}"
EOF

chmod +x /tmp/security-settings.sh
```

---

## Monitoring with OneUptime

After setting up Keycloak, it is crucial to implement comprehensive monitoring to ensure your SSO infrastructure remains healthy and performant. [OneUptime](https://oneuptime.com) provides an excellent solution for monitoring Keycloak deployments.

### Why Monitor Keycloak with OneUptime?

1. **Uptime Monitoring**: Track the availability of your Keycloak endpoints and receive instant alerts when services go down.

2. **Performance Metrics**: Monitor response times for authentication endpoints to ensure users experience fast login times.

3. **SSL Certificate Monitoring**: Get notified before your SSL certificates expire to prevent service disruptions.

4. **Custom Health Checks**: Create custom monitors for Keycloak's health endpoints (`/health/ready`, `/health/live`).

5. **Incident Management**: Automatically create and manage incidents when Keycloak experiences issues.

### Setting Up OneUptime Monitoring for Keycloak

```bash
# Example: Create a monitoring script that integrates with OneUptime
cat > /opt/keycloak/scripts/oneuptime-health.sh << 'EOF'
#!/bin/bash
# Keycloak health check script for OneUptime integration

KEYCLOAK_URL="https://auth.yourdomain.com"

# Check Keycloak readiness
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${KEYCLOAK_URL}/health/ready")

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo "Keycloak is healthy"
    exit 0
else
    echo "Keycloak health check failed with status: ${HEALTH_STATUS}"
    exit 1
fi
EOF

chmod +x /opt/keycloak/scripts/oneuptime-health.sh
```

With OneUptime, you can:

- Set up HTTP monitors for your Keycloak authentication endpoints
- Configure alerting via email, SMS, Slack, or PagerDuty
- Create status pages to communicate Keycloak availability to your users
- Track historical uptime and performance metrics
- Monitor multiple Keycloak nodes in a clustered deployment

Visit [OneUptime](https://oneuptime.com) to start monitoring your Keycloak SSO infrastructure and ensure your authentication services remain reliable and performant for all your users.

---

## Conclusion

Setting up Keycloak for SSO on Ubuntu requires careful planning and configuration, but the result is a robust, enterprise-grade identity management solution. This guide covered the essential aspects of a production Keycloak deployment:

- Understanding core concepts like realms, clients, and roles
- Multiple installation methods for different use cases
- Integration with external identity providers
- Database configuration for production workloads
- High availability setup for enterprise deployments
- Backup and restore procedures
- Security best practices

Remember to regularly update Keycloak to receive security patches and new features, and always test configuration changes in a staging environment before applying them to production.

For additional resources, consult the [official Keycloak documentation](https://www.keycloak.org/documentation) and join the Keycloak community for support and best practices sharing.
