# How to Migrate a Containerized Application from Amazon ECS to Google Kubernetes Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Amazon ECS, Container Migration, Kubernetes

Description: A practical guide to migrating containerized applications from Amazon ECS to Google Kubernetes Engine, covering task definition translation, networking, and deployment strategies.

---

Migrating from Amazon ECS to Google Kubernetes Engine (GKE) is not a simple lift-and-shift. ECS and Kubernetes have fundamentally different abstractions. ECS has task definitions, services, and tasks. Kubernetes has pods, deployments, services, and ingresses. The container images themselves transfer easily - a Docker image is a Docker image regardless of where it runs. But the orchestration layer around them needs to be rebuilt.

In this post, I will walk through the migration process step by step, translating ECS concepts to Kubernetes equivalents and setting up the GKE infrastructure to run your workloads.

## ECS to Kubernetes Concept Mapping

Before diving into the migration, here is how the concepts map:

| ECS Concept | Kubernetes Equivalent |
|-------------|----------------------|
| Task Definition | Pod spec + Deployment |
| Service | Deployment + Service + HPA |
| Task | Pod |
| Container Definition | Container spec |
| ECS Cluster | GKE Cluster |
| ALB/NLB | Ingress / Service (LoadBalancer) |
| ECS Service Discovery | Kubernetes DNS (CoreDNS) |
| Task IAM Role | Workload Identity |
| ECS Exec | kubectl exec |
| CloudWatch Logs | Cloud Logging |
| Parameter Store / Secrets Manager | Kubernetes Secrets / Secret Manager |

## Step 1: Create a GKE Cluster

Set up the GKE cluster that will host your workloads:

```bash
# Create a GKE Autopilot cluster (managed node scaling)
gcloud container clusters create-auto ecs-migration-cluster \
  --region=us-central1 \
  --project=PROJECT_ID

# Or create a Standard cluster for more control
gcloud container clusters create ecs-migration-cluster \
  --region=us-central1 \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --project=PROJECT_ID
```

Get credentials:

```bash
# Configure kubectl to use the new cluster
gcloud container clusters get-credentials ecs-migration-cluster \
  --region=us-central1 \
  --project=PROJECT_ID
```

## Step 2: Transfer Container Images

Your container images need to be accessible from GKE. You have a few options:

**Option A: Copy images to Artifact Registry (recommended)**

```bash
# Create an Artifact Registry repository
gcloud artifacts repositories create app-images \
  --repository-format=docker \
  --location=us-central1 \
  --project=PROJECT_ID

# Pull from ECR, tag for Artifact Registry, and push
docker pull 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest
docker tag 123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/app-images/my-api:latest
docker push us-central1-docker.pkg.dev/PROJECT_ID/app-images/my-api:latest
```

**Option B: Pull directly from ECR** by configuring an image pull secret:

```bash
# Create a pull secret for ECR access
kubectl create secret docker-registry ecr-secret \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1)
```

Option A is better for production since it removes the cross-cloud dependency.

## Step 3: Translate Task Definitions to Kubernetes Manifests

Here is an example ECS task definition and its Kubernetes equivalent.

**ECS Task Definition:**

```json
{
  "family": "my-api",
  "networkMode": "awsvpc",
  "cpu": "1024",
  "memory": "2048",
  "taskRoleArn": "arn:aws:iam::123456789:role/my-api-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-api:v1.2.3",
      "cpu": 512,
      "memory": 1024,
      "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DB_HOST", "value": "mydb.cluster-abc.us-east-1.rds.amazonaws.com"}
      ],
      "secrets": [
        {"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:db-password"}
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-api",
          "awslogs-region": "us-east-1"
        }
      }
    },
    {
      "name": "nginx-sidecar",
      "image": "nginx:1.25",
      "cpu": 256,
      "memory": 512,
      "portMappings": [{"containerPort": 80}],
      "dependsOn": [{"containerName": "api", "condition": "HEALTHY"}]
    }
  ]
}
```

