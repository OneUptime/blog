# How to Implement Container Security Best Practices on AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Containers, ECS, EKS, Security

Description: A hands-on guide to securing containers on AWS covering image scanning, runtime security, network policies, and secrets management for ECS and EKS.

---

Containers changed how we deploy software, but they also introduced new attack surfaces. A vulnerable base image, an overly permissive IAM role, or a container running as root - any one of these can turn your sleek microservices architecture into a security nightmare. On AWS, you've got ECS and EKS as your main container platforms, and each has its own set of security controls to get right.

Let's walk through how to lock down containers on AWS, from the image build process all the way to runtime.

## Securing the Image Pipeline

Security starts before your container ever runs. Your CI/CD pipeline should scan images for vulnerabilities and enforce policies before anything reaches production.

This Dockerfile follows security best practices for a Node.js application.

```dockerfile
# Use a specific version tag, never "latest"
FROM node:20.11-alpine3.19 AS builder

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Second stage - minimal runtime image
FROM node:20.11-alpine3.19

# Install security updates
RUN apk update && apk upgrade --no-cache

# Copy the non-root user from builder
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

WORKDIR /app

# Copy only production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Remove unnecessary files
RUN rm -rf .git .env* tests/

# Run as non-root user
USER appuser

# Use exec form so signals are properly handled
CMD ["node", "server.js"]
```

Multi-stage builds keep your final image small, and running as a non-root user prevents container escape attacks from gaining root on the host.

## ECR Image Scanning

Amazon ECR has built-in vulnerability scanning. Enable it and block deployments of images with critical vulnerabilities.

This Terraform configuration sets up ECR with scanning and lifecycle policies.

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "my-application"
  image_tag_mutability = "IMMUTABLE"  # Prevent tag overwriting

  # Enable scan on push
  image_scanning_configuration {
    scan_on_push = true
  }

  # Encrypt with customer-managed KMS key
  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.ecr.arn
  }
}

# Lifecycle policy to clean up old images
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Remove untagged images older than 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
```

Setting `image_tag_mutability` to `IMMUTABLE` is a simple but powerful control. It prevents someone from pushing a malicious image with an existing tag - like replacing `v1.0.0` with a compromised version.

## ECS Task Security

When running containers on ECS, the task definition is where most security decisions get made. Here's a task definition that follows security best practices.

```json
{
  "family": "secure-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/appTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-application:v1.2.3",
      "essential": true,
      "readonlyRootFilesystem": true,
      "user": "1000:1000",
      "linuxParameters": {
        "capabilities": {
          "drop": ["ALL"]
        },
        "initProcessEnabled": true
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/secure-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "app"
        }
      },
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -q --spider http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

Key security settings in this task definition: `readonlyRootFilesystem` prevents the container from writing to its filesystem. Dropping all Linux capabilities removes privileges the container doesn't need. Using Secrets Manager instead of environment variables keeps credentials out of your task definition and CloudWatch logs.

## EKS Pod Security

On EKS, Kubernetes pod security standards give you fine-grained control over what containers can do.

This pod spec enforces security best practices.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  # Use a service account with minimal permissions
  serviceAccountName: app-service-account
  automountServiceAccountToken: false  # Don't mount token unless needed

  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault

  containers:
    - name: app
      image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-application:v1.2.3
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir:
        medium: Memory
        sizeLimit: 64Mi
```

## Network Policies for EKS

By default, all pods in a Kubernetes cluster can talk to each other. That's way too permissive. Use network policies to restrict traffic.

This network policy only allows traffic from the frontend to the backend API.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only allow traffic from the frontend
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow traffic to the database
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## IAM Roles for Service Accounts (IRSA)

On EKS, use IAM Roles for Service Accounts instead of node-level IAM roles. This gives each pod exactly the permissions it needs and nothing more.

```hcl
# Create an OIDC provider for the EKS cluster
data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer
}

# IAM role that can only be assumed by a specific service account
resource "aws_iam_role" "app_role" {
  name = "eks-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:production:app-service-account"
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# Attach a minimal policy
resource "aws_iam_role_policy" "app_policy" {
  name = "app-s3-read-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::my-app-config/*"
      }
    ]
  })
}
```

## Runtime Threat Detection

Use GuardDuty's EKS runtime monitoring to detect threats in your running containers. It can spot cryptocurrency mining, reverse shells, and other suspicious behavior.

```python
import boto3

def enable_eks_runtime_monitoring():
    """Enable GuardDuty EKS runtime monitoring."""
    gd = boto3.client('guardduty')

    detectors = gd.list_detectors()['DetectorIds']
    if not detectors:
        print("No GuardDuty detector found. Enable GuardDuty first.")
        return

    detector_id = detectors[0]

    gd.update_detector(
        DetectorId=detector_id,
        Features=[
            {
                'Name': 'EKS_RUNTIME_MONITORING',
                'Status': 'ENABLED',
                'AdditionalConfiguration': [
                    {
                        'Name': 'EKS_ADDON_MANAGEMENT',
                        'Status': 'ENABLED'
                    }
                ]
            }
        ]
    )
    print("EKS runtime monitoring enabled")

enable_eks_runtime_monitoring()
```

## Wrapping Up

Container security on AWS isn't a single thing you enable - it's a set of practices applied at every stage. Build secure images. Scan them. Run containers with minimal privileges. Restrict network traffic. Use scoped IAM roles. Monitor for threats at runtime.

The biggest mistake teams make is treating containers as black boxes. Just because something is packaged in a container doesn't mean it's automatically secure. Apply the same security rigor you'd use for any other workload.

For more on AWS security practices, check out [serverless security best practices on AWS](https://oneuptime.com/blog/post/serverless-security-best-practices-aws/view) and [defense in depth on AWS](https://oneuptime.com/blog/post/defense-in-depth-aws/view).
