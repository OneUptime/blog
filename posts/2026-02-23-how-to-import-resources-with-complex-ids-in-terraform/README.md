# How to Import Resources with Complex IDs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, Resource IDs, State Management, Cloud Providers

Description: Learn how to import Terraform resources that have complex, compound, or non-obvious resource identifiers across different cloud providers.

---

Not all Terraform resources use simple identifiers for import. Many resources require compound IDs, use special delimiters, or have non-obvious ID formats that differ from what you see in the cloud console. This guide covers how to find and construct the correct import IDs for complex Terraform resources across AWS, Azure, GCP, and other providers.

## Why Resource IDs Are Complex

Different cloud providers and Terraform providers use different conventions for resource identification. Some resources are identified by a single attribute like a name or ARN. Others require a combination of parent resource IDs and their own identifiers. The Terraform provider documentation is your primary reference for import ID formats, but understanding the patterns helps when documentation is sparse.

## Common ID Patterns

Terraform providers use several common patterns for import IDs:

```bash
# Simple ID - just the resource identifier
terraform import aws_instance.web i-0abc123def456789a

# ARN-based ID
terraform import aws_iam_role.admin arn:aws:iam::123456789012:role/admin-role

# Compound ID with slash delimiter
terraform import aws_route_table_association.a subnet-0abc123/rtbassoc-0def456

# Compound ID with colon delimiter
terraform import aws_security_group_rule.ingress sg-0abc123:ingress:tcp:443:443:0.0.0.0/0

# Compound ID with pipe delimiter
terraform import azurerm_network_security_rule.rule1 "/subscriptions/.../rule1|/subscriptions/.../nsg1"

# Name-based ID with path
terraform import google_compute_firewall.default projects/my-project/global/firewalls/my-firewall
```

## AWS Complex Import IDs

Many AWS resources have compound IDs. Here are common examples:

### Security Group Rules

```bash
# Security group rules use a compound format:
# sg-id:type:protocol:from_port:to_port:source
terraform import aws_security_group_rule.allow_https \
  'sg-0abc123:ingress:tcp:443:443:0.0.0.0/0'

# For rules with security group sources
terraform import aws_security_group_rule.allow_internal \
  'sg-0abc123:ingress:tcp:0:65535:sg-0def456'

# For rules with IPv6 sources
terraform import aws_security_group_rule.allow_https_v6 \
  'sg-0abc123:ingress:tcp:443:443:::/0'
```

### Route Table Associations

```bash
# Route table associations use subnet-id/association-id
terraform import aws_route_table_association.public \
  'subnet-0abc123/rtbassoc-0def456'
```

### IAM Policy Attachments

```bash
# IAM role policy attachments use role-name/policy-arn
terraform import aws_iam_role_policy_attachment.admin \
  'admin-role/arn:aws:iam::aws:policy/AdministratorAccess'

# IAM user policy use user-name:policy-name
terraform import aws_iam_user_policy.user_policy \
  'my-user:my-policy'
```

### Route53 Records

```bash
# Route53 records use zone-id_record-name_record-type
terraform import aws_route53_record.www \
  'Z0123456789ABCDEF_www.example.com_A'

# For weighted or latency-based records, include the set identifier
terraform import aws_route53_record.www_weighted \
  'Z0123456789ABCDEF_www.example.com_A_us-east-1'
```

### Lambda Permissions

```bash
# Lambda permissions use function-name/statement-id
terraform import aws_lambda_permission.api_gateway \
  'my-function/AllowAPIGateway'
```

## Azure Complex Import IDs

Azure resources typically use their full Azure Resource Manager (ARM) resource ID:

```bash
# Virtual Machine
terraform import azurerm_linux_virtual_machine.web \
  '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Compute/virtualMachines/my-vm'

# Network Security Group Rule
terraform import azurerm_network_security_rule.allow_ssh \
  '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Network/networkSecurityGroups/my-nsg/securityRules/allow-ssh'

# Key Vault Secret
terraform import azurerm_key_vault_secret.db_password \
  'https://my-vault.vault.azure.net/secrets/db-password/abc123def456'

# Role Assignment
terraform import azurerm_role_assignment.contributor \
  '/subscriptions/00000000-0000-0000-0000-000000000000/providers/Microsoft.Authorization/roleAssignments/11111111-1111-1111-1111-111111111111'
```

