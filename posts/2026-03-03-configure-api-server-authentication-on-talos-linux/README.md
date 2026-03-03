# How to Configure API Server Authentication on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, API Server, Authentication, Kubernetes, Security

Description: Learn how to configure various authentication methods on the Kubernetes API server in Talos Linux including OIDC, webhooks, and client certificates.

---

The Kubernetes API server is the front door to your cluster. Every kubectl command, every controller, every pod that talks to the Kubernetes API goes through it. How you configure authentication on the API server determines who can get through that door and how they prove their identity. Talos Linux configures the API server through its machine configuration, which gives you full control over authentication settings.

## Understanding API Server Authentication

The Kubernetes API server supports multiple authentication methods simultaneously. When a request arrives, the API server tries each configured authenticator in order. The first one that succeeds determines the identity of the request.

The authentication methods available are:

- Client certificates (X.509)
- Bearer tokens (static token file, bootstrap tokens)
- OIDC tokens
- Webhook token authentication
- Service account tokens
- Anonymous authentication

Talos Linux enables some of these by default and lets you configure the rest through machine configuration patches.

## Default Authentication in Talos Linux

Out of the box, a Talos Linux cluster uses:

- Client certificates for system components (kubelet, controller manager, scheduler)
- Service account tokens for pods
- The talosconfig for API access via talosctl

```bash
# Check what authentication modes are active
talosctl logs kube-apiserver -n <control-plane-ip> | grep -E "auth|token|cert|oidc"
```

## Configuring OIDC Authentication

OIDC is the recommended method for human users. Configure it through the Talos machine config:

```yaml
# oidc-auth-patch.yaml
cluster:
  apiServer:
    extraArgs:
      # OIDC Configuration
      oidc-issuer-url: "https://auth.example.com"
      oidc-client-id: "kubernetes"
      oidc-username-claim: "email"
      oidc-username-prefix: "oidc:"
      oidc-groups-claim: "groups"
      oidc-groups-prefix: "oidc:"
      oidc-required-claim: "email_verified=true"
```

Apply to control plane nodes:

```bash
talosctl patch machineconfig \
    --patch @oidc-auth-patch.yaml \
    -n <control-plane-ip>
```

### OIDC Parameters Explained

- `oidc-issuer-url` - The URL of your identity provider. The API server will fetch the OIDC discovery document from `{issuer-url}/.well-known/openid-configuration`.
- `oidc-client-id` - The client ID to validate against in the token's `aud` claim.
- `oidc-username-claim` - Which JWT claim to use as the username. Common options: `email`, `sub`, `preferred_username`.
- `oidc-username-prefix` - Prefix added to usernames to avoid collisions with other auth methods.
- `oidc-groups-claim` - Which JWT claim contains group memberships.
- `oidc-groups-prefix` - Prefix added to group names.
- `oidc-required-claim` - Reject tokens that do not contain this claim. Useful for requiring email verification.

### Using a Custom CA for OIDC

If your identity provider uses a private CA:

```yaml
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://auth.internal.example.com"
      oidc-client-id: "kubernetes"
      oidc-ca-file: "/etc/kubernetes/pki/oidc-ca.crt"
    extraVolumes:
      - hostPath: /var/oidc-ca
        mountPath: /etc/kubernetes/pki
        readonly: true
```

## Configuring Webhook Token Authentication

Webhook authentication delegates token validation to an external service. This is useful when you need custom authentication logic.

### Step 1: Create the Webhook Configuration

```yaml
# webhook-config.yaml
apiVersion: v1
kind: Config
clusters:
  - name: authn-webhook
    cluster:
      server: https://authn-webhook.kube-system.svc:443/authenticate
      certificate-authority: /etc/kubernetes/pki/webhook-ca.crt
users:
  - name: kube-apiserver
    user:
      client-certificate: /etc/kubernetes/pki/webhook-client.crt
      client-key: /etc/kubernetes/pki/webhook-client.key
current-context: webhook
contexts:
  - context:
      cluster: authn-webhook
      user: kube-apiserver
    name: webhook
```

### Step 2: Configure the API Server

```yaml
# webhook-auth-patch.yaml
cluster:
  apiServer:
    extraArgs:
      authentication-token-webhook-config-file: "/etc/kubernetes/authn-webhook.yaml"
      authentication-token-webhook-cache-ttl: "5m"
```

