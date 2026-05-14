# How to Configure GitRepository with Custom CA Certificates in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, TLS, CA Certificates, Security

Description: Learn how to configure Flux CD GitRepository resources to trust custom or self-signed CA certificates for HTTPS connections to private Git servers.

---

Enterprise environments frequently use internal Certificate Authorities (CAs) for their Git servers rather than publicly trusted certificates. Flux CD needs to be configured to trust these custom CAs when connecting over HTTPS. This guide covers how to supply CA certificates to GitRepository resources, handle self-signed certificates, and manage certificate chains.

## Why Custom CA Certificates Are Needed

When Flux's source-controller attempts to clone a repository over HTTPS, it validates the server's TLS certificate against a trusted CA bundle. If your Git server uses a certificate signed by an internal CA, the connection will fail with errors like:

- `x509: certificate signed by unknown authority`
- `SSL certificate problem: unable to get local issuer certificate`

You must provide the CA certificate to Flux so it can establish trust.

## Step 1: Obtain Your CA Certificate

Before configuring Flux, you need the CA certificate in PEM format. There are several ways to obtain it.

Export or obtain the CA certificate for your Git server:

```bash
# Method 1: Save the certificate chain presented by the server for inspection
openssl s_client -connect git.internal.company.com:443 -servername git.internal.company.com -showcerts </dev/null 2>/dev/null \
  | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{ print }' > server-chain.pem

# Method 2: If the server certificate is self-signed, extract that certificate
openssl s_client -connect git.internal.company.com:443 -servername git.internal.company.com -showcerts </dev/null 2>/dev/null \
  | openssl x509 -outform PEM > ca-cert.pem

# Method 3: Copy from your organization's PKI distribution point
# Often available at an internal URL or shared drive; this is the preferred source
```

Verify the certificate is correct:

```bash
# Display certificate details
openssl x509 -in ca-cert.pem -text -noout

# Verify the Git server certificate against this CA, if you have the leaf certificate
openssl verify -CAfile ca-cert.pem server-cert.pem

# Or verify the live TLS connection with this CA bundle
openssl s_client -connect git.internal.company.com:443 -servername git.internal.company.com \
  -CAfile ca-cert.pem -verify_return_error </dev/null
```

## Step 2: Create a Secret with the CA Certificate

Flux reads the CA certificate from a Kubernetes secret referenced by the GitRepository. The CA certificate can be included in the same secret used for authentication.

Create a secret with HTTPS credentials and the CA certificate:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-https-with-ca
  namespace: flux-system
type: Opaque
stringData:
  # Git authentication credentials
  username: flux-bot
  password: your-personal-access-token
  # The CA certificate in PEM format
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    MIIFazCCA1OgAwIBAgIUEZ4hjmLqOB8mBKnr0V2bIhkTjhwwDQYJKoZIhvcNAQEL
    BQAwRTELMAkGA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
    GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNTAxMDEwMDAwMDBaFw0zNTAx
    ... (your CA certificate content) ...
    MDEwMDAwMDBaMEUxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
    -----END CERTIFICATE-----
```

Alternatively, create the secret using kubectl:

```bash
# Create the secret from files
kubectl create secret generic git-https-with-ca \
  --from-literal=username=flux-bot \
  --from-literal=password=your-personal-access-token \
  --from-file=ca.crt=./ca-cert.pem \
  --namespace=flux-system
```

## Step 3: Configure the GitRepository with CA Trust

Reference the secret containing the CA certificate in your GitRepository resource.

GitRepository with custom CA certificate:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: private-git-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.company.com/platform/k8s-config.git
  ref:
    branch: main
  secretRef:
    # This secret contains username, password, and ca.crt
    name: git-https-with-ca
  timeout: 60s
```

Apply the resources:

```bash
kubectl apply -f git-secret.yaml
kubectl apply -f gitrepository.yaml
```

## Step 4: Handle Certificate Chains

If your Git server's certificate is signed by an intermediate CA, include the required CA certificates in the `ca.crt` field.

