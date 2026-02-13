# How to Configure Lambda Memory and Timeout Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Performance, Serverless

Description: Understand how Lambda memory allocation affects CPU, performance, and cost, and learn how to configure memory and timeout settings for optimal results.

---

Lambda's pricing model is based on two things: the number of requests and the duration of execution measured in GB-seconds. Memory allocation directly controls both how fast your function runs and how much it costs. Get it right and you save money while improving performance. Get it wrong and you're either overpaying or suffering from slow functions.

Let's break down how memory and timeout settings work, and how to configure them properly.

## How Memory Allocation Works

When you set the memory for a Lambda function, you're not just setting RAM. You're also setting CPU power. Lambda allocates CPU proportionally to memory:

- **128 MB** - Minimum. Very limited CPU (a fraction of one vCPU)
- **1,769 MB** - One full vCPU
- **3,538 MB** - Two full vCPUs (though your code needs to be multi-threaded to use both)
- **10,240 MB** - Maximum. About six vCPUs

The relationship is linear. At 256 MB, you get roughly twice the CPU of 128 MB. At 512 MB, four times. This means that doubling the memory often halves the execution time - and since you pay for duration times memory, the cost can be identical while the function runs twice as fast.

## Viewing Current Settings

Check your function's current configuration:

```bash
# Get current memory and timeout settings
aws lambda get-function-configuration \
  --function-name my-function \
  --query "{Memory:MemorySize,Timeout:Timeout,LastModified:LastModified}" \
  --output table
```

## Configuring Memory

Set the memory allocation using the CLI:

```bash
# Set memory to 512 MB
aws lambda update-function-configuration \
  --function-name my-function \
  --memory-size 512
```

Memory can be set in 1 MB increments between 128 MB and 10,240 MB. Some common allocations and their use cases:

| Memory | CPU | Good For |
|--------|-----|----------|
| 128 MB | Minimal | Simple routing, lightweight transforms |
| 256 MB | Low | API handlers, DynamoDB operations |
| 512 MB | Moderate | JSON processing, API calls with parsing |
| 1024 MB | ~0.5 vCPU | Image thumbnailing, moderate computation |
| 1769 MB | 1 vCPU | Heavy processing, data transformation |
| 3008 MB | ~1.7 vCPU | Machine learning inference |
| 10240 MB | ~6 vCPU | Parallel processing, large data sets |

## Configuring Timeout

The timeout setting controls the maximum execution time before Lambda kills the function:

```bash
# Set timeout to 60 seconds
aws lambda update-function-configuration \
  --function-name my-function \
  --timeout 60
```

The minimum is 1 second and the maximum is 900 seconds (15 minutes). The default is 3 seconds.

Here's the thing - you don't want your timeout to be too tight or too generous:

- **Too tight**: Functions get killed during normal operation, especially under load when external services are slower
- **Too generous**: If something goes wrong (infinite loop, hung connection), you burn money waiting for the timeout

A good rule of thumb is to set the timeout to 3-5x the expected maximum execution time. If your function normally completes in 2 seconds, set the timeout to 6-10 seconds.

## Setting Both at Once

Update memory and timeout together:

```bash
# Update both memory and timeout
aws lambda update-function-configuration \
  --function-name my-function \
  --memory-size 1024 \
  --timeout 30
```

## The Memory-Duration-Cost Relationship

Here's where it gets interesting. Let's say a function takes 10 seconds at 128 MB. If you double the memory to 256 MB, it might only take 5 seconds. The cost calculation:

```
128 MB for 10s = 128/1024 * 10 = 1.25 GB-seconds
256 MB for 5s  = 256/1024 * 5  = 1.25 GB-seconds
```

Same cost, but the function is twice as fast. In many cases, adding more memory actually reduces cost because the speed improvement is more than proportional to the memory increase.

Here's a Python script that calculates the cost comparison:

