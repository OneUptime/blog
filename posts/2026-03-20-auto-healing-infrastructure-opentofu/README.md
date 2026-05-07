# How to Set Up Auto-Healing Infrastructure with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Auto-Healing, High Availability, OpenTofu, Auto Scaling, Kubernetes, Self-Healing

Description: Learn how to configure auto-healing infrastructure using OpenTofu that automatically detects and replaces failed instances, pods, and services without manual intervention.

## Overview

Auto-healing infrastructure automatically detects unhealthy components and replaces them. OpenTofu configures the AWS and Kubernetes resources that provide auto-healing at multiple levels: EC2 instance replacement via Auto Scaling groups, native EC2 recovery for supported standalone instances, Kubernetes pod restarts, and managed database failover.

## Step 1: Auto Scaling Group with Instance Replacement

```hcl
# main.tf - ASG with comprehensive auto-healing

resource "aws_autoscaling_group" "self_healing" {
  name                = "self-healing-asg"
  vpc_zone_identifier = module.vpc.private_subnets
  target_group_arns   = [aws_lb_target_group.app.arn]

  min_size         = 3
  max_size         = 30
  desired_capacity = 6

  # Use ELB health checks (not just EC2 status)
  health_check_type         = "ELB"
  health_check_grace_period = 300

  # Enable instance refresh rollback if the new instances fail health checks
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90
      auto_rollback          = true
    }
    triggers = ["tag"]
  }

  launch_template {
    id      = aws_launch_template.app.id
    version = aws_launch_template.app.latest_version
  }

  tag {
    key                 = "Version"
    value               = var.app_version
    propagate_at_launch = true
  }
}

# CloudWatch alarm to alert on unhealthy load balancer targets
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "asg-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 1

  dimensions = {
    TargetGroup  = aws_lb_target_group.app.arn_suffix
    LoadBalancer = aws_lb.app.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
```

## Step 2: EC2 Instance Recovery for Standalone Instances

```hcl
# CloudWatch alarm triggers EC2 auto-recovery for supported standalone instances
data "aws_region" "current" {}

resource "aws_cloudwatch_metric_alarm" "instance_recovery" {
  alarm_name          = "ec2-instance-recovery"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed_System"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 1

  dimensions = {
    InstanceId = aws_instance.app.id
  }

  alarm_actions = [
    "arn:aws:automate:${data.aws_region.current.name}:ec2:recover",
    aws_sns_topic.alerts.arn
  ]

  treat_missing_data = "missing"
}
```

## Step 3: Kubernetes Self-Healing Configuration

```hcl
# Kubernetes Deployment with liveness probes for auto-restart
resource "kubernetes_deployment" "self_healing" {
  metadata {
    name      = "self-healing-app"
    namespace = "production"
    labels = {
      app = "self-healing-app"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "self-healing-app"
      }
    }

    strategy {
      type = "RollingUpdate"
      rolling_update {
        max_unavailable = "0"
        max_surge       = "1"
      }
    }

    template {
      metadata {
        labels = {
          app = "self-healing-app"
        }
      }

      spec {
        # Restart policy (default is Always for Deployments)
        restart_policy = "Always"

        container {
          name  = "app"
          image = "app:latest"

          liveness_probe {
            http_get {
              path = "/health/live"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health/ready"
              port = 8080
            }
            period_seconds    = 5
            failure_threshold = 3
          }

          resources {
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "2000m"
              memory = "1Gi"
            }
          }
        }
      }
    }
  }
}

# Horizontal Pod Autoscaler keeps a minimum replica floor and scales on CPU utilization
resource "kubernetes_horizontal_pod_autoscaler_v2" "self_healing" {
  metadata {
    name      = "self-healing-app-hpa"
    namespace = "production"
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.self_healing.metadata[0].name
    }

    min_replicas = 3
    max_replicas = 30

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }
  }
}
```

## Step 4: RDS Auto-Healing with Multi-AZ

```hcl
# RDS Multi-AZ for automatic database failover
resource "aws_db_instance" "auto_healing" {
  identifier                  = "app-db-auto-healing"
  allocated_storage           = 100
  engine                      = "postgres"
  instance_class              = "db.r6g.large"
  multi_az                    = true
  username                    = "appadmin"
  manage_master_user_password = true

  # Enhanced Monitoring provides OS-level metrics for troubleshooting
  monitoring_interval = 15
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Performance Insights for diagnostic data
  performance_insights_enabled = true
}

# EventBridge rule for RDS failover completion events
resource "aws_cloudwatch_event_rule" "rds_failover" {
  name        = "rds-failover-event"
  description = "Capture RDS failover events"
  event_pattern = jsonencode({
    source      = ["aws.rds"]
    detail-type = ["RDS DB Instance Event"]
    detail = {
      SourceArn = [aws_db_instance.auto_healing.arn]
      EventID = ["RDS-EVENT-0049"]  # Multi-AZ failover complete
    }
  })
}

resource "aws_cloudwatch_event_target" "rds_failover_alerts" {
  rule      = aws_cloudwatch_event_rule.rds_failover.name
  target_id = "SendFailoverAlert"
  arn       = aws_sns_topic.alerts.arn
}
```

## Summary

Auto-healing infrastructure configured with OpenTofu operates across multiple layers: Auto Scaling groups replace unhealthy EC2 instances automatically, CloudWatch EC2 recovery can recover supported standalone instances onto healthy hardware, and Kubernetes liveness probes restart containers that become deadlocked. RDS Multi-AZ typically provides 60-120 second automatic database failover. Together, these mechanisms reduce manual intervention for common failure scenarios while still benefiting from monitoring and alerting.
