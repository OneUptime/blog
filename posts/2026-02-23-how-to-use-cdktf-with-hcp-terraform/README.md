# How to Use CDKTF with HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, HCP Terraform, Terraform Cloud, DevOps

Description: Learn how to integrate CDKTF with HCP Terraform for managed state, remote execution, policy enforcement, and team collaboration features.

---

HCP Terraform (formerly Terraform Cloud) is HashiCorp's managed platform for Terraform. It handles state management, provides remote execution, offers policy enforcement with Sentinel, and gives your team a web-based UI for managing infrastructure. CDKTF integrates directly with HCP Terraform, and using the two together gives you a solid workflow for team-based infrastructure management. This guide covers the setup and key integration points.

## What HCP Terraform Adds to CDKTF

On its own, CDKTF generates Terraform configurations and can apply them locally. Adding HCP Terraform gives you:

- **Managed state storage** with encryption and locking built in
- **Remote execution** so plans and applies run in a consistent environment
- **Variable management** for secrets and environment-specific values
- **Policy as code** with Sentinel or OPA
- **Run history** showing every plan and apply
- **Team permissions** for controlling who can approve deployments
- **VCS integration** for triggering runs from pull requests

## Setting Up HCP Terraform

First, create an HCP Terraform account and organization:

```bash
# Install the Terraform CLI if you do not have it
brew install terraform

# Login to HCP Terraform
terraform login

# This opens a browser to generate an API token
# The token is stored in ~/.terraform.d/credentials.tfrc.json
```

Create an organization and workspace through the web UI at app.terraform.io, or use the API.

## Configuring CDKTF with the Cloud Backend

The `CloudBackend` class connects your CDKTF application to HCP Terraform:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, CloudBackend, NamedCloudWorkspace } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

class ProductionStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Connect this stack to HCP Terraform
    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "my-company",
      workspaces: new NamedCloudWorkspace("production-infra"),
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define resources as usual
  }
}

const app = new App();
new ProductionStack(app, "production");
app.synth();
```

## Using Tag-based Workspaces

For projects with multiple stacks, you can use tag-based workspace selection:

```typescript
import { TaggedCloudWorkspaces } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string, environment: string) {
    super(scope, id);

    // Use tags to group related workspaces
    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "my-company",
      workspaces: new TaggedCloudWorkspaces(["app", environment]),
    });
  }
}
```

## Setting Up Variables in HCP Terraform

HCP Terraform manages variables for you, which is especially useful for secrets:

```bash
# Set a variable using the Terraform CLI
# First, make sure you have the TFE provider or use the API

