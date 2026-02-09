# How to Set Up Blue-Green Kubernetes Cluster Upgrades for Control Plane Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Blue-Green, Upgrades

Description: Learn how to implement blue-green cluster upgrade strategies for Kubernetes control plane changes with zero downtime and instant rollback capabilities.

---

Upgrading Kubernetes control plane components carries risk of API compatibility issues, etcd problems, and unexpected behavior. Traditional in-place upgrades can leave you in a broken state with difficult recovery. Blue-green cluster upgrades provide a safer alternative by running parallel clusters and switching traffic atomically. This guide shows you how to implement this strategy effectively.

## Understanding Blue-Green Cluster Architecture

Blue-green cluster upgrades maintain two complete Kubernetes clusters: one serving production traffic (blue) and one with the new version (green). You validate the green cluster thoroughly before switching traffic.

```yaml
# Infrastructure definition for blue cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-blue-config
data:
  cluster_name: "production-blue"
  version: "1.28.5"
  control_plane_endpoint: "https://api-blue.k8s.example.com"
  node_pools: |
    - name: system
      size: 3
      instance_type: t3.large
    - name: application
      size: 10
      instance_type: t3.xlarge
---
# Infrastructure definition for green cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-green-config
data:
  cluster_name: "production-green"
  version: "1.29.2"  # New version being tested
  control_plane_endpoint: "https://api-green.k8s.example.com"
  node_pools: |
    - name: system
      size: 3
      instance_type: t3.large
    - name: application
      size: 10
      instance_type: t3.xlarge
```

Both clusters run simultaneously during the upgrade window, allowing thorough validation before committing to the switch.

## Provisioning the Green Cluster with Terraform

Use infrastructure as code to create identical clusters with different versions.

```hcl
# terraform/cluster-green.tf
module "green_cluster" {
  source = "./modules/kubernetes-cluster"

  cluster_name    = "production-green"
  cluster_version = "1.29.2"
  region          = var.region

  control_plane_subnet_ids = var.control_plane_subnets
  worker_subnet_ids        = var.worker_subnets

  # Reuse existing VPC and networking
  vpc_id              = data.terraform_remote_state.network.outputs.vpc_id
  cluster_security_group_id = data.terraform_remote_state.network.outputs.cluster_sg_id

  # Control plane configuration
  control_plane_instance_type = "t3.large"
  control_plane_count         = 3

  # Worker node pools matching blue cluster
  node_pools = {
    system = {
      instance_type = "t3.large"
      min_size      = 3
      max_size      = 6
      desired_size  = 3
      labels = {
        role = "system"
      }
      taints = [
        {
          key    = "node-role.kubernetes.io/system"
          value  = "true"
          effect = "NoSchedule"
        }
      ]
    }
    application = {
      instance_type = "t3.xlarge"
      min_size      = 10
      max_size      = 30
      desired_size  = 10
      labels = {
        role = "application"
      }
    }
  }

  # Add metadata for identification
  tags = {
    Environment = "production"
    Cluster     = "green"
    Purpose     = "upgrade-validation"
  }
}

# Create DNS record for green cluster API
resource "aws_route53_record" "green_api" {
  zone_id = var.route53_zone_id
  name    = "api-green.k8s.example.com"
  type    = "A"

  alias {
    name                   = module.green_cluster.api_endpoint
    zone_id                = module.green_cluster.api_hosted_zone_id
    evaluate_target_health = true
  }
}
```

This provisions a complete green cluster with the new Kubernetes version while the blue cluster continues serving traffic.

## Synchronizing Workloads to Green Cluster

Deploy applications to the green cluster using the same manifests and configurations.

```bash
#!/bin/bash
# Script to synchronize workloads from blue to green cluster

BLUE_CONTEXT="production-blue"
GREEN_CONTEXT="production-green"
NAMESPACES="default production staging"

# Function to deploy resources to green cluster
deploy_to_green() {
  local namespace=$1

  echo "Synchronizing namespace: $namespace"

  # Get all deployments from blue cluster
  kubectl --context=$BLUE_CONTEXT get deployments -n $namespace -o yaml > /tmp/deployments-$namespace.yaml

  # Remove cluster-specific fields
  kubectl --context=$GREEN_CONTEXT apply -f /tmp/deployments-$namespace.yaml

  # Sync services
  kubectl --context=$BLUE_CONTEXT get services -n $namespace -o yaml > /tmp/services-$namespace.yaml
  kubectl --context=$GREEN_CONTEXT apply -f /tmp/services-$namespace.yaml

  # Sync configmaps and secrets
  kubectl --context=$BLUE_CONTEXT get configmaps -n $namespace -o yaml > /tmp/configmaps-$namespace.yaml
  kubectl --context=$GREEN_CONTEXT apply -f /tmp/configmaps-$namespace.yaml

  # Wait for deployments to be ready
  kubectl --context=$GREEN_CONTEXT wait --for=condition=available --timeout=600s \
    deployment --all -n $namespace
}

# Deploy to all namespaces
for ns in $NAMESPACES; do
  deploy_to_green $ns
done

echo "Workload synchronization complete"
```

