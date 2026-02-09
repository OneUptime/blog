# How to Migrate from Docker Registry v2 to Harbor Container Registry on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Docker Registry, Kubernetes, Container Registry, Migration

Description: Step-by-step guide to migrate from Docker Registry v2 to Harbor on Kubernetes, including image replication, metadata preservation, and implementing advanced features like vulnerability scanning and access control.

---

Docker Registry v2 provides basic image storage functionality, but modern container workflows demand more. Harbor offers enterprise-grade features including role-based access control, vulnerability scanning, image signing, replication policies, and a comprehensive management UI. This guide walks through migrating your Docker Registry v2 deployment to Harbor on Kubernetes while preserving all your images and maintaining service availability.

## Why Migrate to Harbor

Docker Registry v2 excels at storing and distributing images, but it lacks critical production features. Harbor extends the registry with security scanning using Trivy or Clair, policy-based image replication across registries, webhook notifications for CI/CD integration, Helm chart repository capabilities, and granular access control with project-based isolation.

For organizations running Kubernetes, Harbor provides native integration and supports multi-tenancy, making it ideal for teams sharing a cluster.

## Planning the Migration

Before starting, inventory your current registry:

```bash
# List all repositories in Docker Registry v2
curl -X GET https://registry.example.com/v2/_catalog | jq .

# For each repository, list tags
REPOS=$(curl -s https://registry.example.com/v2/_catalog | jq -r '.repositories[]')

for repo in $REPOS; do
  echo "Repository: $repo"
  curl -X GET https://registry.example.com/v2/$repo/tags/list | jq .
done

# Calculate total storage
kubectl exec -n registry registry-pod-name -- du -sh /var/lib/registry
```

Document authentication requirements, client applications, and CI/CD pipelines that push to or pull from the registry.

## Deploying Harbor on Kubernetes

Use the official Harbor Helm chart for deployment:

```bash
# Add Harbor Helm repository
helm repo add harbor https://helm.goharbor.io
helm repo update

# Create namespace
kubectl create namespace harbor

# Create values file
cat > harbor-values.yaml <<EOF
expose:
  type: ingress
  tls:
    enabled: true
    certSource: secret
    secret:
      secretName: harbor-tls
  ingress:
    hosts:
      core: harbor.example.com
    className: nginx
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"

externalURL: https://harbor.example.com

persistence:
  enabled: true
  resourcePolicy: "keep"
  persistentVolumeClaim:
    registry:
      storageClass: "fast-ssd"
      size: 500Gi
    database:
      storageClass: "fast-ssd"
      size: 10Gi
    redis:
      storageClass: "fast-ssd"
      size: 1Gi

harborAdminPassword: "ChangeThisPassword123!"

database:
  type: internal

redis:
  type: internal

trivy:
  enabled: true

notary:
  enabled: true
EOF

# Install Harbor
helm install harbor harbor/harbor \
  -n harbor \
  -f harbor-values.yaml

# Wait for all components to be ready
kubectl wait --for=condition=available --timeout=600s \
  deployment --all -n harbor
```

Verify the installation:

```bash
# Check all pods are running
kubectl get pods -n harbor

# Get Harbor admin password
kubectl get secret harbor-core -n harbor -o jsonpath='{.data.HARBOR_ADMIN_PASSWORD}' | base64 -d

# Access Harbor UI
echo "Harbor URL: https://harbor.example.com"
```

## Setting Up Harbor Projects and Users

Create projects in Harbor to organize your images:

```bash
# Install Harbor CLI (harbor-cli or use Harbor API)
# Or use curl with Harbor API

# Login to Harbor
HARBOR_URL="https://harbor.example.com"
HARBOR_USER="admin"
HARBOR_PASSWORD="ChangeThisPassword123!"

# Create projects
for project in myapp frontend backend ml-models; do
  curl -X POST "${HARBOR_URL}/api/v2.0/projects" \
    -H "Content-Type: application/json" \
    -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
    -d "{
      \"project_name\": \"${project}\",
      \"public\": false,
      \"storage_limit\": -1
    }"

  echo "Created project: $project"
done

# List projects
curl -X GET "${HARBOR_URL}/api/v2.0/projects" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" | jq .
```