A secret with a full certificate chain (intermediate + root CA):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-https-full-chain
  namespace: flux-system
type: Opaque
stringData:
  username: flux-bot
  password: your-access-token
  # Include the CA bundle: intermediate CA and root CA
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    (Intermediate CA certificate)
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    (Root CA certificate)
    -----END CERTIFICATE-----
```

Flux also supports the older `caFile` key for GitRepository secrets, but `ca.crt` takes precedence when both keys are present.

## Step 5: Use CA Certificates with SSH (Known Hosts)

For SSH connections, certificate trust works differently. Instead of CA certificates, you configure `known_hosts` to trust the server's SSH host key.

Create an SSH secret with known hosts:

```bash
# Scan the SSH host key
ssh-keyscan git.internal.company.com > known_hosts

# Verify the host key fingerprint matches what your admin provides
ssh-keygen -lf known_hosts
```

The SSH secret structure:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  # SSH private key for authentication
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    (your private key content)
    -----END OPENSSH PRIVATE KEY-----
  # Known hosts file to trust the server's SSH host key
  known_hosts: |
    git.internal.company.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...
```

## Step 6: Configure CA Trust for Multiple Repositories

When multiple GitRepository resources connect to the same Git server, they can share the CA certificate secret.

Multiple repositories sharing the same CA trust:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 5m
  url: https://git.internal.company.com/apps/config.git
  ref:
    branch: main
  secretRef:
    name: git-https-with-ca
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infra-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://git.internal.company.com/infra/config.git
  ref:
    branch: main
  secretRef:
    # Same secret works for all repos on the same Git server
    name: git-https-with-ca
```

## Step 7: Rotating CA Certificates

When your CA certificate is about to expire, you need to update the secret. During rotation, you can include both the old and new CA certificates to avoid downtime.

A secret with both old and new CA certificates during rotation:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-https-with-ca
  namespace: flux-system
type: Opaque
stringData:
  username: flux-bot
  password: your-access-token
  # Include both CAs during the rotation period
  ca.crt: |
    -----BEGIN CERTIFICATE-----
    (New CA certificate)
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    (Old CA certificate -- remove after rotation is complete)
    -----END CERTIFICATE-----
```

After all servers have been updated to use certificates signed by the new CA, remove the old CA from the secret.

Force the source-controller to pick up the updated secret:

```bash
# Update the secret
kubectl apply -f updated-secret.yaml

# Trigger reconciliation to use the new CA
flux reconcile source git private-git-repo
```

## Verifying the Configuration

Confirm that Flux can connect using the custom CA.

Check the GitRepository status:

```bash
# Check all Git sources
flux get sources git

# Get detailed status
kubectl describe gitrepository private-git-repo -n flux-system

# Check source-controller logs for TLS errors
kubectl logs -n flux-system deployment/source-controller | grep -i "tls\|certificate\|x509"
```

## Troubleshooting

**x509: certificate signed by unknown authority:** The `ca.crt` in your secret does not contain the correct CA. Confirm the issuer from `openssl s_client -showcerts` and get the matching CA certificate from your PKI source.

**x509: certificate has expired:** Your CA or server certificate has expired. Check expiration with `openssl x509 -in ca-cert.pem -enddate -noout`.

**Certificate chain issues:** If you see `unable to get local issuer certificate`, you are likely missing an intermediate CA. Include the required CA certificates in `ca.crt`.

**Secret not picked up:** After updating a secret, Flux may take up to one reconciliation interval to detect the change. Force an immediate reconciliation with `flux reconcile source git <name>`.

**Wrong secret key name:** Use `ca.crt` or `caFile` for GitRepository CA data. Other names such as `ca-bundle.crt` will not be used.

## Summary

Configuring custom CA certificates in Flux CD is accomplished by including the CA certificate in PEM format under the `ca.crt` key in the authentication secret referenced by the GitRepository. This approach works for self-signed certificates, internal CAs, and certificate chains. The same secret can hold both authentication credentials and the CA certificate, keeping the configuration simple. During CA rotation, include both old and new certificates to maintain uninterrupted service.
