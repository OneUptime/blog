# How to Use AWS Signer for Code Signing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Signer, Code Signing, Security, Lambda

Description: Set up AWS Signer to cryptographically sign your code artifacts and enforce signature verification for Lambda deployments and container images.

---

Deploying unsigned code is a trust problem. How do you know that the Lambda function code running in production is the same code your CI/CD pipeline built? How do you verify that a container image hasn't been tampered with between build and deploy? Without code signing, you're essentially running on faith.

AWS Signer provides managed code signing for your deployment artifacts. You sign your code during the build process, and AWS verifies the signature before allowing deployment. If someone modifies the artifact after signing - whether it's an attacker, a misconfigured pipeline, or an accidental overwrite - the deployment gets rejected.

## What Can You Sign?

AWS Signer supports signing for:

- **Lambda functions** - Sign ZIP deployment packages and Lambda layers
- **AWS IoT** - Sign firmware updates for IoT devices
- **Container images** - Sign container images with Notation (used with ECR)

The most common use case is Lambda, so we'll focus heavily on that while covering the others.

## Setting Up a Signing Profile

A signing profile defines the signing configuration - the platform, signature validity period, and other parameters.

### For Lambda

This creates a signing profile for Lambda function code:

```bash
# Create a signing profile for Lambda
aws signer put-signing-profile \
  --profile-name LambdaProductionProfile \
  --platform-id AWSLambda-SHA384-ECDSA \
  --signature-validity-period value=135,type=MONTHS \
  --tags Environment=Production,Team=Platform
```

The platform ID `AWSLambda-SHA384-ECDSA` is the standard for Lambda code signing. The signature validity period defines how long signed artifacts remain valid.

List available platforms:

```bash
aws signer list-signing-platforms \
  --query 'Platforms[].{Id:PlatformId,Target:Target,Category:Category}'
```

### View Your Signing Profile

```bash
aws signer get-signing-profile \
  --profile-name LambdaProductionProfile
```

## Signing a Lambda Deployment Package

### Step 1: Upload Your Code to S3

Your unsigned code needs to be in S3 for Signer to access it:

```bash
# Upload the unsigned Lambda deployment package
aws s3 cp function.zip s3://my-deploy-bucket/unsigned/function.zip
```

### Step 2: Start a Signing Job

This tells Signer to sign the code artifact and put the signed version in a destination bucket:

```bash
# Start the signing job
aws signer start-signing-job \
  --source '{
    "s3": {
      "bucketName": "my-deploy-bucket",
      "key": "unsigned/function.zip",
      "version": "abc123"
    }
  }' \
  --destination '{
    "s3": {
      "bucketName": "my-deploy-bucket",
      "prefix": "signed/"
    }
  }' \
  --profile-name LambdaProductionProfile
```

The response includes a job ID. Check its status:

```bash
# Check signing job status
aws signer describe-signing-job --job-id abc123-def456
```

### Step 3: Deploy the Signed Artifact

Once signed, deploy to Lambda:

```bash
# Deploy the signed code to Lambda
aws lambda update-function-code \
  --function-name my-function \
  --s3-bucket my-deploy-bucket \
  --s3-key signed/abc123def456.zip
```

## Enforcing Code Signing on Lambda

Creating signing profiles is only half the story. You need to enforce that Lambda functions can only be deployed with properly signed code.

### Create a Code Signing Config

This creates a code signing configuration that specifies which signing profiles are trusted:

```bash
# Create code signing configuration
aws lambda create-code-signing-config \
  --description "Production code signing policy" \
  --allowed-publishers '{
    "SigningProfileVersionArns": [
      "arn:aws:signer:us-east-1:111111111111:/signing-profiles/LambdaProductionProfile/abc123"
    ]
  }' \
  --code-signing-policies '{
    "UntrustedArtifactOnDeployment": "Enforce"
  }'
```

The `UntrustedArtifactOnDeployment` policy can be:
- `Enforce` - Block deployment of unsigned or incorrectly signed code
- `Warn` - Allow deployment but log a warning

### Attach to Lambda Functions

Attach the code signing config to your functions:

```bash
# Attach code signing config to a function
aws lambda put-function-code-signing-config \
  --function-name my-function \
  --code-signing-config-arn arn:aws:lambda:us-east-1:111111111111:code-signing-config:csc-abc123
```

