# How to Fix Lambda 'Task Timed Out' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Troubleshooting, Performance

Description: Diagnose and fix AWS Lambda timeout errors by identifying slow dependencies, optimizing code, adjusting timeout settings, and improving cold start times.

---

You check your Lambda logs and see this:

```
Task timed out after 3.00 seconds
```

Your function ran out of time before it could finish. This is one of the most common Lambda errors, and the fix depends on why your function is taking too long. Let's work through the most common causes and solutions.

## Understanding Lambda Timeouts

Every Lambda function has a configurable timeout between 1 second and 15 minutes. The default is 3 seconds, which is surprisingly short for anything that makes network calls. When the timeout hits, Lambda kills your function immediately - no graceful shutdown, no chance to clean up.

First, check what your current timeout is:

```bash
# Check the function's timeout setting
aws lambda get-function-configuration \
  --function-name my-function \
  --query '{Timeout:Timeout,MemorySize:MemorySize}'
```

## Fix 1: Increase the Timeout

The most obvious fix. If your function legitimately needs more time, increase the timeout:

```bash
# Increase timeout to 30 seconds
aws lambda update-function-configuration \
  --function-name my-function \
  --timeout 30
```

But don't just crank it up to 15 minutes and call it a day. A long timeout means that if something is actually broken (like a downstream service being down), your function will run for the full timeout duration, burning money and potentially holding connections open.

Set your timeout to a reasonable value - maybe 2-3x what the function normally takes.

## Fix 2: Increase Memory (and CPU)

This is the fix people don't realize. Lambda allocates CPU power proportionally to memory. A 128 MB function gets a fraction of a CPU core. A 1024 MB function gets a full core. A 1769 MB function gets a full vCPU.

If your function is CPU-bound (processing data, parsing JSON, compressing files), increasing memory can dramatically speed it up:

```bash
# Increase memory to 1024 MB (which also increases CPU)
aws lambda update-function-configuration \
  --function-name my-function \
  --memory-size 1024
```

Here's a quick test to see if memory helps:

```python
import time
import json

def lambda_handler(event, context):
    start = time.time()

    # Your actual work here
    result = do_work()

    duration = time.time() - start
    remaining = context.get_remaining_time_in_millis()

    print(json.dumps({
        'duration_ms': round(duration * 1000),
        'remaining_ms': remaining,
        'memory_allocated': context.memory_limit_in_mb
    }))

    return result
```

Run this at different memory sizes and compare the duration. You might find that doubling the memory cuts the execution time in half, meaning you pay the same amount but finish faster.

## Fix 3: Optimize Database Connections

Database connections are a common timeout culprit. Each invocation that creates a new connection wastes time on the TCP handshake, TLS negotiation, and authentication.

Reuse connections by initializing them outside the handler:

```python
import pymysql
import os

# Connection initialized outside the handler - reused across invocations
connection = None

def get_connection():
    global connection
    if connection is None or not connection.open:
        connection = pymysql.connect(
            host=os.environ['DB_HOST'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            database=os.environ['DB_NAME'],
            connect_timeout=5,  # Don't wait forever for the connection
            read_timeout=10
        )
    return connection

def lambda_handler(event, context):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = %s", (event['user_id'],))
        result = cursor.fetchone()
    return {'statusCode': 200, 'body': str(result)}
```

For RDS, consider using RDS Proxy to handle connection pooling:

```bash
# Check if you're using RDS Proxy
aws rds describe-db-proxies \
  --query 'DBProxies[*].{Name:DBProxyName,Endpoint:Endpoint}'
```

## Fix 4: Fix DNS Resolution in VPC

If your Lambda is in a VPC and making external API calls, DNS resolution can add significant latency. Each cold start needs to resolve DNS names, which goes through the VPC's DNS settings.

Check if your function is in a VPC:

```bash
# Check VPC configuration
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'VpcConfig.{SubnetIds:SubnetIds,SecurityGroupIds:SecurityGroupIds}'
```

If it's in a VPC and making external calls, make sure you have a NAT Gateway (for internet access) and consider caching DNS results:

```python
import socket
import os

# Cache DNS resolution results
_dns_cache = {}

def cached_dns_resolve(hostname):
    if hostname not in _dns_cache:
        _dns_cache[hostname] = socket.gethostbyname(hostname)
    return _dns_cache[hostname]
```

## Fix 5: Use Async Operations

If your function calls multiple services, don't call them sequentially. Use async patterns to parallelize:

```python
import asyncio
import aiobotocore
from aiobotocore.session import get_session

async def fetch_data():
    session = get_session()

    async with session.create_client('dynamodb', region_name='us-east-1') as dynamodb:
        async with session.create_client('s3', region_name='us-east-1') as s3:
            # Run both calls in parallel
            results = await asyncio.gather(
                dynamodb.get_item(
                    TableName='users',
                    Key={'id': {'S': '123'}}
                ),
                s3.get_object(
                    Bucket='my-bucket',
                    Key='config.json'
                )
            )

    return results

def lambda_handler(event, context):
    loop = asyncio.get_event_loop()
    results = loop.run_until_complete(fetch_data())
    return {'statusCode': 200}
```

In Node.js, this is even more natural:

```javascript
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const dynamodb = new DynamoDBClient({});
const s3 = new S3Client({});

exports.handler = async (event) => {
  // Run both calls in parallel instead of sequentially
  const [userData, configData] = await Promise.all([
    dynamodb.send(new GetItemCommand({
      TableName: 'users',
      Key: { id: { S: '123' } }
    })),
    s3.send(new GetObjectCommand({
      Bucket: 'my-bucket',
      Key: 'config.json'
    }))
  ]);

  return { statusCode: 200 };
};
```

## Fix 6: Add Timeouts to External Calls

If your function calls external APIs, add explicit timeouts so a slow dependency doesn't eat your entire Lambda timeout:

```python
import requests

def lambda_handler(event, context):
    try:
        # Set a timeout shorter than your Lambda timeout
        response = requests.get(
            'https://api.example.com/data',
            timeout=(3, 10)  # (connect timeout, read timeout)
        )
        return {'statusCode': 200, 'body': response.text}
    except requests.Timeout:
        return {'statusCode': 504, 'body': 'Upstream API timed out'}
```

## Diagnosing Timeouts with X-Ray

AWS X-Ray can show you exactly where time is being spent in your function:

```bash
# Enable X-Ray tracing on your function
aws lambda update-function-configuration \
  --function-name my-function \
  --tracing-config Mode=Active
```

Then check the X-Ray console to see a breakdown of time spent in each service call.

## Monitoring and Alerting

Set up CloudWatch alarms for Lambda timeouts so you know about them immediately:

```bash
# Create an alarm for Lambda errors (including timeouts)
aws cloudwatch put-metric-alarm \
  --alarm-name "my-function-timeouts" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=my-function \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

For more comprehensive monitoring across your Lambda functions and other AWS services, consider using [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) which can correlate Lambda timeouts with downstream service health.

## Summary

Lambda timeouts usually fall into one of these categories:

1. **Timeout is too low** - Increase it to 2-3x your normal execution time
2. **Not enough CPU** - Increase memory to get more CPU power
3. **Slow database connections** - Reuse connections, use RDS Proxy
4. **Sequential API calls** - Parallelize with async
5. **Missing timeouts on external calls** - Always set explicit timeouts
6. **Cold starts** - Optimize package size, use provisioned concurrency

Start by checking your logs to understand where the time is being spent, then apply the appropriate fix.