This ensures the green cluster runs identical workloads for accurate validation.

## Implementing Traffic Switching with External DNS

Use external load balancers and DNS to switch traffic between clusters atomically.

```yaml
# Configure external load balancer for blue-green switching
apiVersion: v1
kind: Service
metadata:
  name: production-ingress
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    external-dns.alpha.kubernetes.io/hostname: "api.example.com"
    external-dns.alpha.kubernetes.io/ttl: "60"  # Short TTL for quick switching
spec:
  type: LoadBalancer
  selector:
    app: ingress-nginx
  ports:
  - name: https
    port: 443
    targetPort: 443
---
# Blue cluster ingress configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: application-ingress-blue
  namespace: production
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: application-service
            port:
              number: 80
```

Switching traffic involves updating DNS or load balancer targets to point to the green cluster.

## Validating Green Cluster Readiness

Run comprehensive tests before switching production traffic to the green cluster.

```bash
#!/bin/bash
# Comprehensive green cluster validation script

GREEN_CONTEXT="production-green"
VALIDATION_PASSED=true

echo "Starting green cluster validation..."

# Test 1: Check all nodes are ready
echo "Validating node status..."
NOT_READY=$(kubectl --context=$GREEN_CONTEXT get nodes --no-headers | grep -v " Ready" | wc -l)
if [ $NOT_READY -gt 0 ]; then
  echo "FAIL: $NOT_READY nodes not ready"
  VALIDATION_PASSED=false
fi

# Test 2: Check all system pods are running
echo "Validating system pods..."
NOT_RUNNING=$(kubectl --context=$GREEN_CONTEXT get pods -n kube-system --no-headers | grep -v "Running\|Completed" | wc -l)
if [ $NOT_RUNNING -gt 0 ]; then
  echo "FAIL: $NOT_RUNNING system pods not running"
  VALIDATION_PASSED=false
fi

# Test 3: Verify API version compatibility
echo "Checking deprecated API usage..."
kubectl --context=$GREEN_CONTEXT api-resources --verbs=list -o name | \
  xargs -n 1 kubectl --context=$GREEN_CONTEXT get --show-kind --ignore-not-found -A -o yaml > /tmp/green-resources.yaml

# Check for deprecated APIs
if grep -q "apiVersion: extensions/v1beta1" /tmp/green-resources.yaml; then
  echo "FAIL: Deprecated extensions/v1beta1 APIs detected"
  VALIDATION_PASSED=false
fi

# Test 4: Run synthetic traffic tests
echo "Running synthetic traffic tests..."
kubectl --context=$GREEN_CONTEXT run test-pod --image=curlimages/curl:latest --rm -i --restart=Never -- \
  curl -s -o /dev/null -w "%{http_code}" http://application-service.production.svc.cluster.local/health

if [ $? -ne 0 ]; then
  echo "FAIL: Synthetic traffic test failed"
  VALIDATION_PASSED=false
fi

# Test 5: Validate persistent storage
echo "Checking persistent volume claims..."
NOT_BOUND=$(kubectl --context=$GREEN_CONTEXT get pvc -A --no-headers | grep -v "Bound" | wc -l)
if [ $NOT_BOUND -gt 0 ]; then
  echo "FAIL: $NOT_BOUND PVCs not bound"
  VALIDATION_PASSED=false
fi

# Test 6: Run smoke tests
echo "Executing smoke test suite..."
kubectl --context=$GREEN_CONTEXT apply -f smoke-tests.yaml
kubectl --context=$GREEN_CONTEXT wait --for=condition=complete --timeout=300s job/smoke-tests

if [ $? -ne 0 ]; then
  echo "FAIL: Smoke tests did not complete successfully"
  VALIDATION_PASSED=false
fi

# Final result
if [ "$VALIDATION_PASSED" = true ]; then
  echo "✓ Green cluster validation PASSED - ready for traffic switch"
  exit 0
else
  echo "✗ Green cluster validation FAILED - do not switch traffic"
  exit 1
fi
```

Only proceed with the traffic switch if all validation tests pass.

## Executing the Traffic Switch

Perform the blue-to-green traffic cutover with monitoring and quick rollback capability.