Now any attempt to deploy unsigned code to this function will fail:

```bash
# This will fail if the code isn't signed with an approved profile
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://unsigned-function.zip
# Error: Code signing configuration policy rejection
```

## CI/CD Integration

Here's how to integrate code signing into a CI/CD pipeline.

This script signs and deploys a Lambda function in a GitHub Actions workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy Lambda
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: |
          pip install -r requirements.txt -t package/
          cd package && zip -r ../function.zip . && cd ..
          zip function.zip lambda_function.py

      - name: Upload unsigned artifact
        run: |
          aws s3 cp function.zip s3://my-deploy-bucket/unsigned/function-${{ github.sha }}.zip

      - name: Sign the artifact
        id: sign
        run: |
          JOB_ID=$(aws signer start-signing-job \
            --source '{"s3":{"bucketName":"my-deploy-bucket","key":"unsigned/function-${{ github.sha }}.zip"}}' \
            --destination '{"s3":{"bucketName":"my-deploy-bucket","prefix":"signed/"}}' \
            --profile-name LambdaProductionProfile \
            --query 'jobId' --output text)
          echo "job_id=$JOB_ID" >> $GITHUB_OUTPUT

      - name: Wait for signing
        run: |
          aws signer wait successful-signing-job --job-id ${{ steps.sign.outputs.job_id }}

      - name: Deploy
        run: |
          SIGNED_KEY=$(aws signer describe-signing-job \
            --job-id ${{ steps.sign.outputs.job_id }} \
            --query 'signedObject.s3.key' --output text)
          aws lambda update-function-code \
            --function-name my-function \
            --s3-bucket my-deploy-bucket \
            --s3-key "$SIGNED_KEY"
```

## Terraform Configuration

Here's the full Terraform setup for Lambda code signing:

```hcl
# Signing profile
resource "aws_signer_signing_profile" "lambda" {
  platform_id = "AWSLambda-SHA384-ECDSA"
  name        = "LambdaProductionProfile"

  signature_validity_period {
    value = 135
    type  = "MONTHS"
  }

  tags = {
    Environment = "Production"
  }
}

# Code signing config
resource "aws_lambda_code_signing_config" "production" {
  description = "Production code signing policy"

  allowed_publishers {
    signing_profile_version_arns = [
      aws_signer_signing_profile.lambda.version_arn
    ]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }
}

# Attach to Lambda function
resource "aws_lambda_function" "my_function" {
  function_name    = "my-function"
  role             = aws_iam_role.lambda.arn
  handler          = "lambda_function.handler"
  runtime          = "python3.12"
  s3_bucket        = "my-deploy-bucket"
  s3_key           = "signed/latest.zip"

  code_signing_config_arn = aws_lambda_code_signing_config.production.arn
}
```

## Revoking Signatures

If a signing profile is compromised or you need to invalidate previously signed artifacts:

```bash
# Revoke a specific signing profile version
aws signer revoke-signing-profile \
  --profile-name LambdaProductionProfile \
  --profile-version abc123 \
  --reason "Key compromise" \
  --effective-time "2026-02-12T00:00:00Z"
```

Revoking a profile version makes all code signed with it invalid. Functions already deployed continue running, but new deployments using revoked signatures will be rejected.

## Monitoring Signing Activity

Track all signing operations for audit purposes:

```bash
# List recent signing jobs
aws signer list-signing-jobs \
  --status Succeeded \
  --query 'Jobs[].{JobId:JobId,Profile:ProfileName,Created:CreatedAt,Source:Source.S3.Key}'
```

CloudTrail logs all Signer API calls, making it easy to audit who signed what and when.

## Best Practices

**Use separate profiles per environment.** Don't use the same signing profile for dev and production. If the dev profile is compromised, production stays safe.

**Enforce, don't just warn.** Set `UntrustedArtifactOnDeployment` to `Enforce` in production. The warn mode is fine for testing but offers no real protection.

**Rotate signing profiles periodically.** While profiles can last for years, rotating them annually is good hygiene.

**Integrate into CI/CD early.** Retrofitting code signing into existing pipelines is harder than building it in from the start.

Code signing adds a critical verification step to your deployment pipeline. Combined with proper monitoring through [OneUptime](https://oneuptime.com), you get confidence that what's running in production is exactly what your team built and approved.
