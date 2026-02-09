# How to Implement Blue-Green Cluster Upgrade Strategy for Zero Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, Zero-Downtime

Description: Master blue-green cluster upgrade strategies for Kubernetes with complete implementation guide including traffic shifting, DNS updates, and automated rollback procedures for zero-downtime upgrades.

---

Blue-green cluster upgrades provide the ultimate safety net for Kubernetes version upgrades. Instead of upgrading nodes in place, you create an entirely new cluster running the target version and shift traffic once validation is complete. This approach eliminates upgrade-related downtime and provides instant rollback capabilities.

## Understanding Blue-Green Cluster Upgrades

Traditional in-place upgrades modify your existing cluster, introducing risk at every step. Blue-green upgrades eliminate this risk by maintaining two complete clusters: the blue cluster running your current version and the green cluster running the new version. Traffic shifts from blue to green only after thorough validation.

This strategy requires more resources temporarily but provides unmatched safety and confidence. It's particularly valuable for production environments where downtime is unacceptable and rollback needs to be instantaneous.

## Planning Your Blue-Green Upgrade

Before implementing a blue-green upgrade, you need to plan your infrastructure carefully. Consider your persistent storage strategy, external service dependencies, DNS configuration, and cost implications of running two clusters simultaneously.

The key components you need to plan for include cluster creation with identical configuration, data migration or shared storage access, application deployment to the new cluster, traffic shifting mechanism, validation procedures, and cleanup of the old cluster.

## Creating the Green Cluster

Start by creating a new cluster with the target Kubernetes version. The green cluster should mirror your production configuration.

```bash
# For EKS example
aws eks create-cluster \
  --name production-green \
  --version 1.29 \
  --role-arn arn:aws:iam::123456789012:role/eks-cluster-role \
  --resources-vpc-config subnetIds=subnet-abc123,subnet-def456,securityGroupIds=sg-123456

# Create node group
aws eks create-nodegroup \
  --cluster-name production-green \
  --nodegroup-name standard-workers \
  --node-role arn:aws:iam::123456789012:role/eks-node-role \
  --subnets subnet-abc123 subnet-def456 \
  --instance-types t3.large \
  --scaling-config minSize=3,maxSize=10,desiredSize=5

# For GKE example
gcloud container clusters create production-green \
  --cluster-version=1.29 \
  --zone=us-central1-a \
  --num-nodes=5 \
  --machine-type=n1-standard-4 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=10

# For AKS example
az aks create \
  --resource-group production-rg \
  --name production-green \
  --kubernetes-version 1.29.0 \
  --node-count 5 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

## Setting Up Infrastructure as Code

Managing two clusters manually is error-prone. Use Infrastructure as Code to ensure consistency.

```hcl
# Terraform example for blue-green clusters
variable "active_cluster" {
  description = "The active cluster color"
  type        = string
  default     = "blue"
}

module "eks_blue" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "production-blue"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    standard = {
      min_size     = 3
      max_size     = 10
      desired_size = 5
      instance_types = ["t3.large"]
    }
  }
}

module "eks_green" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "production-green"
  cluster_version = "1.29"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    standard = {
      min_size     = 3
      max_size     = 10
      desired_size = 5
      instance_types = ["t3.large"]
    }
  }
}

# Route53 weighted routing for gradual traffic shift
resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = var.active_cluster == "blue" ? 100 : 0
  }

  set_identifier = "blue"
  alias {
    name                   = module.eks_blue.cluster_endpoint
    zone_id                = module.eks_blue.cluster_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_green" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  weighted_routing_policy {
    weight = var.active_cluster == "green" ? 100 : 0
  }

  set_identifier = "green"
  alias {
    name                   = module.eks_green.cluster_endpoint
    zone_id                = module.eks_green.cluster_zone_id
    evaluate_target_health = true
  }
}
```

## Deploying Applications to Green Cluster

Once the green cluster is ready, deploy your applications. Use GitOps tools like ArgoCD or Flux for consistent deployments.

```yaml
# ArgoCD ApplicationSet for multi-cluster deployment
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: production-apps
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: blue
        url: https://kubernetes.blue.example.com
      - cluster: green
        url: https://kubernetes.green.example.com
  template:
    metadata:
      name: '{{cluster}}-myapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/myapp
        targetRevision: main
        path: k8s/overlays/production
      destination:
        server: '{{url}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Alternatively, use a deployment script:

```bash
#!/bin/bash
# deploy-to-green.sh

GREEN_CONTEXT="production-green"

echo "Deploying to green cluster..."

# Switch to green cluster context
kubectl config use-context $GREEN_CONTEXT

# Apply all manifests
kubectl apply -k k8s/overlays/production

# Wait for deployments to be ready
kubectl wait --for=condition=available --timeout=600s \
  deployment --all -n production

# Run smoke tests
./run-smoke-tests.sh $GREEN_CONTEXT

if [ $? -eq 0 ]; then
  echo "Green cluster deployment successful!"
else
  echo "Green cluster deployment failed!"
  exit 1
fi
```

## Handling Stateful Workloads

Stateful workloads require special attention during blue-green upgrades. You have several options for handling persistent data.

