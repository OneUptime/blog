# How to Configure ALB Health Checks in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, ALB, Health Check, Load Balancing

Description: A detailed guide to configuring ALB health checks in Terraform, including HTTP/HTTPS checks, custom health check paths, matcher codes, and troubleshooting unhealthy targets.

---

Health checks are how your Application Load Balancer decides whether to send traffic to an instance. Get them wrong, and your ALB either sends traffic to broken instances or pulls healthy ones out of rotation. Get them right, and your load balancer becomes a reliable traffic cop that automatically routes around failures.

This guide covers every health check setting you can configure in Terraform, along with practical advice for tuning them.

## How ALB Health Checks Work

The ALB periodically sends requests to each registered target on a specific path. Based on the response, it marks the target as healthy or unhealthy:

1. ALB sends an HTTP(S) request to the target's health check path
2. If the response matches the expected status code within the timeout, it counts as a success
3. After enough consecutive successes, the target is marked healthy
4. After enough consecutive failures, the target is marked unhealthy and removed from rotation
5. Unhealthy targets keep getting checked, and are restored when they pass enough checks

## Basic Health Check Configuration

Health checks are configured on the target group, not the ALB or listener.

```hcl
# Target group with a basic health check
resource "aws_lb_target_group" "app" {
  name_prefix = "app-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"  # Use the same port as the target
    protocol            = "HTTP"
    healthy_threshold   = 3    # Consecutive successes to mark healthy
    unhealthy_threshold = 3    # Consecutive failures to mark unhealthy
    timeout             = 5    # Seconds to wait for a response
    interval            = 30   # Seconds between checks
    matcher             = "200"  # Expected HTTP status code
  }

  tags = {
    Name = "app-target-group"
  }
}
```

Let's break down each setting.

## Health Check Path

The path should point to a dedicated health endpoint in your application that checks all critical dependencies.

```hcl
# Simple health check - just confirms the app is running
health_check {
  path = "/health"
  # Returns 200 if the process is alive
}

# Deep health check - verifies database and cache connections
health_check {
  path = "/health/ready"
  # Returns 200 only if DB and Redis are reachable
}

# Lightweight ping endpoint
health_check {
  path = "/ping"
  # Returns 200 with minimal processing
}
```

Choose your health check path carefully:

- Use a **lightweight endpoint** (`/ping`) if you just want to confirm the process is running
- Use a **deep health check** (`/health/ready`) if the instance is useless without database connectivity
- Avoid using your homepage (`/`) because it's typically heavier and may return non-200 codes

Here's what a good health endpoint looks like in your application:

```python
# Example Flask health endpoint
@app.route('/health')
def health():
    checks = {}

    # Check database
    try:
        db.session.execute('SELECT 1')
        checks['database'] = 'ok'
    except Exception:
        checks['database'] = 'failed'
        return jsonify(checks), 503

    # Check Redis
    try:
        redis_client.ping()
        checks['redis'] = 'ok'
    except Exception:
        checks['redis'] = 'failed'
        return jsonify(checks), 503

    return jsonify(checks), 200
```

## Port Configuration

By default, health checks use the same port as the traffic port. You can override this.

```hcl
# Health check on the traffic port (default)
health_check {
  port = "traffic-port"
  path = "/health"
}

# Health check on a different port
# Useful when your app has a separate management port
health_check {
  port = 8081      # Management port
  path = "/health"
}

# Health check on a specific port for sidecar health
health_check {
  port = 9090      # Prometheus/metrics port
  path = "/metrics"
  matcher = "200"
}
```

Using a separate health check port is common when your application exposes management endpoints on a different port than the application traffic.

## Matcher Configuration

The matcher defines which HTTP status codes count as healthy.

```hcl
# Single status code
health_check {
  matcher = "200"
  path    = "/health"
}

# Range of status codes
health_check {
  matcher = "200-299"  # Any 2xx is healthy
  path    = "/health"
}

# Multiple specific codes
health_check {
  matcher = "200,204,301"  # Any of these is healthy
  path    = "/health"
}
```

For gRPC target groups, you can match gRPC status codes:

```hcl
# gRPC health check
resource "aws_lb_target_group" "grpc" {
  name_prefix      = "grpc-"
  port             = 50051
  protocol         = "HTTP"
  protocol_version = "gRPC"
  vpc_id           = aws_vpc.main.id

  health_check {
    enabled  = true
    path     = "/grpc.health.v1.Health/Check"
    matcher  = "0-99"  # gRPC status codes
    protocol = "HTTP"
  }
}
```

## Tuning Thresholds and Timing

The timing parameters control how quickly the ALB detects and recovers from failures.

