# IAM Users with OpenTofu on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IAM, OpenTofu, Security, Infrastructure as Code

Description: Learn how to create and manage AWS IAM users, access keys, and group memberships using OpenTofu for reproducible and auditable identity management.

## When to Use IAM Users

IAM users represent individual people or services that need long-term AWS credentials. While roles are preferred for applications and services, IAM users are appropriate for:

- Human operators requiring console access
- CI/CD systems that cannot assume roles
- Legacy integrations requiring static credentials

## Creating an IAM User

```hcl
resource "aws_iam_user" "developer" {
  name          = "jane.doe"
  path          = "/developers/"
  force_destroy = true

  tags = {
    Team        = "engineering"
    Environment = "production"
  }
}
```

## Creating Access Keys

```hcl
resource "aws_iam_access_key" "developer_key" {
  user = aws_iam_user.developer.name
}

output "access_key_id" {
  value = aws_iam_access_key.developer_key.id
}

output "secret_access_key" {
  value     = aws_iam_access_key.developer_key.secret
  sensitive = true
}
```

## Managing IAM Groups

```hcl
resource "aws_iam_group" "developers" {
  name = "developers"
  path = "/groups/"
}

resource "aws_iam_group_policy_attachment" "dev_policy" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_user_group_membership" "jane_groups" {
  user   = aws_iam_user.developer.name
  groups = [aws_iam_group.developers.name]
}
```

## Login Profile for Console Access

```hcl
resource "aws_iam_user_login_profile" "developer_login" {
  user                    = aws_iam_user.developer.name
  password_reset_required = true
}
```

## Creating Multiple Users with for_each

```hcl
variable "users" {
  default = {
    alice = { team = "backend" }
    bob   = { team = "frontend" }
    carol = { team = "devops" }
  }
}

resource "aws_iam_user" "team" {
  for_each = var.users
  name     = each.key

  tags = {
    Team = each.value.team
  }
}
```

## Attaching a Policy Directly to a User

```hcl
resource "aws_iam_user_policy" "inline_policy" {
  name = "AllowS3Upload"
  user = aws_iam_user.developer.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "arn:aws:s3:::uploads-bucket/*"
      }
    ]
  })
}
```

## Storing Secrets Safely

Never commit access keys to version control. If you write them to AWS Secrets Manager with OpenTofu, protect your state carefully because the secret value is still stored there.

```hcl
resource "aws_secretsmanager_secret" "user_creds" {
  name = "iam/jane.doe"
}

resource "aws_secretsmanager_secret_version" "user_creds" {
  secret_id = aws_secretsmanager_secret.user_creds.id

  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.developer_key.id
    secret_access_key = aws_iam_access_key.developer_key.secret
  })
}
```

## Best Practices

1. **Prefer roles over users** for applications and services
2. **Enable MFA** for all human users with console access
3. **Rotate access keys** regularly and use access key age reporting
4. **Use groups** to manage permissions at scale rather than attaching policies to individual users
5. **Mark secrets as sensitive** in OpenTofu outputs to hide them from normal CLI output, and protect your state because sensitive values are still stored there

## Conclusion

OpenTofu enables consistent and auditable IAM user management at scale. By defining users, groups, and policies as code, you make identity management reproducible and reduce the risk of orphaned accounts or over-permissioned credentials.
