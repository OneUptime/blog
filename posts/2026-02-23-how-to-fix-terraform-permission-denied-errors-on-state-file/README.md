# How to Fix Terraform Permission Denied Errors on State File

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, State Management

Description: Fix Terraform permission denied errors on state files for local, S3, Azure Blob, and GCS backends including IAM policies and file permissions.

---

Terraform state files hold the mapping between your configuration and real infrastructure. When Terraform cannot read or write the state file due to permission errors, it cannot plan or apply any changes. These errors can affect local state files, S3 backends, Azure Blob Storage, GCS, and Terraform Cloud. This guide walks through the fixes for each backend type.

## The Error

Permission denied errors vary by backend but generally look like:

```text
Error: Failed to load state

Error loading state: AccessDenied: Access Denied
  status code: 403, request id: XXXX
```

Or for local state:

```text
Error: Failed to save state

Error saving state: open terraform.tfstate: permission denied
```

Or for DynamoDB locking:

```text
Error: Error acquiring the state lock

Error message: AccessDeniedException: User: arn:aws:iam::123456789012:user/deploy
is not authorized to perform: dynamodb:PutItem on resource:
arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks
```

## Fix 1: Local State File Permissions

If you are using the default local backend, the state file is `terraform.tfstate` in your working directory.

```bash
# Check file permissions
ls -la terraform.tfstate

# Fix ownership
sudo chown $(whoami) terraform.tfstate terraform.tfstate.backup

# Fix permissions
chmod 644 terraform.tfstate terraform.tfstate.backup
```

If the file was created by a different user (like root or a CI user):

```bash
# Change ownership to your user
sudo chown $(whoami):$(whoami) terraform.tfstate
```

Also check the directory permissions - Terraform needs write access to the directory to create temporary files:

```bash
ls -la .
chmod 755 .
```

## Fix 2: S3 Backend Permissions

The S3 backend requires specific IAM permissions for both the S3 bucket and the DynamoDB lock table.

### Minimum IAM Policy for S3 Backend

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3StateAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketVersioning"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state"
    },
    {
      "Sid": "S3StateObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state/*"
    },
    {
      "Sid": "DynamoDBLockAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/terraform-locks"
    }
  ]
}
```

### S3 Bucket Policy Conflicts

Even with the right IAM permissions, a restrictive bucket policy can deny access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-terraform-state/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

If the bucket requires KMS encryption, configure it in your backend:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
  }
}
```

And add KMS permissions to your IAM policy:

```json
{
  "Sid": "KMSAccess",
  "Effect": "Allow",
  "Action": [
    "kms:Decrypt",
    "kms:Encrypt",
    "kms:GenerateDataKey"
  ],
  "Resource": "arn:aws:kms:us-east-1:123456789012:key/my-key-id"
}
```

### Debugging S3 Permissions

```bash
# Check your current identity
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://my-terraform-state/
aws s3 cp s3://my-terraform-state/prod/terraform.tfstate /dev/null

# Test DynamoDB access
aws dynamodb get-item --table-name terraform-locks --key '{"LockID":{"S":"my-terraform-state/prod/terraform.tfstate"}}'
```

## Fix 3: Azure Blob Storage Permissions

For the Azure backend:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "terraformstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

Required permissions:

- **Storage Blob Data Contributor** role on the storage container
- Or **Storage Blob Data Owner** for full control

```bash
# Assign the role
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee user@example.com \
  --scope /subscriptions/SUBSCRIPTION_ID/resourceGroups/terraform-state-rg/providers/Microsoft.Storage/storageAccounts/terraformstate/blobServices/default/containers/tfstate
```

Check access:

```bash
# List blobs in the container
az storage blob list \
  --account-name terraformstate \
  --container-name tfstate \
  --auth-mode login
```

If using access keys instead of Azure AD:

```bash
# Get the storage account key
az storage account keys list --account-name terraformstate --resource-group terraform-state-rg

# Export for Terraform
export ARM_ACCESS_KEY="your-storage-access-key"
```

## Fix 4: GCS Backend Permissions

For Google Cloud Storage:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"
  }
}
```

Required permissions:

- `storage.objects.get`
- `storage.objects.create`
- `storage.objects.delete`
- `storage.objects.update`
- `storage.buckets.get`

The simplest role is **Storage Object Admin** on the bucket:

```bash
# Grant access
gsutil iam ch user:deploy@my-project.iam.gserviceaccount.com:roles/storage.objectAdmin gs://my-terraform-state

# Verify access
gsutil ls gs://my-terraform-state/
```

Check your current authentication:

```bash
gcloud auth list
gcloud config get-value project
```

## Fix 5: Terraform Cloud Permissions

In Terraform Cloud, state access is controlled by workspace permissions:

- **Read access** - Can view state
- **Write access** - Can create runs
- **Admin access** - Can manage workspace settings

If you get permission errors with Terraform Cloud:

1. Check your API token:

```bash
# Verify the token works
curl -s -H "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/account/details | jq '.data.attributes.username'
```

2. Check workspace permissions in the Terraform Cloud UI.

3. Verify the organization and workspace names match:

```hcl
terraform {
  cloud {
    organization = "my-org"    # Must match exactly
    workspaces {
      name = "my-workspace"    # Must match exactly
    }
  }
}
```

## Fix 6: Cross-Account State Access

If your state is in one AWS account and you are running Terraform from another:

```hcl
terraform {
  backend "s3" {
    bucket         = "central-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    role_arn       = "arn:aws:iam::CENTRAL_ACCOUNT:role/terraform-state-access"
    dynamodb_table = "terraform-locks"
  }
}
```

The role in the central account needs:
1. A trust policy allowing your account to assume it
2. Permissions to access the S3 bucket and DynamoDB table

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::YOUR_ACCOUNT:root"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Fix 7: State File Recovery

If permissions were accidentally removed and you have lost access to the state:

1. **Fix the permissions** - Restore IAM policies, bucket policies, or role assignments.

2. **If you have a local backup:**

```bash
# Check for a local backup
ls -la terraform.tfstate.backup

# Restore from backup
cp terraform.tfstate.backup terraform.tfstate
```

3. **If you have S3 versioning enabled:**

```bash
# List state file versions
aws s3api list-object-versions --bucket my-terraform-state --prefix prod/terraform.tfstate

# Download a specific version
aws s3api get-object --bucket my-terraform-state --key prod/terraform.tfstate --version-id VERSION_ID recovered-state.json
```

## Best Practices

1. **Use least-privilege IAM policies** - Grant only the permissions Terraform needs.
2. **Enable bucket versioning** - Allows recovery from accidental state corruption.
3. **Encrypt state at rest** - State files contain sensitive data.
4. **Use separate credentials for state access** - Do not reuse application credentials.
5. **Enable access logging** - Track who accesses the state file.
6. **Test permissions before migration** - Verify access before moving state to a new backend.

## Conclusion

Permission denied errors on state files are about access control, not Terraform itself. Identify which backend you are using, check the credentials Terraform is running with, and verify the permissions match what the backend requires. For cloud backends, use the cloud provider's CLI to test access independently of Terraform. And always keep state files backed up and versioned so you can recover from permission mishaps.
