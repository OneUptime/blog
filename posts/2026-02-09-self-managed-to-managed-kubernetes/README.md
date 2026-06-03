# How to Migrate from Self-Managed Kubernetes to Managed Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Migration, Managed Service

Description: Learn how to migrate from self-managed Kubernetes clusters to managed services like EKS, GKE, or AKS for reduced operational overhead and improved reliability.

---

Self-managed Kubernetes requires significant operational expertise for control plane management, upgrades, and disaster recovery. Managed Kubernetes services handle these operational burdens while providing cloud integrations. This guide shows you how to migrate from self-managed clusters to managed services with minimal downtime.

## Comparing Self-Managed vs Managed Kubernetes

Understand what managed services handle for you.

```yaml
# Self-managed responsibilities

apiVersion: v1
kind: ConfigMap
metadata:
  name: kubernetes-responsibilities
data:
  self-managed.txt: |
    - Control plane installation and configuration
    - etcd backup and disaster recovery
    - Kubernetes version upgrades
    - Certificate rotation
    - Control plane high availability
    - Load balancer provisioning
    - Node OS patching and updates
    - Monitoring and logging setup
    - Security updates and CVE patching

  managed-service.txt: |
    Cloud provider handles:
    - Control plane management (included or billed separately)
    - Managed upgrade workflows and optional automatic upgrades
    - etcd backup and HA
    - Certificate management
    - Control plane scaling
    - Integration with cloud services

    You manage:
    - Worker nodes (can be managed node groups)
    - Application deployments
    - Cluster configuration
```

Managed services reduce operational overhead significantly.

## Choosing Target Managed Service

Select the appropriate managed Kubernetes provider.

```bash
#!/bin/bash
# Compare managed Kubernetes options

echo "AWS EKS:"
echo "  - Best AWS integration"
echo "  - Fargate for serverless pods"
echo "  - Cost: $0.10/hour per cluster for standard support + node costs"

echo "Google GKE:"
echo "  - Most Kubernetes-native (Google invented K8s)"
echo "  - Autopilot mode (fully managed)"
echo "  - Cost: Cluster management fee with monthly free-tier credit + node or Autopilot workload costs"

echo "Azure AKS:"
echo "  - Best Azure integration"
echo "  - Virtual nodes (serverless)"
echo "  - Cost: Free tier for non-production; Standard/Premium cluster management billed separately + node costs"

# Assess current infrastructure
kubectl get nodes -o wide
kubectl get pv -o json | jq '.items[] | .spec.storageClassName'
```

Choose based on existing cloud infrastructure and requirements.

## Provisioning Target Managed Cluster

Create the managed Kubernetes cluster.

```bash
#!/bin/bash
# Provision EKS cluster (example)

eksctl create cluster \
  --name production-managed \
  --region us-east-1 \
  --version 1.35 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 5 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed \
  --enable-ssm

# Get kubeconfig
aws eks update-kubeconfig --name production-managed --region us-east-1

# Verify cluster
kubectl get nodes
```

Use infrastructure as code for repeatable provisioning.

## Installing Required Add-ons

Deploy essential components to the managed cluster.

```bash
#!/bin/bash
# Install cloud-specific add-ons

# AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks
eksctl utils associate-iam-oidc-provider \
  --cluster production-managed \
  --region us-east-1 \
  --approve

# Requires the AWSLoadBalancerControllerIAMPolicy to exist in the account
eksctl create iamserviceaccount \
  --cluster production-managed \
  --region us-east-1 \
  --namespace kube-system \
  --name aws-load-balancer-controller \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=production-managed \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# EBS CSI Driver
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm repo update aws-ebs-csi-driver
eksctl create iamserviceaccount \
  --cluster production-managed \
  --region us-east-1 \
  --namespace kube-system \
  --name ebs-csi-controller-sa \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --override-existing-serviceaccounts \
  --approve

helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  -n kube-system \
  --set controller.serviceAccount.create=false \
  --set controller.serviceAccount.name=ebs-csi-controller-sa

# Cluster Autoscaler
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm repo update autoscaler
# Requires a ClusterAutoscalerPolicy scoped to this cluster's node groups
eksctl create iamserviceaccount \
  --cluster production-managed \
  --region us-east-1 \
  --namespace kube-system \
  --name cluster-autoscaler \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/ClusterAutoscalerPolicy \
  --override-existing-serviceaccounts \
  --approve

helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  -n kube-system \
  --set autoDiscovery.clusterName=production-managed \
  --set awsRegion=us-east-1 \
  --set rbac.serviceAccount.create=false \
  --set rbac.serviceAccount.name=cluster-autoscaler

# Install Velero for migration
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket migration-backup \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --no-secret
```

Add-ons provide cloud-native functionality.

## Migrating Workloads with Velero

