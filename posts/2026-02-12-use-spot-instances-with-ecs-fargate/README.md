# How to Use Spot Instances with ECS Fargate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Fargate, Spot Instances, Cost Optimization

Description: Learn how to use Fargate Spot capacity providers with Amazon ECS to reduce container costs by up to 70% while maintaining application reliability.

---

Fargate Spot lets you run ECS tasks at up to 70% discount compared to regular Fargate pricing. The tradeoff is that AWS can reclaim your Spot capacity with a 2-minute warning when it needs the resources back. That sounds scary, but for many workloads it's perfectly fine - and the savings are substantial.

A standard Fargate task with 1 vCPU and 2GB memory costs about $0.04048/hour. The same task on Fargate Spot costs around $0.01215/hour. Over a month, that's the difference between $29.55 and $8.87 per task. Multiply by dozens or hundreds of tasks, and the savings become very real.

## When to Use Fargate Spot

Fargate Spot works well for:
- **Batch processing** - Jobs that can be retried if interrupted
- **Queue workers** - Tasks that process messages from SQS; interruptions just mean the message goes back to the queue
- **Development/staging environments** - Where brief interruptions don't matter
- **Stateless web servers behind a load balancer** - The ALB routes around terminated tasks
- **CI/CD pipelines** - Build and test tasks that can be restarted

Fargate Spot does not work well for:
- Singleton tasks (only one instance running)
- Long-running database connections that can't handle disconnection
- Tasks that take hours to start up

## Setting Up Capacity Providers

First, create a cluster with both Fargate and Fargate Spot capacity providers:

```bash
# Create an ECS cluster with both capacity providers
aws ecs create-cluster \
  --cluster-name my-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=2 \
    capacityProvider=FARGATE_SPOT,weight=3
```

