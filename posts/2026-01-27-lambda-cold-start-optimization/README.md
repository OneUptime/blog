# How to Optimize Lambda Cold Starts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS Lambda, Serverless, Cold Start, Performance, Optimization

Description: Learn how to minimize AWS Lambda cold start latency through code optimization, provisioned concurrency, and architectural patterns.

---

> "The fastest Lambda function is one that never has to cold start. But when it does, every millisecond of initialization code matters."

Cold starts are the hidden tax of serverless computing. While Lambda handles scaling automatically, the initial boot time can add hundreds of milliseconds to your response time. For user-facing APIs and latency-sensitive applications, this delay directly impacts user experience. Let's explore practical strategies to minimize cold start latency.

---

## What Are Cold Starts and Why Do They Happen

A cold start occurs when AWS Lambda creates a new execution environment to handle a request. This happens when:

- A function is invoked for the first time
- All existing execution environments are busy handling other requests
- An execution environment has been idle and was recycled (typically after 5-15 minutes)
- You deploy new code or update configuration

During a cold start, Lambda must:

1. Download your deployment package from S3
2. Create a new execution environment (microVM)
3. Initialize the runtime (Node.js, Python, Java, etc.)
4. Execute your initialization code (code outside the handler)
5. Finally execute your handler function

Warm invocations skip steps 1-4, reusing an existing environment. The difference can be dramatic - from 5ms warm to 500ms+ cold.

---

## Measuring Cold Start Latency

Before optimizing, establish a baseline. Lambda provides built-in metrics, but you need to distinguish cold from warm invocations.

### Using CloudWatch Logs Insights

```sql
-- Query to identify cold starts and their duration
fields @timestamp, @requestId, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| filter @type = "REPORT"
| filter @message like /Init Duration/
| parse @message /Init Duration: (?<initDuration>[0-9.]+) ms/
| stats avg(initDuration) as avgColdStart,
        max(initDuration) as maxColdStart,
        count(*) as coldStartCount
        by bin(1h)
```

### Adding Custom Metrics

```javascript
// Node.js - Track cold starts with custom metrics
let isColdStart = true;

exports.handler = async (event) => {
    // Emit custom metric for cold start tracking
    if (isColdStart) {
        console.log(JSON.stringify({
            _aws: {
                Timestamp: Date.now(),
                CloudWatchMetrics: [{
                    Namespace: "MyApp/Lambda",
                    Dimensions: [["FunctionName"]],
                    Metrics: [{ Name: "ColdStart", Unit: "Count" }]
                }]
            },
            FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            ColdStart: 1
        }));
        isColdStart = false;
    }

    // Your handler logic here
    return { statusCode: 200, body: "OK" };
};
```

---

## Runtime Selection Impact

Your choice of runtime significantly affects cold start duration. Here's what to expect:

| Runtime | Typical Cold Start | Notes |
|---------|-------------------|-------|
| Python 3.12 | 150-300ms | Fast startup, great for most use cases |
| Node.js 20.x | 150-350ms | Fast, handles async well |
| Go | 100-200ms | Compiled, very fast |
| Rust | 100-200ms | Compiled, minimal overhead |
| .NET 8 | 300-600ms | Improved with Native AOT |
| Java 21 | 500ms-3s | Use Snap Start for improvement |

If cold start latency is critical and you have flexibility, consider Python, Node.js, Go, or Rust. For existing Java applications, Snap Start (covered below) is essential.

---

## Package Size Optimization

Deployment package size directly correlates with cold start time. Lambda must download and extract your code before execution.

### Minimize Dependencies

```javascript
// Bad - importing entire AWS SDK v3
const AWS = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

// Good - import only what you need
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
```

### Use Bundlers and Tree Shaking

```javascript
// esbuild.config.js - Bundle and minify for Lambda
const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/handler.js'],
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/handler.js',
    external: ['@aws-sdk/*'], // Use Lambda's built-in SDK
    treeShaking: true
});
```

### Layer Strategy

Use Lambda Layers for shared dependencies, but be strategic:

```yaml
# SAM template - Layer for common utilities
Resources:
  CommonLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: common-utils
      ContentUri: layers/common/
      CompatibleRuntimes:
        - nodejs20.x
      RetentionPolicy: Delete

  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Layers:
        - !Ref CommonLayer
      # Function code is now smaller
      CodeUri: src/
```

---

## Initialization Code Optimization

