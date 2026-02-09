# How to Migrate On-Premises Kubernetes Clusters to EKS Using Cluster API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS EKS, Cluster API

Description: Learn how to migrate on-premises Kubernetes workloads to Amazon EKS using Cluster API for declarative cluster provisioning and workload migration with minimal downtime.

---

Moving from on-premises Kubernetes to managed EKS reduces operational overhead while gaining AWS integrations. Cluster API provides declarative infrastructure provisioning that simplifies creating target EKS clusters. This guide shows you how to migrate on-premises clusters to EKS using Cluster API for infrastructure automation and Velero for workload migration.

## Installing Cluster API Management Cluster

Set up a management cluster to provision the target EKS cluster.

```bash
#!/bin/bash
# Install Cluster API on management cluster

# Install clusterctl
curl -L https://github.com/kubernetes-sigs/cluster-api/releases/download/v1.6.1/clusterctl-linux-amd64 -o clusterctl
sudo install -o root -g root -m 0755 clusterctl /usr/local/bin/clusterctl

# Initialize Cluster API with AWS provider
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_B64ENCODED_CREDENTIALS=$(clusterawsadm bootstrap credentials encode-as-profile)

clusterctl init --infrastructure aws

# Verify installation
kubectl get pods -n capi-system
kubectl get pods -n capa-system

echo "Cluster API installed successfully"
```

The management cluster orchestrates EKS cluster creation.

## Defining Target EKS Cluster

Create Cluster API manifests for the target EKS cluster.

```yaml
# eks-cluster.yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: Cluster
metadata:
  name: production-eks
  namespace: default
spec:
  clusterNetwork:
    pods:
      cidrBlocks:
      - 192.168.0.0/16
  controlPlaneRef:
    apiVersion: controlplane.cluster.x-k8s.io/v1beta1
    kind: AWSManagedControlPlane
    name: production-eks-control-plane
  infrastructureRef:
    apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
    kind: AWSManagedCluster
    name: production-eks
---
apiVersion: controlplane.cluster.x-k8s.io/v1beta1
kind: AWSManagedControlPlane
metadata:
  name: production-eks-control-plane
spec:
  region: us-east-1
  sshKeyName: eks-nodes
  version: v1.28
  eksClusterName: production-eks
  networking:
    cni:
      cniIngressRules:
      - description: Allow nodes to communicate with each other
        fromPort: 0
        protocol: "-1"
        toPort: 65535
  iamAuthenticatorConfig:
    mapRoles:
    - rolearn: arn:aws:iam::ACCOUNT_ID:role/KubernetesAdmin
      username: kubernetes-admin
      groups:
      - system:masters
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AWSManagedCluster
metadata:
  name: production-eks
spec: {}
---
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineDeployment
metadata:
  name: production-eks-md-0
spec:
  clusterName: production-eks
  replicas: 3
  selector:
    matchLabels: {}
  template:
    spec:
      bootstrap:
        configRef:
          apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
          kind: EKSConfigTemplate
          name: production-eks-md-0
      clusterName: production-eks
      infrastructureRef:
        apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
        kind: AWSMachineTemplate
        name: production-eks-md-0
      version: v1.28.0
---
apiVersion: infrastructure.cluster.x-k8s.io/v1beta1
kind: AWSMachineTemplate
metadata:
  name: production-eks-md-0
spec:
  template:
    spec:
      instanceType: t3.xlarge
      iamInstanceProfile: nodes.cluster-api-provider-aws.sigs.k8s.io
      sshKeyName: eks-nodes
---
apiVersion: bootstrap.cluster.x-k8s.io/v1beta1
kind: EKSConfigTemplate
metadata:
  name: production-eks-md-0
spec:
  template: {}
```

This declarative specification creates a production-ready EKS cluster.

## Provisioning EKS Cluster

Deploy the EKS cluster using Cluster API.

