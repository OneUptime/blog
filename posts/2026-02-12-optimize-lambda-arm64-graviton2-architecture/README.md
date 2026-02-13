# How to Optimize Lambda with ARM64 (Graviton2) Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Performance, Serverless

Description: Learn how to switch your Lambda functions to ARM64 Graviton2 processors for up to 34% better price-performance with minimal code changes.

---

AWS Lambda functions run on x86_64 by default, but switching to ARM64 (Graviton2) gives you up to 20% better performance and 20% lower cost. That's a 34% improvement in price-performance for changing a single configuration setting. Most functions work without any code modifications. Let's walk through when and how to make the switch.

## Why Graviton2 Matters

Graviton2 is AWS's custom ARM-based processor. It's been battle-tested in EC2, Fargate, and RDS before Lambda support landed. The advantages are straightforward: ARM chips are more power-efficient, so AWS charges less for them, and they often execute workloads faster because of better memory bandwidth and larger caches.

For Lambda specifically, you get:
- 20% lower cost per millisecond of execution
- Up to 20% better performance for most workloads
- Same Lambda features, limits, and integrations
- Available in most AWS regions

## Switching to ARM64

The change itself is trivial. You just set the architecture in your function configuration.

Here's how to update an existing function using the AWS CLI:

```bash
# Update an existing function to use ARM64
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64

# Verify the change
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'Architectures'
```

For new functions, set the architecture at creation time:

```bash
# Create a new ARM64 function
aws lambda create-function \
  --function-name my-arm-function \
  --runtime python3.12 \
  --handler lambda_function.lambda_handler \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --architectures arm64 \
  --zip-file fileb://function.zip
```

## Infrastructure as Code

If you manage your Lambda functions through CloudFormation, Terraform, or SAM, here's how to specify ARM64 in each.

CloudFormation template with ARM64 architecture:

```yaml
# CloudFormation
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-arm64-function
      Runtime: python3.12
      Handler: index.handler
      Architectures:
        - arm64  # Just add this line
      Code:
        S3Bucket: my-bucket
        S3Key: function.zip
      MemorySize: 256
      Timeout: 30
```

Terraform configuration for ARM64 Lambda:

```hcl
# Terraform
resource "aws_lambda_function" "my_function" {
  function_name = "my-arm64-function"
  runtime       = "python3.12"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_role.arn
  architectures = ["arm64"]  # Just add this line

  filename         = "function.zip"
  source_code_hash = filebase64sha256("function.zip")
  memory_size      = 256
  timeout          = 30
}
```

SAM template with ARM64:

```yaml
# AWS SAM
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.lambda_handler
      Runtime: python3.12
      Architectures:
        - arm64
      CodeUri: src/
      MemorySize: 256
```

## Native Dependencies - The One Gotcha

Pure Python, Node.js, and Java code runs on ARM64 without changes. The problem comes when you have native compiled dependencies - C extensions, shared libraries, or binary packages.

Common packages that need ARM64-specific builds include `numpy`, `pandas`, `Pillow`, `psycopg2`, and anything using `cffi`. If you're bundling these in a Lambda layer or deployment package, you need to compile them for ARM64.

Build your dependencies on an ARM64 environment:

```bash
# Option 1: Build on an ARM64 EC2 instance or Mac with M-series chip
pip install -r requirements.txt -t ./package/

# Option 2: Use Docker with an ARM64 Lambda base image
docker run --platform linux/arm64 \
  -v "$PWD":/var/task \
  public.ecr.aws/sam/build-python3.12:latest \
  pip install -r requirements.txt -t /var/task/package/

# Option 3: Use SAM build (handles cross-compilation)
sam build --use-container
```

For Node.js, the same principle applies to native addons:

```bash
# Rebuild native Node.js modules for ARM64
docker run --platform linux/arm64 \
  -v "$PWD":/var/task \
  -w /var/task \
  public.ecr.aws/sam/build-nodejs20.x:latest \
  npm install --arch=arm64 --platform=linux
```

## Lambda Layers Compatibility

Lambda layers are architecture-specific. If you're using layers with native code, you need ARM64-compatible versions.

Create an ARM64-compatible layer:

