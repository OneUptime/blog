# How to Create IAM Access Keys in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Access Keys, Security, Infrastructure as Code

Description: Learn how to create and manage IAM access keys in Terraform, including secure storage, rotation strategies, and when to use alternatives like IAM roles.

---

IAM access keys provide programmatic access to AWS services. They consist of an access key ID and a secret access key that applications use to sign API requests. While IAM roles are the preferred approach for granting access to AWS services from EC2 instances, Lambda functions, and other AWS resources, there are scenarios where access keys are still necessary. Service accounts for third-party tools, CI/CD systems that do not support OIDC federation, and legacy applications may require access keys.

This guide covers creating IAM access keys with Terraform, storing them securely, implementing rotation, and understanding when to use alternatives.

## When to Use Access Keys

Before creating access keys, consider whether an alternative approach would be better:

- **EC2 instances**: Use IAM instance profiles instead.
- **Lambda functions**: Use execution roles instead.
- **ECS tasks**: Use task roles instead.
- **GitHub Actions**: Use OIDC federation instead.
- **Cross-account access**: Use IAM roles with `sts:AssumeRole` instead.

Use access keys only when the system cannot use temporary credentials through IAM roles or federation.

## Prerequisites

You need:

- Terraform 1.0 or later
- An AWS account with IAM permissions
- AWS CLI configured with valid credentials
- A secure secret storage system (AWS Secrets Manager, HashiCorp Vault, etc.)

## Creating a Basic Access Key

Here is how to create an IAM user and access key with Terraform.

```hcl
# Create the IAM user
resource "aws_iam_user" "service_account" {
  name = "ci-cd-service-account"
  path = "/service-accounts/"

  tags = {
    Purpose   = "CI/CD pipeline"
    ManagedBy = "terraform"
  }
}

# Attach a policy to the user
resource "aws_iam_user_policy_attachment" "service_account_policy" {
  user       = aws_iam_user.service_account.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Create the access key
resource "aws_iam_access_key" "service_account" {
  user = aws_iam_user.service_account.name
}

# Output the access key ID (not sensitive)
output "access_key_id" {
  value       = aws_iam_access_key.service_account.id
  description = "The access key ID for the service account"
}

# Output the secret key (sensitive)
output "secret_access_key" {
  value       = aws_iam_access_key.service_account.secret
  description = "The secret access key for the service account"
  sensitive   = true
}
```

The secret access key is only available when the key is first created. Terraform stores it in the state file, which is why securing your Terraform state is critical.

## Storing Access Keys in AWS Secrets Manager

Instead of outputting the secret key, store it directly in Secrets Manager.

```hcl
resource "aws_iam_user" "app_service" {
  name = "app-service-account"
  path = "/service-accounts/"
}

resource "aws_iam_access_key" "app_service" {
  user = aws_iam_user.app_service.name
}

# Store the credentials in Secrets Manager
resource "aws_secretsmanager_secret" "app_credentials" {
  name        = "app/service-account/credentials"
  description = "IAM credentials for the app service account"

  tags = {
    ManagedBy = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "app_credentials" {
  secret_id = aws_secretsmanager_secret.app_credentials.id

  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.app_service.id
    secret_access_key = aws_iam_access_key.app_service.secret
  })
}

# Output only the secret name, not the credentials
output "credentials_secret_name" {
  value       = aws_secretsmanager_secret.app_credentials.name
  description = "Secrets Manager secret name containing the credentials"
}
```

## Storing Access Keys in SSM Parameter Store

For simpler setups, SSM Parameter Store is another option.

```hcl
resource "aws_iam_access_key" "deploy_key" {
  user = aws_iam_user.service_account.name
}

# Store access key ID
resource "aws_ssm_parameter" "access_key_id" {
  name        = "/service-accounts/deploy/access-key-id"
  description = "Access key ID for deploy service account"
  type        = "String"
  value       = aws_iam_access_key.deploy_key.id

  tags = {
    ManagedBy = "terraform"
  }
}

# Store secret access key as SecureString
resource "aws_ssm_parameter" "secret_access_key" {
  name        = "/service-accounts/deploy/secret-access-key"
  description = "Secret access key for deploy service account"
  type        = "SecureString"
  value       = aws_iam_access_key.deploy_key.secret

  tags = {
    ManagedBy = "terraform"
  }
}
```

## Access Key Rotation

AWS recommends rotating access keys regularly. Terraform can help manage key rotation using a status parameter.

```hcl
# Create the primary access key
resource "aws_iam_access_key" "primary" {
  user = aws_iam_user.service_account.name
}

# Create a secondary key for rotation (initially inactive)
resource "aws_iam_access_key" "secondary" {
  user   = aws_iam_user.service_account.name
  status = "Inactive"  # Activate when rotating
}
```

