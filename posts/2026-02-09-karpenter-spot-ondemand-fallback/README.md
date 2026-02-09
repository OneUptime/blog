# How to Configure Karpenter Spot-to-On-Demand Fallback for Cost-Optimized Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Karpenter, AWS, Cost Optimization, Spot Instances

Description: Configure Karpenter to automatically fallback from Spot to On-Demand instances when capacity is unavailable, ensuring workload reliability while maximizing cost savings in Kubernetes clusters.

---

Spot instances offer massive cost savings, sometimes up to 90% compared to On-Demand pricing. But they come with a catch: they can be reclaimed by the cloud provider at any time with minimal notice. For production workloads, you need a strategy that maximizes Spot usage while gracefully falling back to On-Demand instances when Spot capacity runs dry.

Karpenter, the Kubernetes node autoscaler built by AWS, provides sophisticated mechanisms for managing this fallback behavior. Unlike traditional cluster autoscalers that require pre-defined node groups, Karpenter dynamically provisions the most cost-effective capacity while respecting your availability requirements.

## Understanding Karpenter's Capacity Selection Logic

Karpenter evaluates pending pods and determines the optimal instance types to provision based on multiple factors. It considers pricing data, availability zones, capacity types (Spot vs On-Demand), instance sizes, and architectural compatibility. The provisioner's requirements field defines constraints, while the provider configuration specifies capacity type preferences.

When Spot capacity is unavailable, Karpenter can automatically attempt to provision On-Demand instances instead. This fallback behavior requires careful configuration to avoid unexpected cost increases while maintaining workload availability.

## Installing Karpenter in Your EKS Cluster

Before configuring fallback behavior, you need Karpenter installed and running. This example assumes you're using AWS EKS, but similar concepts apply to other cloud providers.

```bash
# Set environment variables for your cluster
export CLUSTER_NAME="your-cluster-name"
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create IAM roles and policies for Karpenter
cat > karpenter-controller-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/oidc.eks.${AWS_REGION}.amazonaws.com/id/YOUR_OIDC_ID"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.${AWS_REGION}.amazonaws.com/id/YOUR_OIDC_ID:sub": "system:serviceaccount:karpenter:karpenter"
        }
      }
    }
  ]
}
EOF

# Create the Karpenter controller IAM role
aws iam create-role \
  --role-name KarpenterControllerRole-${CLUSTER_NAME} \
  --assume-role-policy-document file://karpenter-controller-trust-policy.json

# Attach the necessary policies
aws iam attach-role-policy \
  --role-name KarpenterControllerRole-${CLUSTER_NAME} \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

# Install Karpenter using Helm
helm repo add karpenter https://charts.karpenter.sh
helm repo update

helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::${AWS_ACCOUNT_ID}:role/KarpenterControllerRole-${CLUSTER_NAME}" \
  --set clusterName=${CLUSTER_NAME} \
  --set clusterEndpoint=$(aws eks describe-cluster --name ${CLUSTER_NAME} --query cluster.endpoint --output text) \
  --wait
```

Verify that Karpenter is running:

```bash
kubectl get pods -n karpenter
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter -c controller
```

## Configuring Basic Spot-to-On-Demand Fallback

Create a Provisioner that attempts Spot first but falls back to On-Demand when necessary. The capacity type ordering determines the preference hierarchy.

```yaml
# karpenter-provisioner-basic.yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  # Define capacity type priority: Spot first, then On-Demand
  requirements:
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot", "on-demand"]

    # Specify instance categories
    - key: karpenter.k8s.aws/instance-category
      operator: In
      values: ["c", "m", "r"]

    # Define instance generations
    - key: karpenter.k8s.aws/instance-generation
      operator: Gt
      values: ["4"]

    # Architecture constraint
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]

  # Set limits to control maximum capacity
  limits:
    resources:
      cpu: "1000"
      memory: "1000Gi"

  # Consolidation settings
  consolidation:
    enabled: true

  # Time-to-live for empty nodes
  ttlSecondsAfterEmpty: 30

  # Node provider configuration
  providerRef:
    name: default

---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  subnetSelector:
    karpenter.sh/discovery: ${CLUSTER_NAME}

  securityGroupSelector:
    karpenter.sh/discovery: ${CLUSTER_NAME}

  # IAM instance profile for nodes
  instanceProfile: KarpenterNodeInstanceProfile-${CLUSTER_NAME}

  # User data for node initialization
  userData: |
    #!/bin/bash
    /etc/eks/bootstrap.sh ${CLUSTER_NAME}
```

Apply the provisioner configuration:

```bash
# Replace cluster name variable
export CLUSTER_NAME="your-cluster-name"
envsubst < karpenter-provisioner-basic.yaml | kubectl apply -f -
```

This configuration tells Karpenter to prefer Spot instances but automatically try On-Demand when Spot capacity is unavailable. The ordering in the `values` array determines preference.

## Advanced Fallback with Weighted Capacity Types

For more control, use separate provisioners with different priorities and capacity types. This approach lets you define different instance type preferences for Spot vs On-Demand.

