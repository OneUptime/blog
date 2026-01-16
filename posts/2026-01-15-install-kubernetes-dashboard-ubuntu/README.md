# How to Install Kubernetes Dashboard on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ubuntu, Dashboard, DevOps, Monitoring, Web UI, Cluster Management

Description: A complete guide to installing, configuring, and securing Kubernetes Dashboard on Ubuntu for visual cluster management and monitoring.

---

Kubernetes Dashboard is the official web-based UI for Kubernetes clusters. It provides a visual interface to deploy applications, troubleshoot workloads, and manage cluster resources without memorizing kubectl commands. This guide walks through installation, authentication setup, access methods, and security hardening on Ubuntu.

## What is Kubernetes Dashboard?

Kubernetes Dashboard is a general-purpose web UI that runs as a Pod inside your cluster. It allows you to:

- View and manage Pods, Deployments, Services, and other resources
- Deploy containerized applications via forms or YAML
- Monitor resource consumption (CPU, memory) when metrics-server is installed
- View logs and exec into containers
- Troubleshoot failing workloads visually

The Dashboard is not installed by default because it requires careful security configuration. An improperly secured Dashboard can expose your entire cluster to attackers.

## Prerequisites

Before installing Kubernetes Dashboard, ensure you have:

- **Ubuntu 20.04/22.04/24.04** (server or desktop)
- **A running Kubernetes cluster** (minikube, kubeadm, k3s, or managed K8s)
- **kubectl configured** and able to communicate with your cluster
- **Cluster admin privileges** to create ServiceAccounts and RBAC rules
- **Helm 3.x** (optional but recommended for easier installation)

Verify your cluster is accessible before proceeding.

```bash
# Check kubectl can reach the cluster
kubectl cluster-info
# Verify you have nodes in Ready state
kubectl get nodes
# Confirm your current context
kubectl config current-context
```

## Installing Kubernetes Dashboard

There are two primary installation methods: using the official YAML manifest or Helm. Both work well; Helm offers more customization options.

### Method 1: Official YAML Manifest

The Kubernetes project maintains an official manifest that deploys Dashboard with sensible defaults.

```bash
# Apply the recommended Dashboard manifest (v2.7.0 - check for latest version)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

This creates the `kubernetes-dashboard` namespace and deploys:
- Dashboard deployment and service
- Metrics scraper for basic resource stats
- Required RBAC rules for the Dashboard to read cluster state

Verify the installation completed successfully.

```bash
# Check that Dashboard pods are running
kubectl get pods -n kubernetes-dashboard
# Expected output: dashboard and metrics-scraper pods in Running state
```

### Method 2: Helm Installation

Helm provides more control over Dashboard configuration and simplifies upgrades.

```bash
# Add the kubernetes-dashboard Helm repository
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
# Update your local Helm chart cache
helm repo update
# Install Dashboard with default settings
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard \
  --create-namespace
```

For production environments, customize the installation with a values file.

```bash
# Create a custom values file for production settings
cat <<EOF > dashboard-values.yaml
# Enable metrics-scraper for resource usage graphs
metricsScraper:
  enabled: true
# Set resource limits to prevent runaway consumption
resources:
  requests:
    cpu: 100m
    memory: 200Mi
  limits:
    cpu: 500m
    memory: 500Mi
# Use ClusterIP by default (we'll configure access separately)
service:
  type: ClusterIP
EOF

# Install with custom values
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard \
  --create-namespace \
  -f dashboard-values.yaml
```

## Creating an Admin User and RBAC Configuration

The Dashboard requires authentication. Create a ServiceAccount with appropriate permissions to access cluster resources.

### Create Admin ServiceAccount

This ServiceAccount will have full cluster-admin privileges. Use it only for administrative tasks.

```yaml
# Save as dashboard-admin.yaml
# Creates a ServiceAccount for Dashboard login
apiVersion: v1
kind: ServiceAccount
metadata:
  name: admin-user
  namespace: kubernetes-dashboard
---
# Binds cluster-admin role to our ServiceAccount
# WARNING: This grants full cluster access - use carefully
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: admin-user
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: admin-user
  namespace: kubernetes-dashboard
```

Apply the configuration to create the ServiceAccount.

```bash
# Apply the admin user configuration
kubectl apply -f dashboard-admin.yaml
# Verify the ServiceAccount was created
kubectl get serviceaccount admin-user -n kubernetes-dashboard
```

### Create Read-Only User (Recommended for Most Users)

For day-to-day monitoring, create a restricted user that can view but not modify resources.

```yaml
# Save as dashboard-readonly.yaml
# ServiceAccount for read-only Dashboard access
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readonly-user
  namespace: kubernetes-dashboard
