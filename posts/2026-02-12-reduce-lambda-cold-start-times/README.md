# How to Reduce Lambda Cold Start Times

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Performance, Cold Start, Serverless

Description: Practical techniques to reduce AWS Lambda cold start times, from code optimization and runtime selection to provisioned concurrency and SnapStart.

---

Cold starts are the most common performance complaint about Lambda. When Lambda creates a new execution environment for your function - downloading the code, starting the runtime, running initialization - that startup time gets added to the first request. For interactive applications where users are waiting, even a few hundred extra milliseconds matters.

The good news is that cold starts are very manageable. With the right techniques, you can cut them dramatically or eliminate them entirely.

## Understanding What Causes Cold Starts

A cold start happens when Lambda needs to create a new execution environment. This occurs when:

- The function is invoked for the first time
- All existing environments are busy handling other requests
- Lambda has recycled old environments (typically after 5-15 minutes of inactivity)
- You've deployed new code

The cold start process has several phases:

```mermaid
graph LR
    A[Download Code] --> B[Start Runtime]
    B --> C[Run Init Code]
    C --> D[Execute Handler]

    style A fill:#ff9999
    style B fill:#ff9999
    style C fill:#ffcc99
    style D fill:#99ff99
```

Phases A and B are controlled by AWS (you can't optimize them directly, but you can influence them). Phase C is your initialization code - imports, connections, global variables. Phase D is the actual function execution.

## Technique 1: Minimize Package Size

Larger deployment packages take longer to download and extract. This is the most basic optimization.

For Python:

```bash
# Remove unnecessary files from your package
cd build/
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

# Don't include boto3 - it's already in the Lambda runtime
pip install -r requirements.txt -t . --no-deps boto3 botocore
```

For Node.js, use tree-shaking with esbuild:

```bash
# Bundle and minify your function
npx esbuild index.mjs --bundle --platform=node --target=node20 \
  --outfile=dist/index.mjs --format=esm --minify --tree-shaking=true
```

This can reduce a 50 MB `node_modules` folder to under 1 MB.

## Technique 2: Optimize Initialization Code

Everything that runs outside your handler function runs during cold start. Move expensive operations out of the critical path.

Bad - imports and setup in the handler (runs every time but also contributes to module load):

```python
def lambda_handler(event, context):
    import pandas as pd  # Heavy import on every call
    import boto3

    client = boto3.client('s3')  # New connection every call
    # ...
```

Good - initialize outside the handler (runs once during cold start, reused on warm invocations):

```python
import json
import os
import boto3

# These run once during cold start and are reused
# Keep imports lightweight where possible
s3_client = boto3.client('s3')
TABLE_NAME = os.environ['TABLE_NAME']


def lambda_handler(event, context):
    # Handler code only - no initialization
    response = s3_client.get_object(
        Bucket='my-bucket',
        Key=event['key']
    )
    return {'statusCode': 200, 'body': json.dumps({'status': 'ok'})}
```

## Technique 3: Lazy Import Heavy Modules

If your function sometimes needs a heavy module and sometimes doesn't, import it lazily:

```python
import json

_pandas = None

def get_pandas():
    """Lazy load pandas only when needed."""
    global _pandas
    if _pandas is None:
        import pandas as _pandas
    return _pandas


def lambda_handler(event, context):
    action = event.get('action')

    if action == 'analyze':
        # Only import pandas when this code path is taken
        pd = get_pandas()
        df = pd.DataFrame(event['data'])
        result = df.describe().to_dict()
    else:
        # Fast path - no pandas needed
        result = {'status': 'skipped'}

    return {'statusCode': 200, 'body': json.dumps(result)}
```

## Technique 4: Choose the Right Runtime

Different runtimes have dramatically different cold start times. From fastest to slowest (approximate):

| Runtime | Typical Cold Start |
|---------|-------------------|
| Python 3.12 | 150-300 ms |
| Node.js 20.x | 150-300 ms |
| Go (provided.al2023) | 50-100 ms |
| .NET 8 (native AOT) | 200-400 ms |
| Ruby 3.3 | 200-400 ms |
| Java 21 | 800-3000 ms |
| .NET 8 (standard) | 500-1500 ms |
| Java 21 (with Spring) | 3000-10000 ms |

If cold starts are critical and you have flexibility on runtime, Python and Node.js give the best cold start performance out of the box. Go is the fastest overall if you're comfortable with the language.

## Technique 5: Use ARM64 Architecture

Lambda functions running on Graviton2 (ARM64) processors get about 20% better price-performance, and cold starts are slightly faster:

```bash
# Deploy with ARM64 architecture
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64
```

Make sure your dependencies are compiled for ARM. If you're using only pure Python or JavaScript, the switch is seamless.

## Technique 6: Connection Pooling

Database connections are one of the slowest parts of cold start initialization. Use connection pooling to minimize the impact.

For RDS, use RDS Proxy:

```python
import boto3
import os

# RDS Proxy handles connection pooling - connect to proxy endpoint
import pymysql

# Connection is established during init (cold start)
# and reused across warm invocations
connection = pymysql.connect(
    host=os.environ['RDS_PROXY_ENDPOINT'],
    user=os.environ['DB_USER'],
    password=os.environ['DB_PASSWORD'],
    database=os.environ['DB_NAME'],
    connect_timeout=5
)


def lambda_handler(event, context):
    with connection.cursor() as cursor:
        cursor.execute("SELECT * FROM orders WHERE id = %s", (event['order_id'],))
        result = cursor.fetchone()

    return {'statusCode': 200, 'body': json.dumps(result)}
```

## Technique 7: Use Lambda SnapStart (Java)

For Java functions, SnapStart dramatically reduces cold starts by taking a snapshot of the initialized execution environment. See our detailed guide on [Lambda SnapStart for Java](https://oneuptime.com/blog/post/2026-02-12-lambda-snapstart-java-functions/view).

## Technique 8: Use Provisioned Concurrency

If you can't tolerate any cold starts, provisioned concurrency keeps execution environments warm and ready:

```bash
# Keep 5 environments warm at all times
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --qualifier production \
  --provisioned-concurrent-executions 5
```

This eliminates cold starts for up to 5 concurrent invocations. But it costs money even when the function isn't running. Check out our guide on [provisioned concurrency](https://oneuptime.com/blog/post/2026-02-12-lambda-provisioned-concurrency-eliminate-cold-starts/view) for details.

## Technique 9: Keep Functions Warm

A simple, free approach is to ping your function periodically to keep execution environments alive:

```python
# warmer.py - Lambda function that pings other functions
import boto3
import json

lambda_client = boto3.client('lambda')

FUNCTIONS_TO_WARM = [
    'api-get-orders',
    'api-create-order',
    'api-update-order'
]


def lambda_handler(event, context):
    for func_name in FUNCTIONS_TO_WARM:
        try:
            lambda_client.invoke(
                FunctionName=func_name,
                InvocationType='Event',  # Async
                Payload=json.dumps({'__warmup': True})
            )
        except Exception as e:
            print(f"Failed to warm {func_name}: {e}")

    return {'warmed': len(FUNCTIONS_TO_WARM)}
```

Schedule it to run every 5 minutes with EventBridge:

```bash
# Create a scheduled rule
aws events put-rule \
  --name "warm-lambda-functions" \
  --schedule-expression "rate(5 minutes)"

aws events put-targets \
  --rule "warm-lambda-functions" \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:123456789012:function:warmer"
```

In your actual functions, add a short-circuit for warmup invocations:

```python
def lambda_handler(event, context):
    # Short-circuit for warmup pings
    if event.get('__warmup'):
        return {'statusCode': 200, 'body': 'warm'}

    # Normal function logic
    # ...
```

This approach only keeps one environment warm per function. If you need multiple concurrent warm environments, you need provisioned concurrency.

## Technique 10: Reduce Memory for Faster Downloads

This might seem counterintuitive, but smaller memory allocations download code faster because Lambda optimizes for the resource profile. However, once the code is downloaded, initialization is slower with less CPU. The net effect depends on your specific function.

Test both extremes and measure total cold start time, not just init duration.

## Measuring Cold Starts

Track cold start frequency and duration with CloudWatch:

```bash
# Count cold starts vs warm starts
aws logs filter-log-events \
  --log-group-name "/aws/lambda/my-function" \
  --filter-pattern "Init Duration" \
  --start-time $(date -d '24 hours ago' +%s000) \
  --query "events | length(@)"
```

Create a CloudWatch metric for cold start duration:

```python
# Add to your function to track cold start metrics
import os
import time

# This runs during cold start
_cold_start = True
_init_time = time.time()


def lambda_handler(event, context):
    global _cold_start

    if _cold_start:
        init_duration = (time.time() - _init_time) * 1000
        print(f"COLD_START init_duration={init_duration:.2f}ms")
        _cold_start = False

    # Rest of your function
```

## Wrapping Up

Cold starts are a fact of life with Lambda, but they don't have to be a problem. Most functions can achieve sub-300ms cold starts with basic optimizations: small packages, efficient initialization, and the right runtime. For the functions where even that isn't enough, provisioned concurrency and SnapStart eliminate cold starts entirely.

Start with the free techniques (smaller packages, lazy imports, connection reuse) and only reach for provisioned concurrency when you've exhausted the easy wins.
