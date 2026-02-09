# How to Configure Kubernetes API Server Client Certificate Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, PKI

Description: Learn how to set up and manage client certificate authentication for Kubernetes API server access to provide secure, cryptographic identity for users and automation systems.

---

Client certificate authentication uses X.509 certificates to verify the identity of users and systems accessing the Kubernetes API server. This cryptographic authentication method provides strong security guarantees, works without external dependencies, and is ideal for automation systems, CI/CD pipelines, and environments where OIDC integration is not feasible.

This guide demonstrates how to configure, manage, and secure client certificate authentication for Kubernetes.

## Understanding Client Certificate Authentication

In client certificate authentication, each user or system is issued an X.509 certificate signed by the Kubernetes cluster's Certificate Authority (CA). The API server validates certificates against its CA during TLS handshake and extracts identity information from certificate fields:

- **Common Name (CN)**: Used as the username
- **Organization (O)**: Used for group membership

The API server configuration includes the CA certificate that signed client certificates, enabling it to verify their authenticity.

## Prerequisites

Ensure you have:

- Access to Kubernetes control plane nodes
- Cluster CA certificate and key
- OpenSSL or cfssl installed
- Understanding of X.509 certificates and PKI

## Locating Cluster CA

Find the cluster CA certificate and key:

```bash
# For kubeadm clusters
CA_CERT=/etc/kubernetes/pki/ca.crt
CA_KEY=/etc/kubernetes/pki/ca.key

# Verify CA location
sudo ls -l /etc/kubernetes/pki/ca.{crt,key}

# View CA certificate details
openssl x509 -in $CA_CERT -text -noout
```

## Generating Client Certificates with OpenSSL

Create a client certificate for a user:

```bash
# Generate private key
openssl genrsa -out alice.key 2048

# Create certificate signing request
openssl req -new -key alice.key -out alice.csr \
  -subj "/CN=alice/O=developers/O=team-a"

# Sign certificate with cluster CA
sudo openssl x509 -req -in alice.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out alice.crt \
  -days 365
```

The certificate now identifies:
- **Username**: alice (from CN)
- **Groups**: developers, team-a (from O fields)

## Using Kubernetes Certificate API

For production environments, use the Kubernetes Certificate API instead of direct CA access:

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: alice
spec:
  request: <base64-encoded-csr>
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000  # 1 year
  usages:
  - client auth
```

Generate and submit the CSR:

```bash
# Generate private key and CSR
openssl genrsa -out alice.key 2048
openssl req -new -key alice.key -out alice.csr \
  -subj "/CN=alice/O=developers"

# Encode CSR
CSR_BASE64=$(cat alice.csr | base64 | tr -d '\n')

# Create CSR object
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: alice
spec:
  request: $CSR_BASE64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000
  usages:
  - client auth
EOF

# Approve the CSR
kubectl certificate approve alice

# Retrieve signed certificate
kubectl get csr alice -o jsonpath='{.status.certificate}' | base64 -d > alice.crt
```

## Configuring kubectl

Configure kubectl to use the client certificate:

```bash
# Add user credentials
kubectl config set-credentials alice \
  --client-certificate=alice.crt \
  --client-key=alice.key \
  --embed-certs=true

# Create context
kubectl config set-context alice-context \
  --cluster=kubernetes \
  --user=alice

# Use the context
kubectl config use-context alice-context

# Test access
kubectl get pods
# Error: forbidden (no RBAC permissions yet)
```

## Creating RBAC Bindings

Grant permissions to certificate-based users:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: alice-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: User
  name: alice
  apiGroup: rbac.authorization.k8s.io
---
# Grant permissions to group
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-edit
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- kind: Group
  name: developers
  apiGroup: rbac.authorization.k8s.io
```

Now alice can access the cluster:

```bash
kubectl config use-context alice-context
kubectl get pods -n development  # Should work
kubectl get pods -n production   # May fail depending on RBAC
```

## Automation with Service Account Certificates

Create certificates for automation systems:

```bash
# Generate certificate for CI/CD system
openssl genrsa -out ci-bot.key 2048
openssl req -new -key ci-bot.key -out ci-bot.csr \
  -subj "/CN=system:ci-bot/O=system:automation"

sudo openssl x509 -req -in ci-bot.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out ci-bot.crt \
  -days 730  # 2 years for automation
```

Create RBAC for automation:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ci-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ci-bot-deployer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ci-deployer
subjects:
- kind: User
  name: system:ci-bot
  apiGroup: rbac.authorization.k8s.io