Use Velero to backup and restore applications.

```bash
#!/bin/bash
# Backup from self-managed cluster

export KUBECONFIG=~/.kube/config-selfmanaged

# Create backup
velero backup create full-migration \
  --include-namespaces production,staging \
  --snapshot-volumes=true \
  --wait

# Verify backup
velero backup describe full-migration

# Switch to managed cluster
export KUBECONFIG=~/.kube/config-managed

# Restore to managed cluster
velero restore create migration-restore \
  --from-backup full-migration \
  --namespace-mappings production:production,staging:staging \
  --restore-volumes=true

# Monitor restore
velero restore describe migration-restore --details
```

Velero handles cross-cluster workload migration.

## Updating Load Balancer Configurations

Adapt ingress and service configurations for managed service.

```yaml
# Self-managed cluster used MetalLB
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    metallb.io/address-pool: production-pool
    metallb.io/loadBalancerIPs: 10.0.1.100
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
---
# Managed cluster uses cloud load balancer
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

Update service annotations for cloud providers.

## Configuring Cloud IAM Integration

Replace service account credentials with cloud IAM roles.

```yaml
# Self-managed cluster used secrets
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
type: Opaque
stringData:
  access_key: AKIAIOSFODNN7EXAMPLE
  secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
---
# Managed cluster uses IRSA (IAM Roles for Service Accounts)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/AppRole
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: myapp:v1.0
        # No AWS credentials needed - IRSA provides them
```

IRSA eliminates hardcoded credentials.

## Validating DNS and Networking

Ensure external access works correctly.

```bash
#!/bin/bash
# Validate networking

# Get load balancer endpoints
kubectl get svc -A -o json | jq -r '.items[] | select(.spec.type=="LoadBalancer") | [.metadata.namespace, .metadata.name, (.status.loadBalancer.ingress[0].hostname // .status.loadBalancer.ingress[0].ip // "pending")] | @tsv'

# Test external access
for LB in $(kubectl get svc -A -o json | jq -r '.items[] | select(.spec.type=="LoadBalancer") | (.status.loadBalancer.ingress[0].hostname // .status.loadBalancer.ingress[0].ip // empty)'); do
  echo "Testing $LB..."
  curl -I http://$LB/health
done

# Update DNS records
# Point domain to new load balancer
NEW_LB_HOSTNAME=$(kubectl get svc -n production web -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$NEW_LB_HOSTNAME'"}]
      }
    }]
  }'
```

Verify external connectivity before DNS cutover.

## Monitoring Managed Cluster

Set up observability for the new cluster.

```bash
#!/bin/bash
# CloudWatch Container Insights (EKS)
eksctl create iamserviceaccount \
  --name cloudwatch-agent \
  --namespace amazon-cloudwatch \
  --cluster production-managed \
  --region us-east-1 \
  --role-name AmazonEKS_Observability_Role \
  --role-only \
  --attach-policy-arn arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --approve

aws eks create-addon \
  --cluster-name production-managed \
  --addon-name amazon-cloudwatch-observability \
  --service-account-role-arn arn:aws:iam::ACCOUNT_ID:role/AmazonEKS_Observability_Role \
  --region us-east-1
```

Use cloud-native monitoring solutions.

## Decommissioning Self-Managed Cluster

Safely shut down the old cluster after migration.

```bash
#!/bin/bash
# Decommission self-managed cluster

SOAK_PERIOD_DAYS=7

echo "Managed cluster has been stable for $SOAK_PERIOD_DAYS days"
read -p "Proceed with decommission? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  exit 0
fi

# Final backup
export KUBECONFIG=~/.kube/config-selfmanaged
velero backup create final-backup-before-decommission

# Scale down workloads
kubectl scale deployment --all --replicas=0 -A

# Backup etcd
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-final-$(date +%Y%m%d).db

# Archive cluster state
kubectl get all -A -o yaml > cluster-final-state.yaml

# Destroy infrastructure
terraform destroy -target=module.kubernetes-cluster

echo "Self-managed cluster decommissioned"
```

Keep backups for recovery if needed.

## Conclusion

Migrating to managed Kubernetes reduces operational overhead. Choose a managed service based on existing cloud infrastructure and requirements. Provision the target managed cluster with appropriate node groups and sizing. Install cloud-specific add-ons for load balancing, storage, and autoscaling. Use Velero to backup workloads from the self-managed cluster and restore to the managed service. Update service annotations for cloud load balancers and ingress controllers. Replace hardcoded credentials with cloud IAM integrations like IRSA or Workload Identity. Validate external connectivity and update DNS records. Set up cloud-native monitoring and logging. Decommission the self-managed cluster only after a successful soak period. Managed services typically cost less than self-managed clusters when accounting for operational overhead and engineering time.
