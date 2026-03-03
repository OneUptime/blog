# How to Set Up Client Certificate Authentication on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Client Certificates, TLS, Authentication, Kubernetes, PKI

Description: Learn how to configure client certificate authentication on Talos Linux for strong mutual TLS authentication between users and the Kubernetes API server.

---

Client certificate authentication is one of the oldest and most reliable authentication methods in Kubernetes. It uses mutual TLS (mTLS) where both the client and server present certificates to prove their identity. When you use a client certificate to authenticate with the Kubernetes API server, the Common Name (CN) in the certificate becomes your username, and the Organization (O) fields become your group memberships. This guide walks through setting up client certificate authentication on a Talos Linux cluster.

## How Client Certificate Authentication Works

In a standard TLS connection, only the server presents a certificate. The client trusts the server if the certificate is signed by a trusted CA. In mutual TLS, the client also presents a certificate, and the server verifies it against its trusted CA.

For Kubernetes, this means:

1. You create a private key and a Certificate Signing Request (CSR)
2. The CSR is signed by the cluster's CA (or a Kubernetes-managed signer)
3. The signed certificate is your proof of identity
4. The API server extracts your username from CN and groups from O
5. RBAC determines what you are allowed to do

## Understanding the Certificate Fields

The fields in your certificate directly map to Kubernetes identity:

- **Common Name (CN)** becomes the username (e.g., `jane@example.com`)
- **Organization (O)** becomes group memberships (e.g., `developers`, `team-frontend`)

You can have multiple O fields, and each one becomes a separate group.

```bash
# Example CSR with username and two groups
openssl req -new -key user.key -out user.csr \
    -subj "/CN=jane@example.com/O=developers/O=team-frontend"
```

## Step 1: Generate a User Key Pair

Create a private key for the user:

```bash
# Generate a 2048-bit RSA private key
openssl genrsa -out jane.key 2048

# Or use ECDSA for a smaller, faster key
openssl ecparam -genkey -name prime256v1 -out jane.key
```

## Step 2: Create a Certificate Signing Request

Create a CSR with the appropriate CN and O fields:

```bash
# Create the CSR
openssl req -new -key jane.key -out jane.csr \
    -subj "/CN=jane@example.com/O=developers/O=team-frontend"

# Verify the CSR contents
openssl req -in jane.csr -text -noout
```

## Step 3: Sign the Certificate Using Kubernetes CSR API

The preferred method is to use the Kubernetes CertificateSigningRequest API:

```yaml
# jane-csr.yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane-csr
spec:
  request: <base64-encoded-csr>
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000  # 1 year
  usages:
  - client auth
```

Apply and approve:

```bash
# Encode the CSR
CSR_BASE64=$(cat jane.csr | base64 | tr -d '\n')

# Create the CSR resource
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane-csr
spec:
  request: $CSR_BASE64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000
  usages:
  - client auth
EOF

# List pending CSRs
kubectl get csr

# Approve the CSR
kubectl certificate approve jane-csr

# Check the status
kubectl get csr jane-csr

# Download the signed certificate
kubectl get csr jane-csr -o jsonpath='{.status.certificate}' | base64 -d > jane.crt

# Verify the certificate
openssl x509 -in jane.crt -text -noout
```

## Step 4: Create a kubeconfig for the User

Build a kubeconfig file that uses the client certificate:

```bash
# Get the cluster CA certificate
kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > cluster-ca.crt

# Get the API server URL
API_SERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')

# Create the kubeconfig
kubectl config set-cluster my-cluster \
    --server="$API_SERVER" \
    --certificate-authority=cluster-ca.crt \
    --embed-certs=true \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config set-credentials jane \
    --client-certificate=jane.crt \
    --client-key=jane.key \
    --embed-certs=true \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config set-context jane-context \
    --cluster=my-cluster \
    --user=jane \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config use-context jane-context \
    --kubeconfig=jane-kubeconfig.yaml
```

## Step 5: Set Up RBAC for the Certificate User

The certificate grants identity, but RBAC grants permissions:

```yaml
# jane-rbac.yaml

# Give jane edit access in the production namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: jane-edit-production
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
  - kind: User
    name: "jane@example.com"
    apiGroup: rbac.authorization.k8s.io

---
# Give the developers group view access cluster-wide
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-view
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
  - kind: Group
    name: "developers"
    apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f jane-rbac.yaml
```

## Step 6: Test the Authentication

```bash
# Use the new kubeconfig
export KUBECONFIG=jane-kubeconfig.yaml

# Test access
kubectl get pods -n production
# Should succeed (edit role includes get/list)

kubectl get nodes
# Should succeed (view ClusterRole)

kubectl delete node worker-1
# Should fail (view does not include delete)

# Check who you are
kubectl auth whoami
# Should show jane@example.com with groups [developers, team-frontend]
```