```yaml
# karpenter-provisioner-spot-priority.yaml
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-priority
spec:
  weight: 50  # Higher weight = higher priority

  requirements:
    # Only Spot instances
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot"]

    # Wider instance type selection for better Spot availability
    - key: karpenter.k8s.aws/instance-category
      operator: In
      values: ["c", "m", "r", "t"]

    - key: karpenter.k8s.aws/instance-generation
      operator: Gt
      values: ["4"]

    # Multiple availability zones
    - key: topology.kubernetes.io/zone
      operator: In
      values: ["us-east-1a", "us-east-1b", "us-east-1c"]

  limits:
    resources:
      cpu: "800"
      memory: "800Gi"

  consolidation:
    enabled: true

  ttlSecondsAfterEmpty: 30

  providerRef:
    name: default

---
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: on-demand-fallback
spec:
  weight: 10  # Lower weight = lower priority

  requirements:
    # Only On-Demand instances
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["on-demand"]

    # More conservative instance type selection for cost control
    - key: karpenter.k8s.aws/instance-category
      operator: In
      values: ["c", "m"]

    - key: karpenter.k8s.aws/instance-generation
      operator: Gt
      values: ["5"]

    - key: topology.kubernetes.io/zone
      operator: In
      values: ["us-east-1a", "us-east-1b", "us-east-1c"]

  limits:
    resources:
      cpu: "200"
      memory: "200Gi"

  consolidation:
    enabled: true

  ttlSecondsAfterEmpty: 30

  providerRef:
    name: default
```

Apply both provisioners:

```bash
kubectl apply -f karpenter-provisioner-spot-priority.yaml
```

Karpenter will attempt to schedule pods using the spot-priority provisioner first. If Spot capacity is unavailable across all suitable instance types, it falls back to the on-demand-fallback provisioner.

## Workload-Specific Capacity Type Control

Different workloads have different tolerance for interruptions. Configure pod-level capacity type requirements to control fallback behavior per workload.

```yaml
# deployment-spot-only.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
spec:
  replicas: 10
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      # This workload only runs on Spot
      nodeSelector:
        karpenter.sh/capacity-type: spot

      # Tolerate Spot interruptions
      tolerations:
      - key: karpenter.sh/capacity-type
        operator: Equal
        value: spot
        effect: NoSchedule

      containers:
      - name: processor
        image: your-batch-image:latest
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"

---
# deployment-spot-preferred.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      # Prefer Spot but allow On-Demand fallback
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: karpenter.sh/capacity-type
                operator: In
                values: ["spot"]

      containers:
      - name: frontend
        image: your-frontend-image:latest
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"

---
# deployment-on-demand-only.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      # Critical workload, On-Demand only
      nodeSelector:
        karpenter.sh/capacity-type: on-demand

      containers:
      - name: postgres
        image: postgres:15
        resources:
          requests:
            cpu: "2000m"
            memory: "8Gi"
```

Deploy these workloads:

```bash
kubectl apply -f deployment-spot-only.yaml
kubectl apply -f deployment-spot-preferred.yaml
kubectl apply -f deployment-on-demand-only.yaml
```

Monitor which capacity types Karpenter provisions:

```bash
# Check node capacity types
kubectl get nodes -L karpenter.sh/capacity-type

# Watch Karpenter provisioning decisions
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter -c controller -f | grep -i "capacity-type"
```

## Handling Spot Interruptions Gracefully

Even with fallback configured, Spot instances can still be interrupted. Configure proper handling to minimize disruption.

```yaml
# spot-interruption-handler.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: aws-node-termination-handler
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: aws-node-termination-handler
  template:
    metadata:
      labels:
        app: aws-node-termination-handler
    spec:
      serviceAccountName: aws-node-termination-handler
      hostNetwork: true
      containers:
      - name: aws-node-termination-handler
        image: public.ecr.aws/aws-ec2/aws-node-termination-handler:latest
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: ENABLE_SPOT_INTERRUPTION_DRAINING
          value: "true"
        - name: ENABLE_SCHEDULED_EVENT_DRAINING
          value: "true"
        securityContext:
          privileged: true
```

This DaemonSet watches for Spot interruption notices and cordons/drains nodes gracefully. Karpenter will automatically provision replacement capacity using the fallback configuration.

## Monitoring Spot vs On-Demand Usage

Track your capacity type distribution to understand cost savings and fallback frequency.

```bash
# Get capacity type breakdown
kubectl get nodes -L karpenter.sh/capacity-type --no-headers | \
  awk '{print $NF}' | sort | uniq -c

# Monitor Karpenter metrics
kubectl port-forward -n karpenter svc/karpenter 8080:8080

# Query Prometheus metrics
# karpenter_nodes_created{capacity_type="spot"}
# karpenter_nodes_created{capacity_type="on-demand"}
```

Create a Grafana dashboard to visualize the Spot/On-Demand ratio over time and identify patterns in fallback usage.

## Optimizing Fallback Configuration

Fine-tune your configuration based on observed behavior. If you see frequent fallbacks, consider expanding your Spot instance type selection. If Spot availability is good, you can tighten your On-Demand limits to control costs.

Test your fallback configuration during maintenance windows by deliberately creating high pod counts that exceed Spot capacity:

```bash
# Scale up a test deployment
kubectl scale deployment test-app --replicas=100

# Watch Karpenter provision nodes
kubectl get nodes -w -L karpenter.sh/capacity-type

# Check if On-Demand fallback was triggered
kubectl describe node <node-name> | grep capacity-type
```

Spot-to-On-Demand fallback transforms cost optimization from a risky proposition into a reliable strategy. By configuring Karpenter to intelligently fallback when needed, you maximize savings without sacrificing availability. Start with conservative limits on On-Demand capacity and gradually increase Spot usage as you gain confidence in your interruption handling.
