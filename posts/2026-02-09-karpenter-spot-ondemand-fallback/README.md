# How to Configure Karpenter Spot-to-On-Demand Fallback for Cost-Optimized K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Karpenter, AWS, Cost Optimization, Spot Instance

Description: Configure Karpenter to automatically fallback from Spot to On-Demand instances when capacity is unavailable, ensuring workload reliability while maximizing cost savings in Kubernetes clusters.

---

Spot instances offer massive cost savings, sometimes up to 90% compared to On-Demand pricing. But they come with a catch: they can be reclaimed by the cloud provider at any time with minimal notice. For production workloads, you need a strategy that maximizes Spot usage while gracefully falling back to On-Demand instances when Spot capacity runs dry.

Karpenter, the Kubernetes node autoscaler built by AWS, provides sophisticated mechanisms for managing this fallback behavior. Unlike traditional cluster autoscalers that require pre-defined node groups, Karpenter dynamically provisions the most cost-effective capacity while respecting your availability requirements.

## Understanding Karpenter's Capacity Selection Logic

Karpenter evaluates pending pods and determines the optimal instance types to provision based on multiple factors. It considers pricing data, availability zones, capacity types (Spot vs On-Demand), instance sizes, and architectural compatibility. The NodePool requirements field defines constraints, while the EC2NodeClass specifies AWS-specific settings such as subnet, security group, and node IAM role selection.

When Spot capacity is unavailable, Karpenter can automatically attempt to provision On-Demand instances instead. This fallback behavior requires careful configuration to avoid unexpected cost increases while maintaining workload availability.

## Installing Karpenter in Your EKS Cluster

Before configuring fallback behavior, you need Karpenter installed and running. This example assumes you're using AWS EKS, but similar concepts apply to other cloud providers.

```bash
# Set environment variables for your cluster

export CLUSTER_NAME="your-cluster-name"
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export KARPENTER_NAMESPACE="karpenter"
export KARPENTER_VERSION="1.12.1"

# Install the IAM roles, controller policy, node role, and interruption queue.
# Review the generated CloudFormation before applying it in production.
curl -fsSL https://raw.githubusercontent.com/aws/karpenter-provider-aws/v${KARPENTER_VERSION}/website/content/en/preview/getting-started/getting-started-with-karpenter/cloudformation.yaml > karpenter-cloudformation.yaml

aws cloudformation deploy \
  --stack-name "Karpenter-${CLUSTER_NAME}" \
  --template-file karpenter-cloudformation.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides "ClusterName=${CLUSTER_NAME}"

# Install Karpenter using Helm
helm registry logout public.ecr.aws

helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter \
  --version "${KARPENTER_VERSION}" \
  --namespace "${KARPENTER_NAMESPACE}" \
  --create-namespace \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${CLUSTER_NAME}-karpenter" \
  --set "settings.clusterName=${CLUSTER_NAME}" \
  --set "settings.interruptionQueue=${CLUSTER_NAME}" \
  --wait
```

Verify that Karpenter is running:

```bash
kubectl get pods -n "${KARPENTER_NAMESPACE}"
kubectl logs -n "${KARPENTER_NAMESPACE}" -l app.kubernetes.io/name=karpenter -c controller
```

## Configuring Basic Spot-to-On-Demand Fallback

Create a NodePool that allows both Spot and On-Demand capacity. Karpenter prioritizes Spot over On-Demand when both capacity types are allowed, then falls back to On-Demand if no compatible Spot offering is available.

```yaml
# karpenter-nodepool-basic.yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
        # Allow Spot and On-Demand; Karpenter prioritizes Spot before On-Demand
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

        # Architecture and operating system constraints
        - key: kubernetes.io/arch
          operator: In
          values: ["amd64"]
        - key: kubernetes.io/os
          operator: In
          values: ["linux"]

      # Node provider configuration
      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default

      # Time-to-live for nodes before they are replaced
      expireAfter: 720h

  # Set limits to control maximum capacity
  limits:
    cpu: "1000"
    memory: "1000Gi"

  # Consolidation settings
  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s

---
apiVersion: karpenter.k8s.aws/v1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiSelectorTerms:
    - alias: al2023@latest

  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: ${CLUSTER_NAME}

  securityGroupSelectorTerms:
    - tags:
        karpenter.sh/discovery: ${CLUSTER_NAME}

  # IAM role for nodes
  role: KarpenterNodeRole-${CLUSTER_NAME}
```

Apply the NodePool configuration:

```bash
# Replace cluster name variable
export CLUSTER_NAME="your-cluster-name"
envsubst < karpenter-nodepool-basic.yaml | kubectl apply -f -
```

This configuration tells Karpenter to prefer Spot instances but automatically try On-Demand when Spot capacity is unavailable. Karpenter's capacity type priority is fixed: reserved capacity first, then Spot, then On-Demand.

## Advanced Fallback with Weighted Capacity Types

For more control, use separate NodePools with different weights and capacity types. This approach lets you define different instance type preferences for Spot vs On-Demand.

```yaml
# karpenter-nodepool-spot-priority.yaml
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: spot-priority
spec:
  weight: 50  # Higher weight = higher priority

  template:
    spec:
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

        - key: kubernetes.io/os
          operator: In
          values: ["linux"]

      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default

  limits:
    cpu: "800"
    memory: "800Gi"

  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s

---
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: on-demand-fallback
spec:
  weight: 10  # Lower weight = lower priority

  template:
    spec:
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

        - key: kubernetes.io/os
          operator: In
          values: ["linux"]

      nodeClassRef:
        group: karpenter.k8s.aws
        kind: EC2NodeClass
        name: default

  limits:
    cpu: "200"
    memory: "200Gi"

  disruption:
    consolidationPolicy: WhenEmptyOrUnderutilized
    consolidateAfter: 30s
```

Apply both NodePools:

```bash
kubectl apply -f karpenter-nodepool-spot-priority.yaml
```

Karpenter will prefer the higher-weight spot-priority NodePool when both NodePools match a pod. If the Spot NodePool cannot launch capacity across its suitable offerings, the lower-weight on-demand-fallback NodePool can provide On-Demand capacity.

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

Even with fallback configured, Spot instances can still be interrupted. Configure Karpenter's native interruption handling to minimize disruption.

```bash
# The CloudFormation template above creates an SQS interruption queue named after the cluster.
# Make sure the Helm release points Karpenter at that queue.
helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter \
  --version "${KARPENTER_VERSION}" \
  --namespace "${KARPENTER_NAMESPACE}" \
  --set "settings.clusterName=${CLUSTER_NAME}" \
  --set "settings.interruptionQueue=${CLUSTER_NAME}" \
  --reuse-values \
  --wait
```

With interruption handling enabled, Karpenter watches the SQS queue for Spot interruption warnings and other instance events, then taints, drains, and terminates affected nodes. Karpenter's documentation recommends not running AWS Node Termination Handler alongside Karpenter interruption handling because both components can act on the same events.

## Monitoring Spot vs On-Demand Usage

Track your capacity type distribution to understand cost savings and fallback frequency.

```bash
# Get capacity type breakdown
kubectl get nodes -L karpenter.sh/capacity-type --no-headers | \
  awk '{print $NF}' | sort | uniq -c

# Monitor Karpenter metrics
kubectl port-forward -n karpenter svc/karpenter 8080:8080

# Query Prometheus metrics
# karpenter_pods_state{capacity_type="spot"}
# karpenter_pods_state{capacity_type="on-demand"}
# karpenter_nodepools_usage
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
