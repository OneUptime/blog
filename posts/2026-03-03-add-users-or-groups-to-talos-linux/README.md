# How to Add Users or Groups to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Users, Groups, Security, Access Control, Kubernetes, System Administration

Description: Understanding user and group management on Talos Linux and how to work within its immutable, API-driven security model.

---

If you are coming from a traditional Linux background, one of your first instincts when setting up a new server is to create user accounts. You add administrators, set up service accounts, configure sudo access, and manage group memberships. On Talos Linux, the concept of user management is fundamentally different because there are no interactive users.

This guide explains how Talos handles users and groups, why it works differently from traditional Linux, and how to manage access control for your cluster.

## Why Talos Does Not Have Traditional Users

On a traditional Linux server, user accounts serve several purposes:

1. Interactive login (SSH, console)
2. File ownership and permissions
3. Process isolation
4. Audit trails

Talos Linux eliminates the first purpose entirely - there is no interactive login. Without a shell or SSH, there is no reason to have user accounts that people log into. The other purposes are handled differently.

### Process Isolation

All workloads on Talos run in containers (either Talos system containers or Kubernetes pods). Container isolation is provided by namespaces and cgroups, which are more robust than traditional Unix user-based isolation.

### File Ownership

The root filesystem is immutable and read-only. Talos manages all system files, so there is no need for different user ownerships at the OS level.

### Audit Trails

Access to the Talos API is authenticated using mTLS certificates. Every action is tied to a certificate, providing a stronger audit trail than username/password authentication.

## Managing Access with Talos Roles

Instead of Unix users and groups, Talos uses roles to control what operations are allowed through the API. The talosconfig file contains credentials with specific role assignments.

### Understanding Talos Roles

Talos defines several built-in roles:

```bash
# Check your current role
talosctl config info
```

The common roles are:

- **os:admin** - Full access to all Talos API operations
- **os:reader** - Read-only access to node information
- **os:etcd:backup** - Permission to create etcd backups
- **os:operator** - Operational access without full admin privileges

### Creating Role-Specific Credentials

You can generate talosconfigs with specific roles for different team members:

```bash
# Generate a read-only talosconfig
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --roles os:reader

# Generate an operator talosconfig
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --roles os:operator
```

This lets you give your developers read-only access to node information for debugging while restricting configuration changes to administrators.

## Kubernetes RBAC for Application Access

For application-level access control, use Kubernetes Role-Based Access Control (RBAC). This is where the traditional concept of "users" applies in a Talos environment:

### Creating Kubernetes Users

Kubernetes users are defined by their certificates or authentication tokens. Here is how to create a certificate-based user:

```bash
# Generate a private key for the user
openssl genrsa -out developer.key 2048

# Create a certificate signing request
openssl req -new -key developer.key -out developer.csr -subj "/CN=developer/O=dev-team"

# Create a CertificateSigningRequest in Kubernetes
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: developer
spec:
  request: $(cat developer.csr | base64 | tr -d '\n')
  signerName: kubernetes.io/kube-apiserver-client
  usages:
    - client auth
EOF

# Approve the CSR
kubectl certificate approve developer

# Extract the signed certificate
kubectl get csr developer -o jsonpath='{.status.certificate}' | base64 -d > developer.crt
```

### Creating RBAC Roles

```yaml
# Define what the developer role can do
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: development
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "delete"]
---
# Bind the role to the user
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: development
subjects:
  - kind: User
    name: developer
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

### Creating Service Accounts

For automated systems and CI/CD pipelines, use Kubernetes service accounts:

```yaml
# Create a service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: production
---
# Create a role for deployments
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
---
# Bind the service account to the role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-binding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: production
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io
```

## Container-Level User and Group Configuration

While Talos itself does not manage OS-level users, containers running on Talos can define their own users and groups:

```yaml
# Pod with specific user/group settings
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    # Run all containers as this user/group
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        # Do not allow privilege escalation
        allowPrivilegeEscalation: false
        runAsNonRoot: true
```

This ensures containers run as non-root users, which is a security best practice regardless of the underlying OS.

## System Extension Users

Some system extensions create their own users and groups at the OS level for the services they provide. These are managed by the extension itself, not by the administrator:

```bash
# Check what users exist on the system
talosctl read --nodes 192.168.1.10 /etc/passwd

# Check what groups exist
talosctl read --nodes 192.168.1.10 /etc/group
```

The default Talos system has minimal users (root, nobody) since there is no need for more.

## Integrating with External Identity Providers

For organizations with existing identity infrastructure, integrate Kubernetes authentication with your identity provider:

### OIDC Integration

```yaml
# Configure the API server to use OIDC
cluster:
  apiServer:
    extraArgs:
      oidc-issuer-url: "https://accounts.google.com"
      oidc-client-id: "my-k8s-client-id"
      oidc-username-claim: "email"
      oidc-groups-claim: "groups"
```

This lets your team authenticate to Kubernetes using their existing corporate credentials.

### LDAP via Dex

For LDAP-based environments, use Dex as an identity broker:

```yaml
# Deploy Dex to bridge LDAP to Kubernetes OIDC
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dex
  namespace: auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dex
  template:
    metadata:
      labels:
        app: dex
    spec:
      containers:
        - name: dex
          image: ghcr.io/dexidp/dex:v2.37.0
          args: ["dex", "serve", "/etc/dex/config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /etc/dex
      volumes:
        - name: config
          configMap:
            name: dex-config
```

## Access Control Best Practices on Talos

1. **Principle of least privilege**: Give each person and system only the access they need
2. **Use Talos roles**: Generate separate talosconfigs with appropriate roles for different team members
3. **Use Kubernetes RBAC**: Define fine-grained permissions at the namespace level
4. **Use namespaces**: Separate environments (dev, staging, production) into different namespaces with different access policies
5. **Audit access**: Enable Kubernetes audit logging to track who does what
6. **Rotate credentials**: Regularly rotate talosconfig certificates and Kubernetes tokens
7. **Use external identity**: Integrate with your organization's identity provider rather than managing separate credentials

## Conclusion

Talos Linux replaces traditional Unix user management with a certificate-based, role-driven access model at the OS level and delegates application-level access control to Kubernetes RBAC. This approach is more secure and more manageable than maintaining user accounts on individual servers. While it requires a shift in thinking, the result is a cleaner separation of concerns: Talos manages the OS, Kubernetes manages workloads, and your identity provider manages who people are.
