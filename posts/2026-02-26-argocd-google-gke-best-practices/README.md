# How to Use ArgoCD with Google GKE Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GCP, GKE

Description: Learn the best practices for running ArgoCD on Google Kubernetes Engine, covering Workload Identity, private clusters, Artifact Registry integration, and production-ready GKE configurations.

---

Google Kubernetes Engine (GKE) is one of the most popular managed Kubernetes services, and ArgoCD runs well on it. However, getting the most out of ArgoCD on GKE requires understanding GCP-specific features like Workload Identity, private clusters, and Google-managed certificates. This guide covers the production best practices for running ArgoCD on GKE.

## Installation: Use Autopilot or Standard?

GKE offers two modes: Autopilot (fully managed nodes) and Standard (you manage node pools). Both work with ArgoCD, but with different considerations:

**GKE Autopilot**: Google manages nodes entirely. Similar to Fargate on AWS.
- ArgoCD works well on Autopilot
- Resource requests are required on every pod
- No DaemonSets support
- Simpler to manage, higher per-pod cost

**GKE Standard**: You manage node pools and can customize nodes.
- Full control over node configuration
- DaemonSets supported
- Can use node selectors for ArgoCD placement
- More cost-effective at scale

For most production setups, GKE Standard gives you more flexibility for running ArgoCD.

## Installing ArgoCD on GKE

Use Helm for a production installation:

```yaml
# values-gke.yaml
global:
  image:
    tag: v2.10.0

controller:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      memory: 2Gi
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

server:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
  service:
    type: ClusterIP
  ingress:
    enabled: true
    ingressClassName: ""
    annotations:
      kubernetes.io/ingress.class: gce-internal
      networking.gke.io/managed-certificates: argocd-cert
      networking.gke.io/v1beta1.FrontendConfig: argocd-frontend-config
    hosts:
      - argocd.internal.example.com

repoServer:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      cpu: 250m
      memory: 256Mi

redis-ha:
  enabled: true
  haproxy:
    enabled: true

configs:
  params:
    server.insecure: true  # TLS terminated at GCP LB
```

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd -n argocd --create-namespace -f values-gke.yaml
```

## Workload Identity Configuration

Workload Identity is GKE's equivalent of AWS IRSA. It maps Kubernetes service accounts to GCP service accounts, giving pods access to GCP services without managing keys.

```bash
# Enable Workload Identity on the cluster (if not already)
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --region us-central1

# Create a GCP service account for ArgoCD
gcloud iam service-accounts create argocd-repo-server \
  --display-name="ArgoCD Repo Server"

# Grant necessary permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:argocd-repo-server@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Bind the K8s service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  argocd-repo-server@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[argocd/argocd-repo-server]"
```

Annotate the Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-repo-server
  namespace: argocd
  annotations:
    iam.gke.io/gcp-service-account: argocd-repo-server@my-project.iam.gserviceaccount.com
```