Create robot accounts for CI/CD:

```bash
# Create robot account with push/pull permissions
curl -X POST "${HARBOR_URL}/api/v2.0/robots" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "name": "cicd-bot",
    "description": "CI/CD robot account",
    "duration": -1,
    "level": "system",
    "permissions": [
      {
        "kind": "project",
        "namespace": "*",
        "access": [
          {"resource": "repository", "action": "push"},
          {"resource": "repository", "action": "pull"},
          {"resource": "artifact", "action": "read"},
          {"resource": "artifact", "action": "list"}
        ]
      }
    ]
  }' | jq .
```

## Migrating Images with Skopeo

Skopeo is the best tool for copying images between registries while preserving metadata:

```bash
# Install Skopeo
# Ubuntu/Debian
apt-get install -y skopeo

# RHEL/CentOS
yum install -y skopeo

# macOS
brew install skopeo
```

Create a migration script:

```bash
#!/bin/bash
# migrate-images.sh

OLD_REGISTRY="registry.example.com"
NEW_REGISTRY="harbor.example.com"
HARBOR_PROJECT="myapp"

OLD_REGISTRY_USER="admin"
OLD_REGISTRY_PASSWORD="oldpassword"
HARBOR_USER="admin"
HARBOR_PASSWORD="ChangeThisPassword123!"

# Get list of all repositories
REPOS=$(curl -s -u ${OLD_REGISTRY_USER}:${OLD_REGISTRY_PASSWORD} \
  https://${OLD_REGISTRY}/v2/_catalog | jq -r '.repositories[]')

for repo in $REPOS; do
  echo "Processing repository: $repo"

  # Get all tags for this repository
  TAGS=$(curl -s -u ${OLD_REGISTRY_USER}:${OLD_REGISTRY_PASSWORD} \
    https://${OLD_REGISTRY}/v2/${repo}/tags/list | jq -r '.tags[]')

  for tag in $TAGS; do
    echo "  Copying ${repo}:${tag}"

    # Copy image with all layers and metadata
    skopeo copy \
      --src-creds ${OLD_REGISTRY_USER}:${OLD_REGISTRY_PASSWORD} \
      --dest-creds ${HARBOR_USER}:${HARBOR_PASSWORD} \
      docker://${OLD_REGISTRY}/${repo}:${tag} \
      docker://${NEW_REGISTRY}/${HARBOR_PROJECT}/${repo}:${tag}

    if [ $? -eq 0 ]; then
      echo "  ✓ Successfully copied ${repo}:${tag}"
    else
      echo "  ✗ Failed to copy ${repo}:${tag}" | tee -a migration-errors.log
    fi
  done
done

echo "Migration complete. Check migration-errors.log for any failures."
```

Make it executable and run:

```bash
chmod +x migrate-images.sh
./migrate-images.sh
```

For large registries, parallelize the migration:

```bash
#!/bin/bash
# migrate-images-parallel.sh

export OLD_REGISTRY="registry.example.com"
export NEW_REGISTRY="harbor.example.com"
export HARBOR_PROJECT="myapp"
export HARBOR_USER="admin"
export HARBOR_PASSWORD="ChangeThisPassword123!"

# Function to copy a single image
copy_image() {
  local repo=$1
  local tag=$2

  skopeo copy \
    --src-creds ${OLD_REGISTRY_USER}:${OLD_REGISTRY_PASSWORD} \
    --dest-creds ${HARBOR_USER}:${HARBOR_PASSWORD} \
    docker://${OLD_REGISTRY}/${repo}:${tag} \
    docker://${NEW_REGISTRY}/${HARBOR_PROJECT}/${repo}:${tag} \
    2>&1 | tee -a "migration-${repo//\//-}-${tag}.log"
}

export -f copy_image

# Get all image:tag combinations
curl -s https://${OLD_REGISTRY}/v2/_catalog | jq -r '.repositories[]' | while read repo; do
  curl -s https://${OLD_REGISTRY}/v2/${repo}/tags/list | jq -r '.tags[]' | while read tag; do
    echo "${repo}:${tag}"
  done
done > images-to-migrate.txt

# Use GNU parallel to copy images concurrently
cat images-to-migrate.txt | parallel -j 10 --colsep ':' copy_image {1} {2}
```

