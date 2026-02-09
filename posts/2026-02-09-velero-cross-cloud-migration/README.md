# How to Migrate Kubernetes Clusters Between Cloud Providers Using Velero Cross-Cloud Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Migration

Description: Learn how to migrate Kubernetes workloads between different cloud providers using Velero for cross-cloud backup and restore with minimal downtime.

---

Moving Kubernetes workloads between cloud providers is challenging when using provider-specific resources like load balancers, storage classes, and managed services. Velero provides cloud-agnostic backup and restore capabilities that simplify cross-cloud migration. This guide shows you how to migrate clusters between providers while handling provider-specific differences.

## Installing Velero on Source Cluster

Set up Velero with appropriate storage backend accessible from both clouds.

```bash
#!/bin/bash
# Install Velero on source cluster (AWS example)

SOURCE_CLOUD="aws"
VELERO_VERSION="v1.12.0"
BUCKET_NAME="k8s-migration-backup"
REGION="us-east-1"

# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/${VELERO_VERSION}/velero-${VELERO_VERSION}-linux-amd64.tar.gz
tar -xvf velero-${VELERO_VERSION}-linux-amd64.tar.gz
sudo mv velero-${VELERO_VERSION}-linux-amd64/velero /usr/local/bin/

# Create S3 bucket for backups (accessible from both clouds)
aws s3 mb s3://${BUCKET_NAME} --region ${REGION}

# Create IAM user for Velero
cat > velero-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeVolumes",
                "ec2:DescribeSnapshots",
                "ec2:CreateTags",
                "ec2:CreateVolume",
                "ec2:CreateSnapshot",
                "ec2:DeleteSnapshot"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObject",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::${BUCKET_NAME}"
        }
    ]
}
EOF

aws iam create-policy --policy-name VeleroPolicy --policy-document file://velero-policy.json
aws iam create-user --user-name velero
aws iam attach-user-policy --user-name velero --policy-arn arn:aws:iam::ACCOUNT_ID:policy/VeleroPolicy
aws iam create-access-key --user-name velero > velero-credentials.json

# Create credentials file
cat > credentials-velero <<EOF
[default]
aws_access_key_id=$(jq -r .AccessKey.AccessKeyId velero-credentials.json)
aws_secret_access_key=$(jq -r .AccessKey.SecretAccessKey velero-credentials.json)
EOF

# Install Velero in source cluster
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket ${BUCKET_NAME} \
    --backup-location-config region=${REGION} \
    --snapshot-location-config region=${REGION} \
    --secret-file ./credentials-velero

kubectl wait --for=condition=available --timeout=300s deployment/velero -n velero

echo "Velero installed on source cluster"
```

This setup uses S3 as a cloud-agnostic storage backend accessible from any provider.

## Creating Comprehensive Backup

Back up all cluster resources including persistent volumes.

```bash
#!/bin/bash
# Create full cluster backup

BACKUP_NAME="full-cluster-$(date +%Y%m%d-%H%M%S)"

# Create backup with volume snapshots
velero backup create ${BACKUP_NAME} \
    --include-namespaces "*" \
    --exclude-namespaces velero,kube-system \
    --snapshot-volumes=true \
    --default-volumes-to-fs-backup=false \
    --wait

# Wait for backup to complete
velero backup describe ${BACKUP_NAME}

# Verify backup
velero backup logs ${BACKUP_NAME}

# Check backup status
STATUS=$(velero backup get ${BACKUP_NAME} -o json | jq -r '.status.phase')
if [ "$STATUS" != "Completed" ]; then
    echo "ERROR: Backup failed with status: $STATUS"
    exit 1
fi

echo "Backup ${BACKUP_NAME} completed successfully"
echo "Backup location: s3://${BUCKET_NAME}/${BACKUP_NAME}"
```

This creates a complete backup of all application workloads and data.

## Handling Provider-Specific Resources

Transform cloud-specific resources during migration.

