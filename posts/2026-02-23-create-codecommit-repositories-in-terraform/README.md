# How to Create CodeCommit Repositories in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, CodeCommit, Git, DevOps, CI/CD, Infrastructure as Code

Description: A practical guide to creating and managing AWS CodeCommit Git repositories with Terraform, including triggers, approval rules, IAM access policies, and notifications.

---

AWS CodeCommit is a fully managed Git hosting service. It stores your source code in private Git repositories that live entirely within your AWS account. There are no servers to manage, no storage limits to worry about, and it integrates natively with other AWS services like CodeBuild, CodePipeline, and Lambda.

While GitHub and GitLab dominate the Git hosting space, CodeCommit fills a specific niche: organizations that need all their source code to stay within AWS for compliance reasons, or teams that want tight integration with their existing AWS CI/CD pipeline without managing cross-platform credentials. If your build pipeline already lives in AWS, CodeCommit simplifies the authentication story significantly.

This post covers creating CodeCommit repositories with Terraform, setting up triggers for notifications, configuring approval rules for pull requests, and managing access through IAM.

## Basic Repository

Creating a CodeCommit repository is straightforward:

```hcl
# A basic CodeCommit repository
resource "aws_codecommit_repository" "app" {
  repository_name = "my-application"
  description     = "Main application repository"
  default_branch  = "main"

  tags = {
    Team      = "backend"
    ManagedBy = "terraform"
  }
}

output "clone_url_https" {
  value       = aws_codecommit_repository.app.clone_url_http
  description = "HTTPS clone URL"
}

output "clone_url_ssh" {
  value       = aws_codecommit_repository.app.clone_url_ssh
  description = "SSH clone URL"
}

output "repository_arn" {
  value       = aws_codecommit_repository.app.arn
  description = "Repository ARN"
}
```

Note that `default_branch` only takes effect if the repository has at least one commit. For a brand new empty repository, the default branch is set when the first commit is pushed.

## Multiple Repositories

Most teams need several repositories. Use `for_each` to create them from a map:

```hcl
variable "repositories" {
  type = map(object({
    description = string
    team        = string
  }))
  default = {
    "frontend-app" = {
      description = "React frontend application"
      team        = "frontend"
    }
    "backend-api" = {
      description = "Node.js backend API"
      team        = "backend"
    }
    "infrastructure" = {
      description = "Terraform infrastructure code"
      team        = "platform"
    }
    "shared-libraries" = {
      description = "Shared utility libraries"
      team        = "platform"
    }
    "data-pipeline" = {
      description = "ETL and data processing scripts"
      team        = "data"
    }
  }
}

resource "aws_codecommit_repository" "repos" {
  for_each = var.repositories

  repository_name = each.key
  description     = each.value.description
  default_branch  = "main"

  tags = {
    Team      = each.value.team
    ManagedBy = "terraform"
  }
}

# Output all clone URLs
output "repository_urls" {
  value = {
    for name, repo in aws_codecommit_repository.repos :
    name => {
      https = repo.clone_url_http
      ssh   = repo.clone_url_ssh
    }
  }
}
```

## Repository Triggers

Triggers fire SNS notifications or Lambda functions when events happen in the repository - pushes, branch creation, and branch deletion:

```hcl
# SNS topic for repository notifications
resource "aws_sns_topic" "code_notifications" {
  name = "codecommit-notifications"

  tags = {
    ManagedBy = "terraform"
  }
}

# Email subscription for the team
resource "aws_sns_topic_subscription" "team_email" {
  topic_arn = aws_sns_topic.code_notifications.arn
  protocol  = "email"
  endpoint  = "team@example.com"
}

# SNS topic policy allowing CodeCommit to publish
resource "aws_sns_topic_policy" "codecommit_publish" {
  arn = aws_sns_topic.code_notifications.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCodeCommitPublish"
        Effect = "Allow"
        Principal = {
          Service = "codecommit.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.code_notifications.arn
      }
    ]
  })
}

# Trigger that fires on pushes to main
resource "aws_codecommit_trigger" "main_push" {
  repository_name = aws_codecommit_repository.app.repository_name

  trigger {
    name            = "notify-on-main-push"
    events          = ["updateReference"]
    branches        = ["main"]
    destination_arn = aws_sns_topic.code_notifications.arn
  }

  trigger {
    name            = "notify-on-all-activity"
    events          = ["all"]
    destination_arn = aws_sns_topic.code_notifications.arn
  }
}
```

The `events` parameter accepts `all`, `updateReference` (pushes), `createReference` (branch/tag creation), and `deleteReference` (branch/tag deletion). Filtering by branch with the `branches` parameter keeps noise down.

## Lambda Trigger for Custom Logic

For more than just notifications, use a Lambda trigger:

```hcl
# Lambda function triggered by CodeCommit events
resource "aws_lambda_function" "code_review_bot" {
  function_name = "codecommit-review-bot"
  runtime       = "python3.12"
  handler       = "index.handler"
  role          = aws_iam_role.review_bot.arn
  filename      = "lambda/review-bot.zip"

  environment {
    variables = {
      SLACK_WEBHOOK_URL = var.slack_webhook_url
    }
  }

  tags = {
    ManagedBy = "terraform"
  }
}

# IAM role for the Lambda function
resource "aws_iam_role" "review_bot" {
  name = "codecommit-review-bot-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Policy for the review bot to read CodeCommit
resource "aws_iam_role_policy" "review_bot" {
  name = "codecommit-read-access"
  role = aws_iam_role.review_bot.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codecommit:GetCommit",
          "codecommit:GetDifferences",
          "codecommit:GetBranch",
          "codecommit:GetRepository"
        ]
        Resource = aws_codecommit_repository.app.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Permission for CodeCommit to invoke Lambda
resource "aws_lambda_permission" "codecommit" {
  statement_id  = "AllowCodeCommitInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.code_review_bot.function_name
  principal     = "codecommit.amazonaws.com"
  source_arn    = aws_codecommit_repository.app.arn
}

# Trigger using Lambda
resource "aws_codecommit_trigger" "lambda_trigger" {
  repository_name = aws_codecommit_repository.app.repository_name

  trigger {
    name            = "review-bot-trigger"
    events          = ["updateReference"]
    branches        = ["main", "develop"]
    destination_arn = aws_lambda_function.code_review_bot.arn
  }
}
```