---
# ClusterRole with view-only permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-readonly
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets", "persistentvolumeclaims", "nodes", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "daemonsets", "statefulsets", "replicasets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses", "networkpolicies"]
  verbs: ["get", "list", "watch"]
---
# Bind the readonly role to our ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-readonly
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dashboard-readonly
subjects:
- kind: ServiceAccount
  name: readonly-user
  namespace: kubernetes-dashboard
```

Apply the read-only user configuration.

```bash
# Create the read-only user and permissions
kubectl apply -f dashboard-readonly.yaml
```

## Accessing the Kubernetes Dashboard

The Dashboard is not exposed externally by default for security reasons. Here are three methods to access it.

### Method 1: kubectl proxy (Development Only)

The simplest method for local development. Creates a secure tunnel from your machine to the cluster.

```bash
# Start the kubectl proxy - runs in foreground
kubectl proxy
# The proxy listens on localhost:8001 by default
```

With the proxy running, open your browser and navigate to:

```
http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

This method only works from the machine running the proxy and is not suitable for team access.

### Method 2: NodePort Service (Internal Networks)

Expose the Dashboard on a static port on every node. Useful for internal networks with firewall protection.

```bash
# Patch the Dashboard service to use NodePort
kubectl patch svc kubernetes-dashboard -n kubernetes-dashboard \
  -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "targetPort": 8443, "nodePort": 30443}]}}'
```

Access the Dashboard at `https://<any-node-ip>:30443`. Your browser will warn about the self-signed certificate.

```bash
# Find your node IPs
kubectl get nodes -o wide
# Access Dashboard at: https://<NODE_EXTERNAL_IP>:30443
```

### Method 3: Ingress Controller (Production)

For production environments, expose the Dashboard through an Ingress with proper TLS termination.

```yaml
# Save as dashboard-ingress.yaml
# Requires an Ingress Controller (nginx, traefik, etc.) to be installed
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    # For nginx ingress controller
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Optional: add authentication at ingress level
    # nginx.ingress.kubernetes.io/auth-type: basic
    # nginx.ingress.kubernetes.io/auth-secret: dashboard-basic-auth
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - dashboard.example.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

Apply the Ingress configuration.

```bash
# Create the Ingress resource
kubectl apply -f dashboard-ingress.yaml
# Verify Ingress was created and has an address
kubectl get ingress -n kubernetes-dashboard
```

## Dashboard Authentication Methods

Kubernetes Dashboard supports two authentication methods: Bearer Token and Kubeconfig file.

### Token-Based Login

The most common method. Generate a token for your ServiceAccount and paste it into the Dashboard login form.

For Kubernetes 1.24 and later, tokens are not automatically created. Generate one manually.

```bash
# Generate a token for the admin-user ServiceAccount
# Token expires in 24 hours by default
kubectl create token admin-user -n kubernetes-dashboard

# For a longer-lived token (30 days), use --duration
kubectl create token admin-user -n kubernetes-dashboard --duration=720h
```

For Kubernetes versions before 1.24, retrieve the auto-generated secret token.

```bash
# Find the secret name (pre-1.24 clusters only)
kubectl get secret -n kubernetes-dashboard | grep admin-user
# Extract and decode the token
kubectl get secret admin-user-token-xxxxx -n kubernetes-dashboard -o jsonpath='{.data.token}' | base64 --decode
```

Copy the token output and paste it into the Dashboard login page.

### Creating a Long-Lived Token Secret (Optional)

If you need a persistent token that survives pod restarts, create a Secret explicitly.

```yaml
# Save as admin-token-secret.yaml
# Creates a permanent token for the admin-user ServiceAccount
apiVersion: v1
kind: Secret
metadata:
  name: admin-user-token
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: admin-user
type: kubernetes.io/service-account-token
```

Apply and retrieve the permanent token.

```bash
# Create the token secret
kubectl apply -f admin-token-secret.yaml
# Retrieve the token value
kubectl get secret admin-user-token -n kubernetes-dashboard -o jsonpath='{.data.token}' | base64 --decode
```

### Kubeconfig File Method

Users can authenticate using their existing kubeconfig file. This method uses the same credentials configured for kubectl.

Create a dedicated kubeconfig for Dashboard access.

```bash
# Get the cluster CA certificate
kubectl get secret -n kubernetes-dashboard admin-user-token -o jsonpath='{.data.ca\.crt}' | base64 --decode > ca.crt

# Get the admin user token
TOKEN=$(kubectl get secret admin-user-token -n kubernetes-dashboard -o jsonpath='{.data.token}' | base64 --decode)

# Get the cluster API server URL
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

