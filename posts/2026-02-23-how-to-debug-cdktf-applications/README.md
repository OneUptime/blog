# How to Debug CDKTF Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Debugging, TypeScript, Infrastructure as Code

Description: Practical techniques for debugging CDKTF applications including synthesis errors, plan failures, runtime issues, and strategies for troubleshooting infrastructure code.

---

Debugging infrastructure code is different from debugging application code. When something goes wrong in CDKTF, the problem could be in your TypeScript code, in the generated Terraform configuration, in the Terraform plan, or in the actual cloud API call. Knowing where to look and what tools to use at each stage makes the difference between spending five minutes or five hours on a problem. This guide covers debugging techniques for every stage of the CDKTF lifecycle.

## Understanding Where Errors Occur

CDKTF errors fall into four categories:

1. **Synthesis errors**: Your TypeScript code fails to run
2. **Validation errors**: The generated configuration is invalid
3. **Plan errors**: Terraform cannot calculate the changes
4. **Apply errors**: The cloud API rejects the request

Each category needs different debugging techniques.

## Debugging Synthesis Errors

Synthesis errors happen when `cdktf synth` fails. These are typically TypeScript errors:

```bash
# Run synthesis with verbose output
cdktf synth --log-level debug

# Or set the environment variable
export CDKTF_LOG_LEVEL=debug
cdktf synth
```

### Common Synthesis Errors

**Missing provider**: You forgot to instantiate a provider before creating resources.

```typescript
// ERROR: No provider found for aws
class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Missing: new AwsProvider(this, "aws", { region: "us-east-1" });
    new S3Bucket(this, "bucket", { bucket: "my-bucket" });
  }
}
```

**Wrong construct scope**: You passed the wrong scope to a resource.

```typescript
// ERROR: Resources must be created within a stack or construct
const app = new App();
const stack = new MyStack(app, "stack");
// Wrong: creating resource with app as scope instead of stack
new S3Bucket(app, "bucket", { bucket: "my-bucket" }); // Bug!
```

**Type errors**: TypeScript catches many errors at compile time.

```bash
# Run TypeScript compiler to check for type errors
npx tsc --noEmit

# This catches things like:
# - Wrong property names
# - Missing required properties
# - Wrong types for properties
```

## Inspecting Generated Configuration

After synthesis, inspect the generated Terraform JSON:

```bash
# Synthesize
cdktf synth

# View the generated configuration for a stack
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq .

# View just the resources
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq '.resource'

# View a specific resource type
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq '.resource.aws_s3_bucket'

# Check the providers
cat cdktf.out/stacks/my-stack/cdk.tf.json | jq '.provider'
```

Comparing the generated JSON to what you expect is often the fastest way to find configuration issues.

## Using Console.log for Debugging

Since CDKTF runs as regular TypeScript, you can use `console.log`:

```typescript
class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    // Debug: print the VPC's token value
    console.log("VPC ID token:", vpc.id);
    // Output: VPC ID token: ${aws_vpc.vpc_12345.id}

    // Debug: print configuration values
    console.log("VPC CIDR:", vpc.cidrBlockInput);
    // Output: VPC CIDR: 10.0.0.0/16

    // Debug: check if a value is a token
    console.log("Is token?", Token.isUnresolved(vpc.id));
    // Output: Is token? true
  }
}
```

Remember that token values will show as Terraform expressions, not actual values.

## Debugging Plan Errors

When `cdktf diff` or `cdktf deploy` fails during the plan phase:

```bash
# Run diff with detailed output
cdktf diff my-stack

# For more detail, run Terraform directly
cd cdktf.out/stacks/my-stack
terraform init
terraform plan

# For even more detail, enable Terraform debug logging
TF_LOG=DEBUG terraform plan
```

### Common Plan Errors

**Missing credentials**:

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check Azure credentials
az account show

# Check GCP credentials
gcloud auth list
```

**Resource not found** (for data sources):

```text
Error: Error describing VPC: VPCNotFound
```

This means the data source is looking for a resource that does not exist. Check the filter criteria.

**Invalid attribute value**:

```text
Error: expected cidr_block to be a valid CIDR
```

Check the generated JSON to see what value was produced for that attribute.

## Debugging Apply Errors

Apply errors come from the cloud API. They often include specific error codes:

```bash
# Deploy with detailed logging
TF_LOG=DEBUG cdktf deploy my-stack