```bash
#!/bin/bash
# Script to switch traffic from blue to green cluster

BLUE_CONTEXT="production-blue"
GREEN_CONTEXT="production-green"
DOMAIN="api.example.com"

# Backup current state
echo "Backing up current configuration..."
kubectl --context=$BLUE_CONTEXT get ingress -A -o yaml > /tmp/blue-ingress-backup.yaml
aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID > /tmp/blue-dns-backup.json

# Start traffic switch
echo "Beginning traffic switch to green cluster..."

# Update DNS to point to green cluster load balancer
GREEN_LB=$(kubectl --context=$GREEN_CONTEXT get svc production-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch "{
  \"Changes\": [{
    \"Action\": \"UPSERT\",
    \"ResourceRecordSet\": {
      \"Name\": \"$DOMAIN\",
      \"Type\": \"CNAME\",
      \"TTL\": 60,
      \"ResourceRecords\": [{\"Value\": \"$GREEN_LB\"}]
    }
  }]
}"

echo "DNS updated to point to green cluster"
echo "Monitoring traffic migration..."

# Monitor green cluster for issues
for i in {1..10}; do
  sleep 30

  # Check error rates
  ERROR_RATE=$(kubectl --context=$GREEN_CONTEXT top pods -n production --containers | \
    awk '{print $4}' | grep -v RESTARTS | awk '{sum+=$1} END {print sum}')

  echo "Minute $i: Error count = $ERROR_RATE"

  if [ $ERROR_RATE -gt 10 ]; then
    echo "ERROR: High error rate detected on green cluster"
    echo "Initiating automatic rollback..."

    # Rollback DNS to blue cluster
    BLUE_LB=$(kubectl --context=$BLUE_CONTEXT get svc production-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch "{
      \"Changes\": [{
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"$DOMAIN\",
          \"Type\": \"CNAME\",
          \"TTL\": 60,
          \"ResourceRecords\": [{\"Value\": \"$BLUE_LB\"}]
        }
      }]
    }"

    echo "Traffic rolled back to blue cluster"
    exit 1
  fi
done

echo "✓ Traffic successfully migrated to green cluster"
echo "Green cluster is now serving production traffic"
```

This script switches traffic and automatically rolls back if issues are detected.

## Managing State and Persistent Data

Handle stateful workloads carefully during blue-green cluster upgrades.

```yaml
# Use external storage that both clusters can access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-database-storage
  namespace: production
spec:
  accessModes:
  - ReadWriteMany  # Both clusters can access
  storageClassName: efs-storage  # External storage service
  resources:
    requests:
      storage: 100Gi
---
# Configure database to use shared storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: production
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        env:
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: shared-database-storage
```

Use external storage services (EFS, Cloud Filestore) that both clusters can access for stateful workloads.

## Decommissioning the Blue Cluster

After the green cluster proves stable, safely decommission the blue cluster.

```bash
#!/bin/bash
# Script to safely decommission blue cluster

BLUE_CONTEXT="production-blue"
SOAK_PERIOD_HOURS=72  # Wait 72 hours before decommissioning

echo "Blue cluster decommissioning initiated"
echo "Soak period: $SOAK_PERIOD_HOURS hours"

# Archive blue cluster state for recovery
kubectl --context=$BLUE_CONTEXT get all -A -o yaml > /tmp/blue-cluster-full-backup.yaml
kubectl --context=$BLUE_CONTEXT get pv,pvc -A -o yaml > /tmp/blue-cluster-volumes.yaml

# Wait for soak period
echo "Waiting for soak period before decommissioning..."
sleep $(($SOAK_PERIOD_HOURS * 3600))

# Verify green cluster is still healthy
kubectl --context=production-green get nodes
if [ $? -ne 0 ]; then
  echo "ERROR: Green cluster unhealthy, aborting blue cluster decommission"
  exit 1
fi

# Scale down blue cluster workloads
echo "Scaling down blue cluster workloads..."
kubectl --context=$BLUE_CONTEXT scale deployment --all --replicas=0 -A

# Backup persistent volumes
echo "Creating final snapshots of persistent volumes..."
# Add cloud-provider-specific snapshot commands here

# Destroy blue cluster infrastructure
echo "Decommissioning blue cluster infrastructure..."
cd terraform/
terraform destroy -target=module.blue_cluster -auto-approve

echo "Blue cluster successfully decommissioned"
echo "Backup files stored in /tmp/"
```

Wait for a soak period (typically 48-72 hours) before decommissioning to ensure the green cluster is stable.

## Conclusion

Blue-green cluster upgrades provide the safest approach for Kubernetes control plane changes. Provision a complete green cluster with the new version while keeping the blue cluster running. Synchronize all workloads to the green cluster and run comprehensive validation tests. Switch traffic atomically using DNS or load balancers with short TTLs for quick rollback if needed. Monitor the green cluster intensively after the switch and keep the blue cluster available for immediate rollback. Use external storage for stateful workloads so both clusters can access shared data. After a successful soak period, decommission the blue cluster. This approach eliminates upgrade risk by allowing full validation before committing and instant rollback if issues occur.