## Approval Rule Templates

Approval rule templates enforce code review requirements across repositories. They require a specified number of approvals before pull requests can be merged:

```hcl
# Approval rule template requiring 2 approvals
resource "aws_codecommit_approval_rule_template" "two_approvals" {
  name        = "require-two-approvals"
  description = "Require two approvals from the team before merging"

  content = jsonencode({
    Version               = "2018-11-08"
    DestinationReferences = ["refs/heads/main"]
    Statements = [
      {
        Type                    = "Approvers"
        NumberOfApprovalsNeeded = 2
        ApprovalPoolMembers     = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
      }
    ]
  })
}

# Associate the approval rule with the repository
resource "aws_codecommit_approval_rule_template_association" "app" {
  approval_rule_template_name = aws_codecommit_approval_rule_template.two_approvals.name
  repository_name             = aws_codecommit_repository.app.repository_name
}

# Stricter template for the infrastructure repository
resource "aws_codecommit_approval_rule_template" "infra_approvals" {
  name        = "require-platform-team-approval"
  description = "Infrastructure changes require platform team review"

  content = jsonencode({
    Version               = "2018-11-08"
    DestinationReferences = ["refs/heads/main"]
    Statements = [
      {
        Type                    = "Approvers"
        NumberOfApprovalsNeeded = 1
        ApprovalPoolMembers = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/PlatformTeamRole"
        ]
      }
    ]
  })
}

data "aws_caller_identity" "current" {}
```

The `ApprovalPoolMembers` field accepts IAM user ARNs, IAM role ARNs, or the account root ARN. When using the root ARN, any IAM user in the account can approve. When specifying roles, only users who assumed that role can approve.

## IAM Policies for Repository Access

Control who can access which repositories:

```hcl
# Read-only access to specific repositories
resource "aws_iam_policy" "codecommit_readonly" {
  name        = "codecommit-readonly"
  description = "Read-only access to specific CodeCommit repositories"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codecommit:BatchGet*",
          "codecommit:Get*",
          "codecommit:Describe*",
          "codecommit:List*",
          "codecommit:GitPull"
        ]
        Resource = [
          aws_codecommit_repository.app.arn,
          "arn:aws:codecommit:*:*:shared-libraries"
        ]
      }
    ]
  })
}

# Full access for developers to push code
resource "aws_iam_policy" "codecommit_developer" {
  name        = "codecommit-developer"
  description = "Developer access to push and manage branches"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codecommit:BatchGet*",
          "codecommit:Get*",
          "codecommit:Describe*",
          "codecommit:List*",
          "codecommit:GitPull",
          "codecommit:GitPush",
          "codecommit:CreateBranch",
          "codecommit:DeleteBranch",
          "codecommit:CreatePullRequest",
          "codecommit:UpdatePullRequestDescription",
          "codecommit:MergePullRequestByFastForward",
          "codecommit:MergePullRequestBySquash",
          "codecommit:MergePullRequestByThreeWay",
          "codecommit:PostCommentForPullRequest",
          "codecommit:UpdateComment"
        ]
        Resource = aws_codecommit_repository.app.arn
      },
      {
        # Deny force push and direct push to main
        Effect = "Deny"
        Action = [
          "codecommit:GitPush"
        ]
        Resource = aws_codecommit_repository.app.arn
        Condition = {
          StringEqualsIfExists = {
            "codecommit:References" = ["refs/heads/main"]
          }
          Null = {
            "codecommit:References" = "false"
          }
        }
      }
    ]
  })
}
```

The second statement in the developer policy prevents direct pushes to `main`, forcing all changes through pull requests. This is a common pattern for branch protection in CodeCommit.

## Notification Rules

For richer notifications using AWS CodeStar Notifications:

```hcl
# Notification rule for pull request events
resource "aws_codestarnotifications_notification_rule" "pr_notifications" {
  name        = "codecommit-pr-notifications"
  resource    = aws_codecommit_repository.app.arn
  detail_type = "FULL"

  event_type_ids = [
    "codecommit-repository-pull-request-created",
    "codecommit-repository-pull-request-merged",
    "codecommit-repository-pull-request-status-changed",
    "codecommit-repository-pull-request-source-updated"
  ]

  target {
    type    = "SNS"
    address = aws_sns_topic.code_notifications.arn
  }

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Wrapping Up

CodeCommit repositories in Terraform are simple to create but the value comes from the supporting infrastructure: triggers for notifications, approval rules for code review enforcement, and IAM policies for access control. Together, these create a governed source control environment that integrates directly with your AWS CI/CD pipeline.

The main decision points are: whether to use SNS triggers or CodeStar notifications (CodeStar notifications give you more granular event types), how many approvals to require per repository, and how to structure IAM policies for branch protection.

If you are building a complete CI/CD pipeline on AWS, pair CodeCommit with [CodeBuild for builds](https://oneuptime.com/blog/post/2026-02-12-create-codebuild-projects-terraform/view) and [CodePipeline for orchestration](https://oneuptime.com/blog/post/2026-02-12-create-codepipeline-terraform/view) to get an end-to-end deployment workflow entirely within your AWS account.