# Create a kubeconfig file for Dashboard login
kubectl config set-cluster dashboard-cluster \
  --server=$APISERVER \
  --certificate-authority=ca.crt \
  --embed-certs=true \
  --kubeconfig=dashboard-kubeconfig

kubectl config set-credentials admin-user \
  --token=$TOKEN \
  --kubeconfig=dashboard-kubeconfig

kubectl config set-context dashboard \
  --cluster=dashboard-cluster \
  --user=admin-user \
  --kubeconfig=dashboard-kubeconfig

kubectl config use-context dashboard --kubeconfig=dashboard-kubeconfig

# The file 'dashboard-kubeconfig' can now be used for Dashboard login
```

Upload this kubeconfig file when prompted on the Dashboard login page.

## Dashboard Features Overview

Once logged in, the Dashboard provides a comprehensive view of your cluster.

### Cluster Overview

The home screen shows cluster health at a glance:

- **Workloads**: Pod counts by status (Running, Pending, Failed)
- **Daemon Sets**: System-level pods running on every node
- **Deployments**: Application deployment status
- **Replica Sets**: Pod replica information
- **Jobs/CronJobs**: Batch workload status

### Namespace Navigation

Use the namespace dropdown to filter resources by namespace. This is essential for multi-tenant clusters.

### Real-Time Logs

View container logs directly in the browser without kubectl. Click any Pod, then select the Logs tab.

### Exec into Containers

Open a terminal session inside any running container. Navigate to a Pod, click the exec icon, and select a container.

### YAML Editor

View and edit resource YAML directly. Click any resource, then click Edit to modify its configuration.

## Resource Management via Dashboard

The Dashboard enables common administrative tasks through its UI.

### Deploying Applications

Create new workloads using the "+" button in the top-right corner.

- **Create from input**: Paste YAML or JSON directly
- **Create from file**: Upload a manifest file
- **Create from form**: Use the guided form (limited options)

### Scaling Deployments

Adjust replica counts without editing YAML.

1. Navigate to Workloads > Deployments
2. Click the three-dot menu on your deployment
3. Select "Scale"
4. Enter the desired replica count

### Deleting Resources

Remove resources through the Dashboard interface.

1. Select the resource you want to delete
2. Click the three-dot menu
3. Select "Delete"
4. Confirm the deletion

Be careful with deletions. The Dashboard does not prevent you from deleting critical system components.

## Metrics Integration

The Dashboard can display CPU and memory graphs when metrics are available.

### Installing Metrics Server

Metrics Server collects resource usage data from kubelets and exposes it via the Kubernetes API.

```bash
# Install metrics-server using the official manifest
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

For clusters with self-signed kubelet certificates (common in minikube, kubeadm), add the insecure TLS flag.

```bash
# Patch metrics-server to skip TLS verification (development only)
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

Verify metrics-server is working.

```bash
# Wait for metrics-server to collect data (takes ~60 seconds)
kubectl top nodes
kubectl top pods -A
```

### Viewing Metrics in Dashboard

Once metrics-server is running, the Dashboard automatically displays:

- CPU and memory graphs on Pod detail pages
- Resource usage in the workloads overview
- Node resource consumption

## Security Best Practices

Kubernetes Dashboard has been involved in security incidents when misconfigured. Follow these practices.

### Never Expose Dashboard Publicly Without Authentication

The Dashboard should never be accessible from the public internet without strong authentication. Use one of these patterns:

- VPN access only
- SSO/OIDC integration
- IP allowlisting at the load balancer

### Use Network Policies

Restrict which pods can communicate with the Dashboard.

```yaml
# Save as dashboard-network-policy.yaml
# Only allows traffic from specific namespaces to Dashboard
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dashboard-ingress-policy
  namespace: kubernetes-dashboard
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: kubernetes-dashboard
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Only allow from ingress-nginx namespace
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8443
```

### Implement RBAC Properly

Never grant cluster-admin to the Dashboard service account itself. Create separate user accounts with minimal required permissions.

```bash
# Audit what permissions the dashboard has
kubectl auth can-i --list --as=system:serviceaccount:kubernetes-dashboard:kubernetes-dashboard
```

### Enable Audit Logging

Track Dashboard usage through Kubernetes audit logs.

```yaml
# Add to your kube-apiserver audit policy
# Logs all Dashboard-related API calls
- level: RequestResponse
  users: ["system:serviceaccount:kubernetes-dashboard:*"]
  verbs: ["create", "update", "patch", "delete"]
  resources:
  - group: ""
    resources: ["*"]
