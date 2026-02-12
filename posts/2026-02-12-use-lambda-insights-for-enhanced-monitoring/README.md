# How to Use Lambda Insights for Enhanced Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Monitoring, Lambda Insights

Description: Enable and use CloudWatch Lambda Insights for enhanced monitoring with system-level metrics like CPU, memory, disk, and network usage for your Lambda functions.

---

Standard CloudWatch metrics for Lambda tell you about invocations, errors, and duration. But they don't show what's happening inside the execution environment. Is your function running out of memory? Is it CPU-bound? How much network I/O is it doing? Is disk access slow?

Lambda Insights is a CloudWatch extension that collects system-level performance data from your Lambda functions. It adds metrics for CPU usage, memory utilization, disk I/O, and network activity - the kind of data you'd normally get from a server monitoring agent, but for serverless functions.

## What Lambda Insights Provides

Lambda Insights collects these additional metrics that standard Lambda monitoring doesn't:

| Metric | Description |
|---|---|
| cpu_total_time | Total CPU time consumed |
| memory_utilization | Percentage of allocated memory used |
| used_memory_max | Peak memory usage during invocation |
| total_memory | Allocated memory for the function |
| rx_bytes | Network bytes received |
| tx_bytes | Network bytes transmitted |
| tmp_used | Bytes used in /tmp storage |
| tmp_max | Total /tmp capacity |
| init_duration | Cold start initialization time |
| fd_use | File descriptors in use |
| fd_max | Maximum file descriptors available |
| threads | Number of threads |

These metrics help you answer questions like "Should I increase the memory allocation?" and "Is my function CPU-bound or I/O-bound?"

## Enabling Lambda Insights

Lambda Insights is implemented as a Lambda Layer that runs alongside your function code. Enable it through the console, CLI, or Infrastructure as Code.

Using the AWS CLI:

```bash
# Step 1: Add the Lambda Insights layer to your function
# The layer ARN varies by region - this is for us-east-1
aws lambda update-function-configuration \
  --function-name my-function \
  --layers "arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:49"

# Step 2: Add the CloudWatch Lambda Insights managed policy to the execution role
aws iam attach-role-policy \
  --role-name my-lambda-execution-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy
```

Using CloudFormation:

```yaml
# Enable Lambda Insights via CloudFormation
Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-function
      Runtime: nodejs20.x
      Handler: index.handler
      Role: !GetAtt LambdaRole.Arn
      MemorySize: 512
      Timeout: 30
      Layers:
        # Lambda Insights extension layer
        - !Sub "arn:aws:lambda:${AWS::Region}:580247275435:layer:LambdaInsightsExtension:49"
      Code:
        ZipFile: |
          exports.handler = async (event) => {
            return { statusCode: 200, body: 'Hello!' };
          };

  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        # Required for Lambda Insights
        - arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy
```

Using SAM:

```yaml
# SAM makes it even simpler with a global setting
Globals:
  Function:
    Tracing: Active
    Layers:
      - !Sub "arn:aws:lambda:${AWS::Region}:580247275435:layer:LambdaInsightsExtension:49"

Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs20.x
      Policies:
        - CloudWatchLambdaInsightsExecutionRolePolicy
```

## Finding the Right Layer ARN

The Lambda Insights layer ARN includes the region and version number. Find the latest ARN for your region:

```bash
# List available Lambda Insights layer versions for your region
aws lambda list-layer-versions \
  --layer-name LambdaInsightsExtension \
  --region us-east-1 \
  --query "LayerVersions[0].LayerVersionArn" \
  --output text
```

## Viewing Lambda Insights in the Console

After enabling Lambda Insights, navigate to CloudWatch in the AWS Console and look for "Lambda Insights" under the "Application monitoring" section. You'll see:

1. **Multi-function overview** - A table showing all your Insights-enabled functions with key metrics
2. **Single function view** - Detailed metrics for a specific function
3. **Performance anomalies** - Highlighted deviations from normal behavior

## Querying Lambda Insights Metrics

Lambda Insights publishes metrics to the `LambdaInsights` namespace. You can query them programmatically:

```bash
# Get memory utilization over the last hour
aws cloudwatch get-metric-statistics \
  --namespace LambdaInsights \
  --metric-name memory_utilization \
  --dimensions "Name=function_name,Value=my-function" \
  --start-time "$(date -u -v-1H '+%Y-%m-%dT%H:%M:%SZ')" \
  --end-time "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --period 300 \
  --statistics Average Maximum
```

## Building Dashboards with Insights Metrics

