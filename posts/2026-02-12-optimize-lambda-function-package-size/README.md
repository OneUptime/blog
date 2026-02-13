# How to Optimize Lambda Function Package Size

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Optimization, Performance, Serverless

Description: Reduce AWS Lambda deployment package sizes to improve cold start times, stay within size limits, and speed up deployments with practical optimization techniques.

---

Lambda has a 50 MB limit for direct zip uploads and 250 MB for uncompressed packages (or 10 GB with container images). But even if you're under the limits, package size matters. Larger packages mean longer cold starts because Lambda needs to download and extract more code before your function can start handling requests. A 5 MB package cold starts noticeably faster than a 50 MB one.

Let's go through practical ways to shrink your Lambda deployment packages.

## Measuring Your Current Package Size

Before optimizing, understand what's taking up space:

```bash
# Check total package size
du -sh node_modules/
# 147M  node_modules/

# Find the biggest offenders
du -sh node_modules/* | sort -rh | head -20
# 23M   node_modules/aws-sdk
# 18M   node_modules/@aws-sdk
# 12M   node_modules/puppeteer-core
# 8.4M  node_modules/typescript
# ...
```

For Python:

```bash
# Check Python dependencies size
pip install --target ./package -r requirements.txt
du -sh package/
du -sh package/* | sort -rh | head -20
```

## Strategy 1: Use Production Dependencies Only

The most common mistake is including dev dependencies in the deployment package.

For Node.js:

```bash
# Install only production dependencies for deployment
npm ci --production

# Or with npm prune after a full install
npm ci
npm prune --production
```

For Python, maintain separate requirements files:

```bash
# requirements.txt - production only
boto3==1.34.0
requests==2.31.0

# requirements-dev.txt - development/testing
pytest==7.4.0
black==23.12.0
mypy==1.8.0
```

```bash
# Install only production deps for packaging
pip install -r requirements.txt -t ./package
```

## Strategy 2: Remove Unnecessary Files

Many npm packages include test files, documentation, TypeScript source files, and other artifacts you don't need at runtime.

Create a `.lambdaignore` script or use a tool:

```bash
# Remove unnecessary files from node_modules before packaging
find node_modules -type f \( \
  -name "*.md" -o \
  -name "*.ts" -o \
  -name "*.map" -o \
  -name "*.d.ts" -o \
  -name "LICENSE*" -o \
  -name "CHANGELOG*" -o \
  -name "README*" -o \
  -name ".eslintrc*" -o \
  -name ".prettierrc*" -o \
  -name "tsconfig*" \
\) -delete

# Remove test directories
find node_modules -type d \( \
  -name "__tests__" -o \
  -name "test" -o \
  -name "tests" -o \
  -name "docs" -o \
  -name "example" -o \
  -name "examples" \
\) -exec rm -rf {} + 2>/dev/null

echo "Size after cleanup:"
du -sh node_modules/
```

This can often cut 20-40% off the node_modules size.

## Strategy 3: Use the AWS SDK v3 Modular Imports

AWS SDK v2 is a monolithic 60+ MB package. SDK v3 is modular - import only the clients you need:

```javascript
// BAD: Importing the entire AWS SDK v2 (adds ~60 MB)
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// GOOD: Import only the specific clients you need (adds ~2-5 MB each)
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const s3 = new S3Client({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));
```

Even better, for Node.js 18+ Lambda runtime, the AWS SDK v3 is included in the runtime. You don't need to include it in your package at all:

```javascript
// If using Node.js 18+ runtime, AWS SDK v3 is pre-installed
// No need to include it in your deployment package
const { S3Client } = require('@aws-sdk/client-s3');
// This works without adding @aws-sdk/* to package.json
```

The trade-off is that you're tied to whatever SDK version the runtime ships. If you need a specific version, bundle it.

## Strategy 4: Use Lambda Layers

Move shared dependencies into Lambda Layers. The layer is downloaded once and cached, separate from your function code:

```bash
# Create a layer with shared dependencies
mkdir -p layer/nodejs
cp package.json layer/nodejs/
cd layer/nodejs && npm ci --production && cd ../..

# Package the layer
cd layer && zip -r ../my-deps-layer.zip nodejs/ && cd ..

# Publish the layer
aws lambda publish-layer-version \
  --layer-name shared-deps \
  --zip-file fileb://my-deps-layer.zip \
  --compatible-runtimes nodejs20.x
```