Finding Azure resource IDs can be done through the portal or CLI:

```bash
# Find the resource ID using Azure CLI
az resource show \
  --resource-group my-rg \
  --resource-type "Microsoft.Compute/virtualMachines" \
  --name my-vm \
  --query id -o tsv

# List all resources in a resource group with their IDs
az resource list --resource-group my-rg --query '[].{Name:name, ID:id}' -o table
```

## GCP Complex Import IDs

GCP resources often use a project/region/name format:

```bash
# Compute Instance
terraform import google_compute_instance.web \
  'projects/my-project/zones/us-central1-a/instances/my-instance'

# Firewall Rule
terraform import google_compute_firewall.allow_http \
  'projects/my-project/global/firewalls/allow-http'

# Cloud SQL Database
terraform import google_sql_database.users \
  'projects/my-project/instances/my-sql-instance/databases/users'

# IAM Member (uses a special format)
terraform import google_project_iam_member.viewer \
  'my-project roles/viewer user:admin@example.com'

# Cloud Storage Bucket ACL
terraform import google_storage_bucket_acl.photos_acl \
  'my-photos-bucket'
```

For GCP, use gcloud to find resource details:

```bash
# List compute instances with their self links
gcloud compute instances list --format='table(name,selfLink)'

# Get details of a specific resource
gcloud compute instances describe my-instance \
  --zone=us-central1-a \
  --format='value(selfLink)'
```

## Finding the Correct Import ID

When documentation is unclear, use these strategies to determine the correct import ID:

### Check the Provider Documentation

```bash
# The Terraform registry has import examples for most resources
# Visit: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance#import
```

### Read the Provider Source Code

For resources without clear import documentation, check the provider source code. The import function is typically in the resource's Go file:

```bash
# Search for the import function in the provider source
# Look for functions named resourceImport or ImportState
```

### Use terraform state show

If you have a similar resource already managed by Terraform, examine its ID format:

```bash
# Show the full state of a managed resource
terraform state show aws_security_group_rule.existing

# The id attribute shows the format used
```

### Trial and Error with Helpful Errors

Some providers give helpful error messages when you use the wrong format:

```bash
# Attempt an import with an incorrect format
terraform import aws_security_group_rule.test sg-0abc123

# Error message might say:
# Error: unexpected format of ID ("sg-0abc123"),
# expected "sg-id_type_protocol_from-port_to-port_source"
```

## Using Import Blocks for Complex IDs

Import blocks handle complex IDs more cleanly because you avoid shell escaping:

```hcl
# Complex IDs are easier in import blocks
import {
  to = aws_security_group_rule.allow_https
  id = "sg-0abc123:ingress:tcp:443:443:0.0.0.0/0"
}

import {
  to = azurerm_network_security_rule.allow_ssh
  id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/my-rg/providers/Microsoft.Network/networkSecurityGroups/my-nsg/securityRules/allow-ssh"
}

import {
  to = google_project_iam_member.viewer
  id = "my-project roles/viewer user:admin@example.com"
}
```

## Handling Resources Without Import Support

Some Terraform resources do not support import at all. In these cases you have several options:

```hcl
# Option 1: Use a data source to reference the existing resource
data "aws_iam_policy_document" "existing" {
  # Recreate the policy document to match existing
}

# Option 2: Import the parent resource and let Terraform manage the child
# Some child resources are created automatically with the parent

# Option 3: Use terraform state push to manually add state entries
# (Advanced - use with extreme caution)
```

## Best Practices

Always check the Terraform provider documentation for the correct import ID format before attempting an import. Use import blocks instead of CLI commands for complex IDs to avoid shell quoting issues. When importing multiple related resources with complex IDs, document the ID format in comments so future team members understand the pattern. Test imports in a non-production environment first when you are unsure of the ID format.

## Conclusion

Importing resources with complex IDs is a matter of finding the right format for each resource type. The key resources are the provider documentation, the state of existing managed resources, and provider error messages. Import blocks make the process cleaner by eliminating shell escaping concerns. With the patterns covered in this guide, you should be able to handle most complex import scenarios across AWS, Azure, and GCP.

For more import strategies, see [How to Handle Import Conflicts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-import-conflicts-in-terraform/view) and [How to Verify Imported Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-verify-imported-resources-in-terraform/view).
