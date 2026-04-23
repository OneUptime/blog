# How to Configure Registry Access Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Container Registry, Access Control, ECR, Infrastructure as Code

Description: Learn how to configure container registry access policies with OpenTofu to control who can push, pull, and manage container images across AWS, Azure, and GCP.

Registry access policies define who can push images (CI/CD), who can pull images (compute), and who has administrative access. Managing these policies in OpenTofu ensures least-privilege access is consistently enforced.

## AWS ECR Registry-Level Policies

```hcl
# Registry-level policy applies to all repositories

resource "aws_ecr_registry_policy" "main" {
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Allow cross-account replication from another account
      {
        Sid    = "AllowReplication"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.source_account_id}:root"
        }
        Action = [
          "ecr:CreateRepository",
          "ecr:ReplicateImage",
        ]
        Resource = "arn:aws:ecr:${var.region}:${data.aws_caller_identity.current.account_id}:repository/*"
      }
    ]
  })
}

# Repository-level policy - per repo
resource "aws_ecr_repository_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowPull"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.ecs_task_execution.arn,
            aws_iam_role.eks_nodes.arn,
          ]
        }
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability",
        ]
      },
      {
        Sid    = "AllowPush"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ci_runner.arn
        }
        Action = [
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchCheckLayerAvailability",
        ]
      }
    ]
  })
}
```

For Amazon ECS task execution roles and EKS node roles, pair repository permissions with an IAM policy that allows `ecr:GetAuthorizationToken` on `*` before they authenticate to ECR.

## IAM Policy for ECR Authentication

```hcl
# ECR authorization token is required before any pull/push
resource "aws_iam_role_policy" "ecr_auth" {
  role = aws_iam_role.ci_runner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"  # GetAuthorizationToken is not resource-scoped
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
        ]
        Resource = [
          for repo in aws_ecr_repository.services :
          repo.arn
        ]
      }
    ]
  })
}
```

## Azure ACR RBAC Roles

```hcl
locals {
  acr_roles = {
    # Role : Principal
    "Container Registry Repository Reader" = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
    "Container Registry Repository Writer" = azurerm_user_assigned_identity.cicd.principal_id
  }
}

resource "azurerm_role_assignment" "acr" {
  for_each = local.acr_roles

  scope                = azurerm_container_registry.main.id
  role_definition_name = each.key
  principal_id         = each.value
}
```

On registries that still use the legacy `RBAC Registry Permissions` mode, the equivalent roles are `AcrPull` and `AcrPush`.

## GCP Artifact Registry IAM

```hcl
data "google_project" "current" {
  project_id = var.project_id
}

locals {
  registry_bindings = {
    reader = {
      role    = "roles/artifactregistry.reader"
      members = [
        "serviceAccount:${google_service_account.gke_nodes.email}",
        "serviceAccount:service-${data.google_project.current.number}@serverless-robot-prod.iam.gserviceaccount.com",
      ]
    }
    writer = {
      role    = "roles/artifactregistry.writer"
      members = [
        "serviceAccount:${google_service_account.cicd.email}",
      ]
    }
    admin = {
      role    = "roles/artifactregistry.repoAdmin"
      members = [
        "group:platform-team@example.com",
      ]
    }
  }
}

resource "google_artifact_registry_repository_iam_binding" "bindings" {
  for_each = local.registry_bindings

  project    = var.project_id
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  role       = each.value.role
  members    = each.value.members
}
```

## Conclusion

Container registry access policies in OpenTofu enforce least-privilege for image operations. Grant pull-only to compute principals (ECS task execution roles, EKS node roles, GKE node service accounts, Cloud Run service agents), push to CI/CD service accounts, and admin only to platform teams. Audit registry policies regularly and remove roles when services are decommissioned - OpenTofu makes this visible in the diff.