```yaml
# ConfigMap mapping for resource transformation
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-mappings
  namespace: velero
data:
  storage-class-mappings.yaml: |
    # AWS to GCP storage class mappings
    gp2: pd-standard
    gp3: pd-balanced
    io1: pd-ssd
    st1: pd-standard
    sc1: pd-standard

  load-balancer-mappings.yaml: |
    # Service type transformations
    aws-nlb: gcp-ilb
    aws-alb: gcp-l7

  ingress-class-mappings.yaml: |
    # Ingress controller mappings
    alb: gce
    nginx-aws: nginx-gcp
---
# Velero restore configuration with mappings
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: cross-cloud-restore
  namespace: velero
spec:
  backupName: full-cluster-20260209-103000
  includedNamespaces:
  - "*"
  excludedNamespaces:
  - velero
  - kube-system
  restorePVs: true

  # Transform storage classes
  storageClassMappings:
    gp2: pd-standard
    gp3: pd-balanced
    io1: pd-ssd

  # Label transformations
  labelSelector:
    matchExpressions:
    - key: environment
      operator: In
      values: [production]
```

These mappings translate provider-specific configurations automatically.

## Installing Velero on Target Cluster

Set up Velero on the destination cluster with access to the same backup storage.

```bash
#!/bin/bash
# Install Velero on target cluster (GCP example)

TARGET_CLOUD="gcp"
PROJECT_ID="my-gcp-project"
BUCKET_NAME="k8s-migration-backup"

# Switch to target cluster context
kubectl config use-context gke-target-cluster

# Create GCP service account for Velero
gcloud iam service-accounts create velero \
    --display-name "Velero service account"

# Grant permissions
SERVICE_ACCOUNT_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:Velero service account" \
    --format='value(email)')

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member serviceAccount:${SERVICE_ACCOUNT_EMAIL} \
    --role roles/compute.storageAdmin

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member serviceAccount:${SERVICE_ACCOUNT_EMAIL} \
    --role roles/storage.admin

# Create service account key
gcloud iam service-accounts keys create credentials-velero \
    --iam-account ${SERVICE_ACCOUNT_EMAIL}

# Enable GCS access to S3 bucket (for cross-cloud access)
# Configure Cloud Storage interoperability
gsutil hmac create ${SERVICE_ACCOUNT_EMAIL}

# Install Velero on target cluster using S3-compatible backend
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0,velero/velero-plugin-for-gcp:v1.8.0 \
    --bucket ${BUCKET_NAME} \
    --backup-location-config region=us-east-1,s3ForcePathStyle="true",s3Url=https://storage.googleapis.com \
    --secret-file ./credentials-velero \
    --use-volume-snapshots=false \
    --use-node-agent

kubectl wait --for=condition=available --timeout=300s deployment/velero -n velero

echo "Velero installed on target cluster"
```

The target cluster accesses the same backup storage created by the source cluster.

## Performing Cross-Cloud Restore

Restore workloads to the target cluster with transformation.

```bash
#!/bin/bash
# Restore to target cluster

BACKUP_NAME="full-cluster-20260209-103000"
RESTORE_NAME="cross-cloud-restore-$(date +%Y%m%d-%H%M%S)"

# Verify backup is accessible
velero backup get ${BACKUP_NAME}

# Create restore with transformations
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: ${RESTORE_NAME}
  namespace: velero
spec:
  backupName: ${BACKUP_NAME}
  includedNamespaces:
  - production
  - staging
  excludedNamespaces:
  - velero
  - kube-system

  restorePVs: true

  # Storage class mappings (AWS -> GCP)
  storageClassMappings:
    gp2: pd-standard
    gp3: pd-balanced
    io1: pd-ssd

  # Namespace mappings (optional)
  namespaceMapping:
    production: production-gcp
    staging: staging-gcp

  # Restore only specific resources
  includedResources:
  - deployments
  - services
  - configmaps
  - secrets
  - persistentvolumeclaims
  - persistentvolumes

  # Hook configuration for post-restore actions
  hooks:
    resources:
    - name: update-endpoints
      includedNamespaces:
      - production-gcp
      postHooks:
      - exec:
          container: app
          command:
          - /bin/sh
          - -c
          - "echo 'Restore complete, updating configuration'"
EOF

# Monitor restore progress
velero restore describe ${RESTORE_NAME} --details

# Wait for restore to complete
while true; do
  STATUS=$(velero restore get ${RESTORE_NAME} -o json | jq -r '.status.phase')
  echo "Restore status: $STATUS"

  if [ "$STATUS" == "Completed" ]; then
    echo "Restore completed successfully"
    break
  elif [ "$STATUS" == "Failed" ] || [ "$STATUS" == "PartiallyFailed" ]; then
    echo "Restore failed or partially failed"
    velero restore logs ${RESTORE_NAME}
    exit 1
  fi

  sleep 10
done

# Verify restored resources
kubectl get all -n production-gcp
```