For a detailed walkthrough, see our guide on [ArgoCD with GKE Workload Identity](https://oneuptime.com/blog/post/2026-02-26-argocd-gke-workload-identity/view).

## Private Cluster Configuration

GKE private clusters do not expose the API server publicly. This affects how ArgoCD communicates with managed clusters.

### ArgoCD on the Same Private Cluster

If ArgoCD runs on the same cluster it manages, no special configuration is needed - it uses the in-cluster service account.

### ArgoCD Managing Remote Private Clusters

For managing other private clusters, you need network connectivity:

```bash
# Authorize the ArgoCD cluster's network to access the remote cluster's master
gcloud container clusters update remote-cluster \
  --enable-master-authorized-networks \
  --master-authorized-networks $(gcloud container clusters describe argocd-cluster \
    --format="value(privateClusterConfig.publicEndpoint)" \
    --region us-central1)/32
```

Register the remote cluster:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gke-staging-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: gke-staging
  server: https://10.0.0.2   # Private endpoint
  config: |
    {
      "execProviderConfig": {
        "command": "gke-gcloud-auth-plugin",
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "args": [
          "--project", "my-project",
          "--region", "us-central1",
          "--cluster", "staging-cluster"
        ]
      }
    }
```

## Google-Managed Certificates

Use GKE Managed Certificates for HTTPS on the ArgoCD server:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: argocd-cert
  namespace: argocd
spec:
  domains:
    - argocd.internal.example.com

---
# Frontend config for HTTPS redirect
apiVersion: networking.gke.io/v1beta1
kind: FrontendConfig
metadata:
  name: argocd-frontend-config
  namespace: argocd
spec:
  redirectToHttps:
    enabled: true
    responseCodeName: MOVED_PERMANENTLY_DEFAULT
```

## Internal Load Balancer

For internal-only access (recommended for production):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: gce-internal
    networking.gke.io/managed-certificates: argocd-cert
    networking.gke.io/v1beta1.FrontendConfig: argocd-frontend-config
spec:
  defaultBackend:
    service:
      name: argocd-server
      port:
        number: 80
  rules:
    - host: argocd.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

Alternatively, use the Gateway API (recommended for newer GKE clusters):

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: argocd-gateway
  namespace: argocd
spec:
  gatewayClassName: gke-l7-rilb   # Internal regional LB
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: argocd-tls-cert

---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: argocd-route
  namespace: argocd
spec:
  parentRefs:
    - name: argocd-gateway
  hostnames:
    - argocd.internal.example.com
  rules:
    - backendRefs:
        - name: argocd-server
          port: 80
```

## SSO with Google Workspace

Configure ArgoCD to use Google as the OIDC provider:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.internal.example.com
  oidc.config: |
    name: Google
    issuer: https://accounts.google.com
    clientID: XXXXX.apps.googleusercontent.com
    clientSecret: $oidc.google.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
```

Map Google groups to ArgoCD roles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    g, devops@example.com, role:admin
    g, developers@example.com, role:developer
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, dev/*, allow
```

## Multi-Cluster Management

Managing multiple GKE clusters from one ArgoCD instance:

```bash
# Get credentials for each cluster
gcloud container clusters get-credentials cluster-dev --region us-central1
gcloud container clusters get-credentials cluster-staging --region us-central1
gcloud container clusters get-credentials cluster-prod --region us-central1

# Register each with ArgoCD
argocd cluster add gke_my-project_us-central1_cluster-dev --name gke-dev
argocd cluster add gke_my-project_us-central1_cluster-staging --name gke-staging
argocd cluster add gke_my-project_us-central1_cluster-prod --name gke-prod
```

Use ApplicationSets for multi-cluster deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            env: production
  template:
    metadata:
      name: "my-app-{{name}}"
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/k8s-config.git
        targetRevision: main
        path: apps/my-app/overlays/production
      destination:
        server: "{{server}}"
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Monitoring with Google Cloud Managed Prometheus

```yaml
# PodMonitoring for GMP (GKE-native Prometheus)
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
```

## Node Placement

Pin ArgoCD to dedicated node pools:

```bash
# Create a dedicated node pool for ArgoCD
gcloud container node-pools create platform-pool \
  --cluster my-cluster \
  --region us-central1 \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --node-labels role=platform \
  --node-taints platform=true:NoSchedule
```

```yaml
# In ArgoCD Helm values
controller:
  nodeSelector:
    role: platform
  tolerations:
    - key: "platform"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

## Backup with GCS

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup-sa
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d)
                  kubectl get applications -n argocd -o yaml > /tmp/apps.yaml
                  kubectl get appprojects -n argocd -o yaml > /tmp/projects.yaml
                  gsutil cp /tmp/apps.yaml gs://argocd-backups/$DATE/apps.yaml
                  gsutil cp /tmp/projects.yaml gs://argocd-backups/$DATE/projects.yaml
          restartPolicy: OnFailure
```

## Conclusion

Running ArgoCD on GKE in production requires attention to GCP-specific integration points: Workload Identity for service authentication, private clusters for security, Google-managed certificates for TLS, and integration with Google Cloud's monitoring stack. The combination of GKE's managed Kubernetes with ArgoCD's GitOps model gives you a robust, secure, and automated deployment platform. Start with the HA installation, configure Workload Identity from day one, and use the internal load balancer to keep ArgoCD accessible only within your network.

For comprehensive monitoring of your GKE clusters and ArgoCD-managed applications, [OneUptime](https://oneuptime.com) provides unified observability, alerting, and status pages.