Code outside your handler runs during cold start. Move expensive operations wisely.

### Good: Initialize SDK Clients Outside Handler

```python
# Python - Initialize clients at module level (runs once per cold start)
import boto3
from functools import lru_cache

# These run during cold start - amortized across warm invocations
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('my-table')
s3_client = boto3.client('s3')

# Cache expensive config lookups
@lru_cache(maxsize=1)
def get_config():
    # Fetch from Parameter Store or Secrets Manager
    ssm = boto3.client('ssm')
    return ssm.get_parameter(Name='/myapp/config', WithDecryption=True)

def handler(event, context):
    # Handler stays lean - clients already initialized
    config = get_config()
    response = table.get_item(Key={'id': event['id']})
    return response['Item']
```

### Avoid: Heavy Processing During Init

```javascript
// Bad - Loading large file during cold start
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('large-config.json')); // 10MB file

// Better - Lazy load or use environment variables
let cachedData = null;

const loadData = () => {
    if (!cachedData) {
        cachedData = JSON.parse(fs.readFileSync('large-config.json'));
    }
    return cachedData;
};

exports.handler = async (event) => {
    // Only load if actually needed
    if (event.needsConfig) {
        const data = loadData();
    }
    // ...
};
```

---

## VPC Cold Start Considerations

Functions in a VPC historically had severe cold start penalties (10+ seconds). AWS has improved this significantly, but VPC functions still incur overhead.

### Current VPC Cold Start Impact

- Non-VPC function: 150-500ms cold start
- VPC function: 200-800ms cold start (improved from 10+ seconds in 2019)

### Mitigation Strategies

```yaml
# SAM template - VPC configuration with optimization
Resources:
  MyVpcFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: python3.12
      VpcConfig:
        SecurityGroupIds:
          - !Ref LambdaSecurityGroup
        SubnetIds:
          # Use multiple subnets for ENI reuse
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
          - !Ref PrivateSubnet3
      # Use provisioned concurrency for latency-critical VPC functions
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 5
```

### When to Skip VPC

If your Lambda only needs to call AWS APIs and public endpoints, skip VPC entirely:

```python
# Accessing RDS without VPC - Use RDS Proxy with IAM auth
import boto3
import json

def get_db_connection():
    # RDS Proxy public endpoint with IAM authentication
    client = boto3.client('rds')
    token = client.generate_db_auth_token(
        DBHostname='myproxy.proxy-xxxx.us-east-1.rds.amazonaws.com',
        Port=5432,
        DBUsername='lambda_user',
        Region='us-east-1'
    )
    # Connect using the token
    return token
```

---

## Provisioned Concurrency

Provisioned concurrency keeps execution environments warm, eliminating cold starts entirely for a portion of your traffic.

### Configuration

```yaml
# SAM template with provisioned concurrency
Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      AutoPublishAlias: live
      ProvisionedConcurrencyConfig:
        ProvisionedConcurrentExecutions: 10

  # Scale provisioned concurrency based on schedule
  ProvisionedConcurrencySchedule:
    Type: AWS::ApplicationAutoScaling::ScalableTarget
    Properties:
      MaxCapacity: 50
      MinCapacity: 5
      ResourceId: !Sub function:${ApiFunction}:live
      ScalableDimension: lambda:function:ProvisionedConcurrency
      ServiceNamespace: lambda
      ScheduledActions:
        - ScheduledActionName: ScaleUpMorning
          Schedule: cron(0 8 ? * MON-FRI *)
          ScalableTargetAction:
            MinCapacity: 20
        - ScheduledActionName: ScaleDownEvening
          Schedule: cron(0 20 ? * MON-FRI *)
          ScalableTargetAction:
            MinCapacity: 5
```

### Cost Considerations

Provisioned concurrency charges apply even when instances are idle:

```
Cost = Provisioned GB-seconds * $0.000004463
     + Request charges (same as on-demand)
     + Duration charges for actual execution
```

For a function with 512MB memory and 10 provisioned instances running 24/7:

```
Monthly cost = 10 * 0.5GB * 86400s * 30 days * $0.000004463
            = $578/month just for provisioned concurrency
```

Use it strategically for latency-critical paths, not every function.

---

## Warming Strategies

For functions where provisioned concurrency is too expensive, scheduled warming can help.

### CloudWatch Events Warming