This restores workloads with automatic transformation of cloud-specific resources.

## Handling Load Balancer Migration

Manually update services that use cloud-specific load balancers.

```bash
#!/bin/bash
# Update load balancer services for target cloud

NAMESPACE="production-gcp"

# Get all LoadBalancer services
kubectl get svc -n ${NAMESPACE} --field-selector spec.type=LoadBalancer -o json > services.json

# Update annotations for target cloud
jq '.items[] | .metadata.name' services.json | while read -r SERVICE; do
  SERVICE=$(echo $SERVICE | tr -d '"')

  echo "Updating service: $SERVICE"

  # Remove AWS-specific annotations
  kubectl annotate svc ${SERVICE} -n ${NAMESPACE} \
    service.beta.kubernetes.io/aws-load-balancer-type- \
    service.beta.kubernetes.io/aws-load-balancer-internal- \
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled-

  # Add GCP-specific annotations
  kubectl annotate svc ${SERVICE} -n ${NAMESPACE} \
    cloud.google.com/neg='{"ingress": true}' \
    cloud.google.com/backend-config='{"default": "backend-config"}'

  # Force service recreation to get new load balancer
  kubectl patch svc ${SERVICE} -n ${NAMESPACE} -p '{"spec":{"type":"ClusterIP"}}'
  sleep 5
  kubectl patch svc ${SERVICE} -n ${NAMESPACE} -p '{"spec":{"type":"LoadBalancer"}}'

  echo "Service ${SERVICE} updated for GCP"
done
```

This updates service configurations for the target cloud provider.

## Validating Migration Completeness

Verify all resources migrated successfully.

```bash
#!/bin/bash
# Validation script for cross-cloud migration

SOURCE_CONTEXT="eks-source-cluster"
TARGET_CONTEXT="gke-target-cluster"
NAMESPACE="production"

echo "Comparing resource counts between clusters..."

# Compare deployments
SOURCE_DEPLOYS=$(kubectl --context=${SOURCE_CONTEXT} get deployments -n ${NAMESPACE} --no-headers | wc -l)
TARGET_DEPLOYS=$(kubectl --context=${TARGET_CONTEXT} get deployments -n ${NAMESPACE}-gcp --no-headers | wc -l)

echo "Deployments - Source: $SOURCE_DEPLOYS, Target: $TARGET_DEPLOYS"

# Compare services
SOURCE_SVCS=$(kubectl --context=${SOURCE_CONTEXT} get services -n ${NAMESPACE} --no-headers | wc -l)
TARGET_SVCS=$(kubectl --context=${TARGET_CONTEXT} get services -n ${NAMESPACE}-gcp --no-headers | wc -l)

echo "Services - Source: $SOURCE_SVCS, Target: $TARGET_SVCS"

# Compare PVCs
SOURCE_PVCS=$(kubectl --context=${SOURCE_CONTEXT} get pvc -n ${NAMESPACE} --no-headers | wc -l)
TARGET_PVCS=$(kubectl --context=${TARGET_CONTEXT} get pvc -n ${NAMESPACE}-gcp --no-headers | wc -l)

echo "PVCs - Source: $SOURCE_PVCS, Target: $TARGET_PVCS"

# Check all pods are running
NOT_RUNNING=$(kubectl --context=${TARGET_CONTEXT} get pods -n ${NAMESPACE}-gcp --no-headers | grep -v "Running\|Completed" | wc -l)

if [ $NOT_RUNNING -gt 0 ]; then
  echo "WARNING: $NOT_RUNNING pods not in Running state"
  kubectl --context=${TARGET_CONTEXT} get pods -n ${NAMESPACE}-gcp | grep -v "Running\|Completed"
else
  echo "All pods running successfully"
fi

# Test application endpoints
echo "Testing application endpoints..."
EXTERNAL_IP=$(kubectl --context=${TARGET_CONTEXT} get svc -n ${NAMESPACE}-gcp -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')

if [ -n "$EXTERNAL_IP" ]; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://${EXTERNAL_IP}/health)
  if [ "$HTTP_CODE" == "200" ]; then
    echo "Application health check passed"
  else
    echo "WARNING: Application health check failed (HTTP $HTTP_CODE)"
  fi
fi

echo "Migration validation complete"
```

