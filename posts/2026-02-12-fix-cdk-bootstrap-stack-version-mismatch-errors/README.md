# How to Fix CDK 'Bootstrap stack version mismatch' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Infrastructure as Code, DevOps

Description: Fix the CDK bootstrap stack version mismatch error by upgrading your bootstrap stack, understanding version requirements, and managing multi-account bootstrap strategies.

---

You try to deploy a CDK app and get an error like: "This CDK deployment requires bootstrap stack version X, but the current version is Y." Your CDK app needs a newer bootstrap stack than what's deployed in your AWS account. The fix is usually straightforward - re-bootstrap - but there's some nuance worth understanding.

## What Is the Bootstrap Stack?

CDK bootstrapping deploys a CloudFormation stack called `CDKToolkit` into your AWS account. This stack creates resources that CDK needs to deploy your apps:

- An S3 bucket for storing assets (Lambda code, Docker images, file assets)
- An ECR repository for Docker image assets
- IAM roles for CloudFormation, deployment, and publishing
- A version SSM parameter that tracks the bootstrap version

Each version of CDK may require a minimum bootstrap version. When your CDK app requires a feature that wasn't in the deployed bootstrap stack, you get the mismatch error.

## Check Current Bootstrap Version

```bash
# Check the bootstrap version in your account
aws ssm get-parameter \
    --name /cdk-bootstrap/hnb659fds/version \
    --query 'Parameter.Value'

# Or check the CDKToolkit stack directly
aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --query 'Stacks[0].Outputs[?OutputKey==`BootstrapVersion`].OutputValue'
```

## Fix: Re-Bootstrap Your Account

The fix is to run `cdk bootstrap` again. It updates the existing stack without destroying your existing assets:

```bash
# Basic bootstrap for a single account/region
npx cdk bootstrap aws://123456789012/us-east-1
```

If you're using a specific profile:

```bash
npx cdk bootstrap aws://123456789012/us-east-1 --profile my-profile
```

For multiple regions:

```bash
# Bootstrap multiple regions
for region in us-east-1 us-west-2 eu-west-1; do
    echo "Bootstrapping $region..."
    npx cdk bootstrap aws://123456789012/$region
done
```

## Customized Bootstrap

If you've customized your bootstrap template (which is common in enterprise environments), you need to re-apply the custom template:

```bash
# Generate the default bootstrap template
npx cdk bootstrap --show-template > bootstrap-template.yaml

# Edit it with your customizations
# Then deploy
npx cdk bootstrap \
    --template bootstrap-template.yaml \
    aws://123456789012/us-east-1
```

Common customizations include:
- Custom KMS keys for encryption
- VPC endpoints for the S3 bucket
- Custom bucket policies
- Specific IAM permission boundaries

```bash
# Bootstrap with custom options
npx cdk bootstrap aws://123456789012/us-east-1 \
    --cloudformation-execution-policies "arn:aws:iam::aws:policy/AdministratorAccess" \
    --qualifier myapp \
    --toolkit-stack-name CDKToolkit-myapp
```

## Understanding Version Requirements

Different CDK features require different bootstrap versions. Here's a rough guide:

| Bootstrap Version | Required For |
|------------------|-------------|
| 1-5 | Basic CDK deployment |
| 6 | Docker asset support |
| 7-8 | Cross-account deployment improvements |
| 9-10 | New-style synthesis |
| 11+ | Lookup role, additional security features |
| 14+ | Custom permissions boundary support |

Check what version your CDK app requires:

```bash
# The error message tells you the required version
# Or check the CDK version requirements in your package.json
npm ls aws-cdk-lib
```

## Cross-Account Bootstrap

If you're deploying across accounts (e.g., from a CI/CD account to a target account), both accounts need to be bootstrapped with trust relationships:

```bash
# Bootstrap the target account, trusting the CI/CD account
npx cdk bootstrap aws://TARGET_ACCOUNT/us-east-1 \
    --trust CICD_ACCOUNT_ID \
    --cloudformation-execution-policies "arn:aws:iam::aws:policy/AdministratorAccess"

# Bootstrap the CI/CD account
npx cdk bootstrap aws://CICD_ACCOUNT/us-east-1
```

The `--trust` flag adds the CI/CD account as a trusted principal in the bootstrap roles, allowing it to assume roles in the target account during deployment.

## Qualifier Mismatches

If you used a custom qualifier during bootstrap, your CDK app needs to know about it:

```typescript
// In your CDK app
const app = new cdk.App();

new MyStack(app, 'MyStack', {
    synthesizer: new cdk.DefaultStackSynthesizer({
        qualifier: 'myapp',  // Must match the bootstrap qualifier
    }),
});
```

Or in `cdk.json`:

```json
{
    "app": "npx ts-node bin/my-app.ts",
    "context": {
        "@aws-cdk/core:bootstrapQualifier": "myapp"
    }
}
```

If the qualifier doesn't match, CDK looks for a bootstrap stack that doesn't exist or doesn't have the right resources.

## Multiple Bootstrap Stacks

You can have multiple bootstrap stacks in the same account using different qualifiers. This is useful when different teams or applications need isolation:

```bash
# Team A's bootstrap
npx cdk bootstrap aws://123456789012/us-east-1 \
    --qualifier teama \
    --toolkit-stack-name CDKToolkit-TeamA

# Team B's bootstrap
npx cdk bootstrap aws://123456789012/us-east-1 \
    --qualifier teamb \
    --toolkit-stack-name CDKToolkit-TeamB
```

## When Bootstrap Update Fails

If the bootstrap update itself fails, check the CloudFormation stack events:

```bash
# Check CDKToolkit stack events
aws cloudformation describe-stack-events \
    --stack-name CDKToolkit \
    --query 'StackEvents[?ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
    --output table
```

Common bootstrap update failures:
- S3 bucket policy conflicts
- IAM role modification permissions
- KMS key policy issues

If the bootstrap stack is in a bad state, you might need to manually fix the failing resource before re-running bootstrap.

## SSM Parameter Missing

In some cases, the SSM parameter that tracks the bootstrap version gets deleted or is missing:

```bash
# Check if the parameter exists
aws ssm get-parameter --name /cdk-bootstrap/hnb659fds/version

# If using a custom qualifier
aws ssm get-parameter --name /cdk-bootstrap/myapp/version
```

Re-running `cdk bootstrap` recreates this parameter if it's missing.

## CI/CD Pipeline Considerations

In CI/CD pipelines, make sure bootstrapping is part of your account setup process, not part of every deployment:

```yaml
# GitHub Actions: bootstrap is a one-time setup step
# Don't bootstrap on every deploy - it's unnecessary and slow
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: CDK Deploy
        run: npx cdk deploy --all --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

But if you're setting up new accounts via pipeline, include bootstrapping:

```bash
# One-time account setup script
#!/bin/bash
ACCOUNT_ID=$1
REGION=$2

echo "Bootstrapping $ACCOUNT_ID in $REGION"
npx cdk bootstrap "aws://$ACCOUNT_ID/$REGION" \
    --trust $CICD_ACCOUNT_ID \
    --cloudformation-execution-policies "arn:aws:iam::aws:policy/AdministratorAccess"
```

For monitoring CDK deployments across multiple accounts and regions, set up [deployment monitoring](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-alerting-best-practices/view) to catch bootstrap and deployment failures early.

## Summary

The bootstrap version mismatch error means your CDK app requires a newer bootstrap than what's deployed. Run `cdk bootstrap` again to update it. If you're using custom qualifiers, templates, or cross-account trust, make sure those match between your bootstrap and your CDK app's synthesizer settings. Re-bootstrapping is safe - it updates the existing stack without destroying assets.
