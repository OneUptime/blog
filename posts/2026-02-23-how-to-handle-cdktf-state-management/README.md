# How to Handle CDKTF State Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, State Management, Infrastructure as Code, DevOps

Description: Learn how to manage Terraform state effectively in CDKTF projects, including state storage, locking, migration, import, and troubleshooting common issues.

---

Terraform state is the source of truth for your infrastructure. It tracks which real resources correspond to which definitions in your code. Without state, Terraform would not know what already exists and what needs to be created. In CDKTF, state management works the same way as in plain Terraform, but there are CDKTF-specific considerations around multi-stack state, synthesis, and the relationship between your TypeScript code and the generated configuration. This guide covers everything you need to know.

## How State Works in CDKTF

When you run `cdktf deploy`, the following happens:

1. Your TypeScript code runs and generates Terraform JSON in `cdktf.out/stacks/<stack-name>/`
2. Terraform initializes in that directory
3. Terraform reads the current state
4. Terraform compares the state to the generated configuration
5. Terraform creates, updates, or deletes resources to match
6. Terraform writes the updated state

Each CDKTF stack has its own state file. This is fundamental - resources in different stacks are tracked independently.

## State File Contents

A state file contains:

```json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "serial": 42,
  "lineage": "unique-id-for-this-state",
  "outputs": {
    "vpc_id": {
      "value": "vpc-abc123",
      "type": "string"
    }
  },
  "resources": [
    {
      "mode": "managed",
      "type": "aws_vpc",
      "name": "main_vpc_12345",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "attributes": {
            "id": "vpc-abc123",
            "cidr_block": "10.0.0.0/16"
          }
        }
      ]
    }
  ]
}
```

State files can contain sensitive data like database passwords, API keys, and certificates. Treat them as sensitive.

## Configuring State Storage

### Local State (Development Only)

By default, CDKTF stores state locally in `cdktf.out`:

```typescript
import { App, TerraformStack } from "cdktf";

// No backend configuration means local state
class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // State goes to cdktf.out/stacks/my-stack/terraform.tfstate
  }
}
```

### Remote State with S3

For teams and production:

```typescript
import { S3Backend } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "my-terraform-state",
      key: `stacks/${id}/terraform.tfstate`,
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });
  }
}
```

### Consistent Backend Configuration

Create a helper to ensure all stacks use the same backend:

```typescript
function configureBackend(stack: TerraformStack, stackName: string): void {
  new S3Backend(stack, {
    bucket: "company-terraform-state",
    key: `cdktf/${stackName}/terraform.tfstate`,
    region: "us-east-1",
    encrypt: true,
    dynamodbTable: "terraform-state-lock",
    // Workspace prefix if using workspaces
  });
}

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    configureBackend(this, id);
    // Resources
  }
}

class AppStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    configureBackend(this, id);
    // Resources
  }
}
```

## State Locking

State locking prevents two deployments from modifying state simultaneously. Different backends handle locking differently:

- **S3**: Uses DynamoDB for locking
- **Azure Blob**: Uses blob leases
- **GCS**: Uses native GCS locking
- **HCP Terraform**: Built-in locking

```bash
# If a lock gets stuck (use with extreme caution)
cd cdktf.out/stacks/my-stack
terraform force-unlock LOCK_ID
```

## Importing Existing Resources

When you want CDKTF to manage resources that already exist:

```typescript
class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define the resource in your code
    const vpc = new Vpc(this, "existing-vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      tags: { Name: "production-vpc" },
    });
  }
}
```

Then import the existing resource:

```bash
# Synthesize first
cdktf synth

# Navigate to the stack directory
cd cdktf.out/stacks/my-stack

# Import the existing resource
# The address uses the CDKTF-generated name
terraform import aws_vpc.existing-vpc_12345 vpc-abc123def

# Verify no changes are planned
terraform plan
# Should show "No changes"
```

To find the correct resource address:

```bash
# Look at the generated configuration to find resource addresses
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq '.resource.aws_vpc'
```

## State Migration

### Moving from Local to Remote

