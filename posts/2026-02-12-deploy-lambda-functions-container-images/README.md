# How to Deploy Lambda Functions as Container Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Docker, Containers, Serverless

Description: Learn how to package and deploy AWS Lambda functions as container images using Docker, including custom runtimes, large dependencies, and CI/CD integration.

---

Lambda functions have traditionally been deployed as ZIP archives - your code and dependencies bundled into a file. But if your function needs large ML libraries, custom binaries, or you just prefer working with Docker, container image support changes everything. You can package your Lambda function as a Docker image up to 10 GB in size, push it to Amazon ECR, and deploy it as a Lambda function.

This means you can use your existing Docker workflows, install system-level dependencies, and run the same image locally for testing. Let's build and deploy a containerized Lambda function from scratch.

## How It Works

Lambda container images use one of two approaches:

1. **AWS base images** - pre-built images that include the Lambda runtime interface client. These are the easiest starting point.
2. **Custom base images** - any Docker image, as long as you include the Lambda Runtime Interface Client (RIC).

The image runs in Lambda's execution environment just like a ZIP-deployed function. The cold start is slightly longer because the image needs to be pulled from ECR, but subsequent invocations use a cached image.

## Building with AWS Base Images

AWS provides base images for all supported runtimes. These include the runtime interface client and emulator, making them the simplest option.

This Dockerfile creates a Node.js Lambda function using the AWS base image:

```dockerfile
# Use the official AWS Lambda Node.js base image
FROM public.ecr.aws/lambda/nodejs:20

# Copy package files and install dependencies
COPY package*.json ${LAMBDA_TASK_ROOT}/
RUN npm ci --production

# Copy function code
COPY index.js ${LAMBDA_TASK_ROOT}/

# Set the handler
CMD [ "index.handler" ]
```

And the corresponding Lambda handler:

```javascript
// index.js
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from containerized Lambda!',
      timestamp: new Date().toISOString(),
    }),
  };
};
```

## Building with Python and ML Dependencies

Container images really shine when you have large dependencies. Here's a Python function with pandas, numpy, and scikit-learn - libraries that would exceed the 250 MB ZIP limit.

This Dockerfile packages a Python ML function with large scientific computing libraries:

```dockerfile
FROM public.ecr.aws/lambda/python:3.12

# Install system dependencies for scientific computing
RUN dnf install -y gcc gcc-c++ && dnf clean all

# Copy requirements and install Python dependencies
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r requirements.txt

# Copy function code
COPY app.py ${LAMBDA_TASK_ROOT}/
COPY models/ ${LAMBDA_TASK_ROOT}/models/

CMD [ "app.handler" ]
```

The Python handler:

```python
# app.py
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# Load model at init time (outside the handler)
MODEL_PATH = os.path.join(os.environ['LAMBDA_TASK_ROOT'], 'models', 'classifier.pkl')
model = joblib.load(MODEL_PATH)

def handler(event, context):
    # Parse input features
    body = json.loads(event.get('body', '{}'))
    features = body.get('features', [])

    if not features:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'No features provided'})
        }

    # Make prediction
    input_data = np.array(features).reshape(1, -1)
    prediction = model.predict(input_data)
    probability = model.predict_proba(input_data)

    return {
        'statusCode': 200,
        'body': json.dumps({
            'prediction': int(prediction[0]),
            'confidence': float(max(probability[0])),
        })
    }
```

## Using Custom Base Images

You can use any base image as long as you include the Lambda Runtime Interface Client. This is useful when you need specific OS distributions or pre-built images from your organization.

This Dockerfile uses a custom base image with the Lambda runtime interface client added:

```dockerfile
# Start from any base image
FROM ubuntu:22.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install the Lambda runtime interface client
RUN pip3 install awslambdaric

# Install your dependencies
COPY requirements.txt /app/
RUN pip3 install --no-cache-dir -r /app/requirements.txt

# Copy function code
COPY app.py /app/

WORKDIR /app

# Set the entrypoint to the Lambda runtime interface client
ENTRYPOINT [ "python3", "-m", "awslambdaric" ]

# Set the handler
CMD [ "app.handler" ]
```

## Building and Pushing to ECR

Before deploying, you need to push your image to Amazon ECR.

These commands build the Docker image and push it to ECR:

```bash
# Create an ECR repository
aws ecr create-repository \
  --repository-name my-lambda-function \
  --image-scanning-configuration scanOnPush=true

# Get the ECR login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build the image
docker build -t my-lambda-function .

# Tag the image
docker tag my-lambda-function:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda-function:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda-function:latest
```

## Deploying with AWS CDK

CDK can build and push the Docker image for you as part of the deployment.

