# How to Configure Helm Chart Repositories with Authentication and TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Security

Description: Learn how to configure Helm chart repositories with authentication, TLS certificates, and secure access controls for enterprise Kubernetes deployments.

---

Securing your Helm chart repositories protects proprietary charts and ensures only authorized users can access your packages. Configuring authentication and TLS for Helm repositories involves setting up credentials, managing certificates, and integrating with existing identity systems. This guide walks through the complete setup process with real examples.

## Understanding Helm Repository Security

Public chart repositories listed in Artifact Hub often require no authentication, but enterprise environments need private repositories with access controls. Helm supports repository authentication with basic auth and TLS client certificates, while OCI registries support registry login with passwords or identity tokens. The choice depends on your repository backend and security requirements.

Helm stores repository configuration in `repositories.yaml` and keeps downloaded repository indexes in its repository cache. When you add a repository, Helm saves the URL and credentials for future use.

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

Helm stores credentials in the repository configuration file at `~/.config/helm/repositories.yaml`.

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

Avoid hard-coding credentials in scripts by reading them from environment variables or a secrets manager before running Helm.

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

ChartMuseum is a popular open-source Helm chart repository server. Configure it with authentication and TLS options.

```yaml
# chartmuseum-config.yaml
port: 8080
tls.cert: /certs/tls.crt
tls.key: /certs/tls.key

storage.backend: local
storage.local.rootdir: /charts

basicauth.user: developer
basicauth.pass: mypassword

# Require authentication for GET requests
authanonymousget: false

# For bearer token authentication, remove the basic auth settings above and configure:
bearerauth: true
authrealm: "https://auth.company.com/oauth2/token"
authservice: "chartmuseum"
authcertpath: /certs/auth-public-key.pem
```

Deploy ChartMuseum with this configuration.

```bash
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

Harbor provides enterprise-grade OCI registry features with RBAC, vulnerability scanning, and replication. Harbor 2.8 and later no longer includes ChartMuseum, so use Harbor's OCI registry support for Helm charts.

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

# Initial admin password
harborAdminPassword: "change-me-before-production"
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

Use Harbor as an OCI registry for Helm charts.

```bash
# Login to Harbor
helm registry login harbor.company.com \
  --username admin \
  --password Harbor12345

# Push chart to Harbor
helm push mychart-1.0.0.tgz oci://harbor.company.com/library

# Pull chart from Harbor
helm pull oci://harbor.company.com/library/mychart --version 1.0.0
```

## Using Bearer Token Authentication

Access tokens work well with CI/CD systems and service accounts. For classic chart repositories, `helm repo add` sends the configured username and password using HTTP Basic authentication, so use a token as the password only when your repository server supports that pattern.

```bash
# Add repository with an access token accepted as the password
helm repo add private-charts https://charts.company.com \
  --username token \
  --password "eyJhbGciOiJSUzI1NiIs..."

# Or set token in environment variable
export HELM_REGISTRY_TOKEN="eyJhbGciOiJSUzI1NiIs..."

# Configure repo to use token from environment
helm repo add private-charts https://charts.company.com \
  --username token \
  --password "${HELM_REGISTRY_TOKEN}"
```

For OCI registries, use the registry login command with tokens or identity tokens.

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
helm repo add artifactory https://artifactory.company.com/artifactory/api/helm/helm \
  --username myuser \
  --password "AKC...api-key..."

# Or use access token
helm repo add artifactory https://artifactory.company.com/artifactory/api/helm/helm \
  --username myuser \
  --password "eyJ0eXAiOi...access-token..."

# Or read an access token from stdin
echo "$ARTIFACTORY_ACCESS_TOKEN" | helm repo add artifactory \
  https://artifactory.company.com/artifactory/api/helm/helm \
  --username myuser \
  --password-stdin
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
    - helm repo add private-charts https://charts.company.com \
        --ca-file /tmp/helm-certs/ca.crt \
        --cert-file /tmp/helm-certs/client.crt \
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

Monitor who accesses your chart repository by enabling structured access logging on the server.

```yaml
# chartmuseum-config.yaml with structured logging
port: 8080
logjson: true

# Log all access attempts
loghealth: true
loglatencyinteger: true
```

Parse structured logs to track chart downloads.

```bash
# Extract chart package download requests from access logs
jq -r 'select(.reqPath | test("^/charts/.+\\.tgz$")) | [.time, .reqMethod, .reqPath, .status, .remoteAddr] | @csv' \
  /var/log/chartmuseum/access.log
```

Securing Helm repositories with authentication and TLS protects your intellectual property and ensures compliance with security policies. Use basic auth for simple setups, TLS client certificates for stronger security, and access tokens for automated systems when your repository or registry supports them. Store credentials securely using secrets management tools and enable access logging to track access patterns.
