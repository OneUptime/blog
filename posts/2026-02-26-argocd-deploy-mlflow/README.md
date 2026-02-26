# How to Deploy MLflow with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, MLflow, Machine Learning

Description: A step-by-step guide to deploying MLflow tracking server and model registry on Kubernetes using ArgoCD for GitOps-managed ML experiment infrastructure.

---

MLflow is one of the most widely adopted tools for ML experiment tracking, model versioning, and model registry. Deploying it on Kubernetes with ArgoCD gives you a production-grade, GitOps-managed MLflow installation that is easy to maintain, upgrade, and scale.

This guide covers deploying the full MLflow stack - tracking server, artifact storage, and metadata database - using ArgoCD.

## Architecture Overview

A production MLflow deployment consists of several components:

```mermaid
graph LR
    A[Data Scientists] --> B[MLflow Tracking Server]
    B --> C[PostgreSQL - Metadata]
    B --> D[S3/MinIO - Artifacts]
    E[ArgoCD] --> B
    E --> C
    E --> F[Ingress]
```

The tracking server stores experiment metadata in PostgreSQL and model artifacts in S3-compatible storage. ArgoCD manages the entire stack declaratively.

## Repository Structure

Set up your Git repository to manage the MLflow deployment:

```
mlflow/
  base/
    kustomization.yaml
    namespace.yaml
    postgres/
      statefulset.yaml
      service.yaml
      pvc.yaml
      secret.yaml
    mlflow-server/
      deployment.yaml
      service.yaml
      configmap.yaml
    ingress.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        replicas.yaml
    production/
      kustomization.yaml
      patches/
        replicas.yaml
        resources.yaml
```

## Deploying PostgreSQL for MLflow Backend Store

MLflow needs a database for storing experiment metadata. Deploy PostgreSQL as part of your stack:

```yaml
# base/postgres/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mlflow-postgres-secret
type: Opaque
stringData:
  POSTGRES_USER: mlflow
  POSTGRES_PASSWORD: changeme  # Use sealed-secrets in production
  POSTGRES_DB: mlflow
```

```yaml
# base/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mlflow-postgres
  labels:
    app: mlflow-postgres
spec:
  serviceName: mlflow-postgres
  replicas: 1
  selector:
    matchLabels:
      app: mlflow-postgres
  template:
    metadata:
      labels:
        app: mlflow-postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16.1
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: mlflow-postgres-secret
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
              subPath: pgdata
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - mlflow
            initialDelaySeconds: 10
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi
```

```yaml
# base/postgres/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mlflow-postgres
spec:
  selector:
    app: mlflow-postgres
  ports:
    - port: 5432
      targetPort: 5432
  clusterIP: None
```

## Deploying the MLflow Tracking Server

Now deploy the MLflow tracking server itself:

```yaml
# base/mlflow-server/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mlflow-config
data:
  MLFLOW_BACKEND_STORE_URI: "postgresql://mlflow:changeme@mlflow-postgres:5432/mlflow"
  MLFLOW_DEFAULT_ARTIFACT_ROOT: "s3://mlflow-artifacts/"
  MLFLOW_HOST: "0.0.0.0"
  MLFLOW_PORT: "5000"
  MLFLOW_WORKERS: "4"
  AWS_DEFAULT_REGION: "us-east-1"
```

```yaml
# base/mlflow-server/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-tracking
  labels:
    app: mlflow-tracking
spec:
  replicas: 2
  selector:
    matchLabels:
      app: mlflow-tracking
  template:
    metadata:
      labels:
        app: mlflow-tracking
    spec:
      serviceAccountName: mlflow-sa
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:2.10.0
          command:
            - mlflow
            - server
            - --backend-store-uri
            - $(MLFLOW_BACKEND_STORE_URI)
            - --default-artifact-root
            - $(MLFLOW_DEFAULT_ARTIFACT_ROOT)
            - --host
            - $(MLFLOW_HOST)
            - --port
            - $(MLFLOW_PORT)
            - --workers
            - $(MLFLOW_WORKERS)
          envFrom:
            - configMapRef:
                name: mlflow-config
          ports:
            - containerPort: 5000
              name: http
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 15
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 30
            periodSeconds: 15
          resources:
            requests:
              cpu: "1"
              memory: "2Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
```

```yaml
# base/mlflow-server/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mlflow-tracking
spec:
  selector:
    app: mlflow-tracking
  ports:
    - port: 5000
      targetPort: 5000
      name: http
```

## Configuring Artifact Storage with S3 Access

The MLflow server needs access to S3 for artifact storage. Use IRSA (IAM Roles for Service Accounts) on EKS:

```yaml
# base/mlflow-server/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mlflow-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/mlflow-s3-access
```

The IAM role should have permissions to read and write to your artifacts bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::mlflow-artifacts",
        "arn:aws:s3:::mlflow-artifacts/*"
      ]
    }
  ]
}
```

## Setting Up Ingress

Expose MLflow through an ingress with authentication:

```yaml
# base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mlflow-ingress
  annotations:
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: mlflow-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "MLflow Authentication"
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - mlflow.example.com
      secretName: mlflow-tls
  rules:
    - host: mlflow.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mlflow-tracking
                port:
                  number: 5000
```

## The ArgoCD Application

Create the ArgoCD Application that manages the full MLflow stack:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mlflow-platform
  namespace: argocd
  labels:
    team: ml-platform
    component: experiment-tracking
spec:
  project: ml-infrastructure
  source:
    repoURL: https://github.com/myorg/ml-platform.git
    targetRevision: main
    path: mlflow/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: mlflow
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m
```

## Production Overlay

For production, increase resources and replicas:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - patches/replicas.yaml
  - patches/resources.yaml
```

```yaml
# overlays/production/patches/replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-tracking
spec:
  replicas: 4
```

```yaml
# overlays/production/patches/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow-tracking
spec:
  template:
    spec:
      containers:
        - name: mlflow
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "8"
              memory: "16Gi"
```

## Adding a Horizontal Pod Autoscaler

Scale the tracking server based on load:

```yaml
# base/mlflow-server/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mlflow-tracking-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mlflow-tracking
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Upgrading MLflow with ArgoCD

Upgrading MLflow versions is straightforward. Update the image tag in your deployment and push to Git:

```bash
# Update the image version
cd mlflow/base/mlflow-server
sed -i 's/mlflow:2.10.0/mlflow:2.11.0/' deployment.yaml

git add deployment.yaml
git commit -m "Upgrade MLflow to 2.11.0"
git push origin main
```

ArgoCD will perform a rolling update with zero downtime, since we have multiple replicas and `maxUnavailable: 0` as the default strategy.

## Best Practices

1. **Use Sealed Secrets or External Secrets Operator** for database credentials. Never store plain secrets in Git.

2. **Back up PostgreSQL** regularly. Add a CronJob managed by ArgoCD to take pg_dump backups.

3. **Set resource limits** appropriate to your workload. MLflow can consume significant memory during large batch logging operations.

4. **Enable persistence** for PostgreSQL with appropriate storage classes and backup policies.

5. **Use separate artifact buckets** per environment to avoid staging experiments polluting production data.

With this setup, your entire MLflow infrastructure is defined in Git and managed by ArgoCD. Upgrades, configuration changes, and scaling decisions all go through pull requests, giving you full auditability and the ability to roll back any change.
