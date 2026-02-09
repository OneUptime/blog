# How to Configure EKS Fargate Profiles for Serverless Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, Fargate

Description: Set up AWS Fargate profiles for EKS to run serverless Kubernetes pods without managing EC2 instances, with automatic scaling and pay-per-use pricing.

---

AWS Fargate enables running Kubernetes pods without managing EC2 instances. Each pod runs in its own isolated compute environment with dedicated resources. Fargate eliminates node management, automatically scales, and charges only for pod resource usage. This guide covers creating and using Fargate profiles with EKS for serverless container workloads.

## Understanding EKS on Fargate

EKS on Fargate runs each pod in an isolated, right-sized VM. Unlike traditional node-based deployments, Fargate handles infrastructure provisioning, patching, and scaling automatically. You define pod specifications, and Fargate provisions the exact compute resources needed.

Fargate is ideal for batch jobs, microservices, and workloads with variable load patterns. It reduces operational overhead but has limitations including no DaemonSets, HostNetwork, or persistent volumes with ReadWriteMany access modes.

## Creating a Fargate Profile

Create a Fargate profile using AWS CLI:

```bash
# Create Fargate profile
aws eks create-fargate-profile \
  --cluster-name my-cluster \
  --fargate-profile-name default-profile \
  --pod-execution-role-arn arn:aws:iam::123456789012:role/EKSFargatePodExecutionRole \
  --subnets subnet-abc123 subnet-def456 subnet-ghi789 \
  --selectors '[
    {
      "namespace": "default"
    },
    {
      "namespace": "production",
      "labels": {
        "environment": "prod"
      }
    }
  ]'

# List Fargate profiles
aws eks list-fargate-profiles --cluster-name my-cluster

# Describe profile
aws eks describe-fargate-profile \
  --cluster-name my-cluster \
  --fargate-profile-name default-profile
```

Using Terraform:

```hcl
# fargate-profile.tf
resource "aws_eks_fargate_profile" "default" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "default-profile"
  pod_execution_role_arn = aws_iam_role.fargate_pod_execution.arn

  # Fargate requires private subnets
  subnet_ids = module.vpc.private_subnets

  selector {
    namespace = "default"
  }

  selector {
    namespace = "production"
    labels = {
      environment = "prod"
    }
  }

  tags = {
    Name = "default-fargate-profile"
  }
}

# IAM role for Fargate pod execution
resource "aws_iam_role" "fargate_pod_execution" {
  name = "EKSFargatePodExecutionRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks-fargate-pods.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "fargate_pod_execution" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
  role       = aws_iam_role.fargate_pod_execution.name
}
```

## Deploying Pods to Fargate

Deploy application to Fargate:

```yaml
# fargate-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fargate-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fargate-app
  template:
    metadata:
      labels:
        app: fargate-app
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: fargate-service
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: fargate-app
  ports:
  - port: 80
    targetPort: 80
```

Verify pods run on Fargate:

```bash
kubectl apply -f fargate-deployment.yaml

# Check pod nodes (should show fargate-*)
kubectl get pods -o wide

# Describe pod to see Fargate node
kubectl describe pod <pod-name> | grep "Node:"
```

## Configuring Resource Specifications

Fargate requires explicit resource requests:

```yaml
# resource-config.yaml
apiVersion: v1
kind: Pod
metadata:
  name: resource-pod
  namespace: default
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      # Both requests and limits must be specified
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 2Gi
```

Supported Fargate configurations:

```yaml
# Small pod - 0.25 vCPU, 0.5 GB to 2 GB
resources:
  requests:
    cpu: 250m
    memory: 512Mi

# Medium pod - 0.5 vCPU, 1 GB to 4 GB
resources:
  requests:
    cpu: 500m
    memory: 2Gi

# Large pod - 1 vCPU, 2 GB to 8 GB
resources:
  requests:
    cpu: 1000m
    memory: 4Gi

# Extra large pod - 2 vCPU, 4 GB to 16 GB
resources:
  requests:
    cpu: 2000m
    memory: 8Gi

# Maximum - 4 vCPU, 30 GB
resources:
  requests:
    cpu: 4000m
    memory: 30Gi
```

## Namespace-Specific Fargate Profiles

Create profiles for different namespaces:

```hcl
# Multiple Fargate profiles
resource "aws_eks_fargate_profile" "batch_jobs" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "batch-jobs"
  pod_execution_role_arn = aws_iam_role.fargate_pod_execution.arn
  subnet_ids             = module.vpc.private_subnets

  selector {
    namespace = "batch"
  }

  tags = {
    Purpose = "Batch Processing"
  }
}

resource "aws_eks_fargate_profile" "microservices" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "microservices"
  pod_execution_role_arn = aws_iam_role.fargate_pod_execution.arn
  subnet_ids             = module.vpc.private_subnets

  selector {
    namespace = "services"
    labels = {
      tier = "backend"
    }
  }

  tags = {
    Purpose = "Microservices"
  }
}

resource "aws_eks_fargate_profile" "frontend" {
  cluster_name           = aws_eks_cluster.main.name
  fargate_profile_name   = "frontend"
  pod_execution_role_arn = aws_iam_role.fargate_pod_execution.arn
  subnet_ids             = module.vpc.private_subnets

  selector {
    namespace = "frontend"
  }

  tags = {
    Purpose = "Frontend Applications"
  }
}
```

## Running Batch Jobs on Fargate

Deploy batch workloads:

```yaml
# batch-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing
  namespace: batch
spec:
  parallelism: 5
  completions: 10
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: myregistry/batch-processor:v1
        command:
          - python
          - process.py
        env:
        - name: BATCH_SIZE
          value: "1000"
        - name: S3_BUCKET
          value: "my-data-bucket"
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

CronJob example:

```yaml
# cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-task
  namespace: batch