```bash
#!/bin/bash
# Provision EKS cluster

# Apply cluster manifests
kubectl apply -f eks-cluster.yaml

# Monitor cluster creation
echo "Watching cluster provisioning (this takes 10-15 minutes)..."
kubectl get cluster production-eks --watch

# Wait for control plane to be ready
kubectl wait --for=condition=ControlPlaneReady cluster/production-eks --timeout=20m

# Wait for nodes to be ready
kubectl wait --for=condition=NodeHealthy=true machinedeployment/production-eks-md-0 --timeout=15m

# Get kubeconfig for new EKS cluster
clusterctl get kubeconfig production-eks > eks-kubeconfig.yaml

# Verify EKS cluster
export KUBECONFIG=eks-kubeconfig.yaml
kubectl get nodes

echo "EKS cluster provisioned successfully"
```

Cluster API handles all AWS resource creation automatically.

## Installing Required Add-ons on EKS

Deploy essential components to the new EKS cluster.

```bash
#!/bin/bash
# Install EKS add-ons

export KUBECONFIG=eks-kubeconfig.yaml

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=production-eks \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller

# Install EBS CSI Driver
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  -n kube-system

# Install Cluster Autoscaler
helm repo add autoscaler https://kubernetes.github.io/autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  -n kube-system \
  --set autoDiscovery.clusterName=production-eks \
  --set awsRegion=us-east-1

# Install CoreDNS autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/cluster-proportional-autoscaler/master/examples/dns-autoscaler.yaml

echo "EKS add-ons installed"
```

These add-ons provide EKS-specific functionality.

## Setting Up Velero for Workload Migration

Configure Velero on both clusters for backup and restore.

```bash
#!/bin/bash
# Install Velero on source cluster

export KUBECONFIG=~/.kube/config-onprem

# Create S3 bucket for backups
aws s3 mb s3://eks-migration-backup --region us-east-1

# Install Velero
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket eks-migration-backup \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./velero-credentials

# Install Velero on target EKS cluster
export KUBECONFIG=eks-kubeconfig.yaml

velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket eks-migration-backup \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./velero-credentials

echo "Velero installed on both clusters"
```

Velero handles cross-cluster workload migration.

## Creating Comprehensive Backup

Backup all workloads from the on-premises cluster.

```bash
#!/bin/bash
# Backup on-premises cluster

export KUBECONFIG=~/.kube/config-onprem

# Create backup excluding system namespaces
velero backup create onprem-to-eks-migration \
  --include-namespaces production,staging,monitoring \
  --snapshot-volumes=true \
  --default-volumes-to-fs-backup=false \
  --wait

# Verify backup
velero backup describe onprem-to-eks-migration --details

# Check for errors
velero backup logs onprem-to-eks-migration | grep -i error

echo "Backup complete"
```

This captures all application state for migration.

## Transforming Resources for EKS

Modify resources to work with EKS-specific features.

```yaml
# Resource transformation ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: eks-transformations
  namespace: velero
data:
  storage-class-mappings.yaml: |
    # On-prem to EKS storage class mappings
    local-path: gp3
    nfs-storage: efs-sc
    block-storage: gp3

  ingress-annotations.yaml: |
    # Update ingress for ALB
    annotations:
      kubernetes.io/ingress.class: nginx
    transforms_to:
      kubernetes.io/ingress.class: alb
      alb.ingress.kubernetes.io/scheme: internet-facing
      alb.ingress.kubernetes.io/target-type: ip

  service-annotations.yaml: |
    # Update services for NLB
    annotations:
      service.beta.kubernetes.io/external-traffic: OnlyLocal
    transforms_to:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
      service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
```

These mappings adapt resources for AWS infrastructure.

## Restoring to EKS Cluster

Restore workloads to the target EKS cluster.

```bash
#!/bin/bash
# Restore to EKS cluster

export KUBECONFIG=eks-kubeconfig.yaml

# Create restore with transformations
velero restore create onprem-to-eks-restore \
  --from-backup onprem-to-eks-migration \
  --namespace-mappings production:production-eks,staging:staging-eks \
  --restore-volumes=true \
  --wait

# Monitor restore progress
velero restore describe onprem-to-eks-restore --details

# Check for errors
velero restore logs onprem-to-eks-restore | grep -i error

# Verify pods are running
kubectl get pods --all-namespaces

echo "Restore to EKS complete"
```