**Equivalent Kubernetes manifests:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
  namespace: default
  labels:
    app: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      # Workload Identity (replaces ECS task role)
      serviceAccountName: my-api-sa
      containers:
        # Main application container
        - name: api
          image: us-central1-docker.pkg.dev/PROJECT_ID/app-images/my-api:v1.2.3
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "1000m"
              memory: "2Gi"
          env:
            - name: NODE_ENV
              value: "production"
            - name: DB_HOST
              value: "10.0.1.50"  # Cloud SQL private IP
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          # Health check (replaces ECS healthCheck)
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10

        # Sidecar container
        - name: nginx-sidecar
          image: nginx:1.25
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              cpu: "500m"
              memory: "1Gi"
---
# service.yaml - Replaces ECS service discovery + load balancer
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  selector:
    app: my-api
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: api
      port: 8080
      targetPort: 8080
  type: ClusterIP
---
# hpa.yaml - Replaces ECS auto scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 4: Handle Secrets

Migrate secrets from AWS Secrets Manager to Kubernetes Secrets or GCP Secret Manager:

```bash
# Create Kubernetes secrets for database credentials
kubectl create secret generic db-credentials \
  --from-literal=password='your_db_password' \
  --from-literal=username='your_db_user'

# Or use GCP Secret Manager with Workload Identity
gcloud secrets create db-password \
  --data-file=- <<< "your_db_password" \
  --project=PROJECT_ID
```

For Secret Manager integration with GKE, use the Secret Manager CSI driver:

```yaml
# secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: gcp-secrets
spec:
  provider: gcp
  parameters:
    secrets: |
      - resourceName: "projects/PROJECT_ID/secrets/db-password/versions/latest"
        path: "db-password"
```

## Step 5: Set Up Networking and Ingress

Replace the AWS ALB with a GKE Ingress:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-api-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "my-api-ip"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-api
                port:
                  number: 80
```

Reserve a static IP:

```bash
# Reserve a global static IP for the ingress
gcloud compute addresses create my-api-ip \
  --global \
  --project=PROJECT_ID
```

## Step 6: Configure Workload Identity

Replace ECS task IAM roles with GKE Workload Identity:

```bash
# Create a GCP service account
gcloud iam service-accounts create my-api-sa \
  --display-name="My API Service Account" \
  --project=PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:my-api-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Create the Kubernetes service account
kubectl create serviceaccount my-api-sa

# Bind GCP SA to K8s SA
gcloud iam service-accounts add-iam-policy-binding \
  my-api-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:PROJECT_ID.svc.id.goog[default/my-api-sa]"

# Annotate the K8s service account
kubectl annotate serviceaccount my-api-sa \
  iam.gke.io/gcp-service-account=my-api-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Step 7: Deploy and Validate

```bash
# Apply all manifests
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml

# Check deployment status
kubectl rollout status deployment/my-api

# Verify pods are running
kubectl get pods -l app=my-api

# Check service endpoints
kubectl get svc my-api

# Test the health endpoint
kubectl port-forward svc/my-api 8080:8080
# In another terminal: curl http://localhost:8080/health
```

## Migration Strategy: Blue-Green

For a safe cutover, run both ECS and GKE in parallel:

1. Deploy the application on GKE
2. Run both ECS and GKE services behind the same DNS
3. Gradually shift traffic using weighted DNS or a global load balancer
4. Monitor error rates and performance on both platforms
5. Once confident, shift all traffic to GKE
6. Decommission ECS services

## Summary

Migrating from ECS to GKE requires translating task definitions to Kubernetes manifests, moving container images to Artifact Registry, replacing AWS networking with GKE Ingress, and swapping IAM task roles for Workload Identity. The container images themselves transfer directly - the orchestration layer is what changes. Take a blue-green approach to minimize risk, run both platforms in parallel during the transition, and migrate one service at a time rather than everything at once.
