# How to Set Up Kubernetes Dashboard on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes Dashboard, Web UI, Cluster Management, Kubernetes

Description: Install and configure the Kubernetes Dashboard web UI on a Talos Linux cluster for visual cluster management and monitoring.

---

The Kubernetes Dashboard provides a web-based interface for managing your cluster. While most Talos Linux operators rely on kubectl and talosctl for daily operations, the dashboard gives you a quick visual overview of cluster state that is useful for team members who are less comfortable with command-line tools. It lets you view workloads, check pod logs, manage resources, and troubleshoot issues through a browser. In this guide, we will deploy the Kubernetes Dashboard on a Talos Linux cluster with proper authentication and access controls.

## Why Use the Kubernetes Dashboard

Not everyone on your team will be a kubectl expert. The dashboard provides:

- A visual overview of all workloads across namespaces
- Quick access to pod logs and events without remembering kubectl commands
- Resource utilization graphs when Metrics Server is installed
- The ability to create and edit resources through forms
- A search function for finding resources across the cluster

That said, the dashboard should complement your CLI tools, not replace them. For automation and scripting, kubectl and talosctl remain the better options.

## Step 1: Install the Kubernetes Dashboard

The latest version of Kubernetes Dashboard (v3+) uses a Helm chart for installation:

```bash
# Add the Kubernetes Dashboard Helm repository
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm repo update
```

Create a values file:

```yaml
# dashboard-values.yaml
app:
  ingress:
    enabled: false  # We will handle access via port-forward or ingress separately
  settings:
    # Items per page in resource lists
    itemsPerPage: 50
    # Default namespace to show
    defaultNamespace: "_all"
    # Resource auto-refresh interval
    autoRefreshTimeInterval: 10

# Enable metrics scraper for resource usage graphs
metrics-server:
  enabled: false  # We already have metrics-server installed

# Kong ingress controller bundled with dashboard
kong:
  enabled: true
  proxy:
    type: ClusterIP

# Certificate management
cert-manager:
  enabled: false  # Use existing cert-manager if available
```

Install the dashboard:

```bash
# Create a namespace for the dashboard
kubectl create namespace kubernetes-dashboard

# Install using Helm
helm install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard \
  --namespace kubernetes-dashboard \
  --values dashboard-values.yaml
```

Verify the installation:

```bash
kubectl get pods -n kubernetes-dashboard
kubectl get svc -n kubernetes-dashboard
```

## Step 2: Create a Service Account for Authentication

The dashboard needs a service account with appropriate permissions. Create an admin-level account for cluster administrators:

```yaml
# dashboard-admin-user.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-admin
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: dashboard-admin
    namespace: kubernetes-dashboard
```

For a read-only account suitable for developers or viewers:

```yaml
# dashboard-readonly-user.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard-readonly
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-readonly-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
  - kind: ServiceAccount
    name: dashboard-readonly
    namespace: kubernetes-dashboard
```

Apply both:

```bash
kubectl apply -f dashboard-admin-user.yaml
kubectl apply -f dashboard-readonly-user.yaml
```

## Step 3: Generate Authentication Tokens

Create tokens for each service account:

```bash
# Generate a long-lived token for the admin account
kubectl create token dashboard-admin \
  --namespace kubernetes-dashboard \
  --duration=8760h

# Generate a token for the read-only account
kubectl create token dashboard-readonly \
  --namespace kubernetes-dashboard \
  --duration=8760h
```

Alternatively, create a persistent token secret:

```yaml
# dashboard-admin-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dashboard-admin-token
  namespace: kubernetes-dashboard
  annotations:
    kubernetes.io/service-account.name: dashboard-admin
type: kubernetes.io/service-account-token
```

```bash
kubectl apply -f dashboard-admin-token.yaml

# Retrieve the token
kubectl get secret dashboard-admin-token -n kubernetes-dashboard -o jsonpath='{.data.token}' | base64 -d
```

## Step 4: Access the Dashboard

