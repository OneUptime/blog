# How to Fix Lambda Cold Start Performance Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Performance, Optimization

Description: Reduce Lambda cold start times with practical techniques including runtime selection, dependency optimization, provisioned concurrency, and architecture changes.

---

Lambda cold starts are one of the most talked-about issues in serverless computing. When a Lambda function hasn't been invoked recently (or when new concurrent instances are needed), AWS has to spin up a new execution environment. That initialization time - the cold start - adds latency to the request.

For some use cases, a 500ms cold start is barely noticeable. For others, like user-facing APIs, even 200ms of extra latency is too much. Let's go through every technique you can use to reduce cold starts.

## Measuring Cold Starts

Before optimizing, measure your actual cold start duration. You can identify cold starts in CloudWatch Logs by looking for the `Init Duration` field:

```bash
# Search for cold starts in your Lambda logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern "Init Duration" \
  --start-time $(date -d '1 hour ago' +%s000) \
  --query 'events[*].message'
```

The `REPORT` line in Lambda logs includes `Init Duration` only for cold starts:

```
REPORT RequestId: abc-123 Duration: 45.12 ms Billed Duration: 46 ms
Memory Size: 256 MB Max Memory Used: 89 MB Init Duration: 543.21 ms
```

In this case, the cold start added 543ms on top of the 45ms execution time.

## Fix 1: Choose the Right Runtime

Runtime choice has a massive impact on cold start times. Here's a rough comparison:

| Runtime | Typical Cold Start | Notes |
|---------|-------------------|-------|
| Python 3.x | 100-300ms | Great cold start performance |
| Node.js 20.x | 100-300ms | Comparable to Python |
| Go | 50-100ms | Fastest cold starts |
| Java 21 | 500ms-3s+ | Worst cold starts (JVM startup) |
| .NET 8 | 200-500ms | Better with Native AOT |
| Rust (custom runtime) | 10-50ms | Near-zero cold starts |

If cold starts are a top priority and you have flexibility on runtime, Go or Rust will give you the best results.

### Java-Specific: Use SnapStart

If you're stuck with Java, Lambda SnapStart can dramatically reduce cold starts by caching a snapshot of the initialized JVM:

```bash
# Enable SnapStart for a Java function
aws lambda update-function-configuration \
  --function-name my-java-function \
  --snap-start ApplyOn=PublishedVersions

# Publish a new version to activate SnapStart
aws lambda publish-version --function-name my-java-function
```

SnapStart can reduce Java cold starts from 2-3 seconds down to 200-300ms.

## Fix 2: Reduce Deployment Package Size

Larger packages take longer to download and extract. Keep your deployment package lean.

```bash
# Check your function's package size
aws lambda get-function \
  --function-name my-function \
  --query 'Configuration.{CodeSize:CodeSize,Runtime:Runtime}'
```

### Python: Only Include What You Need

```bash
# Bad: Installing everything
pip install boto3 requests pandas numpy scipy

# Better: Only install what the function actually uses
pip install requests  # boto3 is already included in Lambda runtime
```

Key tip: `boto3` is already included in the Lambda Python runtime. Don't include it in your package unless you need a specific version.

```bash
# Create a minimal package
mkdir package
pip install -t package/ requests
cd package && zip -r ../function.zip . && cd ..
zip function.zip lambda_function.py
```

### Node.js: Tree-shake and Minify

Use a bundler like esbuild to create a minimal package:

```bash
# Install esbuild
npm install --save-dev esbuild

# Bundle your function with tree-shaking
npx esbuild index.js --bundle --platform=node --target=node20 \
  --outfile=dist/index.js --minify --external:@aws-sdk/*
```

The `--external:@aws-sdk/*` flag excludes the AWS SDK v3, which is already in the Lambda Node.js runtime.

## Fix 3: Use Lambda Layers Wisely

Layers can help organize your code, but they don't necessarily speed up cold starts. The total size of your function code plus all layers still matters.

However, layers can help if you use them to share dependencies across functions, because AWS can cache layers independently.

```bash
# Create a layer with your dependencies
mkdir -p python/lib/python3.12/site-packages
pip install -t python/lib/python3.12/site-packages/ requests pydantic
zip -r my-layer.zip python/

aws lambda publish-layer-version \
  --layer-name my-deps \
  --zip-file fileb://my-layer.zip \
  --compatible-runtimes python3.12

# Attach the layer to your function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:my-deps:1
```

## Fix 4: Initialize Outside the Handler

Code that runs outside the handler function executes during the cold start and is cached for subsequent warm invocations. Move expensive initialization there:

```python
import boto3
import os

# These run during cold start and are cached
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

# This is also cached
config = load_config()

def lambda_handler(event, context):
    # This runs on every invocation - keep it lean
    response = table.get_item(Key={'id': event['id']})
    return {'statusCode': 200, 'body': response['Item']}
```

In Node.js:

```javascript
// Module-level initialization (cold start only)
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Handler (runs every invocation)
exports.handler = async (event) => {
  const result = await docClient.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { id: event.id }
  }));
  return { statusCode: 200, body: JSON.stringify(result.Item) };
};
```

## Fix 5: Provisioned Concurrency

When cold starts are unacceptable, provisioned concurrency is the nuclear option. It keeps a specified number of execution environments warm at all times.

```bash
# Set provisioned concurrency (requires a published version or alias)
aws lambda publish-version --function-name my-function

aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier 1 \
  --provisioned-concurrent-executions 10
```

You can also auto-scale provisioned concurrency based on usage:

```bash
# Register the target
aws application-autoscaling register-scalable-target \
  --service-namespace lambda \
  --resource-id function:my-function:1 \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 5 \
  --max-capacity 50

# Create a scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace lambda \
  --resource-id function:my-function:1 \
  --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-name my-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 0.7,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"
    }
  }'
```

Provisioned concurrency costs money even when not in use, so use it only for functions where cold starts genuinely impact user experience.

## Fix 6: Keep Functions Warm (Budget Option)

If provisioned concurrency is too expensive, you can use a CloudWatch scheduled event to ping your function periodically:

```bash
# Create a rule that fires every 5 minutes
aws events put-rule \
  --name keep-warm \
  --schedule-expression "rate(5 minutes)"

# Add the Lambda function as a target
aws events put-targets \
  --rule keep-warm \
  --targets '[{"Id":"1","Arn":"arn:aws:lambda:us-east-1:123456789012:function:my-function","Input":"{\"warmup\":true}"}]'
```

In your function, detect and short-circuit warmup invocations:

```python
def lambda_handler(event, context):
    if event.get('warmup'):
        return {'statusCode': 200, 'body': 'warm'}
    # Normal function logic here
```

This only keeps one instance warm. If you need multiple warm instances, you'll need provisioned concurrency.

## Fix 7: Avoid VPC When Possible

VPC-attached Lambda functions used to have significantly longer cold starts (10+ seconds). AWS has improved this dramatically with Hyperplane ENI, but there's still some overhead. If your function doesn't need VPC access, don't put it in one.

## Monitoring Cold Starts

Track your cold start frequency and duration over time with monitoring tools. [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can help you set up alerts for cold start spikes and track the impact on your API latency.

The key is to measure first, then optimize. Not every function needs sub-100ms cold starts. Focus your optimization effort where it actually matters to your users.