## Automating Certificate Generation

For organizations with many users, automate the certificate generation process:

```bash
#!/bin/bash
# create-user-cert.sh

USERNAME=$1
GROUPS=$2  # Comma-separated groups
EXPIRY_DAYS=${3:-365}

if [ -z "$USERNAME" ] || [ -z "$GROUPS" ]; then
    echo "Usage: ./create-user-cert.sh <username> <group1,group2> [expiry_days]"
    exit 1
fi

# Build the subject string
SUBJECT="/CN=$USERNAME"
IFS=',' read -ra GROUP_ARRAY <<< "$GROUPS"
for group in "${GROUP_ARRAY[@]}"; do
    SUBJECT="$SUBJECT/O=$group"
done

# Generate key and CSR
openssl genrsa -out "${USERNAME}.key" 2048
openssl req -new -key "${USERNAME}.key" -out "${USERNAME}.csr" -subj "$SUBJECT"

# Create Kubernetes CSR
CSR_BASE64=$(cat "${USERNAME}.csr" | base64 | tr -d '\n')
CSR_NAME="${USERNAME}-$(date +%s)"

cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: $CSR_NAME
spec:
  request: $CSR_BASE64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: $((EXPIRY_DAYS * 86400))
  usages:
  - client auth
EOF

# Auto-approve (in production, you may want manual approval)
kubectl certificate approve "$CSR_NAME"

# Wait for approval
sleep 2

# Download the certificate
kubectl get csr "$CSR_NAME" -o jsonpath='{.status.certificate}' | base64 -d > "${USERNAME}.crt"

# Generate kubeconfig
API_SERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_CA=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

cat > "${USERNAME}-kubeconfig.yaml" <<EOF
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: $API_SERVER
    certificate-authority-data: $CLUSTER_CA
  name: cluster
contexts:
- context:
    cluster: cluster
    user: $USERNAME
  name: default
current-context: default
users:
- name: $USERNAME
  user:
    client-certificate-data: $(cat "${USERNAME}.crt" | base64 | tr -d '\n')
    client-key-data: $(cat "${USERNAME}.key" | base64 | tr -d '\n')
EOF

echo "Created kubeconfig: ${USERNAME}-kubeconfig.yaml"
echo "Certificate expires in $EXPIRY_DAYS days"

# Clean up temporary files
rm -f "${USERNAME}.csr"
```

## Certificate Expiration Management

Client certificates expire, and when they do, users lose access. Track certificate expiration:

```bash
# Check when a certificate expires
openssl x509 -in jane.crt -noout -enddate

# List all pending and approved CSRs with their ages
kubectl get csr -o wide
```

Set up monitoring for certificate expiration:

```bash
#!/bin/bash
# check-user-cert-expiry.sh

CERT_DIR="/path/to/user-certs"
WARNING_DAYS=30

for cert_file in "$CERT_DIR"/*.crt; do
    username=$(basename "$cert_file" .crt)
    expiry=$(openssl x509 -in "$cert_file" -noout -enddate | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$expiry" +%s)
    now_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

    if [ "$days_left" -lt "$WARNING_DAYS" ]; then
        echo "WARNING: Certificate for $username expires in $days_left days"
    fi
done
```

## Revoking Client Certificates

Kubernetes does not have a built-in certificate revocation mechanism. If a certificate is compromised, you have several options:

1. **Remove the RBAC bindings** for the user so the certificate authenticates but has no permissions
2. **Rotate the cluster CA** (nuclear option, all certificates become invalid)
3. **Use short-lived certificates** so compromised ones expire quickly

```bash
# Quick revocation: Remove all RBAC bindings for the user
kubectl delete rolebinding --all-namespaces \
    --field-selector="subjects[0].name=jane@example.com"

kubectl delete clusterrolebinding \
    --field-selector="subjects[0].name=jane@example.com"
```

## Combining with Other Authentication Methods

Client certificate authentication works alongside other methods. A common setup:

- Client certificates for system components and emergency access
- OIDC for daily human user authentication
- ServiceAccount tokens for pod authentication

```yaml
# Talos API server will accept all configured auth methods
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://auth.example.com"
      oidc-client-id: "kubernetes"
      # Client cert auth is always enabled when the CA is configured
```

## Conclusion

Client certificate authentication on Talos Linux provides strong, cryptographic identity verification for Kubernetes access. The CN and O fields in the certificate directly map to Kubernetes usernames and groups, making it straightforward to integrate with RBAC. For human users, consider combining certificates with OIDC for a better user experience. For system components and break-glass access, certificates are an excellent choice. Always manage certificate lifetimes carefully and have a plan for certificate compromise.