# Common errors and what they mean:
# "AccessDenied" - IAM permissions issue
# "ResourceAlreadyExists" - Resource with that name already exists
# "InvalidParameterValue" - Bad configuration value
# "LimitExceeded" - Account limit reached
```

### Debugging Specific Apply Errors

**Permission denied**:

```bash
# Check what permissions your credentials have
aws iam get-user
aws iam list-attached-user-policies --user-name your-user

# Simulate whether a specific action is allowed
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:user/your-user \
  --action-names s3:CreateBucket
```

**Resource name conflicts**:

```typescript
// If a globally unique name is already taken, make it unique
new S3Bucket(this, "bucket", {
  // Add a random suffix or use a naming convention
  bucket: `my-bucket-${Date.now()}`,
});
```

## Using the Node.js Debugger

For complex synthesis issues, use the Node.js debugger:

```json
// Add to package.json scripts
{
  "scripts": {
    "debug": "node --inspect-brk node_modules/.bin/cdktf synth"
  }
}
```

```bash
# Start with debugging
npm run debug

# Attach your IDE's debugger (VS Code, WebStorm, etc.)
# Set breakpoints in your TypeScript code
```

In VS Code, create a launch configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CDKTF Synth",
      "program": "${workspaceFolder}/node_modules/.bin/cdktf",
      "args": ["synth"],
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Debugging State Issues

When state gets out of sync:

```bash
cd cdktf.out/stacks/my-stack

# List all resources in state
terraform state list

# Show details of a specific resource
terraform state show 'aws_vpc.main_vpc_12345'

# Compare state to actual infrastructure
terraform plan -refresh-only
```

## Debugging Cross-Stack References

Cross-stack references can be tricky. Verify they resolve correctly:

```typescript
class NetworkStack extends TerraformStack {
  public readonly vpcId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });
    this.vpcId = vpc.id;

    // Debug: verify the output is set
    console.log("Network stack VPC ID:", this.vpcId);
  }
}

class AppStack extends TerraformStack {
  constructor(scope: Construct, id: string, vpcId: string) {
    super(scope, id);

    // Debug: verify the received value
    console.log("App stack received VPC ID:", vpcId);

    // Check the generated JSON to verify the remote state reference
  }
}
```

## Using Tests for Debugging

When something does not work as expected, write a test to isolate the issue:

```typescript
import { Testing } from "cdktf";

describe("debugging test", () => {
  it("should produce the expected configuration", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test");
    const synthesized = Testing.synth(stack);

    // Parse and inspect the generated configuration
    const config = JSON.parse(synthesized);
    console.log(JSON.stringify(config, null, 2));

    // Check specific parts
    const vpcConfig = config.resource?.aws_vpc;
    console.log("VPC config:", JSON.stringify(vpcConfig, null, 2));
  });
});
```

## Common Debugging Checklist

When something goes wrong, work through this checklist:

1. **Check TypeScript compilation**: `npx tsc --noEmit`
2. **Check synthesis**: `cdktf synth` - does it complete without errors?
3. **Inspect generated JSON**: Is the configuration what you expect?
4. **Check credentials**: Are you authenticated to the right account/subscription?
5. **Check permissions**: Does your IAM role/service principal have the required permissions?
6. **Check resource limits**: Have you hit any service quotas?
7. **Check state**: Is the state in sync with reality?
8. **Read the full error message**: Cloud API errors usually tell you exactly what is wrong.

## Best Practices

1. **Start with synthesis**. Most bugs are in your TypeScript code, not in Terraform.

2. **Inspect the generated JSON**. When in doubt about what CDKTF produces, look at the output.

3. **Use tests to isolate issues**. A failing test is the fastest path to a fix.

4. **Enable verbose logging when needed**. `CDKTF_LOG_LEVEL=debug` and `TF_LOG=DEBUG` reveal what is happening under the hood.

5. **Keep changes small**. Deploy frequently with small changes so you know exactly what caused a problem.

6. **Read the error message carefully**. It sounds obvious, but the error message almost always points to the issue.

Debugging CDKTF gets easier with experience. The key insight is that there are multiple layers, and knowing which layer has the problem is half the battle. For more on CDKTF testing, see our guide on [testing CDKTF configurations](https://oneuptime.com/blog/post/2026-02-23-how-to-test-cdktf-configurations/view).