This validates that all expected resources exist and are functioning in the target cluster.

## Implementing DNS Cutover

Switch DNS to the new cluster after validation.

```bash
#!/bin/bash
# DNS cutover for migration

OLD_LB_IP="52.1.2.3"  # AWS ELB IP
NEW_LB_IP="35.4.5.6"  # GCP GLB IP
DOMAIN="api.example.com"
ZONE_ID="Z123456789ABC"

echo "Performing DNS cutover from $OLD_LB_IP to $NEW_LB_IP"

# Update Route53 record (works from any cloud)
aws route53 change-resource-record-sets --hosted-zone-id ${ZONE_ID} --change-batch "{
  \"Changes\": [{
    \"Action\": \"UPSERT\",
    \"ResourceRecordSet\": {
      \"Name\": \"${DOMAIN}\",
      \"Type\": \"A\",
      \"TTL\": 60,
      \"ResourceRecords\": [{\"Value\": \"${NEW_LB_IP}\"}]
    }
  }]
}"

echo "DNS updated. Monitoring traffic shift..."

# Monitor traffic on both clusters
for i in {1..20}; do
  echo "Minute $i:"
  echo "  Old cluster requests: $(kubectl --context=eks-source-cluster top pods -n production --containers | awk '{sum+=$3} END {print sum}')"
  echo "  New cluster requests: $(kubectl --context=gke-target-cluster top pods -n production-gcp --containers | awk '{sum+=$3} END {print sum}')"
  sleep 60
done

echo "DNS cutover complete"
```

Use short TTLs during cutover for quick rollback if needed.

## Decommissioning Source Cluster

Safely shut down the old cluster after successful migration.

```bash
#!/bin/bash
# Decommission source cluster

SOURCE_CONTEXT="eks-source-cluster"
SOAK_PERIOD_HOURS=72

echo "Beginning source cluster decommissioning process"
echo "Soak period: $SOAK_PERIOD_HOURS hours"

# Create final backup before decommissioning
velero backup create final-backup-before-decommission \
    --include-namespaces "*" \
    --wait

# Wait for soak period
echo "Waiting for soak period to ensure stability..."
sleep $(($SOAK_PERIOD_HOURS * 3600))

# Verify target cluster is stable
TARGET_ERROR_RATE=$(kubectl --context=gke-target-cluster top pods -n production-gcp --containers | grep Restart | awk '{sum+=$4} END {print sum}')

if [ $TARGET_ERROR_RATE -gt 10 ]; then
  echo "ERROR: Target cluster showing high restart rate. Aborting decommission."
  exit 1
fi

# Scale down source cluster
echo "Scaling down source cluster workloads..."
kubectl --context=${SOURCE_CONTEXT} scale deployment --all --replicas=0 -n production

# Wait and monitor for any issues
sleep 3600

# Delete source cluster resources
kubectl --context=${SOURCE_CONTEXT} delete namespace production --wait=true

echo "Source cluster decommissioned successfully"
echo "Final backup available: final-backup-before-decommission"
```

Keep the source cluster available for a soak period before full decommissioning.

## Conclusion

Velero enables cross-cloud Kubernetes migration through cloud-agnostic backup and restore. Install Velero on the source cluster with a storage backend accessible from all clouds, typically S3 or cloud-agnostic object storage. Create comprehensive backups including persistent volumes and all application resources. Install Velero on the target cluster with access to the same backup storage. Use storage class mappings and namespace transformations to adapt resources for the target cloud. Manually update cloud-specific resources like load balancer annotations and ingress classes. Validate the migration by comparing resource counts and testing application functionality. Perform DNS cutover with short TTLs for quick rollback capability. Keep the source cluster available during a soak period before decommissioning. This approach minimizes downtime and provides rollback safety during cloud provider migration.
