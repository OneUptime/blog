# How to Configure Helm Chart Repositories with Authentication and TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Security

Description: Learn how to configure Helm chart repositories with authentication, TLS certificates, and secure access controls for enterprise Kubernetes deployments.

---

Securing your Helm chart repositories protects proprietary charts and ensures only authorized users can access your packages. Configuring authentication and TLS for Helm repositories involves setting up credentials, managing certificates, and integrating with existing identity systems. This guide walks through the complete setup process with real examples.

## Understanding Helm Repository Security

Public chart repositories like Artifact Hub require no authentication, but enterprise environments need private repositories with access controls. Helm supports several authentication methods including basic auth, bearer tokens, and TLS client certificates. The choice depends on your repository backend and security requirements.

Helm stores repository configuration in your kubeconfig context and in repository cache files. When you add a repository, Helm saves the URL and credentials for future use.

## Setting Up Basic Authentication

Basic authentication uses username and password credentials. Most repository servers including ChartMuseum, Harbor, and Artifactory support this method.

```bash
# Add repository with basic auth
helm repo add private-charts https://charts.company.com \
  --username myuser \
  --password mypassword

# Add repository with password from stdin (more secure)
echo "mypassword" | helm repo add private-charts https://charts.company.com \
  --username myuser \
  --password-stdin

# Update repository index
helm repo update private-charts
```

Helm encodes credentials and stores them in the repository configuration file at ~/.config/helm/repositories.yaml.

```yaml
# ~/.config/helm/repositories.yaml
apiVersion: ""
generated: "2026-02-09T10:30:00Z"
repositories:
- name: private-charts
  url: https://charts.company.com
  username: myuser
  password: mypassword
  caFile: ""
  certFile: ""
  keyFile: ""
  insecure_skip_tls_verify: false
  pass_credentials_all: false
```

Store credentials more securely by using environment variables or credential helpers instead of plain text.

```bash
# Use environment variables for credentials
export HELM_REPO_USERNAME="myuser"
export HELM_REPO_PASSWORD="mypassword"

helm repo add private-charts https://charts.company.com \
  --username $HELM_REPO_USERNAME \
  --password $HELM_REPO_PASSWORD
```

## Configuring TLS Client Certificates

TLS client certificates provide stronger authentication than passwords. The server verifies the client's certificate during the TLS handshake, ensuring mutual authentication.

Generate client certificates using your organization's certificate authority.

```bash
# Generate private key
openssl genrsa -out client.key 4096

# Generate certificate signing request
openssl req -new -key client.key -out client.csr \
  -subj "/CN=helm-client/O=Engineering/C=US"

# Sign certificate with CA (assuming you have ca.crt and ca.key)
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out client.crt -days 365

# Verify certificate
openssl x509 -in client.crt -text -noout
```

Add the repository with TLS certificate authentication.

```bash
# Add repository with TLS client certificates
helm repo add private-charts https://charts.company.com \
  --ca-file ca.crt \
  --cert-file client.crt \
  --key-file client.key

# Search charts using authenticated connection
helm search repo private-charts/
```

The certificate files must remain accessible at the specified paths. Helm reads them each time it connects to the repository.

## Setting Up ChartMuseum with Authentication

ChartMuseum is a popular open-source Helm chart repository server. Configure it with multiple authentication backends.

```yaml
# chartmuseum-config.yaml
server:
  port: 8080
  tls:
    enabled: true
    cert: /certs/tls.crt
    key: /certs/tls.key

storage:
  type: local
  local:
    path: /charts

auth:
  type: basic
  basic:
    users:
      - username: developer
        password: $2a$10$XYZ...  # bcrypt hashed password
      - username: cicd
        password: $2a$10$ABC...

# Allow anonymous GET requests for public charts
anonymous_get: false

# Enable bearer token authentication
bearer_auth: true
bearer_auth_realm: "ChartMuseum"
```

Deploy ChartMuseum with this configuration.

```bash
# Generate bcrypt password hash
htpasswd -bnBC 10 "" mypassword | tr -d ':\n'

# Run ChartMuseum with Docker
docker run -d \
  --name chartmuseum \
  -p 8080:8080 \
  -v $(pwd)/chartmuseum-config.yaml:/config.yaml \
  -v $(pwd)/charts:/charts \
  -v $(pwd)/certs:/certs \
  ghcr.io/helm/chartmuseum:latest \
  --config /config.yaml
```

## Configuring Harbor Registry

Harbor provides enterprise-grade chart repository features with RBAC, vulnerability scanning, and replication.

```yaml
# harbor-values.yaml
expose:
  type: ingress
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: harbor-tls
  ingress:
    hosts:
      core: harbor.company.com

externalURL: https://harbor.company.com

persistence:
  enabled: true
  persistentVolumeClaim:
    registry:
      size: 100Gi
    chartmuseum:
      size: 10Gi

# Enable chart repository
chartmuseum:
  enabled: true
  absoluteUrl: true

# Configure authentication
authMode: ldap_auth
ldap:
  url: ldap://ldap.company.com:389
  searchDn: cn=admin,dc=company,dc=com
  searchPassword: adminpassword
  baseDn: ou=users,dc=company,dc=com
  filter: (objectClass=person)
  uid: uid
  scope: 2
```

Install Harbor with Helm.