spec:
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: task
            image: myregistry/scheduled-task:v1
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
```

## Configuring CoreDNS for Fargate

CoreDNS must run on Fargate for Fargate-only clusters:

```bash
# Patch CoreDNS to remove EC2 node affinity
kubectl patch deployment coredns \
  -n kube-system \
  --type json \
  -p='[{"op": "remove", "path": "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type"}]'

# Add Fargate profile for kube-system
aws eks create-fargate-profile \
  --cluster-name my-cluster \
  --fargate-profile-name coredns \
  --pod-execution-role-arn arn:aws:iam::123456789012:role/EKSFargatePodExecutionRole \
  --subnets subnet-abc123 subnet-def456 \
  --selectors '[{"namespace": "kube-system"}]'

# Restart CoreDNS
kubectl rollout restart -n kube-system deployment coredns
```

## Logging with Fargate

Configure Fluent Bit for log forwarding:

```yaml
# fluent-bit-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-logging
  namespace: aws-observability
data:
  output.conf: |
    [OUTPUT]
        Name cloudwatch_logs
        Match *
        region us-east-1
        log_group_name /aws/eks/fargate/my-cluster
        log_stream_prefix fargate-
        auto_create_group true

  parsers.conf: |
    [PARSER]
        Name json
        Format json
        Time_Key time
        Time_Format %Y-%m-%dT%H:%M:%S.%LZ

  filters.conf: |
    [FILTER]
        Name parser
        Match *
        Key_Name log
        Parser json
```

Create logging namespace:

```bash
# Create namespace for logging configuration
kubectl create namespace aws-observability

# Label namespace
kubectl label namespace aws-observability aws-observability=enabled

# Apply ConfigMap
kubectl apply -f fluent-bit-configmap.yaml
```

## Persistent Storage with Fargate

Use EFS for persistent storage:

```hcl
# efs-storage.tf
resource "aws_efs_file_system" "fargate_storage" {
  creation_token = "fargate-efs"
  encrypted      = true

  tags = {
    Name = "Fargate EFS"
  }
}

resource "aws_efs_mount_target" "fargate" {
  count           = length(module.vpc.private_subnets)
  file_system_id  = aws_efs_file_system.fargate_storage.id
  subnet_id       = module.vpc.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}
```

Use EFS in pods:

```yaml
# efs-pod.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: efs-pv
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: efs-sc
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-0123456789abcdef0
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: efs-claim
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: efs-sc
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: fargate-efs-pod
  namespace: default
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: persistent-storage
      mountPath: /data
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
  volumes:
  - name: persistent-storage
    persistentVolumeClaim:
      claimName: efs-claim
```

## Monitoring Fargate Pods

View metrics:

```bash
# Get pod resource usage
kubectl top pods -n default

# Describe pod for events
kubectl describe pod <pod-name>

# Check Fargate node capacity
kubectl describe node fargate-<node-name>

# CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EKS \
  --metric-name pod_cpu_utilization \
  --dimensions Name=ClusterName,Value=my-cluster \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

## Mixed Fargate and EC2 Deployment

Run some workloads on Fargate, others on EC2:

```yaml
# ec2-deployment.yaml - runs on EC2 nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ec2-app
  namespace: infrastructure
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ec2-app
  template:
    metadata:
      labels:
        app: ec2-app
    spec:
      nodeSelector:
        kubernetes.io/os: linux
        eks.amazonaws.com/compute-type: ec2
      containers:
      - name: app
        image: myapp:latest
---
# fargate-deployment.yaml - runs on Fargate
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fargate-app
  namespace: default  # Fargate profile targets default namespace
spec:
  replicas: 5
  selector:
    matchLabels:
      app: fargate-app
  template:
    metadata:
      labels:
        app: fargate-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

## Cost Optimization

Optimize Fargate costs:

```yaml
# Right-size pod resources
apiVersion: v1
kind: Pod
metadata:
  name: optimized-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      # Request only what you need
      requests:
        cpu: 250m      # Don't over-provision
        memory: 512Mi
      limits:
        cpu: 250m      # Set limits = requests to avoid waste
        memory: 512Mi
```

Use Spot for batch workloads on EC2, Fargate for variable loads.

## Troubleshooting Fargate

Common issues:

```bash
# Pod stuck in Pending
kubectl describe pod <pod-name>
# Look for: "No nodes are available that match pod selector"

# Check Fargate profile selectors
aws eks describe-fargate-profile \
  --cluster-name my-cluster \
  --fargate-profile-name default-profile

# Ensure namespace/labels match profile
kubectl get pod <pod-name> -o yaml | grep -A 5 "labels:"

# Check pod resource requests
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].resources}'

# View Fargate pod execution role
aws iam get-role --role-name EKSFargatePodExecutionRole

# Check subnets are private
aws ec2 describe-subnets --subnet-ids subnet-abc123
```

## Best Practices

1. Always specify resource requests and limits
2. Use private subnets for Fargate
3. Create separate profiles for different workload types
4. Enable logging with Fluent Bit
5. Use EFS for persistent storage needs
6. Right-size pods to avoid wasted resources
7. Monitor costs per namespace/profile
8. Use Fargate for variable workloads, EC2 for steady state
9. Implement proper IAM roles for pod access
10. Test disaster recovery procedures

## Conclusion

EKS Fargate provides serverless Kubernetes pod execution without managing nodes. Create Fargate profiles targeting specific namespaces and labels, specify pod resource requirements, and AWS handles provisioning and scaling. Use Fargate for batch jobs, microservices, and variable workloads where operational simplicity and automatic scaling outweigh the higher per-pod cost. Combine Fargate with EC2 node groups for workloads requiring DaemonSets, host networking, or persistent local storage.
