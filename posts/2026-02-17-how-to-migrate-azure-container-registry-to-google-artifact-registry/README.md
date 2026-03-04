# How to Migrate Azure Container Registry to Google Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Artifact Registry, Azure Container Registry, Docker, Containers, Cloud Migration

Description: A hands-on guide to migrating container images from Azure Container Registry to Google Artifact Registry, covering bulk image transfer, authentication setup, and CI/CD pipeline updates.

---

Container registry migration is one of the more mechanical parts of a cloud move - you are essentially copying Docker images from one registry to another. But doing it efficiently at scale, while updating all the references in your Kubernetes manifests, CI/CD pipelines, and deployment scripts, requires some planning.

Azure Container Registry (ACR) and Google Artifact Registry both store OCI container images and Helm charts. Artifact Registry also supports other artifact types like Maven, npm, and Python packages, making it a more general-purpose artifact storage solution.

## Service Comparison

| Feature | Azure Container Registry | Google Artifact Registry |
|---------|------------------------|------------------------|
| Image formats | Docker, OCI, Helm | Docker, OCI, Helm, plus Maven, npm, Python, Go, etc. |
| Geo-replication | Yes (Premium SKU) | Multi-region repositories |
| Vulnerability scanning | Microsoft Defender | Container Analysis |
| Image signing | Content Trust | Binary Authorization |
| Retention policies | Yes | Cleanup policies |
| Private endpoints | Yes | VPC Service Controls |
| Build service | ACR Tasks | Cloud Build |
| Pricing | Per day per storage | Per GB stored per month |

## Step 1: Inventory Your ACR Repositories

List all repositories and images in your Azure Container Registry.

```bash
# List all repositories in the registry
az acr repository list \
  --name myacr \
  --output table

# Get details for each repository
for repo in $(az acr repository list --name myacr -o tsv); do
  echo "Repository: $repo"
  az acr repository show-tags --name myacr --repository "$repo" --output table
  echo "---"
done

# Get total image count and size
az acr show-usage \
  --name myacr \
  --output table
```

## Step 2: Create the Artifact Registry Repository

Set up your Artifact Registry repository. Unlike ACR where one registry holds multiple repositories, Artifact Registry has an extra layer - you create a repository first, then push images to it.

```bash
# Create a Docker repository in Artifact Registry
gcloud artifacts repositories create docker-images \
  --repository-format=docker \
  --location=us-central1 \
  --description="Container images migrated from ACR"

# For multi-region availability, create in a multi-region location
gcloud artifacts repositories create docker-images \
  --repository-format=docker \
  --location=us \
  --description="Multi-region container image repository"

# If you also store Helm charts in ACR, create a separate Helm repository
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=us-central1 \
  --description="Helm charts"
```

## Step 3: Set Up Authentication

Configure Docker to authenticate with both registries.

```bash
# Authenticate Docker with Azure Container Registry
az acr login --name myacr

# Authenticate Docker with Google Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# For multi-region, configure the appropriate hostnames
gcloud auth configure-docker us-docker.pkg.dev,europe-docker.pkg.dev,asia-docker.pkg.dev
```

## Step 4: Migrate Images - Small Scale

For registries with a manageable number of images, use docker pull/tag/push.

```bash
# Migrate a single image with all its tags
IMAGE="my-web-app"
SOURCE="myacr.azurecr.io"
DEST="us-central1-docker.pkg.dev/my-project/docker-images"

for tag in $(az acr repository show-tags --name myacr --repository $IMAGE -o tsv); do
  echo "Migrating $IMAGE:$tag"
  docker pull "$SOURCE/$IMAGE:$tag"
  docker tag "$SOURCE/$IMAGE:$tag" "$DEST/$IMAGE:$tag"
  docker push "$DEST/$IMAGE:$tag"
  # Clean up local images to save disk space
  docker rmi "$SOURCE/$IMAGE:$tag" "$DEST/$IMAGE:$tag"
done
```

## Step 5: Migrate Images - Large Scale

For registries with hundreds of images, use crane (a tool from the Google container tools project) or skopeo for more efficient server-to-server copies without pulling to local disk.

```bash
# Install crane
go install github.com/google/go-containerregistry/cmd/crane@latest

# Or download a pre-built binary
# https://github.com/google/go-containerregistry/releases

# Authenticate crane with both registries
crane auth login myacr.azurecr.io -u $(az acr credential show --name myacr --query username -o tsv) \
  -p $(az acr credential show --name myacr --query passwords[0].value -o tsv)

gcloud auth print-access-token | crane auth login us-central1-docker.pkg.dev -u oauth2accesstoken --password-stdin
```

Now use crane to copy images directly between registries:

```bash
# Copy a single image (all tags) - server-to-server, no local download
crane copy myacr.azurecr.io/my-web-app:v1.2.3 \
  us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3

# Bulk copy all repositories
for repo in $(az acr repository list --name myacr -o tsv); do
  for tag in $(az acr repository show-tags --name myacr --repository "$repo" -o tsv); do
    echo "Copying $repo:$tag"
    crane copy "myacr.azurecr.io/$repo:$tag" \
      "us-central1-docker.pkg.dev/my-project/docker-images/$repo:$tag" || \
      echo "FAILED: $repo:$tag"
  done
done
```

