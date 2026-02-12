# How to Configure Fargate Spot for Cost Savings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Fargate Spot, Cost Optimization, Containers

Description: A practical guide to configuring AWS Fargate Spot to cut your ECS compute costs by up to 70 percent while maintaining service reliability.

---

Running containers on Fargate is convenient, but the cost adds up fast. If you're spending more than you'd like on ECS compute, Fargate Spot is one of the quickest wins available. It uses spare AWS capacity at a steep discount - typically 50-70% less than regular Fargate pricing. The catch? AWS can reclaim your tasks with a 2-minute warning when it needs that capacity back.

That sounds scary, but for many workloads it's completely fine. Let's dig into how to set it up properly and which workloads make sense.

## How Fargate Spot Works

Fargate Spot works similarly to EC2 Spot Instances. AWS has spare compute capacity that fluctuates based on overall demand. Instead of letting it sit idle, they offer it at a significant discount. When demand spikes and AWS needs that capacity back, your Spot tasks get a SIGTERM signal followed by a 2-minute grace period before termination.

Your tasks need to handle this gracefully. That means:
- Responding to SIGTERM signals
- Completing or checkpointing in-progress work
- Not holding state that can't be reconstructed

## Setting Up Fargate Spot

The simplest way to use Fargate Spot is through a capacity provider strategy on your ECS service. You don't need to create any custom capacity providers - `FARGATE_SPOT` comes built into every ECS cluster.

Here's a basic CloudFormation example that runs a service primarily on Fargate Spot.

```yaml
# CloudFormation service definition using Fargate Spot
Resources:
  WorkerService:
    Type: AWS::ECS::Service
    Properties:
      ServiceName: worker-service
      Cluster: !Ref ECSCluster
      TaskDefinition: !Ref WorkerTaskDefinition
      DesiredCount: 10
      # Note: No LaunchType property - capacity providers replace it
      CapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Base: 2          # Always keep 2 tasks on regular Fargate
          Weight: 1        # 1 part regular Fargate
        - CapacityProvider: FARGATE_SPOT
          Base: 0
          Weight: 4        # 4 parts Fargate Spot
      NetworkConfiguration:
        AwsvpcConfiguration:
          Subnets:
            - !Ref PrivateSubnet1
            - !Ref PrivateSubnet2
          SecurityGroups:
            - !Ref ServiceSecurityGroup
```

The `Base` and `Weight` values are the key settings here. With `Base: 2` on regular Fargate and weights of 1:4, this service would place 2 tasks on regular Fargate first, then distribute the remaining 8 tasks with roughly 80% on Spot and 20% on regular Fargate. That guarantees you always have at least 2 tasks running even during a Spot reclamation event.

## Terraform Configuration

If you're using Terraform, the same setup looks like this.

```hcl
# ECS cluster with Fargate capacity providers
resource "aws_ecs_cluster" "main" {
  name = "production-cluster"
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 2
    weight            = 1
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    weight            = 4
    capacity_provider = "FARGATE_SPOT"
  }
}

# Service that uses the capacity provider strategy
resource "aws_ecs_service" "worker" {
  name            = "worker-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = 10

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    base              = 2
    weight            = 1
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
  }

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.service.id]
  }
}
```

## Handling Spot Interruptions

The 2-minute warning is your lifeline. When AWS reclaims a Spot task, it sends SIGTERM to your container's main process. Your application needs to catch that signal and shut down cleanly.

Here's a Node.js example that handles graceful shutdown.

```javascript
// Graceful shutdown handler for Fargate Spot interruptions
const server = app.listen(3000);
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  console.log('SIGTERM received - starting graceful shutdown');
  isShuttingDown = true;

  // Stop accepting new requests
  server.close();

  // Finish processing current requests (give them 90 seconds)
  const timeout = setTimeout(() => {
    console.log('Shutdown timeout reached, forcing exit');
    process.exit(1);
  }, 90000);

  try {
    // Complete any in-progress work
    await finishPendingJobs();

    // Flush metrics and logs
    await flushMetrics();

    clearTimeout(timeout);
    console.log('Clean shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
});

// Health check that reports unhealthy during shutdown
app.get('/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: 'shutting-down' });
  }
  res.json({ status: 'healthy' });
});
```