```yaml
# SAM template - Warm function every 5 minutes
Resources:
  WarmingRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: rate(5 minutes)
      Targets:
        - Id: WarmTarget
          Arn: !GetAtt MyFunction.Arn
          Input: '{"warm": true}'

  WarmingPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref MyFunction
      Principal: events.amazonaws.com
      SourceArn: !GetAtt WarmingRule.Arn
```

```javascript
// Handler with warming support
exports.handler = async (event) => {
    // Return early for warming invocations
    if (event.warm) {
        console.log('Warming invocation');
        return { statusCode: 200, body: 'warm' };
    }

    // Normal processing
    return processRequest(event);
};
```

### Limitations of Warming

- Only keeps one execution environment warm per warming invocation
- Concurrent warm invocations needed to maintain multiple warm instances
- Does not help during traffic spikes (new instances still cold start)
- Cost of warming invocations adds up

---

## Snap Start for Java

Snap Start dramatically reduces Java cold starts by taking a snapshot of the initialized execution environment.

### Enabling Snap Start

```yaml
# SAM template with Snap Start
Resources:
  JavaFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: com.example.Handler::handleRequest
      Runtime: java21
      SnapStart:
        ApplyOn: PublishedVersions
      AutoPublishAlias: live
```

### Code Considerations

```java
// Snap Start compatible initialization
public class Handler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    // Static initialization runs once, captured in snapshot
    private static final DynamoDbClient dynamoDb = DynamoDbClient.create();
    private static final ObjectMapper mapper = new ObjectMapper();

    // Use CRaC hooks for resources that need refresh after restore
    static {
        CRaCSupport.registerResource(() -> {
            // This runs after restore from snapshot
            // Refresh time-sensitive resources here
            return null;
        });
    }

    @Override
    public APIGatewayProxyResponseEvent handleRequest(
            APIGatewayProxyRequestEvent event, Context context) {
        // Handler logic
    }
}
```

### Snap Start Best Practices

1. Avoid storing timestamps or random values during init
2. Re-establish database connections after restore if needed
3. Refresh credentials that might expire
4. Test with `beforeCheckpoint` and `afterRestore` hooks

---

## Monitoring Cold Starts

Set up proper alerting to catch cold start regressions.

### CloudWatch Alarm for Cold Start Rate

```yaml
# CloudFormation - Alert when cold starts exceed threshold
Resources:
  ColdStartAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: HighColdStartRate
      MetricName: InitDuration
      Namespace: AWS/Lambda
      Statistic: SampleCount
      Period: 300
      EvaluationPeriods: 3
      Threshold: 100
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: FunctionName
          Value: !Ref MyFunction
```

### X-Ray Tracing for Detailed Analysis

```python
# Enable X-Ray for cold start visibility
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

# Patch AWS SDK calls for tracing
patch_all()

def handler(event, context):
    with xray_recorder.in_subsegment('process_request'):
        # Your logic here
        pass
```

---

## Best Practices Summary

1. **Choose the right runtime** - Python, Node.js, Go, and Rust have the fastest cold starts
2. **Minimize package size** - Use bundlers, tree shaking, and only import what you need
3. **Initialize SDK clients outside the handler** - Amortize setup cost across warm invocations
4. **Avoid VPC unless necessary** - VPC adds latency; use RDS Proxy or VPC endpoints when needed
5. **Use provisioned concurrency strategically** - Reserve it for latency-critical, user-facing functions
6. **Enable Snap Start for Java** - Reduces Java cold starts from seconds to milliseconds
7. **Monitor cold start metrics** - Track Init Duration and set alerts for regressions
8. **Right-size memory** - More memory means more CPU, which can speed up initialization
9. **Keep dependencies current** - AWS regularly optimizes runtime performance
10. **Test under realistic conditions** - Use load testing to understand cold start behavior at scale

---

## Conclusion

Cold starts are an inherent part of serverless architecture, but they do not have to be a dealbreaker. By selecting appropriate runtimes, optimizing package size, structuring initialization code properly, and using features like provisioned concurrency and Snap Start, you can achieve consistent sub-100ms latency even for cold invocations.

The key is measurement. Instrument your functions, understand your traffic patterns, and apply optimizations where they matter most. Not every function needs provisioned concurrency - focus your efforts on user-facing, latency-sensitive paths.

---

**Monitor your Lambda functions with OneUptime** - Track cold starts, function duration, and error rates with our serverless monitoring capabilities. Set up alerts for latency anomalies and get insights into your function performance. [Get started with OneUptime](https://oneuptime.com).