```

Use in CI/CD pipeline:

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - kubectl config set-cluster kubernetes --server=$K8S_API_SERVER
      --certificate-authority=$K8S_CA_CERT
    - kubectl config set-credentials ci-bot
      --client-certificate=$CI_BOT_CERT
      --client-key=$CI_BOT_KEY
    - kubectl config set-context deploy-context
      --cluster=kubernetes --user=ci-bot
    - kubectl config use-context deploy-context
    - kubectl apply -f deployment.yaml
```

## Certificate Rotation

Implement certificate rotation before expiry:

```bash
# Check certificate expiry
openssl x509 -in alice.crt -noout -enddate

# Automate rotation with a script
cat > rotate-cert.sh <<'EOF'
#!/bin/bash
USER=$1
DAYS_BEFORE_EXPIRY=30

# Check if certificate expires soon
EXPIRY=$(openssl x509 -in ${USER}.crt -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt $DAYS_BEFORE_EXPIRY ]; then
  echo "Certificate expires in $DAYS_UNTIL_EXPIRY days, rotating..."

  # Generate new CSR with same subject
  SUBJECT=$(openssl x509 -in ${USER}.crt -noout -subject | sed 's/subject=//')
  openssl req -new -key ${USER}.key -out ${USER}-new.csr -subj "$SUBJECT"

  # Submit for signing
  # ... use Certificate API or manual signing ...

  echo "New certificate issued"
else
  echo "Certificate valid for $DAYS_UNTIL_EXPIRY more days"
fi
EOF

chmod +x rotate-cert.sh
```

## Revoking Certificates

Kubernetes doesn't support CRL (Certificate Revocation Lists), so revocation requires:

1. Remove RBAC bindings
2. Rotate cluster CA (drastic)

Remove access immediately:

```bash
# Delete all RBAC for user
kubectl delete clusterrolebindings,rolebindings --all-namespaces \
  --field-selector subjects[*].name=alice

# Verify user has no access
kubectl auth can-i --list --as=alice
```

For complete revocation, rotate the cluster CA:

```bash
# Generate new CA
openssl genrsa -out new-ca.key 2048
openssl req -x509 -new -nodes -key new-ca.key \
  -days 3650 -out new-ca.crt -subj "/CN=kubernetes"

# Update API server to trust both CAs temporarily
# --client-ca-file=/etc/kubernetes/pki/ca.crt,/etc/kubernetes/pki/new-ca.crt

# Reissue all client certificates with new CA
# Switch API server to only trust new CA
# --client-ca-file=/etc/kubernetes/pki/new-ca.crt
```

## Monitoring Certificate Usage

Track certificate-based authentication:

```yaml
# Audit policy for certificate authentication
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  omitStages:
  - RequestReceived
  users:
  - alice
  - system:ci-bot
---
# Prometheus query for certificate auth
apiVersion: v1
kind: ConfigMap
metadata:
  name: cert-auth-monitoring
data:
  queries.promql: |
    # Certificate authentication attempts
    sum by (username) (apiserver_authentication_attempts_total{authenticator="x509"})

    # Failed certificate authentications
    sum by (username) (apiserver_authentication_attempts_total{
      authenticator="x509",
      result="error"
    })
```

## Best Practices

Follow these practices for secure certificate authentication:

**Short certificate lifetimes**: Issue certificates for 90 days or less

**Automation certificates**: Use longer lifetimes (1-2 years) but rotate regularly

**Subject restrictions**: Use meaningful CN and O values that map to RBAC

**Key protection**: Store private keys securely, never in version control

**Rotation procedures**: Automate certificate rotation before expiry

**Least privilege**: Grant minimal necessary RBAC permissions

**Audit logging**: Monitor all certificate-based access

## Troubleshooting

Debug certificate authentication issues:

```bash
# Verify certificate is signed by cluster CA
openssl verify -CAfile /etc/kubernetes/pki/ca.crt alice.crt

# Check certificate details
openssl x509 -in alice.crt -text -noout

# Test authentication
curl --cert alice.crt --key alice.key \
  --cacert /etc/kubernetes/pki/ca.crt \
  https://api-server:6443/api/v1/namespaces

# Check API server logs
kubectl logs -n kube-system kube-apiserver-<node> | grep alice
```

## Conclusion

Client certificate authentication provides strong, cryptographic identity for Kubernetes API server access without external dependencies. By properly managing certificate issuance, rotation, and revocation, you can maintain secure access for both human users and automation systems.

Use the Kubernetes Certificate API for production certificate management, implement automated rotation before expiry, grant least-privilege RBAC permissions, and monitor certificate-based authentication continuously. Track certificate health and usage with OneUptime to ensure secure, reliable access to your Kubernetes clusters.