For Python applications, the pattern is similar.

```python
# Python graceful shutdown for Fargate Spot
import signal
import sys

shutting_down = False

def handle_sigterm(signum, frame):
    global shutting_down
    print("SIGTERM received, starting graceful shutdown")
    shutting_down = True

    # Finish current work
    flush_pending_queue()

    # Close database connections
    db.close()

    print("Shutdown complete")
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
```

## Task Definition Considerations

Your task definition's `stopTimeout` parameter controls how long ECS waits between sending SIGTERM and SIGKILL. For Fargate Spot, set this to at least 120 seconds to use the full 2-minute window.

```json
{
  "family": "worker-task",
  "containerDefinitions": [
    {
      "name": "worker",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/worker:latest",
      "stopTimeout": 120,
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "networkMode": "awsvpc",
  "cpu": "512",
  "memory": "1024"
}
```

## Which Workloads Work Best

Not every workload is a good fit for Fargate Spot. Here's a breakdown:

**Great candidates:**
- Queue workers and background job processors
- Batch processing tasks
- Data pipeline stages
- Stateless API servers (behind a load balancer with enough replicas)
- CI/CD build tasks
- Log and event processors

**Poor candidates:**
- Singleton services that can't tolerate restarts
- Long-running database migrations
- Services with very few replicas (fewer than 3)
- Stateful workloads without external state stores

## Cost Estimation

Let's look at real numbers. Say you're running 20 Fargate tasks, each with 1 vCPU and 2 GB of memory, 24/7 in us-east-1.

Regular Fargate monthly cost:
- vCPU: 20 tasks x 1 vCPU x $0.04048/hour x 730 hours = $591
- Memory: 20 tasks x 2 GB x $0.004445/hour x 730 hours = $129
- Total: ~$720/month

With a 2 base + 18 Spot strategy (assuming 70% discount on Spot):
- Base Fargate: 2 tasks = ~$72/month
- Spot tasks: 18 tasks x 30% of regular price = ~$194/month
- Total: ~$266/month

That's a **63% reduction** in compute costs. Not bad for what amounts to a config change and some SIGTERM handling.

## Monitoring Spot Usage

You'll want to track how Fargate Spot is behaving in your cluster. Set up CloudWatch alarms for these scenarios.

```bash
# Check how many tasks are running on each capacity provider
aws ecs describe-services \
  --cluster production-cluster \
  --services worker-service \
  --query 'services[0].capacityProviderStrategy'

# Look at task stop reasons to catch Spot interruptions
aws ecs list-tasks \
  --cluster production-cluster \
  --desired-status STOPPED | \
  xargs -I {} aws ecs describe-tasks \
    --cluster production-cluster \
    --tasks {} \
    --query 'tasks[?stoppedReason==`Your task was stopped because a Spot interruption occurred.`]'
```

For comprehensive monitoring of your ECS services, including tracking Spot interruptions and their impact on availability, check out our post on [monitoring container workloads](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Pitfalls to Avoid

**Don't go 100% Spot.** Always keep a base count on regular Fargate. If there's a capacity crunch in your region, you don't want your entire service going down.

**Don't ignore the ECS service scheduler.** ECS will automatically replace interrupted Spot tasks, but if Spot capacity is unavailable, those tasks will stay in PROVISIONING state. Your base count is what keeps you running.

**Don't forget about AZ distribution.** Spread your subnets across availability zones. Spot capacity often varies by AZ, so wider distribution means better availability.

**Test your shutdown handlers.** Send SIGTERM to your containers locally and verify they shut down within 2 minutes. A handler that takes 3 minutes is useless.

Fargate Spot is one of those rare cases where you get a massive cost reduction with relatively little engineering effort. If you're running ECS and haven't looked into it yet, it's worth an afternoon of your time.