```bash
# Add Harbor repository
helm repo add harbor https://helm.goharbor.io

# Install Harbor
helm install harbor harbor/harbor \
  --namespace harbor \
  --create-namespace \
  --values harbor-values.yaml
```

Add Harbor as a chart repository with authentication.

```bash
# Login to Harbor
helm registry login harbor.company.com \
  --username admin \
  --password Harbor12345

# Add Harbor project as Helm repository
helm repo add harbor-private https://harbor.company.com/chartrepo/private \
  --username admin \
  --password Harbor12345

# Push chart to Harbor
helm push mychart-1.0.0.tgz oci://harbor.company.com/library
```

## Using Bearer Token Authentication

Bearer tokens work well with CI/CD systems and service accounts.

```bash
# Add repository with bearer token
helm repo add private-charts https://charts.company.com \
  --username token \
  --password "Bearer eyJhbGciOiJSUzI1NiIs..."

# Or set token in environment variable
export HELM_REGISTRY_TOKEN="eyJhbGciOiJSUzI1NiIs..."

# Configure repo to use token from environment
helm repo add private-charts https://charts.company.com \
  --username token \
  --password "${HELM_REGISTRY_TOKEN}"
```

For OCI registries, use the registry login command with tokens.

```bash
# Login to OCI registry with token
echo $GITHUB_TOKEN | helm registry login ghcr.io \
  --username $GITHUB_USER \
  --password-stdin

# Pull chart from OCI registry
helm pull oci://ghcr.io/company/charts/myapp --version 1.0.0
```

## Configuring Artifactory

JFrog Artifactory supports Helm repositories with advanced security features.

```bash
# Add Artifactory Helm repository with API key
helm repo add artifactory https://artifactory.company.com/artifactory/helm \
  --username myuser \
  --password "AKC...api-key..."

# Or use access token
helm repo add artifactory https://artifactory.company.com/artifactory/helm \
  --username token \
  --password "eyJ0eXAiOi...access-token..."

# Set up credentials helper for automatic authentication
cat > ~/.config/helm/artifactory-creds.sh << 'EOF'
#!/bin/bash
echo "username=myuser"
echo "password=${ARTIFACTORY_API_KEY}"
EOF

chmod +x ~/.config/helm/artifactory-creds.sh
```

## Managing Repository Credentials in Kubernetes

Store Helm repository credentials as Kubernetes secrets for use in CI/CD pipelines.

```yaml
# helm-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-credentials
  namespace: default
type: Opaque
stringData:
  username: developer
  password: secure-password
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKZ...
    -----END CERTIFICATE-----
  client.crt: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKZ...
    -----END CERTIFICATE-----
  client.key: |
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpAIBAAKCAQEAz...
    -----END RSA PRIVATE KEY-----
```

Use these credentials in a CI/CD job.

```yaml
# gitlab-ci.yml
deploy:
  stage: deploy
  image: alpine/helm:latest
  script:
    # Create temporary directory for credentials
    - mkdir -p /tmp/helm-certs

    # Extract credentials from secret
    - kubectl get secret helm-repo-credentials -n default -o jsonpath='{.data.ca\.crt}' | base64 -d > /tmp/helm-certs/ca.crt
    - kubectl get secret helm-repo-credentials -n default -o jsonpath='{.data.client\.crt}' | base64 -d > /tmp/helm-certs/client.crt
    - kubectl get secret helm-repo-credentials -n default -o jsonpath='{.data.client\.key}' | base64 -d > /tmp/helm-certs/client.key

    # Add repository with TLS authentication
    - helm repo add private-charts https://charts.company.com
        --ca-file /tmp/helm-certs/ca.crt
        --cert-file /tmp/helm-certs/client.crt
        --key-file /tmp/helm-certs/client.key

    # Install chart
    - helm upgrade --install myapp private-charts/myapp

    # Clean up credentials
    - rm -rf /tmp/helm-certs
```

## Implementing Custom CA Certificates

When your repository uses certificates signed by an internal CA, configure Helm to trust that CA.

```bash
# Add repository with custom CA certificate
helm repo add internal-charts https://charts.internal.company.com \
  --ca-file /path/to/internal-ca.crt \
  --username developer \
  --password secure-password

# Install chart with custom CA
helm install myapp internal-charts/myapp \
  --ca-file /path/to/internal-ca.crt
```

For system-wide trust, add the CA certificate to your system's trust store.

```bash
# On Ubuntu/Debian
sudo cp internal-ca.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates

# On RHEL/CentOS
sudo cp internal-ca.crt /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# On macOS
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain internal-ca.crt
```

## Auditing Repository Access

Monitor who accesses your chart repository by enabling audit logging on the server.

```yaml
# chartmuseum-config.yaml with audit logging
server:
  port: 8080

logging:
  level: info
  json: true

audit:
  enabled: true
  path: /var/log/chartmuseum/audit.log

# Log all access attempts
log_health: true
log_latency_integer: true
```

Parse audit logs to track chart downloads.

```bash
# Extract download events from audit logs
jq -r 'select(.event=="chart.download") | [.timestamp, .user, .chart, .version, .ip] | @csv' \
  /var/log/chartmuseum/audit.log
```

Securing Helm repositories with authentication and TLS protects your intellectual property and ensures compliance with security policies. Use basic auth for simple setups, TLS client certificates for stronger security, and bearer tokens for automated systems. Store credentials securely using secrets management tools and enable audit logging to track access patterns.