Velero recreates all resources in the EKS cluster.

## Updating Applications for AWS Services

Integrate applications with AWS-managed services.

```yaml
# Update RDS connection
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production-eks
data:
  database_host: "production.abc123.us-east-1.rds.amazonaws.com"
  database_port: "5432"
---
# Use IAM roles for service accounts
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
  namespace: production-eks
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/AppRole
---
# Update deployment to use IRSA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production-eks
spec:
  template:
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: app:v2.0
        env:
        - name: AWS_REGION
          value: us-east-1
        # No need for AWS credentials - IRSA provides them
```

IRSA eliminates the need for hardcoded AWS credentials.

## Validating Migration Success

Verify all workloads function correctly on EKS.

```bash
#!/bin/bash
# Validation script

export KUBECONFIG=eks-kubeconfig.yaml

echo "=== Validating Migration ==="

# Check all pods are running
NOT_RUNNING=$(kubectl get pods -A --field-selector status.phase!=Running,status.phase!=Succeeded | tail -n +2 | wc -l)
echo "Pods not running: $NOT_RUNNING"

# Verify services have endpoints
NO_ENDPOINTS=$(kubectl get endpoints -A -o json | jq '[.items[] | select(.subsets | length == 0)] | length')
echo "Services without endpoints: $NO_ENDPOINTS"

# Check PVC binding
UNBOUND_PVCS=$(kubectl get pvc -A --field-selector status.phase!=Bound | tail -n +2 | wc -l)
echo "Unbound PVCs: $UNBOUND_PVCS"

# Test application endpoints
echo "Testing application endpoints..."
for INGRESS in $(kubectl get ingress -A -o jsonpath='{range .items[*]}{.status.loadBalancer.ingress[0].hostname}{"\n"}{end}'); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$INGRESS/health)
  echo "  $INGRESS: HTTP $HTTP_CODE"
done

# Check CloudWatch logs integration
echo "Verifying CloudWatch logs..."
kubectl logs -n kube-system deployment/aws-load-balancer-controller

echo "Validation complete"
```

Comprehensive validation ensures migration success.

## Cleaning Up On-Premises Resources

Decommission the old cluster after successful migration.

```bash
#!/bin/bash
# Cleanup script

SOAK_PERIOD_DAYS=7

echo "EKS cluster has been running for $SOAK_PERIOD_DAYS days"
read -p "Proceed with on-premises cluster decommission? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Decommission cancelled"
  exit 0
fi

# Final backup of on-prem cluster
export KUBECONFIG=~/.kube/config-onprem
velero backup create final-onprem-backup --wait

# Scale down workloads
kubectl scale deployment --all --replicas=0 -n production
kubectl scale deployment --all --replicas=0 -n staging

# Archive cluster state
kubectl get all -A -o yaml > onprem-cluster-final-state.yaml

# Delete namespaces
kubectl delete namespace production staging monitoring

echo "On-premises cluster cleaned up"
echo "Final backup: final-onprem-backup"
echo "Cluster state archived: onprem-cluster-final-state.yaml"
```

Keep backups for recovery if needed.

## Conclusion

Migrating on-premises Kubernetes to EKS using Cluster API provides declarative infrastructure provisioning. Install Cluster API with the AWS provider to manage EKS clusters as Kubernetes resources. Define the target EKS cluster specification including control plane version, node groups, and networking. Provision the EKS cluster and wait for it to become ready. Install required EKS add-ons like AWS Load Balancer Controller, EBS CSI Driver, and Cluster Autoscaler. Use Velero to backup workloads from on-premises and restore to EKS with resource transformations for AWS-specific features. Update applications to integrate with AWS-managed services like RDS and use IAM Roles for Service Accounts for credentials. Validate migration success by checking pod status, service endpoints, and application functionality. Keep the on-premises cluster running during a soak period before decommissioning. This approach provides a safe, repeatable migration path to managed Kubernetes with AWS integrations.