This configuration sets a **base** of 2 tasks on regular Fargate (these always run, even if Spot isn't available) and distributes additional tasks with a 1:3 ratio - for every task on Fargate, three go on Fargate Spot. So if you need 10 tasks, 2 run on Fargate (base) and of the remaining 8, approximately 2 go on Fargate and 6 on Fargate Spot.

For an existing cluster, update the capacity provider strategy:

```bash
# Update an existing cluster's default capacity provider strategy
aws ecs put-cluster-capacity-providers \
  --cluster my-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=2 \
    capacityProvider=FARGATE_SPOT,weight=4
```

## Configuring a Service for Spot

When creating or updating an ECS service, specify the capacity provider strategy:

```bash
# Create a service that uses a mix of Fargate and Fargate Spot
aws ecs create-service \
  --cluster my-cluster \
  --service-name web-app \
  --task-definition web-app:latest \
  --desired-count 6 \
  --capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1,base=2 \
    capacityProvider=FARGATE_SPOT,weight=3 \
  --network-configuration '{
    "awsvpcConfiguration": {
      "subnets": ["subnet-0a1b2c3d", "subnet-0e5f67890"],
      "securityGroups": ["sg-0a1b2c3d4e5f67890"],
      "assignPublicIp": "DISABLED"
    }
  }' \
  --load-balancers '[
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web-app/abc123",
      "containerName": "web",
      "containerPort": 8080
    }
  ]'
```

With this configuration and 6 desired tasks: 2 run on Fargate (base), and of the remaining 4, approximately 1 goes on Fargate and 3 on Fargate Spot.

## Handling Spot Interruptions

When AWS reclaims Spot capacity, ECS sends a task state change event and gives you 2 minutes. Here's how to handle it gracefully.

**In your application code**, handle SIGTERM:

```python
import signal
import sys
import time

# Flag to track if we should keep running
running = True

def handle_sigterm(signum, frame):
    """Handle SIGTERM from ECS when Spot capacity is reclaimed"""
    global running
    print("Received SIGTERM - starting graceful shutdown")
    running = False

# Register the signal handler
signal.signal(signal.SIGTERM, handle_sigterm)

def main():
    while running:
        # Process work items
        message = receive_message_from_queue()
        if message:
            try:
                process_message(message)
                acknowledge_message(message)
            except Exception as e:
                # Don't acknowledge - message will be retried
                print(f"Error processing message: {e}")
        else:
            time.sleep(1)

    # Graceful shutdown
    print("Completing in-flight work before shutdown...")
    finish_current_work()
    print("Shutdown complete")
    sys.exit(0)

if __name__ == '__main__':
    main()
```

**Set up EventBridge rules** to monitor Spot interruptions:

```bash
# Create a rule to capture Fargate Spot interruption events
aws events put-rule \
  --name "fargate-spot-interruptions" \
  --event-pattern '{
    "source": ["aws.ecs"],
    "detail-type": ["ECS Task State Change"],
    "detail": {
      "stopCode": ["SpotInterruption"]
    }
  }' \
  --description "Track Fargate Spot interruption events"

# Send to SNS for monitoring
aws events put-targets \
  --rule fargate-spot-interruptions \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:123456789012:spot-interruptions"
```

## Task Definition for Spot-Friendly Workloads

Design your task definition to work well with Spot:

```json
{
  "family": "spot-friendly-worker",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:latest",
      "essential": true,
      "stopTimeout": 120,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/spot-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        {
          "name": "GRACEFUL_SHUTDOWN_TIMEOUT",
          "value": "110"
        }
      ]
    }
  ]
}
```

The key settings:
- `stopTimeout: 120` gives the container the full 2-minute warning period to shut down
- `GRACEFUL_SHUTDOWN_TIMEOUT` tells your app how long it has to finish current work

## SQS Worker Pattern

The most natural fit for Fargate Spot is processing SQS messages. If a task gets interrupted, unacknowledged messages automatically return to the queue:

```python
import boto3
import signal
import json

sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/work-queue'

running = True

def handle_sigterm(signum, frame):
    global running
    running = False
    print("Shutting down - will finish current message")

signal.signal(signal.SIGTERM, handle_sigterm)

def process_messages():
    while running:
        # Use long polling with a short wait time for responsive shutdown
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=5,
            VisibilityTimeout=300  # 5 min to process
        )

        messages = response.get('Messages', [])
        for msg in messages:
            try:
                body = json.loads(msg['Body'])
                process_work_item(body)

                # Only delete after successful processing
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=msg['ReceiptHandle']
                )
            except Exception as e:
                print(f"Failed to process message: {e}")
                # Message will return to queue after visibility timeout

    print("Graceful shutdown complete")

process_messages()
```

## Monitoring Spot Usage and Savings

Track your Fargate vs Fargate Spot usage:

```python
import boto3
from datetime import datetime, timedelta

ce = boto3.client('ce')

def fargate_spot_savings_report():
    """Calculate Fargate Spot savings for the past month"""
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    response = ce.get_cost_and_usage(
        TimePeriod={'Start': start_date, 'End': end_date},
        Granularity='MONTHLY',
        Metrics=['UnblendedCost', 'UsageQuantity'],
        Filter={
            'Dimensions': {
                'Key': 'SERVICE',
                'Values': ['Amazon Elastic Container Service']
            }
        },
        GroupBy=[{'Type': 'USAGE_TYPE', 'Key': ''}]
    )

    fargate_cost = 0
    spot_cost = 0

    for group in response['ResultsByTime'][0]['Groups']:
        usage_type = group['Keys'][0]
        cost = float(group['Metrics']['UnblendedCost']['Amount'])

        if 'Fargate-Spot' in usage_type:
            spot_cost += cost
        elif 'Fargate' in usage_type:
            fargate_cost += cost

    # Estimate what Spot would have cost at on-demand prices
    spot_at_ondemand = spot_cost / 0.3  # Spot is roughly 30% of on-demand

    print(f"Fargate on-demand cost:    ${fargate_cost:.2f}")
    print(f"Fargate Spot cost:         ${spot_cost:.2f}")
    print(f"Spot at on-demand prices:  ${spot_at_ondemand:.2f}")
    print(f"Spot savings:              ${spot_at_ondemand - spot_cost:.2f}")
    print(f"Total Fargate cost:        ${fargate_cost + spot_cost:.2f}")

fargate_spot_savings_report()
```

## Best Practices

1. **Always set a base count on regular Fargate.** This ensures minimum availability even if all Spot capacity is reclaimed.

2. **Spread across multiple AZs.** Spot interruptions are often AZ-specific. Spreading tasks reduces the chance of losing all Spot tasks at once.

3. **Keep tasks stateless.** Store state in external services (DynamoDB, SQS, S3) so interrupted tasks can be seamlessly replaced.

4. **Use health checks aggressively.** Configure short deregistration delays on your target groups so the ALB quickly stops sending traffic to terminating tasks.

5. **Monitor interruption rates.** If you're seeing frequent interruptions, increase the base count on regular Fargate.

For more on cost-effective compute options, check out our guide on [using Graviton instances for cost-effective compute](https://oneuptime.com/blog/post/2026-02-12-use-graviton-instances-for-cost-effective-compute/view).

## Key Takeaways

Fargate Spot provides 60-70% savings with minimal effort for workloads that can tolerate brief interruptions. Start with queue workers and batch jobs where the risk is lowest, then expand to web services behind load balancers. Always keep a base of on-demand tasks for availability, and design your applications to handle SIGTERM gracefully. The setup takes about an hour, and the savings are immediate.
