# How to Configure ECS Health Checks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Health Checks, Monitoring, Containers

Description: A thorough guide to configuring health checks in ECS, covering container health checks, ALB health checks, how they interact, and strategies to avoid common problems.

---

Health checks are the mechanism that keeps your ECS services running reliably. When a container becomes unhealthy, ECS replaces it. When a task fails load balancer health checks, the ALB stops sending traffic to it. Getting health checks right means the difference between self-healing services and midnight pages about containers stuck in restart loops.

The tricky part is that ECS has multiple layers of health checking, and they don't always interact the way you'd expect. Let's untangle all of them.

## Three Types of Health Checks

ECS services can have up to three different health check mechanisms running simultaneously:

1. **Container health check** - defined in the task definition, runs inside the container
2. **ALB health check** - defined on the target group, runs from the load balancer
3. **ECS service health check** - the service's own evaluation that combines the above

Each plays a different role, and understanding how they interact is key to avoiding problems.

## Container Health Checks

Container health checks run a command inside the container at regular intervals. If the command exits with code 0, the container is healthy. Any other exit code means unhealthy.

Define them in your task definition.

```json
{
  "containerDefinitions": [
    {
      "name": "api",
      "image": "my-api:1.0.0",
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

Here's what each parameter does:

- **command** - the health check command to run
- **interval** - seconds between health checks (default 30)
- **timeout** - seconds to wait for the check to complete before considering it failed (default 5)
- **retries** - consecutive failures needed to mark the container as unhealthy (default 3)
- **startPeriod** - grace period in seconds before health checks start counting failures (default 0)

The `startPeriod` is the most important setting. If your application takes 45 seconds to boot, set this to at least 60. During the start period, health check failures don't count against the retry limit.

### Health Check Command Options

You have two command formats:

```json
// CMD-SHELL - runs in the container's shell
"command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]

// CMD - runs the command directly (no shell)
"command": ["CMD", "/app/healthcheck"]
```

Choose `CMD-SHELL` when you need shell features like pipes or `||`. Use `CMD` when you have a dedicated health check binary and want to avoid shell overhead.

### Writing a Good Health Check Endpoint

Your health check endpoint should verify that your application is actually ready to serve traffic, not just that the process is running.

```javascript
// A comprehensive health check endpoint in Node.js
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');

    // Check cache connectivity
    await redis.ping();

    // Check that the app is initialized
    if (!app.locals.initialized) {
      return res.status(503).json({ status: 'initializing' });
    }

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});
```

```python
# Health check endpoint in Flask
@app.route('/health')
def health_check():
    checks = {}

    # Check database
    try:
        db.session.execute(text('SELECT 1'))
        checks['database'] = 'ok'
    except Exception as e:
        checks['database'] = str(e)
        return jsonify({'status': 'unhealthy', 'checks': checks}), 503

    # Check Redis
    try:
        redis_client.ping()
        checks['redis'] = 'ok'
    except Exception as e:
        checks['redis'] = str(e)
        return jsonify({'status': 'unhealthy', 'checks': checks}), 503

    return jsonify({
        'status': 'healthy',
        'checks': checks,
        'uptime': time.time() - start_time
    })
```

Be careful with what you include in health checks. If your health check depends on an external service that's temporarily down, all your containers might get marked unhealthy and replaced simultaneously. Consider having a "liveness" check (is the process running?) separate from a "readiness" check (can it serve traffic?).

## ALB Health Checks

When your ECS service has a load balancer, the ALB performs its own health checks independently from container health checks.

```bash
# Configure the ALB target group health check
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 15 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher '{"HttpCode": "200-299"}'
```

ALB health checks run from the load balancer nodes to the container's port. They're separate from container health checks.

### ALB vs Container Health Check Interaction

Here's how they work together when both are configured:

1. A new task starts
2. The container health check starts running (respecting `startPeriod`)
3. The ALB registers the task's IP/port as a target
4. The ALB starts its own health checks
5. Once the ALB marks the target healthy, traffic flows to the task
6. If either check fails consistently, the task is eventually replaced

The ECS service considers a task healthy only when both container health check AND ALB health check are passing.

## Health Check Grace Period

The service-level `healthCheckGracePeriodSeconds` is your safety net against false positives during startup.

```bash
# Set health check grace period when creating or updating a service
aws ecs create-service \
  --cluster my-cluster \
  --service-name api \
  --task-definition api:1 \
  --desired-count 3 \
  --health-check-grace-period-seconds 120 \
  --launch-type FARGATE \
  --network-configuration '{...}' \
  --load-balancers '[...]'