This CDK stack builds a Docker image from a local directory and deploys it as a Lambda function:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ContainerLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CDK builds the Docker image and pushes to ECR automatically
    const fn = new lambda.DockerImageFunction(this, 'MLFunction', {
      code: lambda.DockerImageCode.fromImageAsset('docker/ml-function', {
        // Optional: specify build args
        buildArgs: {
          MODEL_VERSION: '2.1.0',
        },
      }),
      memorySize: 2048,
      timeout: cdk.Duration.seconds(30),
      environment: {
        MODEL_CONFIG: 'production',
      },
      // Ephemeral storage for large temporary files
      ephemeralStorageSize: cdk.Size.gibibytes(2),
    });

    // Add an API Gateway trigger
    new apigateway.LambdaRestApi(this, 'MLApi', {
      handler: fn,
    });
  }
}
```

CDK's `DockerImageCode.fromImageAsset` handles the entire build-tag-push-deploy cycle. You point it at a directory with a Dockerfile, and CDK does the rest.

## Local Testing with the Runtime Interface Emulator

One of the biggest advantages of container Lambda is local testing. The AWS base images include the Runtime Interface Emulator (RIE), which simulates the Lambda runtime locally.

These commands run and test your containerized Lambda function locally:

```bash
# Run the container locally
docker run -p 9000:8080 my-lambda-function:latest

# In another terminal, invoke the function
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"body": "{\"features\": [1.0, 2.0, 3.0, 4.0]}"}'
```

For custom base images, you need to install the RIE separately:

```dockerfile
# Add RIE for local testing
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/local/bin/aws-lambda-rie
RUN chmod 755 /usr/local/bin/aws-lambda-rie

# Use a script that detects local vs Lambda environment
COPY entry.sh /
RUN chmod 755 /entry.sh
ENTRYPOINT [ "/entry.sh" ]
CMD [ "app.handler" ]
```

The entry script:

```bash
#!/bin/bash
if [ -z "${AWS_LAMBDA_RUNTIME_API}" ]; then
  # Running locally - use the emulator
  exec /usr/local/bin/aws-lambda-rie python3 -m awslambdaric "$@"
else
  # Running in Lambda - use the real runtime
  exec python3 -m awslambdaric "$@"
fi
```

For more on local testing approaches, see our guide on [testing Lambda functions locally with SAM CLI](https://oneuptime.com/blog/post/test-lambda-functions-locally-sam-cli/view).

## Multi-Stage Builds for Smaller Images

Keep your images small to reduce cold start times. Multi-stage builds help by separating build dependencies from runtime.

This multi-stage Dockerfile compiles dependencies in one stage and copies only artifacts to the final image:

```dockerfile
# Build stage - install and compile dependencies
FROM public.ecr.aws/lambda/python:3.12 AS builder

RUN dnf install -y gcc gcc-c++
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -t /opt/python/

# Runtime stage - only copy what's needed
FROM public.ecr.aws/lambda/python:3.12

# Copy compiled dependencies from builder
COPY --from=builder /opt/python/ ${LAMBDA_TASK_ROOT}/

# Copy application code
COPY app.py ${LAMBDA_TASK_ROOT}/
COPY models/ ${LAMBDA_TASK_ROOT}/models/

CMD [ "app.handler" ]
```

## Cold Start Optimization

Container Lambda functions have longer cold starts than ZIP deployments because the image needs to be pulled and extracted. Here are strategies to minimize this:

1. **Keep images small** - every MB adds to pull time
2. **Use multi-stage builds** to exclude build tools
3. **Put frequently accessed layers early** in the Dockerfile (Docker layer caching)
4. **Use provisioned concurrency** for latency-sensitive functions
5. **Use AWS base images** - they're optimized for Lambda's image caching

```typescript
// Enable provisioned concurrency for container Lambda
const alias = new lambda.Alias(this, 'ProdAlias', {
  aliasName: 'prod',
  version: fn.currentVersion,
  provisionedConcurrentExecutions: 5,
});
```

## CI/CD Integration

Here's a GitHub Actions workflow that builds and deploys a containerized Lambda function:

```yaml
name: Deploy Lambda Container
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/my-lambda:$IMAGE_TAG .
          docker push $ECR_REGISTRY/my-lambda:$IMAGE_TAG

      - name: Update Lambda function
        run: |
          aws lambda update-function-code \
            --function-name my-lambda-function \
            --image-uri 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:${{ github.sha }}
```

## ZIP vs. Container: When to Use Which

**Use ZIP deployments when:**
- Your function and dependencies are under 250 MB
- You want the fastest cold starts
- You don't need system-level dependencies

**Use container images when:**
- You have large dependencies (ML libraries, media processing)
- You need custom system packages or binaries
- You want to use your existing Docker toolchain
- You need to test with the exact runtime environment locally
- Your team is more comfortable with Docker than Lambda packaging

## Wrapping Up

Container image support for Lambda bridges the gap between serverless and container workflows. You get the operational simplicity of Lambda with the packaging flexibility of Docker. The cold start penalty is real but manageable with provisioned concurrency and image optimization. For functions with large dependencies or custom runtime requirements, containers are the clear winner over ZIP deployments.