For maximum throughput, parallelize with xargs or GNU parallel:

```bash
# Generate a list of copy commands
for repo in $(az acr repository list --name myacr -o tsv); do
  for tag in $(az acr repository show-tags --name myacr --repository "$repo" -o tsv); do
    echo "myacr.azurecr.io/$repo:$tag us-central1-docker.pkg.dev/my-project/docker-images/$repo:$tag"
  done
done > copy-list.txt

# Execute copies in parallel (8 at a time)
cat copy-list.txt | xargs -P 8 -L 1 bash -c 'crane copy $0 $1 && echo "Done: $0" || echo "FAILED: $0"'
```

## Step 6: Migrate Using Skopeo (Alternative)

Skopeo is another tool that copies images between registries without pulling them locally.

```bash
# Install skopeo
# On macOS: brew install skopeo
# On Ubuntu: apt-get install skopeo

# Copy a single image
skopeo copy \
  docker://myacr.azurecr.io/my-web-app:v1.2.3 \
  docker://us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3

# Copy all tags for an image
skopeo sync \
  --src docker \
  --dest docker \
  myacr.azurecr.io/my-web-app \
  us-central1-docker.pkg.dev/my-project/docker-images/
```

## Step 7: Update Image References

After copying images, update all references from ACR to Artifact Registry.

### Kubernetes Manifests

```yaml
# Before
spec:
  containers:
    - name: my-app
      image: myacr.azurecr.io/my-web-app:v1.2.3

# After
spec:
  containers:
    - name: my-app
      image: us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3
```

Use sed or a script to bulk-update:

```bash
# Find and replace ACR references in all YAML files
find k8s/ -name "*.yaml" -exec sed -i '' \
  's|myacr.azurecr.io|us-central1-docker.pkg.dev/my-project/docker-images|g' {} +
```

### Docker Compose Files

```yaml
# Before
services:
  web:
    image: myacr.azurecr.io/my-web-app:latest

# After
services:
  web:
    image: us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:latest
```

### CI/CD Pipelines

Update your build pipelines to push to Artifact Registry instead of ACR:

```yaml
# Cloud Build - push to Artifact Registry
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-web-app:$COMMIT_SHA'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/docker-images/my-web-app:$COMMIT_SHA'
```

## Step 8: Set Up Vulnerability Scanning

Replace ACR's Microsoft Defender scanning with Container Analysis.

```bash
# Vulnerability scanning is automatically enabled for Artifact Registry
# Check scan results for an image
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3 \
  --show-package-vulnerability

# List all vulnerabilities for an image
gcloud artifacts vulnerabilities list \
  us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3
```

## Step 9: Set Up Cleanup Policies

Replace ACR retention policies with Artifact Registry cleanup policies.

```bash
# Create a cleanup policy to delete old images
gcloud artifacts repositories set-cleanup-policies docker-images \
  --location=us-central1 \
  --policy=cleanup-policy.json
```

```json
[
  {
    "name": "delete-old-images",
    "action": { "type": "Delete" },
    "condition": {
      "olderThan": "2592000s",
      "tagState": "UNTAGGED"
    }
  },
  {
    "name": "keep-recent-tagged",
    "action": { "type": "Keep" },
    "condition": {
      "tagState": "TAGGED"
    },
    "mostRecentVersions": {
      "keepCount": 10
    }
  }
]
```

## Step 10: Validate

Verify all images were migrated successfully.

```bash
# List all repositories in Artifact Registry
gcloud artifacts repositories list --location=us-central1

# List images in the repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/docker-images \
  --format='table(package, tags, createTime)'

# Compare image counts between ACR and Artifact Registry
echo "ACR image count:"
for repo in $(az acr repository list --name myacr -o tsv); do
  echo "$repo: $(az acr repository show-tags --name myacr --repository $repo -o tsv | wc -l) tags"
done

echo "Artifact Registry image count:"
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/docker-images \
  --format='value(package)' | sort | uniq -c | sort -rn
```

Verify that you can pull images from the new registry:

```bash
# Pull test
docker pull us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3
docker run --rm us-central1-docker.pkg.dev/my-project/docker-images/my-web-app:v1.2.3 --version
```

## Summary

Container registry migration is mostly about efficient image copying and reference updating. Use crane or skopeo for server-to-server copies to avoid downloading images locally - this saves time and bandwidth. The bulk of the work is updating image references across all your Kubernetes manifests, CI/CD pipelines, and deployment scripts. Automate this with find-and-replace scripts, but verify each change carefully. Set up vulnerability scanning and cleanup policies on the new registry before you finish the migration, and keep ACR accessible as a fallback until you have confirmed all workloads are pulling from Artifact Registry.