## Setting Up Replication for Continuous Sync

During the migration period, keep both registries in sync using Harbor's replication feature:

```bash
# Create replication endpoint for old registry
curl -X POST "${HARBOR_URL}/api/v2.0/registries" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d "{
    \"name\": \"old-docker-registry\",
    \"type\": \"docker-registry\",
    \"url\": \"https://${OLD_REGISTRY}\",
    \"credential\": {
      \"access_key\": \"${OLD_REGISTRY_USER}\",
      \"access_secret\": \"${OLD_REGISTRY_PASSWORD}\",
      \"type\": \"basic\"
    },
    \"insecure\": false
  }"

# Create pull-based replication policy
curl -X POST "${HARBOR_URL}/api/v2.0/replication/policies" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "name": "sync-from-old-registry",
    "description": "Continuous sync during migration",
    "src_registry": {
      "id": 1
    },
    "dest_namespace": "myapp",
    "trigger": {
      "type": "scheduled",
      "trigger_settings": {
        "cron": "0 */2 * * *"
      }
    },
    "filters": [
      {
        "type": "name",
        "value": "**"
      }
    ],
    "deletion": false,
    "override": false,
    "enabled": true
  }'
```

## Updating Kubernetes Image Pull Secrets

Update your cluster to use Harbor credentials:

```bash
# Create Harbor pull secret
kubectl create secret docker-registry harbor-registry \
  --docker-server=harbor.example.com \
  --docker-username=robot$cicd-bot \
  --docker-password=<robot-token> \
  --docker-email=devops@example.com \
  -n production

# Patch service accounts to use new secret
kubectl patch serviceaccount default -n production \
  -p '{"imagePullSecrets": [{"name": "harbor-registry"}]}'
```

Update deployments to pull from Harbor:

```bash
# Update all deployments to use new registry
kubectl get deployments --all-namespaces -o json | \
  jq '.items[] |
    select(.spec.template.spec.containers[].image | contains("registry.example.com")) |
    {namespace: .metadata.namespace, name: .metadata.name}' | \
  jq -r '[.namespace, .name] | @tsv' | \
  while IFS=$'\t' read -r namespace name; do
    kubectl set image deployment/$name -n $namespace \
      --all=harbor.example.com/myapp/$(kubectl get deployment $name -n $namespace -o jsonpath='{.spec.template.spec.containers[0].image}' | sed 's|registry.example.com/||')
  done
```

## Configuring Vulnerability Scanning

Enable automatic scanning in Harbor:

```bash
# Configure automatic scan on push
curl -X PUT "${HARBOR_URL}/api/v2.0/projects/${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "metadata": {
      "auto_scan": "true",
      "prevent_vul": "true",
      "severity": "critical"
    }
  }'

# Scan all existing images
curl -X POST "${HARBOR_URL}/api/v2.0/system/scanAll/schedule" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "schedule": {
      "type": "Daily",
      "cron": "0 0 * * *"
    }
  }'
```

Query scan results via API:

```bash
# Get vulnerability report for an artifact
PROJECT="myapp"
REPO="backend"
TAG="v1.2.3"

curl -X GET "${HARBOR_URL}/api/v2.0/projects/${PROJECT}/repositories/${REPO}/artifacts/${TAG}/additions/vulnerabilities" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" | jq .
```

## Implementing Access Control Policies

