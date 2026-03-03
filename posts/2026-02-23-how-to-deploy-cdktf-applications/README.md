# How to Deploy CDKTF Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Deployment, Infrastructure as Code, DevOps

Description: A comprehensive guide to deploying CDKTF applications covering synthesis, planning, applying, and managing the full deployment lifecycle.

---

Deploying a CDKTF application involves several stages: writing your code, synthesizing it into Terraform configuration, planning the changes, and applying them. Each stage has its own commands, options, and considerations. This guide walks through the entire deployment lifecycle, from your first deploy to managing production infrastructure.

## The Deployment Lifecycle

CDKTF deployment follows a clear sequence:

1. **Write** - Define your infrastructure in TypeScript (or another language)
2. **Synthesize** - Convert your code to Terraform JSON
3. **Plan** - Preview what changes Terraform will make
4. **Apply** - Create, update, or destroy the actual resources
5. **Destroy** - Remove infrastructure when no longer needed

## Synthesis: From Code to Configuration

The `cdktf synth` command runs your code and generates Terraform JSON:

```bash
# Synthesize all stacks
cdktf synth

# The output goes to cdktf.out/
# Each stack gets its own directory
ls cdktf.out/stacks/
# my-stack/
#   cdk.tf.json  - The Terraform configuration
```

You can inspect the generated JSON to verify your configuration:

```bash
# View the generated Terraform configuration
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq .
```

Synthesis runs your TypeScript code in Node.js. Any errors in your code will surface during this step. This is also when aspects run and lazy values resolve.

## Planning: Preview Changes

The `cdktf diff` command runs synthesis and then runs `terraform plan`:

```bash
# Plan all stacks
cdktf diff

# Plan a specific stack
cdktf diff my-stack

# The output shows what will be created, changed, or destroyed
```

Example output:

```text
Stack: my-stack
  + aws_vpc.main-vpc
  + aws_subnet.public-subnet
  + aws_instance.web-server

Resources
  + 3 to create
```

Always review the plan before applying. Unexpected changes usually mean a bug in your code.

## Applying: Deploy Infrastructure

The `cdktf deploy` command synthesizes, plans, and applies:

```bash
# Deploy all stacks (with confirmation prompt)
cdktf deploy '*'

# Deploy a specific stack
cdktf deploy my-stack

# Deploy multiple specific stacks
cdktf deploy network-stack application-stack

# Auto-approve without confirmation prompt
cdktf deploy my-stack --auto-approve

# Deploy with parallelism control
cdktf deploy '*' --parallelism 5
```

During deployment, CDKTF shows the progress of each resource:

```text
Deploying Stack: my-stack

  aws_vpc.main-vpc: Creating...
  aws_vpc.main-vpc: Creation complete [id=vpc-abc123]
  aws_subnet.public-subnet: Creating...
  aws_subnet.public-subnet: Creation complete [id=subnet-def456]
  aws_instance.web-server: Creating...
  aws_instance.web-server: Still creating... [10s elapsed]
  aws_instance.web-server: Creation complete [id=i-ghi789]

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:
  instance-ip = "54.234.56.78"
```

## Reading Outputs

After deployment, retrieve output values:

```bash
# Show outputs for a stack
cdktf output my-stack

# Output in JSON format
cdktf output my-stack --outputs-file outputs.json
```

## Destroying Infrastructure

When you no longer need the infrastructure:

```bash
# Destroy all stacks
cdktf destroy '*'

# Destroy a specific stack
cdktf destroy my-stack

# Auto-approve destruction
cdktf destroy my-stack --auto-approve
```

Be careful with destroy in production. Consider using lifecycle rules like `preventDestroy` on critical resources.

## Environment-Specific Deployments

Use environment variables or configuration to control deployments per environment:

```typescript
// Read the environment from an environment variable
const environment = process.env.DEPLOY_ENV || "development";

const config: Record<string, { region: string; instanceType: string }> = {
  development: { region: "us-east-1", instanceType: "t3.micro" },
  staging: { region: "us-east-1", instanceType: "t3.small" },
  production: { region: "us-east-1", instanceType: "t3.medium" },
};

const envConfig = config[environment];

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: envConfig.region });

    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: envConfig.instanceType,
      tags: {
        Environment: environment,
      },
    });
  }
}
```