```

During the grace period, ECS ignores ALB health check failures. This gives your application time to:

- Pull and start the container
- Initialize database connections
- Load configuration
- Warm caches
- Pass the first health check

Set this to at least 2x your application's typical startup time. If your app takes 30 seconds to start, set it to 60-90 seconds. If it takes 2 minutes (heavy Java apps, I'm looking at you), set it to 300.

## Common Health Check Problems and Solutions

### Problem: Tasks Keep Restarting in a Loop

Symptoms: tasks start, run for a minute, get killed, and new ones start.

The cause is almost always the health check grace period being too short. ECS kills the task before it finishes starting up.

```bash
# Fix: increase the grace period
aws ecs update-service \
  --cluster my-cluster \
  --service api \
  --health-check-grace-period-seconds 300
```

### Problem: All Tasks Marked Unhealthy Simultaneously

This happens when your health check depends on an external service (like a database) that goes down briefly.

Fix: separate liveness from readiness.

```javascript
// Liveness check - only checks if the process is alive
app.get('/healthz', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness check - checks if the app can serve traffic
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (err) {
    res.status(503).json({ status: 'not ready' });
  }
});
```

Use the liveness check for the container health check (so ECS doesn't kill containers during database blips) and the readiness check for the ALB health check (so the ALB stops sending traffic to containers that can't serve requests).

### Problem: Health Check Passes Locally But Fails on ECS

Check these things:

1. The security group allows traffic from the ALB to the container port
2. The container is listening on `0.0.0.0`, not `127.0.0.1`
3. The health check path is correct (case-sensitive!)
4. The response code matches the ALB matcher

```bash
# Verify target health status
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123
```

### Problem: Slow Rolling Deployments

If deployments take forever, the health check interval might be too long. The ALB needs `healthy-threshold` consecutive successful checks before routing traffic.

With the default settings (30s interval, 5 healthy threshold), it takes 150 seconds before a new task starts receiving traffic. Optimize this:

```bash
# Faster health check for quicker deployments
aws elbv2 modify-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --health-check-interval-seconds 10 \
  --healthy-threshold-count 2
```

Now it takes just 20 seconds to mark a target healthy. The trade-off is more health check traffic to your containers.

## Monitoring Health Check Status

```bash
# View container health status for running tasks
aws ecs describe-tasks \
  --cluster my-cluster \
  --tasks $(aws ecs list-tasks --cluster my-cluster --service-name api --query 'taskArns[*]' --output text) \
  --query 'tasks[*].{TaskId:taskArn,Health:healthStatus,Containers:containers[*].{Name:name,Health:healthStatus}}'

# View ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State,Reason:TargetHealth.Reason}'
```

## Wrapping Up

Health checks seem simple but have a lot of subtle interactions in ECS. The most important things to get right: set a generous `startPeriod` on container health checks, set an appropriate `healthCheckGracePeriodSeconds` on your service, and separate liveness from readiness so external dependency failures don't cascade into container restarts. Once your health checks are tuned properly, your services become genuinely self-healing. For the next step in building resilient services, check out our guide on [ECS auto scaling](https://oneuptime.com/blog/post/2026-02-12-ecs-service-auto-scaling/view).
