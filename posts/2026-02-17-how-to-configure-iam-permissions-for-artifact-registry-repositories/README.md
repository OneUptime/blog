# How to Configure IAM Permissions for Artifact Registry Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, IAM, Access Control, Security, DevOps

Description: Learn how to configure fine-grained IAM permissions for Google Artifact Registry repositories to control who can read, write, and manage your packages.

---

Getting IAM permissions right for Artifact Registry is one of those things that seems simple but can bite you if you are not careful. Too permissive and anyone can push images to your production repository. Too restrictive and your CI/CD pipeline breaks at 2 AM because a service account cannot pull an image.

Let me walk through the IAM model for Artifact Registry and show you how to set up permissions that make sense for real teams.

## Understanding the IAM Hierarchy

Artifact Registry permissions can be set at three levels:

1. **Project level** - Applies to all repositories in the project
2. **Repository level** - Applies to a specific repository
3. **Inherited from organization/folder** - Flows down from higher levels

Repository-level permissions are the most useful because they let you have different access controls for different repositories. For example, your production image repository might be read-only for most people, while your development repository is more open.

## Available Roles

Here are the predefined roles for Artifact Registry:

| Role | What It Can Do |
|---|---|
| `roles/artifactregistry.reader` | Pull images, download packages |
| `roles/artifactregistry.writer` | Reader + push images, upload packages |
| `roles/artifactregistry.repoAdmin` | Writer + delete images, manage tags, set cleanup policies |
| `roles/artifactregistry.admin` | Everything including creating/deleting repositories |

## Setting Repository-Level Permissions

### Granting Read Access

The most common permission grant - letting a service or user pull images:

```bash
# Grant read access to a service account
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-service@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Grant read access to a Google group
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="group:developers@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Grant read access to a specific user
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="user:developer@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project
```

### Granting Write Access

For CI/CD pipelines and service accounts that push images:

```bash
# Grant write access to the Cloud Build service account
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')

gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project

# Grant write access to a CI/CD service account
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:ci-pipeline@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

### Granting Admin Access

For platform engineers who manage repositories:

```bash
# Grant repo admin to the platform team
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="group:platform-team@example.com" \
  --role="roles/artifactregistry.repoAdmin" \
  --project=my-project
```

## Viewing Current Permissions

Check who has access to a repository:

```bash
# List all IAM bindings for a repository
gcloud artifacts repositories get-iam-policy my-docker-repo \
  --location=us-central1 \
  --project=my-project
```

The output shows all roles and their members:

```yaml
bindings:
- members:
  - group:developers@example.com
  - serviceAccount:my-gke-sa@my-project.iam.gserviceaccount.com
  role: roles/artifactregistry.reader
- members:
  - serviceAccount:123456@cloudbuild.gserviceaccount.com
  role: roles/artifactregistry.writer
- members:
  - group:platform-team@example.com
  role: roles/artifactregistry.repoAdmin
```

## Removing Permissions

Remove access when it is no longer needed:

```bash
# Remove a member's access
gcloud artifacts repositories remove-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="user:former-employee@example.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Cross-Project Access

A common scenario is having images in one project and workloads in another. Grant the workload's service account read access to the image repository:

```bash
# Grant a GKE service account from project-b read access to a repo in project-a
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:gke-node-sa@project-b.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=project-a
```

## GKE-Specific Permissions

For GKE clusters, you typically need to grant the node service account read access:

```bash
# Find the GKE node service account
gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format='value(nodeConfig.serviceAccount)' \
  --project=my-project

# If using the default compute service account, it often has broad access
# For custom service accounts, explicitly grant read access
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-gke-nodes@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project
```

If you are using GKE Workload Identity, you need to grant access to the Kubernetes service account's mapped GCP service account:

```bash
# Grant access to the GCP service account that the K8s service account maps to
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-k8s-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project
```

## Terraform Configuration

Manage permissions declaratively with Terraform:

```hcl
# main.tf - Artifact Registry IAM configuration

resource "google_artifact_registry_repository" "docker_repo" {
  location      = "us-central1"
  repository_id = "my-docker-repo"
  format        = "DOCKER"
}

# Read access for developers
resource "google_artifact_registry_repository_iam_member" "dev_reader" {
  project    = var.project_id
  location   = "us-central1"
  repository = google_artifact_registry_repository.docker_repo.name
  role       = "roles/artifactregistry.reader"
  member     = "group:developers@example.com"
}

# Write access for CI/CD
resource "google_artifact_registry_repository_iam_member" "ci_writer" {
  project    = var.project_id
  location   = "us-central1"
  repository = google_artifact_registry_repository.docker_repo.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.ci_service_account}"
}

# Admin access for platform team
resource "google_artifact_registry_repository_iam_member" "platform_admin" {
  project    = var.project_id
  location   = "us-central1"
  repository = google_artifact_registry_repository.docker_repo.name
  role       = "roles/artifactregistry.repoAdmin"
  member     = "group:platform-team@example.com"
}

# For multiple members with the same role, use iam_binding
resource "google_artifact_registry_repository_iam_binding" "readers" {
  project    = var.project_id
  location   = "us-central1"
  repository = google_artifact_registry_repository.docker_repo.name
  role       = "roles/artifactregistry.reader"

  members = [
    "group:developers@example.com",
    "serviceAccount:gke-sa@my-project.iam.gserviceaccount.com",
    "serviceAccount:cloud-run-sa@my-project.iam.gserviceaccount.com",
  ]
}
```

## Custom Roles

If the predefined roles do not fit your needs, create a custom role:

```bash
# Create a custom role that can only pull images (no list or describe)
gcloud iam roles create artifactRegistryPuller \
  --project=my-project \
  --title="Artifact Registry Puller" \
  --description="Can only pull images from Artifact Registry" \
  --permissions="artifactregistry.repositories.downloadArtifacts"
```

Then use it:

```bash
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-sa@my-project.iam.gserviceaccount.com" \
  --role="projects/my-project/roles/artifactRegistryPuller" \
  --project=my-project
```

## IAM Best Practices

1. **Use groups instead of individual users**. It is much easier to manage access through Google Groups than granting permissions user by user.

2. **Separate read and write access**. Most consumers only need read access. Limit write access to CI/CD service accounts.

3. **Use repository-level permissions** instead of project-level. This lets you have strict access on production repositories and relaxed access on development ones.

4. **Audit permissions regularly**. Run `get-iam-policy` on your repositories periodically to check for overly broad access.

5. **Use least privilege**. Start with the minimum permissions needed and add more only when required.

## Wrapping Up

IAM configuration for Artifact Registry follows the standard GCP IAM model, which means you have fine-grained control over who can do what with your packages and images. Set up reader access for consumers, writer access for CI/CD, and admin access for your platform team. Use repository-level permissions for maximum control, and prefer groups over individual users for easier management.
