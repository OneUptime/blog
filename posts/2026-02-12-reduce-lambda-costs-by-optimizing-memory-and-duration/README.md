# How to Reduce Lambda Costs by Optimizing Memory and Duration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Cost Optimization, Serverless

Description: Learn how to reduce AWS Lambda costs by finding the right memory allocation, cutting execution duration, and using power tuning tools to hit the sweet spot.

---

AWS Lambda pricing is deceptively simple. You pay for the number of requests and the duration of each invocation, measured in GB-seconds. What's not immediately obvious is that memory allocation directly affects both cost and performance, and the relationship isn't linear. A function with more memory can actually cost less than one with less memory because it finishes faster.

Getting this balance right is where the real savings are. Let's dig into the practical techniques.

## Understanding Lambda Pricing

Lambda bills you on two dimensions:

- **Requests**: $0.20 per million invocations
- **Duration**: $0.0000166667 per GB-second (rounded to the nearest millisecond)

The duration charge is calculated as: (memory allocated in GB) x (execution time in seconds). So a function with 512MB that runs for 2 seconds costs the same as a function with 1024MB that runs for 1 second.

Here's where it gets interesting: Lambda allocates CPU power proportionally to memory. At 1,769MB, your function gets one full vCPU. Below that, you get a fraction. Above it, you get additional cores. This means increasing memory often decreases duration enough to lower total cost.

## Profiling Your Current Lambda Costs

Before optimizing, get a baseline. Here's how to pull your most expensive Lambda functions:

```bash
# Find Lambda functions with the highest invocation counts and durations
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "duration",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/Lambda",
          "MetricName": "Duration",
          "Dimensions": [{"Name": "FunctionName", "Value": "my-function"}]
        },
        "Period": 86400,
        "Stat": "Average"
      }
    }
  ]' \
  --start-time 2026-01-13T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z
```

For a broader view, list all functions and their configurations:

```bash
# List all Lambda functions with memory, timeout, and runtime
aws lambda list-functions \
  --query "Functions[].{
    Name: FunctionName,
    Memory: MemorySize,
    Timeout: Timeout,
    Runtime: Runtime,
    CodeSize: CodeSize
  }" \
  --output table
```

## Using AWS Lambda Power Tuning

The best tool for finding the optimal memory setting is the open-source AWS Lambda Power Tuning tool. It runs your function at different memory settings and shows you exactly how cost and duration change.

Deploy it as a Step Functions state machine:

```bash
# Deploy Lambda Power Tuning using SAR (Serverless Application Repository)
aws serverlessrepo create-cloud-formation-change-set \
  --application-id arn:aws:serverlessrepo:us-east-1:451282441545:applications/aws-lambda-power-tuning \
  --stack-name lambda-power-tuning \
  --capabilities CAPABILITY_IAM
```

Then run a tuning session:

```json
{
  "lambdaARN": "arn:aws:lambda:us-east-1:123456789012:function:my-function",
  "powerValues": [128, 256, 512, 1024, 1536, 2048, 3008],
  "num": 50,
  "payload": {"key": "sample-input"},
  "parallelInvocation": true,
  "strategy": "cost"
}
```

The output gives you a visualization showing cost vs. duration for each memory configuration. You'll often find a sweet spot where increasing memory from 128MB to 512MB cuts duration by 75% while only doubling the memory allocation, resulting in a net 50% cost reduction.

## Optimize Cold Start Duration

Cold starts inflate duration and therefore cost. Here are concrete ways to minimize them.

**Keep functions warm for critical paths.** Use a scheduled CloudWatch event to ping your function every 5 minutes:

```python
# handler.py - Add a warm-up check at the top of your handler
import json

def lambda_handler(event, context):
    # Short-circuit for warm-up invocations
    if event.get('source') == 'aws.events' or event.get('warmup'):
        return {'statusCode': 200, 'body': 'warm'}

    # Your actual business logic here
    return process_request(event)
```

**Use Provisioned Concurrency for latency-sensitive functions.** This keeps a specified number of execution environments initialized:

```bash
# Set provisioned concurrency to keep 5 warm instances
aws lambda put-provisioned-concurrency-config \
  --function-name my-critical-function \
  --qualifier prod \
  --provisioned-concurrent-executions 5
```

Note that Provisioned Concurrency has its own cost, so only use it where cold start latency genuinely matters. For most background processing functions, cold starts are fine.

**Minimize package size.** Smaller deployment packages mean faster cold starts:

```bash
# Check your function's package size
aws lambda get-function \
  --function-name my-function \
  --query "Configuration.CodeSize"

# For Python: use Lambda layers for large dependencies
aws lambda publish-layer-version \
  --layer-name my-dependencies \
  --zip-file fileb://layer.zip \
  --compatible-runtimes python3.12
```

