# How to Use Flux CD Capacitor Dashboard for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Capacitor, Dashboard, Monitoring, UI

Description: Learn how to deploy and use the Flux CD Capacitor dashboard to monitor GitOps reconciliation status, view resource details, and troubleshoot issues through a web UI.

---

Flux CD Capacitor is a lightweight web dashboard for Flux CD that provides a visual overview of your GitOps reconciliation state. Unlike the Flux CLI, which requires terminal access and kubectl, Capacitor offers a browser-based interface where you can see the status of all Flux resources at a glance, inspect individual resources, and identify failures quickly. This guide covers deploying Capacitor and using it effectively for Flux monitoring.

## What is Flux Capacitor?

Capacitor is an open-source web UI for Flux CD developed by the Flux community. It reads Flux custom resources from the Kubernetes API and displays them in an organized dashboard. It shows GitRepositories, HelmRepositories, Kustomizations, HelmReleases, and other Flux resources with their reconciliation status, last applied revision, and error messages when present.

Capacitor is read-only by design. It does not modify any cluster resources, making it safe to expose to development teams who need visibility into GitOps state without cluster-admin access.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- kubectl configured with cluster access
- Flux CLI installed (optional, for verification)

## Step 1: Deploy Capacitor with Flux

Create the manifests for Capacitor and manage them through Flux itself:

```yaml
# infrastructure/capacitor/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: capacitor-system
```

```yaml
# infrastructure/capacitor/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capacitor
  namespace: capacitor-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: capacitor
  template:
    metadata:
      labels:
        app: capacitor
    spec:
      serviceAccountName: capacitor
      containers:
        - name: capacitor
          image: ghcr.io/gimlet-io/capacitor:v0.4.3
          ports:
            - containerPort: 9000
              name: http
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            capabilities:
              drop:
                - ALL
```

```yaml
# infrastructure/capacitor/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: capacitor
  namespace: capacitor-system
spec:
  selector:
    app: capacitor
  ports:
    - port: 9000
      targetPort: http
      protocol: TCP
      name: http
```

## Step 2: Configure RBAC for Capacitor

Capacitor needs read access to Flux custom resources and standard Kubernetes resources:

```yaml
# infrastructure/capacitor/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: capacitor
  namespace: capacitor-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: capacitor
rules:
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["gitrepositories", "helmrepositories", "helmcharts", "ocirepositories", "buckets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["kustomizations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["helmreleases"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["notification.toolkit.fluxcd.io"]
    resources: ["providers", "alerts", "receivers"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["image.toolkit.fluxcd.io"]
    resources: ["imagepolicies", "imagerepositories", "imageupdateautomations"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["namespaces", "events"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: capacitor
subjects:
  - kind: ServiceAccount
    name: capacitor
    namespace: capacitor-system
roleRef:
  kind: ClusterRole
  name: capacitor
  apiGroup: rbac.authorization.k8s.io
```

## Step 3: Add to Flux Kustomization

Include Capacitor in your Flux-managed infrastructure:

```yaml
# infrastructure/capacitor/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - rbac.yaml
  - deployment.yaml
  - service.yaml
```

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: capacitor
  namespace: flux-system
spec:
  interval: 30m
  path: ./infrastructure/capacitor
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

Commit and push these files. Flux will reconcile and deploy Capacitor.

## Step 4: Access the Dashboard

Use kubectl port-forward to access Capacitor locally:

```bash
kubectl port-forward -n capacitor-system svc/capacitor 9000:9000
```

Open your browser and navigate to `http://localhost:9000`. You should see the Capacitor dashboard showing all Flux resources.

For persistent access, set up an Ingress:

```yaml
# infrastructure/capacitor/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: capacitor
  namespace: capacitor-system
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: capacitor-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Capacitor Dashboard"
spec:
  ingressClassName: nginx
  rules:
    - host: flux-dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: capacitor
                port:
                  number: 9000
  tls:
    - hosts:
        - flux-dashboard.example.com
      secretName: capacitor-tls
```

Create the basic auth secret:

```bash
htpasswd -c auth admin
kubectl create secret generic capacitor-basic-auth \
  --from-file=auth \
  -n capacitor-system
```

## Step 5: Understanding the Dashboard Views

Capacitor organizes Flux resources into several views:

**Sources View**: Shows all GitRepositories, HelmRepositories, OCIRepositories, and Buckets. Each source displays its URL, last fetched revision, and status. A green indicator means the source is synced; red indicates a fetch failure.

**Kustomizations View**: Lists all Kustomizations with their source reference, path, revision, and reconciliation status. You can see which Kustomizations are ready, which are progressing, and which have failed.

**Helm Releases View**: Displays HelmReleases with their chart version, installed revision, and status. Failed releases show the Helm error message directly in the dashboard.

**Events View**: Shows recent Kubernetes events related to Flux resources, making it easy to spot reconciliation failures, source fetch errors, and dependency issues.

## Step 6: Troubleshooting with Capacitor

When a resource shows a failed status in Capacitor, click on it to see the detailed conditions and events. Common patterns to look for:

```bash
# If Capacitor shows a Kustomization as "Not Ready", check the message
# It will typically show one of:
# - "kustomize build failed" - YAML or Kustomize syntax error
# - "failed to decrypt data key" - SOPS decryption issue
# - "dependency not ready" - A dependent Kustomization has not reconciled

# If a source shows "Failed", common causes include:
# - Authentication failure (wrong deploy key or token)
# - Repository not found (wrong URL)
# - Branch not found (wrong ref)
```

## Step 7: Set Up Alerts Alongside Capacitor

Capacitor is great for at-a-glance monitoring, but pair it with Flux notifications for active alerting:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-errors
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

## Summary

Flux CD Capacitor provides a lightweight, read-only web dashboard for monitoring your GitOps reconciliation state. It deploys as a single container with minimal resource requirements and gives teams visual access to source status, Kustomization health, HelmRelease state, and events. For production use, secure it behind an Ingress with authentication and pair it with Flux notification alerts for proactive issue detection.