```bash
# 1. Update your code to include a remote backend
# 2. Synthesize
cdktf synth

# 3. Navigate to stack directory
cd cdktf.out/stacks/my-stack

# 4. Run init with migration
terraform init -migrate-state

# 5. Confirm the migration
# Type "yes" when prompted
```

### Moving State Between Backends

```bash
# 1. Pull current state
cd cdktf.out/stacks/my-stack
terraform state pull > backup.tfstate

# 2. Update backend configuration in your CDKTF code
# 3. Synthesize
cdktf synth

# 4. Initialize with the new backend
cd cdktf.out/stacks/my-stack
terraform init -migrate-state
```

## Renaming Resources

When you rename a resource in your CDKTF code, Terraform sees it as a delete and create. To avoid destroying and recreating the resource, use `terraform state mv`:

```bash
# If you rename a construct ID from "web-server" to "app-server"
cd cdktf.out/stacks/my-stack

# Find the old and new resource addresses
terraform state list

# Move the state
terraform state mv \
  'aws_instance.web-server_OLDID' \
  'aws_instance.app-server_NEWID'
```

## Removing Resources from State

Sometimes you need to stop managing a resource without destroying it:

```bash
cd cdktf.out/stacks/my-stack

# Remove from state (resource continues to exist in the cloud)
terraform state rm 'aws_s3_bucket.old-bucket_12345'
```

## State File Backup and Recovery

Always back up state before risky operations:

```bash
# Pull and save state backup
cd cdktf.out/stacks/my-stack
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json

# If you need to restore
terraform state push state-backup-20240215-143022.json
```

For remote backends with versioning (like S3 with versioning), you can recover previous state versions through the storage provider.

## Multi-Stack State Considerations

Each stack has independent state, which means:

```typescript
const app = new App();

// Each of these produces a separate state file
new NetworkStack(app, "network");     // State: network/terraform.tfstate
new DatabaseStack(app, "database");   // State: database/terraform.tfstate
new AppStack(app, "application");     // State: application/terraform.tfstate
```

When refactoring resources between stacks, you need to move state:

```bash
# Moving a resource from network stack to application stack

# 1. Pull state from source stack
cd cdktf.out/stacks/network
terraform state pull > network-state.json

# 2. Remove from source
terraform state rm 'aws_security_group.app-sg_12345'

# 3. Import into destination
cd cdktf.out/stacks/application
terraform import 'aws_security_group.app-sg_67890' sg-abc123
```

## Troubleshooting Common Issues

### State Out of Sync

If someone manually deleted a resource:

```bash
# Terraform will try to update a non-existent resource and fail
cdktf deploy my-stack

# Remove the resource from state
cd cdktf.out/stacks/my-stack
terraform state rm 'aws_instance.deleted_resource_12345'

# Then deploy again - it will create a new resource
cdktf deploy my-stack
```

### State Lock Not Released

```bash
# Find and force-unlock the state
cd cdktf.out/stacks/my-stack
terraform force-unlock <lock-id>
```

### Corrupted State

```bash
# Restore from the remote backend's versioned state
# For S3:
aws s3api list-object-versions --bucket my-terraform-state --prefix stacks/my-stack/
aws s3api get-object --bucket my-terraform-state --key stacks/my-stack/terraform.tfstate \
  --version-id "previous-version-id" restored-state.json

# Push the restored state
terraform state push restored-state.json
```

## Best Practices

1. **Always use remote state for shared infrastructure**. Local state does not support collaboration.

2. **Enable state locking**. Concurrent modifications corrupt state.

3. **Enable versioning on state storage**. It is your safety net for recovery.

4. **Encrypt state at rest and in transit**. State contains sensitive data.

5. **Use separate state per stack**. CDKTF does this automatically, which is the right approach.

6. **Back up state before risky operations**. Import, move, and remove operations can go wrong.

7. **Audit state access**. Know who can read and write your state files.

State management is one of those things that you rarely think about until something goes wrong. Setting it up correctly from the start saves enormous pain later. For more on state backends, see our guide on [CDKTF remote backends](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-remote-backends/view).