Then your function package only contains your code:

```bash
# Function package is just your code now - much smaller
zip -r function.zip src/
# function.zip: 50 KB instead of 50 MB
```

## Strategy 5: Use a Bundler

Bundlers like esbuild, webpack, or rollup analyze your code's import tree and include only the modules actually used. This is especially effective for tree-shakeable ES module packages.

Using esbuild (the fastest option):

```bash
# Install esbuild
npm install --save-dev esbuild

# Bundle your Lambda function
npx esbuild src/handler.js \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/handler.js \
  --minify \
  --external:@aws-sdk/*   # Exclude SDK since it's in the runtime
```

Add it to your package.json:

```json
{
  "scripts": {
    "build": "esbuild src/handler.js --bundle --platform=node --target=node20 --outfile=dist/handler.js --minify --external:@aws-sdk/*",
    "package": "npm run build && cd dist && zip -r ../function.zip ."
  }
}
```

The result is often a single JavaScript file under 1 MB, compared to a 50+ MB node_modules directory.

## Strategy 6: Optimize Native Dependencies

Some packages include native binaries compiled for multiple platforms. You only need the Linux x64 build for Lambda:

```bash
# Install Sharp only for the Lambda platform
npm install --platform=linux --arch=x64 sharp

# For packages with optional dependencies for other platforms
npm install --omit=optional
```

For Python packages with C extensions, compile them for Amazon Linux:

```bash
# Use Docker to build Python packages for Lambda's OS
docker run --rm -v $(pwd):/var/task \
  public.ecr.aws/sam/build-python3.12 \
  pip install -r requirements.txt -t python/
```

## Strategy 7: Use Container Images for Large Functions

If your function genuinely needs lots of dependencies (ML models, large libraries), use container images instead of zip packages. The limit goes from 250 MB to 10 GB:

```dockerfile
# Dockerfile for a Lambda function with large dependencies
FROM public.ecr.aws/lambda/python:3.12

# Install system-level dependencies
RUN dnf install -y gcc

# Install Python packages
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy function code
COPY src/ ${LAMBDA_TASK_ROOT}/

CMD ["handler.handler"]
```

```bash
# Build and push to ECR
docker build -t my-lambda .
docker tag my-lambda:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:latest

# Create or update the Lambda function
aws lambda create-function \
  --function-name my-function \
  --package-type Image \
  --code ImageUri=123456789012.dkr.ecr.us-east-1.amazonaws.com/my-lambda:latest \
  --role arn:aws:iam::123456789012:role/lambda-role
```

## Measuring the Impact

After optimizing, measure the cold start improvement:

```bash
# Force a cold start by updating the function config
aws lambda update-function-configuration \
  --function-name my-function \
  --environment "Variables={FORCE_COLD_START=$(date +%s)}"

# Invoke and check the init duration in the logs
aws lambda invoke --function-name my-function output.json

# Check CloudWatch for init_duration
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern "REPORT" \
  --start-time $(date -v-5M +%s000) \
  --query "events[].message" --output text | grep -o "Init Duration: [0-9.]*"
```

## Size Comparison

Here's what you can expect from these optimization strategies applied to a typical Node.js Lambda function:

| Stage | Package Size |
|---|---|
| Unoptimized (all deps) | ~85 MB |
| Production deps only | ~52 MB |
| Remove unnecessary files | ~38 MB |
| SDK v3 modular imports | ~15 MB |
| esbuild bundled | ~800 KB |
| With layer (code only) | ~50 KB |

The cold start difference between 85 MB and 800 KB is substantial - often 2-5 seconds versus a few hundred milliseconds.

## Wrapping Up

Lambda package size directly affects cold start performance and deployment speed. Start with the easy wins - production-only dependencies and removing unnecessary files. Then move to bundlers like esbuild for dramatic size reductions. Use Lambda Layers for shared dependencies, and container images when you genuinely need large packages. Each optimization compounds, and the cold start improvements alone make the effort worthwhile. For monitoring how these changes affect your function performance, check out [monitoring Lambda performance with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-lambda-function-performance-with-cloudwatch/view).
