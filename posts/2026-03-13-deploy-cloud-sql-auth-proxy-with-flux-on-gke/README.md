# How to Deploy Cloud SQL Auth Proxy with Flux on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, GKE, Google Cloud, Cloud SQL, Sidecar

Description: Deploy the Cloud SQL Auth Proxy as a sidecar in GKE pods using Flux CD GitOps to securely connect applications to Cloud SQL without managing credentials.

---

## Introduction

Cloud SQL Auth Proxy is the recommended way to connect applications running on Google Kubernetes Engine to Cloud SQL instances. It handles authentication automatically using IAM, encrypts all traffic, and eliminates the need to manage database credentials in your application code. The proxy runs as a sidecar container alongside your application pod and forwards database connections securely.

Managing this sidecar pattern manually can become error-prone as your fleet of services grows. Flux CD provides a GitOps-driven approach where your desired state — including the proxy configuration — lives in Git and is continuously reconciled against your cluster. Any drift is automatically corrected, and every change is traceable through your commit history.

In this guide you will bootstrap Flux CD on a GKE cluster, configure Workload Identity so the proxy can authenticate to Cloud SQL without static credentials, and deploy an application with the Cloud SQL Auth Proxy sidecar entirely through Git.

## Prerequisites

- A GKE cluster (Standard or Autopilot) with Workload Identity enabled
- A Cloud SQL instance (PostgreSQL or MySQL) in your GCP project
- `flux` CLI installed (`brew install fluxcd/tap/flux` or the official install script)
- `kubectl` configured to talk to your GKE cluster
- `gh` CLI or a GitHub personal access token for Flux bootstrap
- A GitHub repository to store your Flux manifests

## Step 1: Enable Workload Identity on the GKE Cluster

Workload Identity lets Kubernetes service accounts act as GCP service accounts. This is how the Cloud SQL Auth Proxy authenticates without a key file.

```bash
# Enable Workload Identity on an existing cluster
gcloud container clusters update my-cluster \
  --region us-central1 \
  --workload-pool=MY_PROJECT_ID.svc.id.goog

# Create a GCP service account for Cloud SQL access
gcloud iam service-accounts create cloudsql-proxy-sa \
  --display-name="Cloud SQL Auth Proxy Service Account"

# Grant the Cloud SQL Client role
gcloud projects add-iam-policy-binding MY_PROJECT_ID \
  --member="serviceAccount:cloudsql-proxy-sa@MY_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## Step 2: Bootstrap Flux CD on the Cluster

Bootstrap Flux and point it at your GitHub repository. Flux will install its controllers and commit the initial manifests back to the repo.

```bash
# Bootstrap Flux using your GitHub personal access token
flux bootstrap github \
  --owner=your-github-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-gke-cluster \
  --personal
```

## Step 3: Create the Kubernetes Service Account with Workload Identity Annotation

```yaml
# clusters/my-gke-cluster/apps/cloudsql-proxy/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: my-app
  annotations:
    # This annotation binds the Kubernetes SA to the GCP SA
    iam.gke.io/gcp-service-account: cloudsql-proxy-sa@MY_PROJECT_ID.iam.gserviceaccount.com
```

After committing this file, bind the two service accounts in GCP:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  cloudsql-proxy-sa@MY_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:MY_PROJECT_ID.svc.id.goog[my-app/my-app-sa]"
```

## Step 4: Define the GitRepository Source

```yaml
# clusters/my-gke-cluster/apps/cloudsql-proxy/gitrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m          # Poll the repo every minute
  url: https://github.com/your-org/my-app
  ref:
    branch: main
```

## Step 5: Deploy the Application with Cloud SQL Auth Proxy Sidecar

```yaml
# clusters/my-gke-cluster/apps/cloudsql-proxy/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./deploy
  prune: true           # Remove resources deleted from Git
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: my-app
---
# deploy/deployment.yaml (in your application repo)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa   # SA with Workload Identity annotation
      containers:
        - name: my-app
          image: gcr.io/my-project/my-app:latest
          env:
            # Connect via the Unix socket exposed by the proxy sidecar
            - name: DATABASE_URL
              value: "postgresql://myuser:mypassword@localhost/mydb?host=/cloudsql"
          ports:
            - containerPort: 8080

        - name: cloud-sql-proxy
          # Always pin to a specific version in production
          image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.11.0
          args:
            # Replace with your actual instance connection name
            - "--structured-logs"
            - "--port=5432"
            - "MY_PROJECT_ID:us-central1:my-postgres-instance"
          securityContext:
            runAsNonRoot: true
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "100m"
```

## Step 6: Commit and Verify Reconciliation

```bash
# Push all manifests to Git — Flux will detect and apply them
git add clusters/my-gke-cluster/apps/cloudsql-proxy/
git commit -m "feat: add Cloud SQL Auth Proxy sidecar for my-app"
git push

# Watch Flux reconcile
flux get kustomizations --watch

# Verify pods are running with both containers
kubectl get pods -n my-app
kubectl logs -n my-app deployment/my-app -c cloud-sql-proxy
```

## Best Practices

- Always pin the Cloud SQL Auth Proxy image to a specific version tag rather than `latest` to ensure deterministic deployments.
- Use Flux's image automation controllers to automatically update the proxy image tag when new releases are available.
- Set resource requests and limits on the sidecar; it is a long-running process that should not be allowed to starve your application.
- Store the instance connection name in a ConfigMap or as an environment variable so it can be varied per environment without duplicating the full Deployment manifest.
- Enable structured logging (`--structured-logs`) so proxy logs integrate cleanly with Google Cloud Logging.
- Use `prune: true` in your Kustomization to ensure stale resources are removed when you update manifests.

## Conclusion

By combining Cloud SQL Auth Proxy with Flux CD's GitOps model, you get a secure and auditable path for database connectivity on GKE. Every change to proxy configuration or application manifests goes through a Git pull request, Workload Identity eliminates static credentials, and Flux ensures your cluster always reflects the desired state stored in your repository.