## Reduce Execution Duration

Shorter execution time directly reduces cost. Here are the most impactful techniques:

**Reuse connections across invocations.** Initializing HTTP clients and database connections outside the handler means they persist between invocations:

```python
import boto3
import urllib3

# These are initialized once and reused across invocations
s3_client = boto3.client('s3')
http = urllib3.PoolManager()
# Database connection pool
db_pool = create_connection_pool()

def lambda_handler(event, context):
    # Uses the pre-initialized clients - no setup overhead
    data = s3_client.get_object(
        Bucket='my-bucket',
        Key=event['key']
    )
    return process(data)
```

**Process data in parallel.** If your function makes multiple API calls, use concurrent execution:

```python
import concurrent.futures
import boto3

s3 = boto3.client('s3')

def lambda_handler(event, context):
    keys = event['file_keys']

    # Process files in parallel instead of sequentially
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(process_file, key): key
            for key in keys
        }

        results = []
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    return {'processed': len(results)}

def process_file(key):
    response = s3.get_object(Bucket='data-bucket', Key=key)
    content = response['Body'].read()
    # Process the file content
    return transform(content)
```

**Use ARM64 architecture.** Lambda functions running on Graviton2 (arm64) are 20% cheaper and often faster:

```bash
# Update function to use ARM64 architecture
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64
```

This is a free performance win for most workloads. See our guide on [using Graviton instances for cost-effective compute](https://oneuptime.com/blog/post/use-graviton-instances-for-cost-effective-compute/view) for more on ARM-based savings.

## Set Appropriate Timeouts

Many functions have their timeout set to the maximum (15 minutes) as a safety net. The problem is that runaway invocations - due to infinite loops, hung connections, or misconfigured retries - will run until timeout and charge you the full duration.

Set timeouts based on actual p99 duration plus a reasonable buffer:

```bash
# Check actual p99 duration for the past week
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time 2026-02-05T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 604800 \
  --statistics p99

# Set timeout to p99 + 50% buffer (e.g., if p99 is 4s, set to 6s)
aws lambda update-function-configuration \
  --function-name my-function \
  --timeout 6
```

## Automated Cost Monitoring Script

Here's a script that identifies your most expensive Lambda functions and flags optimization opportunities:

```python
import boto3
from datetime import datetime, timedelta

def analyze_lambda_costs():
    lambda_client = boto3.client('lambda')
    cw = boto3.client('cloudwatch')

    functions = lambda_client.list_functions()['Functions']

    end = datetime.utcnow()
    start = end - timedelta(days=7)

    results = []

    for fn in functions:
        name = fn['FunctionName']
        memory = fn['MemorySize']

        # Get average duration and invocation count
        metrics = cw.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Duration',
            Dimensions=[{'Name': 'FunctionName', 'Value': name}],
            StartTime=start,
            EndTime=end,
            Period=604800,
            Statistics=['Average', 'Sum', 'SampleCount']
        )

        if metrics['Datapoints']:
            dp = metrics['Datapoints'][0]
            avg_duration_ms = dp['Average']
            invocations = int(dp['SampleCount'])

            # Calculate weekly cost estimate
            gb_seconds = (memory / 1024) * (avg_duration_ms / 1000) * invocations
            duration_cost = gb_seconds * 0.0000166667
            request_cost = invocations * 0.0000002
            total_cost = duration_cost + request_cost

            results.append({
                'name': name,
                'memory': memory,
                'avg_duration_ms': round(avg_duration_ms),
                'invocations': invocations,
                'weekly_cost': round(total_cost, 2)
            })

    # Sort by cost, highest first
    results.sort(key=lambda x: x['weekly_cost'], reverse=True)

    print(f"{'Function':<35} {'Memory':<8} {'Avg ms':<10} {'Invocations':<12} {'Weekly $'}")
    print("-" * 80)
    for r in results[:20]:
        print(f"{r['name']:<35} {r['memory']:<8} {r['avg_duration_ms']:<10} {r['invocations']:<12} ${r['weekly_cost']}")

analyze_lambda_costs()
```

## Key Takeaways

Lambda cost optimization comes down to three levers: memory allocation, execution duration, and invocation count. The power tuning tool is your best friend for finding the right memory setting. Beyond that, focus on connection reuse, parallel processing, appropriate timeouts, and ARM64 architecture. These changes typically reduce Lambda costs by 30-60% without any functional changes to your application.

For a broader view of your AWS spending, check out our post on [automating cost optimization with Lambda and CloudWatch](https://oneuptime.com/blog/post/automate-cost-optimization-with-lambda-and-cloudwatch/view).