### Rotation Strategy with Timed Keys

A more practical rotation approach uses the `keepers` mechanism with `random_id`.

```hcl
# Change this value to trigger key rotation
variable "key_rotation_version" {
  description = "Increment this value to rotate the access key"
  type        = number
  default     = 1
}

resource "aws_iam_access_key" "rotatable" {
  user = aws_iam_user.service_account.name

  # This lifecycle block ensures old key is destroyed and new one created
  lifecycle {
    create_before_destroy = true
  }
}
```

## Creating Multiple Access Keys for Different Services

Sometimes you need separate credentials for different services, all tied to the same user or different users.

```hcl
variable "service_accounts" {
  description = "Map of service accounts to create"
  type = map(object({
    policy_arns = list(string)
    path        = string
  }))
  default = {
    monitoring = {
      policy_arns = ["arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"]
      path        = "/service-accounts/"
    }
    backup = {
      policy_arns = ["arn:aws:iam::aws:policy/AmazonS3FullAccess"]
      path        = "/service-accounts/"
    }
    deploy = {
      policy_arns = [
        "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
        "arn:aws:iam::aws:policy/AmazonECR_FullAccess",
      ]
      path = "/service-accounts/"
    }
  }
}

# Create users
resource "aws_iam_user" "service_accounts" {
  for_each = var.service_accounts

  name = "${each.key}-service-account"
  path = each.value.path

  tags = {
    Purpose = each.key
  }
}

# Create access keys
resource "aws_iam_access_key" "service_accounts" {
  for_each = var.service_accounts

  user = aws_iam_user.service_accounts[each.key].name
}

# Attach policies
locals {
  user_policy_attachments = flatten([
    for name, config in var.service_accounts : [
      for arn in config.policy_arns : {
        user       = name
        policy_arn = arn
      }
    ]
  ])
}

resource "aws_iam_user_policy_attachment" "service_accounts" {
  for_each = {
    for item in local.user_policy_attachments :
    "${item.user}-${item.policy_arn}" => item
  }

  user       = aws_iam_user.service_accounts[each.value.user].name
  policy_arn = each.value.policy_arn
}

# Store all credentials in Secrets Manager
resource "aws_secretsmanager_secret" "service_credentials" {
  for_each = var.service_accounts

  name = "service-accounts/${each.key}/credentials"
}

resource "aws_secretsmanager_secret_version" "service_credentials" {
  for_each = var.service_accounts

  secret_id = aws_secretsmanager_secret.service_credentials[each.key].id

  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.service_accounts[each.key].id
    secret_access_key = aws_iam_access_key.service_accounts[each.key].secret
  })
}
```

## Using PGP Encryption

For added security, you can encrypt the secret key with a PGP key so it never appears in plain text in the Terraform state.

```hcl
resource "aws_iam_access_key" "encrypted" {
  user    = aws_iam_user.service_account.name
  pgp_key = file("${path.module}/keys/public-key.gpg")
}

output "encrypted_secret" {
  value = aws_iam_access_key.encrypted.encrypted_secret
}

# The secret must be decrypted offline with the corresponding private key
# echo "encrypted_value" | base64 --decode | gpg --decrypt
```

## Security Best Practices

1. **Encrypt your Terraform state.** The secret access key is stored in the state file. Use encrypted S3 backends or Terraform Cloud.
2. **Never commit secrets to version control.** Use `.gitignore` to exclude any files that might contain credentials.
3. **Apply least privilege.** Give the user only the minimum permissions needed.
4. **Rotate keys regularly.** Set up a rotation schedule and automate the process.
5. **Monitor key usage.** Use CloudTrail to track API calls made with access keys.
6. **Delete unused keys.** If a key is no longer needed, delete it immediately.
7. **Prefer IAM roles over access keys.** Whenever possible, use roles with temporary credentials.

For more on secure IAM management, see [How to Implement Least Privilege IAM with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-least-privilege-iam-with-terraform/view) and [How to Create IAM Roles for CI/CD in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-iam-roles-for-ci-cd-in-terraform/view).

## Conclusion

While IAM access keys should be a last resort in modern AWS environments, there are still cases where they are necessary. Terraform helps you manage access keys consistently, store them securely in services like Secrets Manager or SSM Parameter Store, and implement rotation strategies. The most important thing is to secure your Terraform state, apply the principle of least privilege to the associated IAM users, and have a plan for regular key rotation. Whenever possible, evaluate whether IAM roles, OIDC federation, or other temporary credential mechanisms can replace your access keys.