Configure content trust and immutability:

```bash
# Enable content trust (Notary)
curl -X PUT "${HARBOR_URL}/api/v2.0/projects/${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "metadata": {
      "enable_content_trust": "true",
      "auto_scan": "true"
    }
  }'

# Create tag immutability rule
curl -X POST "${HARBOR_URL}/api/v2.0/projects/${PROJECT_NAME}/immutabletagrules" \
  -H "Content-Type: application/json" \
  -u "${HARBOR_USER}:${HARBOR_PASSWORD}" \
  -d '{
    "tag_selectors": [
      {
        "kind": "doublestar",
        "pattern": "v*"
      }
    ],
    "scope_selectors": {
      "repository": [
        {
          "kind": "doublestar",
          "pattern": "**"
        }
      ]
    }
  }'
```

## Updating CI/CD Pipelines

Update GitLab CI to use Harbor:

```yaml
# .gitlab-ci.yml
variables:
  HARBOR_REGISTRY: harbor.example.com
  HARBOR_PROJECT: myapp
  IMAGE_NAME: ${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${CI_PROJECT_NAME}

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $HARBOR_USER -p $HARBOR_PASSWORD $HARBOR_REGISTRY
  script:
    - docker build -t ${IMAGE_NAME}:${CI_COMMIT_SHA} .
    - docker push ${IMAGE_NAME}:${CI_COMMIT_SHA}
    - docker tag ${IMAGE_NAME}:${CI_COMMIT_SHA} ${IMAGE_NAME}:latest
    - docker push ${IMAGE_NAME}:latest
```

Update GitHub Actions:

```yaml
# .github/workflows/build.yaml
name: Build and Push to Harbor

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Login to Harbor
      uses: docker/login-action@v2
      with:
        registry: harbor.example.com
        username: ${{ secrets.HARBOR_USERNAME }}
        password: ${{ secrets.HARBOR_PASSWORD }}

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          harbor.example.com/myapp/${{ github.repository }}:${{ github.sha }}
          harbor.example.com/myapp/${{ github.repository }}:latest
```

## Validation and Testing

Verify all images migrated successfully:

```bash
# Compare image counts
OLD_COUNT=$(curl -s https://${OLD_REGISTRY}/v2/_catalog | jq '.repositories | length')
NEW_COUNT=$(curl -s -u ${HARBOR_USER}:${HARBOR_PASSWORD} \
  ${HARBOR_URL}/api/v2.0/projects/${HARBOR_PROJECT}/repositories | jq 'length')

echo "Old registry: $OLD_COUNT repositories"
echo "New registry: $NEW_COUNT repositories"

# Test image pull
docker pull harbor.example.com/myapp/backend:latest
docker run --rm harbor.example.com/myapp/backend:latest /app/healthcheck

# Verify vulnerability scanning works
# Check Harbor UI or use API to confirm scans completed
```

## Decommissioning Old Registry

After running both registries in parallel for a safe period (2-4 weeks):

```bash
# Stop accepting pushes to old registry (make read-only)
kubectl scale deployment registry --replicas=0 -n registry

# Archive registry data
kubectl exec -n registry registry-pod-name -- tar czf /backup/registry-archive.tar.gz /var/lib/registry

# Copy archive to long-term storage
kubectl cp registry/registry-pod-name:/backup/registry-archive.tar.gz ./registry-archive.tar.gz
aws s3 cp registry-archive.tar.gz s3://backups/registry/

# Delete old registry
helm uninstall docker-registry -n registry
kubectl delete pvc registry-data -n registry
kubectl delete namespace registry
```

## Conclusion

Migrating from Docker Registry v2 to Harbor on Kubernetes brings significant operational improvements including built-in vulnerability scanning, RBAC, and policy-based management. Using Skopeo for image migration preserves all metadata, while Harbor's replication features keep registries synchronized during the transition. The investment in migration pays off through improved security posture and simplified registry operations.