```bash
# Build the layer content for ARM64
mkdir -p layer/python
docker run --platform linux/arm64 \
  -v "$PWD/layer":/var/task \
  public.ecr.aws/sam/build-python3.12:latest \
  pip install requests boto3 -t /var/task/python/

# Package the layer
cd layer && zip -r ../my-layer-arm64.zip python/

# Publish the layer with ARM64 compatibility
aws lambda publish-layer-version \
  --layer-name my-dependencies \
  --compatible-architectures arm64 \
  --zip-file fileb://my-layer-arm64.zip \
  --compatible-runtimes python3.12
```

You can make a layer compatible with both architectures if the code is pure Python or JavaScript:

```bash
# Layer compatible with both architectures
aws lambda publish-layer-version \
  --layer-name my-pure-python-layer \
  --compatible-architectures x86_64 arm64 \
  --zip-file fileb://my-layer.zip \
  --compatible-runtimes python3.12
```

## Benchmarking Before and After

Don't just switch blindly. Measure your function's performance on both architectures to confirm you're getting the expected improvement.

Here's a simple benchmarking script that invokes a function multiple times and compares metrics:

```python
import boto3
import time
import statistics

client = boto3.client("lambda")

def benchmark_function(function_name, iterations=50):
    """Run a Lambda function multiple times and collect timing data."""
    durations = []
    billed_durations = []

    for i in range(iterations):
        response = client.invoke(
            FunctionName=function_name,
            Payload=b'{"test": true}',
            LogType="Tail",
        )

        # Parse the duration from the log
        import base64
        log = base64.b64decode(response["LogResult"]).decode()

        for line in log.split("\n"):
            if "Billed Duration" in line:
                parts = line.split("\t")
                for part in parts:
                    if part.startswith("Duration:"):
                        duration = float(part.split()[1])
                        durations.append(duration)
                    if part.startswith("Billed Duration:"):
                        billed = float(part.split()[2])
                        billed_durations.append(billed)

    return {
        "avg_duration": statistics.mean(durations),
        "p50_duration": statistics.median(durations),
        "p99_duration": sorted(durations)[int(len(durations) * 0.99)],
        "avg_billed": statistics.mean(billed_durations),
    }

# Compare both architectures
print("x86_64 results:", benchmark_function("my-function-x86"))
print("arm64 results:", benchmark_function("my-function-arm64"))
```

## Workloads That Benefit Most

Not every workload sees the same improvement. Here's what typically gains the most:

- **Compute-heavy tasks** - Data processing, image manipulation, JSON parsing. These see the biggest gains, sometimes exceeding 20%.
- **Web API handlers** - Typical CRUD operations with database calls see moderate improvement, usually 10-15%.
- **I/O-bound functions** - Functions that mostly wait on network calls (API requests, database queries) see less improvement since the bottleneck isn't the CPU.

## Gradual Migration Strategy

For production functions, don't switch everything at once. Use aliases and weighted routing to shift traffic gradually.

This sets up a gradual rollout from x86 to ARM64:

```bash
# Deploy ARM64 version as a new version
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64

aws lambda publish-version \
  --function-name my-function

# Route 10% of traffic to the new ARM64 version
aws lambda update-alias \
  --function-name my-function \
  --name production \
  --routing-config AdditionalVersionWeights={"2"=0.1}
```

Monitor error rates and latency during the rollout. If everything looks good, shift more traffic over. If not, roll back instantly by updating the alias weights.

## Cost Savings Calculation

The math is simple but the savings add up fast. ARM64 Lambda costs $0.0000133334 per GB-second versus $0.0000166667 for x86_64 - that's exactly 20% less.

If your function runs 10 million invocations per month at 256MB with an average duration of 200ms, the monthly compute cost drops from about $8.33 to $6.67. That's $20 saved per year on a single function. Across hundreds of functions, it becomes significant.

For keeping track of your Lambda cost optimizations, consider monitoring your cloud spend with dashboards - our post on [AWS cost monitoring](https://oneuptime.com/blog/post/2026-01-24-cost-optimization/view) has useful patterns.

## Wrapping Up

Switching Lambda to ARM64 is one of the rare optimizations that's genuinely easy. Change one config value, test your function, and save money. The only real blocker is native dependencies that need ARM64 builds, and Docker makes that straightforward to handle. Start with your highest-volume functions for the biggest impact, benchmark to verify the improvement, and then roll it out across your fleet.