The webhook service receives a TokenReview request and responds with the authentication result:

```json
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "status": {
    "authenticated": true,
    "user": {
      "username": "jane@example.com",
      "uid": "jane-12345",
      "groups": ["developers", "team-frontend"]
    }
  }
}
```

## Configuring Client Certificate Authentication

Client certificates are already used by Talos Linux for system components. You can also use them for user authentication.

### Generating User Certificates

```bash
# Generate a private key for the user
openssl genrsa -out jane.key 2048

# Create a certificate signing request
openssl req -new -key jane.key -out jane.csr \
    -subj "/CN=jane@example.com/O=developers/O=team-frontend"
# CN becomes the username, O becomes group memberships

# Create a Kubernetes CSR object
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane-csr
spec:
  request: $(cat jane.csr | base64 | tr -d '\n')
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF

# Approve the CSR
kubectl certificate approve jane-csr

# Retrieve the signed certificate
kubectl get csr jane-csr -o jsonpath='{.status.certificate}' | base64 -d > jane.crt
```

### Creating a kubeconfig with Client Certificate

```bash
# Set up the kubeconfig
kubectl config set-cluster my-cluster \
    --server=https://10.0.0.1:6443 \
    --certificate-authority=ca.crt \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config set-credentials jane \
    --client-certificate=jane.crt \
    --client-key=jane.key \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config set-context my-cluster \
    --cluster=my-cluster \
    --user=jane \
    --kubeconfig=jane-kubeconfig.yaml

kubectl config use-context my-cluster \
    --kubeconfig=jane-kubeconfig.yaml
```

## Disabling Anonymous Authentication

By default, unauthenticated requests are assigned the `system:anonymous` user and `system:unauthenticated` group. For production clusters, consider restricting this:

```yaml
# disable-anonymous-patch.yaml
cluster:
  apiServer:
    extraArgs:
      anonymous-auth: "false"
```

Note that some health check endpoints require anonymous access. If you disable it, make sure your load balancer health checks use authenticated requests.

## Configuring Authentication Priority

When multiple authentication methods are configured, the API server tries them in a specific order:

1. Client certificates
2. Bearer tokens (webhook, OIDC, static tokens, bootstrap tokens)
3. Anonymous (if enabled)

You cannot change this order, but you can control which methods are active by enabling or disabling them through the API server configuration.

## Securing the Authentication Configuration

### Rotate Bootstrap Tokens

Bootstrap tokens are used during node join. They should be rotated regularly:

```bash
# List existing bootstrap tokens
kubectl get secrets -n kube-system -l type=bootstrap.kubernetes.io/token

# Delete expired tokens
kubectl delete secret bootstrap-token-abc123 -n kube-system
```

### Audit Authentication Events

Enable audit logging to track authentication:

```yaml
# audit-patch.yaml
cluster:
  apiServer:
    extraArgs:
      audit-log-path: "/var/log/kubernetes/audit.log"
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      audit-policy-file: "/etc/kubernetes/audit-policy.yaml"
```

Create an audit policy that captures authentication events:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all authentication failures
  - level: Metadata
    verbs: ["*"]
    users: ["system:anonymous"]

  # Log all API access
  - level: Metadata
    verbs: ["create", "update", "patch", "delete"]

  # Skip logging read access to reduce noise
  - level: None
    verbs: ["get", "list", "watch"]
    resources:
      - group: ""
        resources: ["configmaps", "endpoints"]
```

## Troubleshooting Authentication Issues

```bash
# Check API server logs for auth errors
talosctl logs kube-apiserver -n <control-plane-ip> | grep -i "unable to authenticate\|authentication failed\|invalid token"

# Test authentication with verbose output
kubectl get pods -v=8 2>&1 | grep -i "auth\|401\|403"

# Verify OIDC configuration
kubectl get --raw /.well-known/openid-configuration 2>/dev/null

# Check if the API server can reach the OIDC provider
talosctl logs kube-apiserver -n <control-plane-ip> | grep "oidc"
```

## Conclusion

Configuring API server authentication on Talos Linux is about choosing the right combination of methods for your organization and configuring them through the Talos machine configuration. Use OIDC for human users, service account tokens for pods, and client certificates for system components. Disable anonymous authentication in production, enable audit logging, and regularly review your authentication configuration. The Talos machine config approach makes it easy to keep authentication configuration consistent across all control plane nodes.