```python
# cost_calculator.py - Compare Lambda costs at different memory levels

# Price per GB-second (as of 2026, us-east-1)
PRICE_PER_GB_SECOND = 0.0000166667
PRICE_PER_REQUEST = 0.0000002

def calculate_cost(memory_mb, duration_ms, invocations_per_month):
    """Calculate monthly Lambda cost."""
    # Convert to GB-seconds
    gb_seconds = (memory_mb / 1024) * (duration_ms / 1000)

    # Total GB-seconds per month
    total_gb_seconds = gb_seconds * invocations_per_month

    # Free tier: 400,000 GB-seconds per month
    billable_gb_seconds = max(0, total_gb_seconds - 400000)

    # Free tier: 1M requests per month
    billable_requests = max(0, invocations_per_month - 1000000)

    compute_cost = billable_gb_seconds * PRICE_PER_GB_SECOND
    request_cost = billable_requests * PRICE_PER_REQUEST

    return compute_cost + request_cost


# Example: Compare 128 MB (10s) vs 256 MB (5s) vs 512 MB (3s)
configs = [
    (128, 10000, "128 MB / 10s"),
    (256, 5000, "256 MB / 5s"),
    (512, 3000, "512 MB / 3s"),
    (1024, 1800, "1024 MB / 1.8s"),
]

invocations = 5_000_000  # 5 million per month

print(f"Monthly cost comparison ({invocations:,} invocations/month):")
print("-" * 50)
for memory, duration, label in configs:
    cost = calculate_cost(memory, duration, invocations)
    print(f"  {label:20s} -> ${cost:,.2f}/month")
```

## Monitoring Memory Usage

After configuring memory, monitor whether your function actually uses what you've allocated.

Lambda reports memory usage in CloudWatch:

```bash
# Get maximum memory used in the last 7 days
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name MaxMemoryUsed \
  --dimensions Name=FunctionName,Value=my-function \
  --start-time $(date -u -v-7d +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Maximum \
  --output table
```

You can also check the `REPORT` line in CloudWatch Logs, which appears after every invocation:

```
REPORT RequestId: abc-123 Duration: 245.31 ms Billed Duration: 246 ms Memory Size: 512 MB Max Memory Used: 87 MB Init Duration: 412.08 ms
```

That `Max Memory Used: 87 MB` tells you the function only needed 87 MB out of the 512 MB allocated. You might be over-provisioned. But remember: reducing memory also reduces CPU, which might increase duration.

## CloudFormation and SAM Configuration

Set memory and timeout in your infrastructure code:

```yaml
# SAM template
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      Runtime: python3.12
      MemorySize: 512
      Timeout: 30
      CodeUri: src/
```

Or in Terraform:

```hcl
resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  handler       = "app.handler"
  runtime       = "python3.12"
  memory_size   = 512
  timeout       = 30
  role          = aws_iam_role.lambda_role.arn
  filename      = "deployment.zip"
}
```

## Common Patterns

### API Handlers
Fast response times matter. Give them enough CPU to respond quickly:
```bash
aws lambda update-function-configuration \
  --function-name api-handler \
  --memory-size 512 \
  --timeout 10
```

### Data Processing Functions
These are often CPU-bound. More memory means more CPU:
```bash
aws lambda update-function-configuration \
  --function-name data-processor \
  --memory-size 2048 \
  --timeout 300
```

### Background Jobs from SQS
These can afford to be slower but need enough timeout for retries:
```bash
aws lambda update-function-configuration \
  --function-name queue-processor \
  --memory-size 256 \
  --timeout 60
```

### File Processing from S3
Large files need more memory and time:
```bash
aws lambda update-function-configuration \
  --function-name file-processor \
  --memory-size 3008 \
  --timeout 900
```

## The Out-of-Memory Error

If your function exceeds its memory allocation, Lambda kills it immediately with this error:

```
Runtime exited with error: signal: killed
```

In CloudWatch, you'll see the `Max Memory Used` matching or exceeding the `Memory Size`. The fix is straightforward - increase the memory allocation.

But don't just set it to 10 GB and call it a day. That's expensive. Find the actual memory usage peak and add a 20-30% buffer.

## Wrapping Up

Memory and timeout are the two most impactful configuration settings for Lambda functions. Start with a reasonable default (256-512 MB, 30 seconds), measure actual usage, and adjust. Remember that more memory means more CPU, so increasing memory often improves performance without increasing cost.

For a more scientific approach to finding the optimal memory size, check out our guide on [choosing the right Lambda memory size](https://oneuptime.com/blog/post/2026-02-12-choose-right-lambda-memory-size-performance/view) and [AWS Lambda Power Tuning](https://oneuptime.com/blog/post/2026-02-12-aws-lambda-power-tuning-optimize-cost-performance/view).