```

### Use TLS Everywhere

Ensure all Dashboard traffic is encrypted.

```bash
# Verify Dashboard is using HTTPS
kubectl get svc -n kubernetes-dashboard kubernetes-dashboard -o jsonpath='{.spec.ports[0].targetPort}'
# Should output: 8443 (HTTPS)
```

### Session Timeout

Configure automatic logout for inactive sessions by setting token expiration.

```bash
# Generate short-lived tokens for interactive sessions
kubectl create token admin-user -n kubernetes-dashboard --duration=1h
```

## Alternative Dashboards

Kubernetes Dashboard is not the only option. Consider these alternatives based on your needs.

### Lens (Lens Desktop)

Lens is a standalone desktop application that provides a richer experience than the web Dashboard.

**Pros:**
- No cluster installation required (connects via kubeconfig)
- Built-in Helm management
- Multi-cluster support
- Integrated terminal
- Extensions ecosystem

**Cons:**
- Requires installation on each developer machine
- Cannot be shared via URL

Install Lens on Ubuntu.

```bash
# Download and install Lens using snap
sudo snap install kontena-lens --classic
# Or download the .deb from https://k8slens.dev
```

### Rancher

Rancher is a full Kubernetes management platform that includes dashboard functionality.

**Pros:**
- Multi-cluster management
- Built-in user management and RBAC
- Application catalog
- Monitoring and logging included

**Cons:**
- More complex to set up
- Higher resource requirements
- May be overkill for single clusters

### Headlamp

Headlamp is a newer, lighter-weight dashboard with a modern UI.

**Pros:**
- Plugin architecture
- Can run as desktop app or in-cluster
- Active development
- OIDC support built-in

**Cons:**
- Smaller community than official Dashboard
- Fewer tutorials available

Install Headlamp in your cluster.

```bash
# Install Headlamp via Helm
helm repo add headlamp https://headlamp-k8s.github.io/headlamp/
helm install headlamp headlamp/headlamp --namespace headlamp --create-namespace
```

## Troubleshooting

Common issues and their solutions when running Kubernetes Dashboard.

### Dashboard Pod Not Starting

Check pod events for error messages.

```bash
# Describe the Dashboard pod to see events
kubectl describe pod -n kubernetes-dashboard -l app.kubernetes.io/name=kubernetes-dashboard
# Check pod logs
kubectl logs -n kubernetes-dashboard -l app.kubernetes.io/name=kubernetes-dashboard
```

Common causes:
- **ImagePullBackOff**: Registry not accessible, check network/credentials
- **CrashLoopBackOff**: Check logs for certificate or permission errors
- **Pending**: No nodes available, check resource requests

### Cannot Login with Token

Verify the token is valid and the ServiceAccount has permissions.

```bash
# Test the token manually
kubectl auth can-i list pods --as=system:serviceaccount:kubernetes-dashboard:admin-user -A
# Should return "yes" for admin-user
```

If using generated tokens (K8s 1.24+), ensure the token has not expired.

```bash
# Generate a fresh token
kubectl create token admin-user -n kubernetes-dashboard
```

### Metrics Not Showing

Verify metrics-server is running and healthy.

```bash
# Check metrics-server pods
kubectl get pods -n kube-system -l k8s-app=metrics-server
# Test metrics API directly
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

If you see certificate errors in metrics-server logs, apply the kubelet-insecure-tls patch mentioned earlier.

### Dashboard Shows Empty Namespace

The logged-in user may lack permissions to view resources.

```bash
# Check what the user can see
kubectl auth can-i --list --as=system:serviceaccount:kubernetes-dashboard:readonly-user -n default
```

### TLS Certificate Errors in Browser

The Dashboard uses a self-signed certificate by default. Either:

1. Accept the browser warning (development only)
2. Configure Ingress with a valid certificate
3. Replace the Dashboard certificate with a CA-signed one

```bash
# Create a TLS secret with your certificate
kubectl create secret tls dashboard-tls \
  --cert=path/to/cert.crt \
  --key=path/to/cert.key \
  -n kubernetes-dashboard
```

### Proxy Connection Refused

Ensure kubectl proxy is running and you are using the correct URL.

```bash
# Start proxy with verbose output
kubectl proxy -v=8
# Verify the URL (note the HTTPS service name)
# http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

---

Kubernetes Dashboard provides valuable visibility into your cluster operations. Start with kubectl proxy for development, graduate to Ingress with proper TLS and authentication for production. Always follow the principle of least privilege when creating ServiceAccounts, and consider alternatives like Lens or Headlamp if you need features the official Dashboard does not provide.

For comprehensive Kubernetes monitoring beyond what Dashboard offers, consider [OneUptime](https://oneuptime.com). OneUptime provides deep observability with metrics, logs, and traces from your Kubernetes workloads, alerting on resource exhaustion, pod failures, and performance degradation before they impact users. Its Kubernetes-native integration works alongside Dashboard to give you both real-time visibility and historical analysis of cluster health.
