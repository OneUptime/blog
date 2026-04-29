# How to Migrate from AWS ECS to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, AWS ECS, Kubernetes, Migration, Container Orchestration

Description: Learn how to migrate containerized workloads from AWS ECS to Rancher-managed Kubernetes, translating ECS task definitions and services to Kubernetes deployments.

## Introduction

AWS Elastic Container Service (ECS) is a managed container orchestration service tightly coupled to the AWS ecosystem. Migrating to Rancher-managed Kubernetes provides portability, a richer ecosystem, and freedom from vendor lock-in while retaining the ability to run on AWS infrastructure.

## ECS vs. Kubernetes Concept Mapping

| AWS ECS | Kubernetes (Rancher) |
|---|---|
| Cluster | Cluster |
| Task Definition | Pod / Deployment |
| Service | Deployment + Service |
| Container | Container |
| Task Role (IAM) | ServiceAccount + workload identity (IRSA on EKS) |
| ALB Target Group | Service + Ingress |
| ECS Parameter Store env | Secret / ConfigMap |
| EFS Volume | PersistentVolume (EFS CSI) |

## Step 1: Export ECS Task Definitions

```bash
aws ecs list-task-definitions --family-prefix myapp
aws ecs describe-task-definition --task-definition myapp:42 > task-def.json
```

Examine the task definition for containers, environment variables, secrets, and volume mounts.

## Step 2: Convert Task Definition to Kubernetes Deployment

Given an ECS task definition container:

```json
{
  "name": "api",
  "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:2.0.0",
  "cpu": 256,
  "memory": 512,
  "portMappings": [{"containerPort": 8080, "protocol": "tcp"}],
  "environment": [{"name": "APP_ENV", "value": "production"}],
  "secrets": [{"name": "DB_PASSWORD", "valueFrom": "arn:aws:secretsmanager:..."}]
}
```

Equivalent Kubernetes Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: api
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:2.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "250m"
              memory: "512Mi"
            limits:
              memory: "512Mi"
          env:
            - name: APP_ENV
              value: "production"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: DB_PASSWORD
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 10
```

## Step 3: Migrate Secrets from AWS Secrets Manager

Retrieve secrets and create Kubernetes Secrets:

```bash
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id prod/myapp/db-password \
  --query SecretString --output text | jq -r .password)

kubectl create secret generic app-secrets \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  -n myapp
```

For ongoing sync, deploy the External Secrets Operator to pull directly from AWS Secrets Manager.

## Step 4: Configure ECR Authentication

Create an image pull secret for ECR:

```bash
kubectl create secret docker-registry ecr-credentials \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  --docker-email=none@example.com \
  -n myapp
```

If your cluster isn't already authorized to pull from ECR through node credentials, reference this Secret from the workload's ServiceAccount. On EKS, worker node IAM roles can pull private ECR images without a Kubernetes image pull secret. If you do rely on image pull secrets, remember that ECR authorization tokens expire after 12 hours and must be refreshed.

## Step 5: Set Up Workload IAM with IRSA on EKS

If your Rancher-managed cluster is EKS and your containers use IAM roles, set up IAM Roles for Service Accounts (IRSA):

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/myapp-role
imagePullSecrets:
  - name: ecr-credentials
```

If your Rancher-managed cluster is not EKS, create the same ServiceAccount without the `eks.amazonaws.com/role-arn` annotation.

## Step 6: Expose the Service with Kubernetes Service and Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: myapp
spec:
  selector:
    app: api
  ports:
    - port: 8080
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: myapp
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 8080
```

## Step 7: Migrate EFS Volumes

Install the EFS CSI driver and create PersistentVolumes:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteMany
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef
```

## Step 8: Deploy via Rancher

In Rancher, use **Create from YAML** or connect a Fleet Git repository to deploy manifests. Monitor deployments under **Workloads**.

## Best Practices

- Migrate one service at a time and validate with side-by-side traffic testing.
- Use the External Secrets Operator for automatic Secrets Manager sync.
- Set up Horizontal Pod Autoscaler to replace ECS Service autoscaling.
- Document all ECS-specific AWS integrations that need Kubernetes equivalents.
- Keep ECS infrastructure running until the Rancher deployment is fully validated.

## Conclusion

Migrating from ECS to Rancher-managed Kubernetes requires careful mapping of ECS constructs to Kubernetes equivalents. By following a methodical approach - secrets, IAM, networking, and storage - you can achieve a smooth migration that unlocks the full power of the Kubernetes ecosystem.