Create a dashboard that combines standard Lambda metrics with Insights metrics:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "title": "Memory Utilization (%)",
        "metrics": [
          ["LambdaInsights", "memory_utilization", "function_name", "my-function", {"stat": "Average"}],
          ["...", {"stat": "Maximum", "color": "#d62728"}]
        ],
        "period": 60,
        "yAxis": {"left": {"min": 0, "max": 100}}
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "CPU Time vs Duration",
        "metrics": [
          ["LambdaInsights", "cpu_total_time", "function_name", "my-function", {"stat": "Average", "label": "CPU Time"}],
          ["AWS/Lambda", "Duration", "FunctionName", "my-function", {"stat": "Average", "label": "Duration"}]
        ],
        "period": 60
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Network I/O",
        "metrics": [
          ["LambdaInsights", "rx_bytes", "function_name", "my-function", {"stat": "Average", "label": "Received"}],
          ["LambdaInsights", "tx_bytes", "function_name", "my-function", {"stat": "Average", "label": "Transmitted"}]
        ],
        "period": 60
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Cold Starts",
        "metrics": [
          ["LambdaInsights", "init_duration", "function_name", "my-function", {"stat": "Average"}],
          ["...", {"stat": "Maximum", "color": "#d62728", "label": "Max Init Duration"}]
        ],
        "period": 300
      }
    }
  ]
}
```

## Setting Up Alarms on Insights Metrics

Create alarms for situations that standard metrics can't detect:

```bash
# Alarm when memory utilization exceeds 90%
# This suggests you need to increase the memory allocation
aws cloudwatch put-metric-alarm \
  --alarm-name "my-function-high-memory" \
  --namespace LambdaInsights \
  --metric-name memory_utilization \
  --dimensions "Name=function_name,Value=my-function" \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:alerts"

# Alarm when /tmp storage is getting full
aws cloudwatch put-metric-alarm \
  --alarm-name "my-function-tmp-full" \
  --namespace LambdaInsights \
  --metric-name tmp_used \
  --dimensions "Name=function_name,Value=my-function" \
  --statistic Maximum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 500000000 \  # 500 MB
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:alerts"
```

## Using Insights for Memory Optimization

One of the most practical uses of Lambda Insights is right-sizing your function's memory allocation:

```bash
# Check how much memory your function actually uses
aws cloudwatch get-metric-statistics \
  --namespace LambdaInsights \
  --metric-name used_memory_max \
  --dimensions "Name=function_name,Value=my-function" \
  --start-time "$(date -u -v-7d '+%Y-%m-%dT%H:%M:%SZ')" \
  --end-time "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
  --period 86400 \
  --statistics Maximum Average
```

If your function is allocated 1024 MB but only uses 300 MB at peak, you're overpaying. If it's using 950 MB, you're dangerously close to the limit and should increase the allocation.

The relationship between memory and performance is important. Lambda allocates CPU proportionally to memory. So a function at 128 MB gets half the CPU of one at 256 MB. Sometimes increasing memory makes your function faster and cheaper because it finishes sooner.

## Using Insights Logs

Lambda Insights writes performance data as structured logs in the `/aws/lambda-insights/` log group. You can query these with CloudWatch Logs Insights:

```
# Find invocations with high memory usage
filter function_name = "my-function"
| filter memory_utilization > 80
| sort memory_utilization desc
| fields @timestamp, memory_utilization, used_memory_max, total_memory, duration
| limit 20
```

```
# Analyze cold start frequency and duration
filter function_name = "my-function"
| filter ispresent(init_duration)
| stats count() as coldStarts, avg(init_duration) as avgInitMs, max(init_duration) as maxInitMs
  by bin(1h)
```

## Cost Considerations

Lambda Insights isn't free. Costs include:

- **Layer overhead**: The Insights extension adds about 5-10 MB to your function's memory footprint and a few milliseconds to each invocation
- **CloudWatch Logs**: Performance data is written to logs, which incurs standard CloudWatch log ingestion costs
- **CloudWatch Metrics**: Custom metrics published by Insights follow standard pricing

For most functions, the cost is negligible compared to the value of the visibility you get. But for very high-volume, low-cost functions (millions of invocations per day at 128 MB), the overhead might be worth considering.

## Wrapping Up

Lambda Insights fills the monitoring gap between "how many times did my function run?" and "what's happening inside my function?" The system-level metrics for CPU, memory, disk, and network give you the data needed to optimize performance, right-size memory allocations, and catch resource exhaustion before it causes failures. Enable it on your critical functions, set up alarms for memory utilization and cold start duration, and use the data to make informed optimization decisions. For complementary custom metrics, see our guide on [creating custom CloudWatch metrics from Lambda](https://oneuptime.com/blog/post/create-custom-cloudwatch-metrics-from-lambda/view).