# Or set variables through the API
curl \
  --header "Authorization: Bearer $TF_API_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "vars",
      "attributes": {
        "key": "AWS_ACCESS_KEY_ID",
        "value": "your-access-key",
        "category": "env",
        "sensitive": true
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/vars"
```

In your CDKTF code, reference these as Terraform variables:

```typescript
import { TerraformVariable } from "cdktf";

class ProductionStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "my-company",
      workspaces: new NamedCloudWorkspace("production"),
    });

    // These variables are set in HCP Terraform's workspace settings
    const dbPassword = new TerraformVariable(this, "db_password", {
      type: "string",
      description: "Database password",
      sensitive: true,
    });

    const environment = new TerraformVariable(this, "environment", {
      type: "string",
      default: "production",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Use the variables in resource configuration
    new DbInstance(this, "database", {
      engine: "postgres",
      instanceClass: "db.t3.medium",
      password: dbPassword.value,
      tags: {
        Environment: environment.value,
      },
    });
  }
}
```

## Remote Execution vs Local Execution

HCP Terraform supports two execution modes:

### Remote Execution (Default)

Plans and applies run on HCP Terraform's infrastructure:

```typescript
// No special configuration needed - remote execution is the default
new CloudBackend(this, {
  hostname: "app.terraform.io",
  organization: "my-company",
  workspaces: new NamedCloudWorkspace("production"),
});
```

With remote execution, `cdktf deploy` sends the configuration to HCP Terraform, which runs the plan and apply. You see the output streamed back to your terminal.

### Local Execution

Plans and applies run on your machine, but state is stored in HCP Terraform:

Set the execution mode in the workspace settings through the UI, or use the API:

```bash
# Set workspace to local execution
curl \
  --header "Authorization: Bearer $TF_API_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "workspaces",
      "attributes": {
        "execution-mode": "local"
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID"
```

## Deploying with HCP Terraform

The deployment workflow is the same as without HCP Terraform:

```bash
# Synthesize the configuration
cdktf synth

# Preview changes (runs on HCP Terraform if remote execution)
cdktf diff

# Deploy (runs on HCP Terraform if remote execution)
cdktf deploy

# You will see the plan output streamed from HCP Terraform
# If approval is required, you will be prompted
```

## Working with Multiple Environments

A common pattern is creating workspaces per environment:

```typescript
interface EnvironmentConfig {
  name: string;
  instanceType: string;
  minCapacity: number;
}

const environments: EnvironmentConfig[] = [
  { name: "dev", instanceType: "t3.micro", minCapacity: 1 },
  { name: "staging", instanceType: "t3.small", minCapacity: 2 },
  { name: "production", instanceType: "t3.medium", minCapacity: 3 },
];

const app = new App();

environments.forEach((env) => {
  const stack = new ApplicationStack(app, `app-${env.name}`, env);

  // Each environment gets its own HCP Terraform workspace
  new CloudBackend(stack, {
    hostname: "app.terraform.io",
    organization: "my-company",
    workspaces: new NamedCloudWorkspace(`app-${env.name}`),
  });
});

app.synth();
```

Wait - there is a subtlety here. The `CloudBackend` must be created inside the stack constructor, not outside it. Let us fix that:

```typescript
class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string, env: EnvironmentConfig) {
    super(scope, id);

    // Backend configured inside the stack
    new CloudBackend(this, {
      hostname: "app.terraform.io",
      organization: "my-company",
      workspaces: new NamedCloudWorkspace(`app-${env.name}`),
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Resources configured based on environment
    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: env.instanceType,
    });
  }
}
```

## Using Run Triggers

HCP Terraform supports run triggers, where a successful apply in one workspace can automatically trigger a run in another workspace. This is useful for stack dependencies:

```bash
# Set up a run trigger via the API
# When the "network" workspace completes, trigger the "application" workspace
curl \
  --header "Authorization: Bearer $TF_API_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "relationships": {
        "sourceable": {
          "data": {
            "id": "ws-network-workspace-id",
            "type": "workspaces"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/workspaces/$APP_WORKSPACE_ID/run-triggers"
```

## Cost Estimation and Policy Checks

HCP Terraform can estimate costs and enforce policies before applying:

```typescript
// Cost estimation is configured at the organization level
// Sentinel policies are configured as policy sets

// Your CDKTF code does not need any changes
// HCP Terraform runs these checks automatically during the plan phase
```

## Best Practices

1. **Use remote execution for production**. It ensures a consistent execution environment and prevents local machine differences from affecting deployments.

2. **Store secrets in HCP Terraform variables**. Mark them as sensitive so they are encrypted and hidden in the UI.

3. **Set up approval workflows**. Require manual approval for production deployments using the workspace settings.

4. **Use run triggers** to chain dependent stacks in the correct order.

5. **Enable cost estimation** to catch expensive resources before they are created.

6. **Use Sentinel policies** to enforce organizational standards like tagging requirements and approved instance types.

HCP Terraform adds the team collaboration and governance features that CDKTF does not provide on its own. The combination gives you a complete infrastructure-as-code platform. For more on CDKTF deployment, see our guide on [deploying CDKTF applications](https://oneuptime.com/blog/post/2026-02-23-how-to-deploy-cdktf-applications/view).