```hcl
# Fast failure detection (good for auto-scaling groups)
resource "aws_lb_target_group" "fast_detection" {
  name_prefix = "fast-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2     # Mark healthy after 2 successes
    unhealthy_threshold = 2     # Mark unhealthy after 2 failures
    timeout             = 3     # Short timeout
    interval            = 10    # Check every 10 seconds
    matcher             = "200"
  }
}

# Slower, more tolerant health checks (good for apps with occasional slowness)
resource "aws_lb_target_group" "tolerant" {
  name_prefix = "tol-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 3     # Need 3 successes to come back
    unhealthy_threshold = 5     # Allow 5 failures before removal
    timeout             = 10    # Wait up to 10 seconds
    interval            = 30    # Check every 30 seconds
    matcher             = "200"
  }
}

# Conservative checks for slow-starting applications
resource "aws_lb_target_group" "slow_start" {
  name_prefix = "slow-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10    # Very tolerant during startup
    timeout             = 15
    interval            = 30
    matcher             = "200"
  }

  # Slow start gives new instances time to warm up
  slow_start = 120  # 120 seconds of gradually increasing traffic
}
```

Here's how to calculate detection times:

- **Time to mark unhealthy** = `unhealthy_threshold` x `interval` = 3 x 30 = 90 seconds
- **Time to mark healthy** = `healthy_threshold` x `interval` = 3 x 30 = 90 seconds

For the fast detection example: 2 x 10 = 20 seconds to detect failure.

## HTTPS Health Checks

When your targets expect HTTPS traffic, configure the health check accordingly.

```hcl
# HTTPS health check
resource "aws_lb_target_group" "https" {
  name_prefix = "https-"
  port        = 443
  protocol    = "HTTPS"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTPS"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }
}
```

The ALB doesn't validate the target's SSL certificate during health checks, so self-signed certs work fine.

## Deregistration Delay

When an instance fails health checks and is removed, the ALB doesn't cut connections immediately. The deregistration delay gives in-flight requests time to complete.

```hcl
resource "aws_lb_target_group" "graceful" {
  name_prefix = "grace-"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id

  # Time to wait for in-flight requests to complete
  # before fully deregistering the target
  deregistration_delay = 120  # 120 seconds (default is 300)

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 15
    matcher             = "200"
  }
}
```

For microservices with short request times, you can lower this to 30 seconds. For long-running requests (file uploads, report generation), set it higher.

## Target Group with Multiple Health Check Strategies

Here's a production-ready target group module that parametrizes health check configuration.

```hcl
variable "health_check_config" {
  type = object({
    path                = string
    port                = optional(string, "traffic-port")
    protocol            = optional(string, "HTTP")
    healthy_threshold   = optional(number, 3)
    unhealthy_threshold = optional(number, 3)
    timeout             = optional(number, 5)
    interval            = optional(number, 30)
    matcher             = optional(string, "200")
  })

  default = {
    path = "/health"
  }
}

resource "aws_lb_target_group" "this" {
  name_prefix          = "${var.service_name}-"
  port                 = var.port
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = var.target_type
  deregistration_delay = var.deregistration_delay
  slow_start           = var.slow_start

  health_check {
    enabled             = true
    path                = var.health_check_config.path
    port                = var.health_check_config.port
    protocol            = var.health_check_config.protocol
    healthy_threshold   = var.health_check_config.healthy_threshold
    unhealthy_threshold = var.health_check_config.unhealthy_threshold
    timeout             = var.health_check_config.timeout
    interval            = var.health_check_config.interval
    matcher             = var.health_check_config.matcher
  }

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}
```

## Troubleshooting Unhealthy Targets

When targets keep failing health checks:

```bash
# Check health status of all targets in a target group
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/app/abc123

# Manually test the health check endpoint from the instance
curl -v http://localhost:8080/health

# Check security group rules - the ALB's SG must be allowed
# to reach the target's SG on the health check port
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

Common causes of failing health checks:
1. Security group doesn't allow traffic from the ALB
2. Health check path returns non-200 status code
3. Application hasn't started yet (increase `unhealthy_threshold` or use `slow_start`)
4. Health check timeout is too short for the application's response time
5. Application is listening on a different port than configured

## Summary

Health checks are a critical part of your load balancing configuration. Use lightweight dedicated health endpoints, tune thresholds based on your application's startup time and tolerance for false positives, and set deregistration delays that match your request patterns. Fast detection (low interval, low thresholds) is great for highly available services, while slower settings prevent flapping for applications with occasional hiccups.

For more ALB configuration, see our guides on [creating ALB listener rules](https://oneuptime.com/blog/post/2026-02-23-create-alb-listener-rules-with-terraform/view) and [creating target groups with Terraform](https://oneuptime.com/blog/post/2026-02-23-create-target-groups-with-terraform/view).