Deploy to different environments:

```bash
# Deploy to development
DEPLOY_ENV=development cdktf deploy my-stack

# Deploy to staging
DEPLOY_ENV=staging cdktf deploy my-stack

# Deploy to production
DEPLOY_ENV=production cdktf deploy my-stack
```

## Handling Deployment Failures

Deployments can fail for many reasons. Here is how to handle common situations:

### Partial Failure

If a deployment partially completes, Terraform state reflects what was actually created. Running `cdktf deploy` again will pick up where it left off:

```bash
# First attempt fails halfway through
cdktf deploy my-stack
# Error creating aws_instance.web-server: rate limit exceeded

# Second attempt continues from where it stopped
cdktf deploy my-stack
# Only the failed resources are retried
```

### State Lock Errors

If a deployment is interrupted and the state lock is not released:

```bash
# Check if there is a stale lock
cd cdktf.out/stacks/my-stack
terraform force-unlock LOCK_ID
```

### Drift Detection

Resources may have been changed outside of Terraform. Detect drift with:

```bash
# Run a plan to see if reality matches state
cdktf diff my-stack

# If there are unexpected changes, decide whether to:
# 1. Apply to overwrite manual changes
# 2. Import the changes into your code
```

## Deployment with Terraform Variables

Pass variables at deployment time:

```typescript
import { TerraformVariable } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const imageTag = new TerraformVariable(this, "image-tag", {
      type: "string",
      description: "Docker image tag to deploy",
    });

    // Use the variable
    // ...
  }
}
```

```bash
# Pass variables via environment variables
export TF_VAR_image_tag="v1.2.3"
cdktf deploy my-stack

# Or via a .tfvars file
# Create terraform.tfvars in the stack output directory
```

## Blue-Green Deployment Pattern

For zero-downtime deployments:

```typescript
class BlueGreenStack extends TerraformStack {
  constructor(scope: Construct, id: string, activeColor: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create both blue and green environments
    const blue = new Instance(this, "blue", {
      ami: "ami-blue-version",
      instanceType: "t3.micro",
      tags: { Color: "blue" },
    });

    const green = new Instance(this, "green", {
      ami: "ami-green-version",
      instanceType: "t3.micro",
      tags: { Color: "green" },
    });

    // Point the load balancer at the active color
    // Switch between blue and green by changing activeColor
    const activeInstance = activeColor === "blue" ? blue : green;

    new LbTargetGroupAttachment(this, "active", {
      targetGroupArn: targetGroup.arn,
      targetId: activeInstance.id,
    });
  }
}
```

## Pre-deployment Checklist

Before deploying to production, verify:

```bash
# 1. Run tests
npm test

# 2. Synthesize and inspect
cdktf synth
cat cdktf.out/stacks/production/cdk.tf.json | jq .

# 3. Review the plan carefully
cdktf diff production

# 4. Check for any warnings from aspects
# Warnings appear during synthesis

# 5. Deploy with explicit approval
cdktf deploy production
# Review the plan one more time before typing "yes"
```

## Best Practices

1. **Always review plans before applying**. Never use `--auto-approve` in production without a thorough CI/CD pipeline.

2. **Deploy to lower environments first**. Use development and staging as gates before production.

3. **Keep deployments small**. Smaller changes are easier to review and less risky.

4. **Use remote backends** so state is shared and locked.

5. **Tag everything**. Tags help you identify what deployed what and when.

6. **Set up monitoring** for your deployed infrastructure. Use tools like OneUptime to monitor the health of your services.

Deploying CDKTF applications is straightforward once you understand the lifecycle. The key is developing good habits around planning, reviewing, and testing before applying changes. For more on automating deployments, see our guide on [CDKTF with CI/CD pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-with-ci-cd-pipelines/view).