The simplest way to access the dashboard is through port-forwarding:

```bash
# Port-forward to the dashboard service
kubectl port-forward -n kubernetes-dashboard svc/kubernetes-dashboard-kong-proxy 8443:443
```

Open https://localhost:8443 in your browser. You will see a login page where you can paste the token generated in the previous step.

## Step 5: Set Up Ingress for Persistent Access

For more permanent access, configure an Ingress resource:

```yaml
# dashboard-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Restrict access by IP if possible
    nginx.ingress.kubernetes.io/whitelist-source-range: "10.0.0.0/8,192.168.0.0/16"
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
                name: kubernetes-dashboard-kong-proxy
                port:
                  number: 443
```

```bash
kubectl apply -f dashboard-ingress.yaml
```

## Step 6: Integrate with Metrics Server

If Metrics Server is running, the dashboard will automatically show CPU and memory usage graphs for pods and nodes. Verify the integration:

```bash
# Check if metrics API is available
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | python3 -m json.tool
```

You should see resource usage charts appear in the dashboard's pod and node views.

## Step 7: Configure RBAC for Namespace-Scoped Access

For multi-team environments, create namespace-specific access:

```yaml
# team-a-dashboard-access.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-dashboard
  namespace: kubernetes-dashboard
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: team-a-role
  namespace: team-a
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "configmaps", "jobs", "cronjobs"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-dashboard-binding
  namespace: team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: team-a-role
subjects:
  - kind: ServiceAccount
    name: team-a-dashboard
    namespace: kubernetes-dashboard
```

## Security Best Practices

When running the Kubernetes Dashboard on Talos Linux, follow these security guidelines:

1. **Never expose the dashboard to the public internet** without additional authentication layers (OAuth proxy, VPN, etc.)
2. **Use read-only service accounts** for most users. Only cluster administrators should have admin tokens.
3. **Rotate tokens regularly**. Use short-lived tokens where possible.
4. **Restrict network access** using ingress whitelisting or network policies.
5. **Audit dashboard access** by enabling Kubernetes audit logging.

Here is an example of adding an OAuth proxy in front of the dashboard:

```yaml
# oauth-proxy-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-oauth-proxy
  namespace: kubernetes-dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dashboard-oauth-proxy
  template:
    metadata:
      labels:
        app: dashboard-oauth-proxy
    spec:
      containers:
        - name: oauth-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:latest
          args:
            - --provider=github
            - --email-domain=*
            - --upstream=https://kubernetes-dashboard-kong-proxy.kubernetes-dashboard.svc.cluster.local:443
            - --http-address=0.0.0.0:4180
            - --cookie-secret=YOUR_COOKIE_SECRET
            - --client-id=YOUR_GITHUB_CLIENT_ID
            - --client-secret=YOUR_GITHUB_CLIENT_SECRET
            - --ssl-upstream-insecure-skip-verify=true
          ports:
            - containerPort: 4180
```

## Troubleshooting Common Issues

If the dashboard is not working as expected:

```bash
# Check pod logs
kubectl logs -n kubernetes-dashboard -l app.kubernetes.io/name=kubernetes-dashboard

# Verify service endpoints
kubectl get endpoints -n kubernetes-dashboard

# Test metrics API connectivity from the dashboard pod
kubectl exec -n kubernetes-dashboard deploy/kubernetes-dashboard-metrics-scraper -- \
  wget -qO- https://metrics-server.kube-system.svc.cluster.local:443/apis/metrics.k8s.io/v1beta1/nodes --no-check-certificate
```

## Conclusion

The Kubernetes Dashboard is a practical addition to your Talos Linux cluster toolkit. It provides a visual interface that complements the command-line tools you already use. The key is to set it up with proper authentication and access controls so it is useful without being a security risk. Deploy it with RBAC-scoped service accounts, restrict network access, and consider adding an OAuth proxy for production environments. With these safeguards in place, the dashboard becomes a convenient way for your team to monitor and manage workloads on Talos Linux.