```yaml
# Option 1: Shared storage using EFS or similar
apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-data
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  csi:
    driver: efs.csi.aws.com
    volumeHandle: fs-abc123::fsap-xyz789
---
# Option 2: Database replication between clusters
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
data:
  primary_conninfo: "host=blue-postgres.example.com port=5432 user=replicator"
  postgresql.conf: |
    wal_level = replica
    max_wal_senders = 5
    hot_standby = on
```

For databases, set up replication from blue to green:

```bash
# PostgreSQL replication setup
kubectl exec -it postgres-0 -n blue -- psql -U postgres << 'EOF'
CREATE ROLE replicator WITH REPLICATION PASSWORD 'secure-password' LOGIN;
SELECT pg_create_physical_replication_slot('green_slot');
EOF

# On green cluster, configure as replica
kubectl create secret generic postgres-replication \
  --from-literal=primary_conninfo="host=blue-postgres.example.com port=5432 user=replicator password=secure-password"

# Deploy PostgreSQL in standby mode
kubectl apply -f postgres-standby.yaml -n green
```

## Implementing Gradual Traffic Shift

Don't switch all traffic at once. Use weighted routing to gradually shift traffic and monitor for issues.

```bash
# Script for gradual traffic shift using Route53
#!/bin/bash
# shift-traffic.sh

ZONE_ID="Z1234567890ABC"
RECORD_NAME="api.example.com"

shift_traffic() {
  local blue_weight=$1
  local green_weight=$2

  echo "Shifting traffic: Blue=$blue_weight%, Green=$green_weight%"

  # Update blue record weight
  aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$RECORD_NAME'",
          "Type": "A",
          "SetIdentifier": "blue",
          "Weight": '$blue_weight',
          "AliasTarget": {
            "HostedZoneId": "Z1234567890",
            "DNSName": "blue-lb.example.com",
            "EvaluateTargetHealth": true
          }
        }
      }]
    }'

  # Update green record weight
  aws route53 change-resource-record-sets \
    --hosted-zone-id $ZONE_ID \
    --change-batch '{
      "Changes": [{
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "'$RECORD_NAME'",
          "Type": "A",
          "SetIdentifier": "green",
          "Weight": '$green_weight',
          "AliasTarget": {
            "HostedZoneId": "Z1234567890",
            "DNSName": "green-lb.example.com",
            "EvaluateTargetHealth": true
          }
        }
      }]
    }'
}

# Gradual shift: 10% increments with 10 minute pauses
shift_traffic 90 10
sleep 600

shift_traffic 75 25
sleep 600

shift_traffic 50 50
sleep 600

shift_traffic 25 75
sleep 600

shift_traffic 0 100
echo "Traffic fully shifted to green cluster"
```

## Validating the Green Cluster

Before shifting production traffic, run comprehensive validation tests.

```bash
#!/bin/bash
# validate-green-cluster.sh

GREEN_ENDPOINT="https://green-api.example.com"
BLUE_ENDPOINT="https://blue-api.example.com"

echo "Running validation tests on green cluster..."

# Health check
if ! curl -sf "$GREEN_ENDPOINT/health" > /dev/null; then
  echo "Health check failed"
  exit 1
fi

# Load test
echo "Running load test..."
hey -n 10000 -c 50 "$GREEN_ENDPOINT/api/v1/test"

# Compare response times with blue
blue_latency=$(curl -w "%{time_total}" -o /dev/null -s "$BLUE_ENDPOINT/api/v1/test")
green_latency=$(curl -w "%{time_total}" -o /dev/null -s "$GREEN_ENDPOINT/api/v1/test")

echo "Blue latency: $blue_latency"
echo "Green latency: $green_latency"

# Run integration tests
kubectl config use-context production-green
./run-integration-tests.sh

if [ $? -eq 0 ]; then
  echo "Validation successful!"
  exit 0
else
  echo "Validation failed!"
  exit 1
fi
```

## Implementing Instant Rollback

If issues arise after switching to green, you need instant rollback capability.

```bash
#!/bin/bash
# rollback-to-blue.sh

echo "Rolling back to blue cluster..."

# Shift all traffic back to blue
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "blue",
          "Weight": 100,
          "AliasTarget": {
            "HostedZoneId": "Z1234567890",
            "DNSName": "blue-lb.example.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "green",
          "Weight": 0,
          "AliasTarget": {
            "HostedZoneId": "Z1234567890",
            "DNSName": "green-lb.example.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

echo "Rollback complete - all traffic on blue cluster"
```

## Cleanup After Successful Migration

Once the green cluster is stable and serving all production traffic, clean up the blue cluster.

```bash
#!/bin/bash
# cleanup-blue-cluster.sh

echo "Starting blue cluster cleanup..."

# Verify green is stable for at least 24 hours
echo "Ensure green has been running stable for 24+ hours before proceeding"
read -p "Continue with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cleanup cancelled"
  exit 0
fi

# Backup blue cluster configuration
kubectl config use-context production-blue
kubectl get all --all-namespaces -o yaml > blue-cluster-backup.yaml

# Delete blue cluster
aws eks delete-cluster --name production-blue

echo "Blue cluster cleanup initiated"
```

Blue-green cluster upgrades provide the safest path for Kubernetes version upgrades. While they require additional resources and planning, the ability to validate thoroughly and rollback instantly makes them ideal for mission-critical production environments where downtime is simply not an option.
