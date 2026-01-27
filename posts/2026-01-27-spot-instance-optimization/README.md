# How to Optimize Spot Instance Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Spot Instances, AWS, GCP, Azure, Cost Optimization, Cloud, Kubernetes, CI/CD, DevOps, FinOps

Description: Learn how to maximize cost savings with spot instances through pricing strategies, interruption handling, instance diversification, and production-ready configurations.

---

> Spot instances offer up to 90% cost savings compared to on-demand pricing, but realizing these savings requires careful planning. The key to success is treating interruptions as expected events rather than failures - design your architecture around them, and spot instances become a powerful cost optimization tool.

Spot instances are spare cloud capacity sold at steep discounts. Understanding how to use them effectively can dramatically reduce your infrastructure costs.

---

## Understanding Spot Pricing

Spot pricing fluctuates based on supply and demand in each availability zone. Understanding these dynamics helps you make better decisions about when and where to use spot capacity.

### Spot Pricing Comparison by Provider

| Provider | Product | Typical Discount | Interruption Notice | Max Runtime |
|----------|---------|------------------|---------------------|-------------|
| AWS | Spot Instances | 60-90% | 2 minutes | Unlimited |
| GCP | Spot VMs | 60-91% | 30 seconds | Unlimited |
| GCP | Preemptible VMs | 60-91% | 30 seconds | 24 hours |
| Azure | Spot VMs | 60-90% | 30 seconds | Unlimited |

### Check Current Spot Prices

Use cloud provider CLIs to check current spot prices before provisioning. This helps identify the best instance types and regions for your workloads.

```bash
# AWS: Check spot price history for m5.large in us-east-1
# The --start-time flag limits results to recent data
aws ec2 describe-spot-price-history \
  --instance-types m5.large m5a.large m5d.large \
  --product-descriptions "Linux/UNIX" \
  --start-time $(date -u +"%Y-%m-%dT%H:%M:%SZ" -d "1 hour ago") \
  --query 'SpotPriceHistory[*].[InstanceType,AvailabilityZone,SpotPrice]' \
  --output table

# GCP: List spot VM pricing for n1-standard-4
# Spot prices are shown alongside on-demand for comparison
gcloud compute machine-types describe n1-standard-4 \
  --zone us-central1-a \
  --format="table(name,guestCpus,memoryMb,zone)"

# Azure: Check spot prices for Standard_D4s_v3
# The eviction policy affects pricing
az vm list-skus \
  --location eastus \
  --size Standard_D4s_v3 \
  --query "[].{Name:name,Tier:tier,Size:size}" \
  --output table
```

### Monitor Spot Price Trends

Set up automated monitoring to track spot prices over time. This data helps identify stable instance types and optimal regions.

```python
# spot_price_monitor.py
# Collects spot price data and sends it to your monitoring system
import boto3
from datetime import datetime, timedelta
import json

def get_spot_prices(instance_types, regions):
    """Fetch current spot prices across multiple regions."""
    prices = {}

    for region in regions:
        # Create EC2 client for each region
        ec2 = boto3.client('ec2', region_name=region)

        # Get price history for the last hour
        response = ec2.describe_spot_price_history(
            InstanceTypes=instance_types,
            ProductDescriptions=['Linux/UNIX'],
            StartTime=datetime.utcnow() - timedelta(hours=1)
        )

        # Organize prices by instance type and AZ
        for price in response['SpotPriceHistory']:
            key = f"{region}/{price['AvailabilityZone']}/{price['InstanceType']}"
            prices[key] = {
                'price': float(price['SpotPrice']),
                'timestamp': price['Timestamp'].isoformat()
            }

    return prices

# Example usage: Monitor common instance types across regions
instance_types = ['m5.large', 'm5a.large', 'm5d.large', 'm4.large']
regions = ['us-east-1', 'us-west-2', 'eu-west-1']
prices = get_spot_prices(instance_types, regions)

# Export to monitoring system or save to database
print(json.dumps(prices, indent=2))
```

---

## Handling Spot Interruptions

Spot instances can be reclaimed with short notice. Building robust interruption handling is essential for production workloads.

### AWS Node Termination Handler

The AWS Node Termination Handler watches for spot interruption notices and gracefully drains nodes before termination.

```bash
# Add the EKS charts repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the node termination handler with all features enabled
helm install aws-node-termination-handler eks/aws-node-termination-handler \
  --namespace kube-system \
  --set enableSpotInterruptionDraining=true \
  --set enableRebalanceMonitoring=true \
  --set enableScheduledEventDraining=true \
  --set enableRebalanceDraining=true \
  --set webhookURL="https://hooks.slack.com/services/xxx" \
  --set podMonitor.create=true
```

### Application-Level Interruption Handling

Listen for interruption notices directly in your application for custom shutdown logic.

```python
# interruption_handler.py
# Handles spot interruption notices for graceful shutdown
import requests
import time
import signal
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SpotInterruptionHandler:
    """Monitor for spot interruption and handle graceful shutdown."""

    # AWS instance metadata endpoint for spot interruption
    METADATA_URL = "http://169.254.169.254/latest/meta-data/spot/instance-action"

    def __init__(self, shutdown_callback):
        # Callback function to execute on interruption
        self.shutdown_callback = shutdown_callback
        self.running = True

    def check_interruption(self):
        """Check if an interruption notice has been issued."""
        try:
            # This endpoint returns 404 when no interruption is pending
            # and returns JSON when interruption is scheduled
            response = requests.get(self.METADATA_URL, timeout=1)
            if response.status_code == 200:
                return response.json()
        except requests.exceptions.RequestException:
            # No interruption notice or not running on EC2
            pass
        return None

    def monitor(self, check_interval=5):
        """Continuously monitor for interruption notices."""
        logger.info("Starting spot interruption monitor")

        while self.running:
            notice = self.check_interruption()

            if notice:
                # Interruption notice received
                action = notice.get('action')
                action_time = notice.get('time')

                logger.warning(
                    f"Spot interruption notice received: {action} at {action_time}"
                )

                # Execute graceful shutdown
                self.shutdown_callback()
                break

            time.sleep(check_interval)

    def stop(self):
        """Stop the monitoring loop."""
        self.running = False


def graceful_shutdown():
    """Application-specific shutdown logic."""
    logger.info("Initiating graceful shutdown")

    # Stop accepting new work
    # Complete in-flight requests
    # Save any state to persistent storage
    # Close database connections

    logger.info("Graceful shutdown complete")
    sys.exit(0)


if __name__ == "__main__":
    handler = SpotInterruptionHandler(graceful_shutdown)

    # Also handle SIGTERM for Kubernetes pod termination
    signal.signal(signal.SIGTERM, lambda s, f: graceful_shutdown())

    handler.monitor()
```

### Kubernetes Pod Disruption Budgets

PDBs ensure minimum availability during spot interruptions by limiting how many pods can be terminated simultaneously.

```yaml
# pdb.yaml
# Maintains minimum availability during spot interruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  # At least 3 pods must remain available during disruptions
  # This prevents cascading failures during spot interruptions
  minAvailable: 3
  selector:
    matchLabels:
      app: web-app
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: worker-pdb
  namespace: production
spec:
  # Allow at most 25% of worker pods to be unavailable
  # Good for large deployments where absolute numbers vary
  maxUnavailable: 25%
  selector:
    matchLabels:
      app: worker
```

---

## Diversification Strategies

Diversifying across instance types, families, and availability zones significantly improves spot availability and reduces interruption rates.

### Instance Type Diversification

Specify multiple instance types to increase the pool of available spot capacity. The cloud provider can pull from any matching pool.

```hcl
# terraform/spot_diversification.tf
# Creates an EC2 Auto Scaling group with diversified spot instances

resource "aws_launch_template" "spot_diversified" {
  name_prefix   = "spot-workers-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = "m5.large"  # Default, overridden by ASG

  # Configure instance metadata service
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  # User data script for instance initialization
  user_data = base64encode(templatefile("${path.module}/userdata.sh", {
    cluster_name = var.cluster_name
  }))

  tags = {
    Name = "spot-worker"
  }
}

resource "aws_autoscaling_group" "spot_diversified" {
  name                = "spot-workers-diversified"
  desired_capacity    = 10
  max_size            = 50
  min_size            = 0
  vpc_zone_identifier = var.subnet_ids

  # Use mixed instances policy for spot diversification
  mixed_instances_policy {
    # Launch template provides base configuration
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.spot_diversified.id
        version            = "$Latest"
      }

      # Override with multiple instance types
      # More types = better spot availability
      override {
        instance_type     = "m5.large"
        weighted_capacity = "2"  # 2 vCPUs worth
      }
      override {
        instance_type     = "m5a.large"  # AMD variant
        weighted_capacity = "2"
      }
      override {
        instance_type     = "m5d.large"  # NVMe variant
        weighted_capacity = "2"
      }
      override {
        instance_type     = "m4.large"   # Previous generation
        weighted_capacity = "2"
      }
      override {
        instance_type     = "m5.xlarge"
        weighted_capacity = "4"  # 4 vCPUs worth
      }
      override {
        instance_type     = "m5a.xlarge"
        weighted_capacity = "4"
      }
    }

    instances_distribution {
      # Use only spot instances
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
      # capacity-optimized selects pools with most available capacity
      # reducing interruption frequency
    }
  }

  # Tags to propagate to instances
  tag {
    key                 = "lifecycle"
    value               = "spot"
    propagate_at_launch = true
  }
}
```

### Multi-AZ Distribution

Spread spot instances across availability zones to avoid zone-specific capacity shortages.

```hcl
# terraform/multi_az_spot.tf
# Distributes spot instances across multiple availability zones

# Get available AZs in the region
data "aws_availability_zones" "available" {
  state = "available"

  # Exclude local zones which may have limited spot capacity
  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

# Create subnets in each AZ
resource "aws_subnet" "spot_subnets" {
  count             = length(data.aws_availability_zones.available.names)
  vpc_id            = var.vpc_id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "spot-subnet-${data.aws_availability_zones.available.names[count.index]}"
  }
}

# Configure ASG to use all AZ subnets
resource "aws_autoscaling_group" "multi_az_spot" {
  name                = "multi-az-spot-workers"
  desired_capacity    = 12
  max_size            = 100
  min_size            = 0

  # Spread across all available AZs
  vpc_zone_identifier = aws_subnet.spot_subnets[*].id

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.spot_diversified.id
        version            = "$Latest"
      }

      # Multiple instance types per AZ
      dynamic "override" {
        for_each = var.instance_types
        content {
          instance_type     = override.value.type
          weighted_capacity = override.value.weight
        }
      }
    }

    instances_distribution {
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized-prioritized"
      # Prioritized strategy respects override order while optimizing for capacity
    }
  }
}

# Variable for instance types
variable "instance_types" {
  description = "List of instance types with weights for spot fleet"
  type = list(object({
    type   = string
    weight = string
  }))
  default = [
    { type = "m5.large", weight = "2" },
    { type = "m5a.large", weight = "2" },
    { type = "m5d.large", weight = "2" },
    { type = "m4.large", weight = "2" },
    { type = "c5.large", weight = "2" },
    { type = "c5a.large", weight = "2" },
  ]
}
```

---

## Mixed Instance Configurations

Combine spot and on-demand instances to balance cost savings with reliability. This ensures baseline capacity while maximizing spot usage.

### AWS Mixed Instances Policy

```hcl
# terraform/mixed_instances.tf
# Combines on-demand baseline with spot instances for cost and reliability

resource "aws_autoscaling_group" "mixed" {
  name                = "mixed-spot-ondemand"
  desired_capacity    = 20
  max_size            = 100
  min_size            = 4
  vpc_zone_identifier = var.subnet_ids

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Define instance type options
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
      override {
        instance_type = "m5d.large"
      }
    }

    instances_distribution {
      # Maintain 4 on-demand instances as baseline
      # These provide guaranteed capacity during spot shortages
      on_demand_base_capacity = 4

      # Above baseline, use 25% on-demand and 75% spot
      # This provides cost savings while maintaining reliability
      on_demand_percentage_above_base_capacity = 25

      # Allocation strategy for spot instances
      spot_allocation_strategy = "capacity-optimized"

      # Maximum price to pay for spot (optional)
      # Setting to on-demand price ensures we get instances when available
      spot_max_price = ""  # Empty = on-demand price
    }
  }

  # Enable instance refresh for zero-downtime updates
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
      instance_warmup        = 300
    }
  }
}
```

### GCP Mixed Node Pools

```hcl
# terraform/gcp_mixed_pools.tf
# Creates both on-demand and spot node pools in GKE

# On-demand node pool for baseline capacity
resource "google_container_node_pool" "ondemand" {
  name       = "ondemand-pool"
  cluster    = google_container_cluster.main.name
  location   = var.region

  # Fixed size on-demand pool for guaranteed capacity
  initial_node_count = 3

  autoscaling {
    min_node_count = 2
    max_node_count = 10
  }

  node_config {
    machine_type = "n1-standard-4"

    # Label to identify on-demand nodes
    labels = {
      "node-type" = "on-demand"
    }

    # OAuth scopes for GCP API access
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}

# Spot node pool for cost optimization
resource "google_container_node_pool" "spot" {
  name       = "spot-pool"
  cluster    = google_container_cluster.main.name
  location   = var.region

  initial_node_count = 5

  autoscaling {
    min_node_count = 0   # Can scale to zero
    max_node_count = 50  # Scale up for burst workloads
  }

  node_config {
    machine_type = "n1-standard-4"
    spot         = true  # Use spot VMs

    # Label for node selection
    labels = {
      "node-type"                     = "spot"
      "cloud.google.com/gke-spot"     = "true"
    }

    # Taint to require explicit toleration
    taint {
      key    = "cloud.google.com/gke-spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
}
```

---

## Kubernetes Node Groups for Spot

Configure Kubernetes node groups specifically optimized for spot instances with proper labels, taints, and autoscaling.

### EKS Managed Node Group with Karpenter

Karpenter provides faster, more flexible node provisioning than Cluster Autoscaler.

```yaml
# karpenter/provisioner.yaml
# Karpenter provisioner for spot instances
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: spot-provisioner
spec:
  # Workloads must have matching tolerations and node selectors
  requirements:
    # Only provision spot instances
    - key: karpenter.sh/capacity-type
      operator: In
      values: ["spot"]
    # Target x86_64 architecture
    - key: kubernetes.io/arch
      operator: In
      values: ["amd64"]
    # Allow multiple instance families for diversification
    - key: karpenter.k8s.aws/instance-family
      operator: In
      values: ["m5", "m5a", "m5d", "m4", "c5", "c5a", "r5", "r5a"]
    # Limit to specific sizes to control costs
    - key: karpenter.k8s.aws/instance-size
      operator: In
      values: ["large", "xlarge", "2xlarge"]
    # Exclude older generations
    - key: karpenter.k8s.aws/instance-generation
      operator: Gt
      values: ["2"]

  # Resource limits for this provisioner
  limits:
    resources:
      cpu: 1000     # Max 1000 vCPUs total
      memory: 4000Gi

  # Provider-specific configuration
  providerRef:
    name: default

  # Consolidation settings
  consolidation:
    enabled: true  # Consolidate underutilized nodes

  # Remove empty nodes after 30 seconds
  ttlSecondsAfterEmpty: 30

  # Expire nodes after 7 days for updates
  ttlSecondsUntilExpired: 604800

---
apiVersion: karpenter.k8s.aws/v1alpha1
kind: AWSNodeTemplate
metadata:
  name: default
spec:
  # Subnet discovery by tags
  subnetSelector:
    karpenter.sh/discovery: ${CLUSTER_NAME}

  # Security group discovery by tags
  securityGroupSelector:
    karpenter.sh/discovery: ${CLUSTER_NAME}

  # AMI selection
  amiFamily: AL2

  # Instance profile for node IAM role
  instanceProfile: KarpenterNodeInstanceProfile-${CLUSTER_NAME}

  # Block device configuration
  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        encrypted: true

  # Tags applied to provisioned instances
  tags:
    Environment: production
    ManagedBy: karpenter
```

### Workload Configuration for Spot Nodes

```yaml
# deployment.yaml
# Deployment configured for spot node groups
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spot-workload
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: spot-workload
  template:
    metadata:
      labels:
        app: spot-workload
    spec:
      # Select spot nodes
      nodeSelector:
        karpenter.sh/capacity-type: spot

      # Tolerate spot taints
      tolerations:
        - key: "karpenter.sh/capacity-type"
          operator: "Equal"
          value: "spot"
          effect: "NoSchedule"

      # Spread pods across nodes and zones
      topologySpreadConstraints:
        # Spread across availability zones
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: spot-workload
        # Spread across nodes within each zone
        - maxSkew: 2
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: spot-workload

      # Termination grace period for graceful shutdown
      terminationGracePeriodSeconds: 120

      containers:
        - name: app
          image: myapp:latest
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi

          # Lifecycle hooks for graceful shutdown
          lifecycle:
            preStop:
              exec:
                command:
                  - /bin/sh
                  - -c
                  - |
                    # Stop accepting new connections
                    /app/stop-accepting-traffic
                    # Wait for in-flight requests
                    sleep 30

          # Probes for health checking
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
```

---

## CI/CD Pipelines with Spot Instances

CI/CD workloads are ideal for spot instances because they are stateless, short-lived, and tolerant of restarts.

### GitHub Actions Self-Hosted Runners on Spot

```hcl
# terraform/github_runners_spot.tf
# Self-hosted GitHub Actions runners on spot instances

resource "aws_launch_template" "github_runner" {
  name_prefix   = "github-runner-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = "c5.2xlarge"

  # IAM instance profile for runner
  iam_instance_profile {
    name = aws_iam_instance_profile.github_runner.name
  }

  # User data to configure the runner
  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -e

    # Install Docker for container-based workflows
    curl -fsSL https://get.docker.com | sh

    # Install GitHub Actions runner
    mkdir -p /opt/actions-runner
    cd /opt/actions-runner
    curl -o actions-runner-linux-x64.tar.gz -L \
      https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
    tar xzf actions-runner-linux-x64.tar.gz

    # Configure runner with registration token
    # Token should be fetched from Parameter Store or Secrets Manager
    RUNNER_TOKEN=$(aws ssm get-parameter \
      --name /github/runner-token \
      --with-decryption \
      --query 'Parameter.Value' \
      --output text)

    ./config.sh \
      --url https://github.com/${var.github_org} \
      --token $RUNNER_TOKEN \
      --name "spot-runner-$(hostname)" \
      --labels spot,linux,x64 \
      --ephemeral \
      --unattended

    # Start the runner
    ./run.sh
  EOF
  )

  # Enable detailed monitoring
  monitoring {
    enabled = true
  }

  # Configure instance metadata
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "github-runner-spot"
    }
  }
}

resource "aws_autoscaling_group" "github_runners" {
  name                = "github-runners-spot"
  desired_capacity    = 5
  max_size            = 50
  min_size            = 0
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.github_runner.id
        version            = "$Latest"
      }

      # Multiple instance types for runner flexibility
      override {
        instance_type = "c5.2xlarge"
      }
      override {
        instance_type = "c5a.2xlarge"
      }
      override {
        instance_type = "c5d.2xlarge"
      }
      override {
        instance_type = "m5.2xlarge"
      }
    }

    instances_distribution {
      on_demand_base_capacity                  = 1  # Keep 1 on-demand for reliability
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }
  }

  # Scale based on queued jobs (requires custom metric)
  tag {
    key                 = "Purpose"
    value               = "github-runner"
    propagate_at_launch = true
  }
}
```

### GitLab Runners with Spot Fleet

```yaml
# docker-compose.yml
# GitLab Runner manager that provisions spot instances
version: '3.8'

services:
  gitlab-runner-manager:
    image: gitlab/gitlab-runner:latest
    volumes:
      - ./config:/etc/gitlab-runner
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - CI_SERVER_URL=${GITLAB_URL}
      - REGISTRATION_TOKEN=${REGISTRATION_TOKEN}
    restart: unless-stopped
```

```toml
# config/config.toml
# GitLab Runner configuration for AWS spot instances
concurrent = 50
check_interval = 0

[[runners]]
  name = "spot-runner"
  url = "https://gitlab.example.com"
  token = "YOUR_RUNNER_TOKEN"
  executor = "docker+machine"

  [runners.docker]
    image = "alpine:latest"
    privileged = true
    disable_cache = false
    volumes = ["/cache"]

  [runners.machine]
    IdleCount = 2
    IdleTime = 600
    MaxBuilds = 100
    MachineDriver = "amazonec2"
    MachineName = "gitlab-runner-%s"

    # AWS configuration for spot instances
    MachineOptions = [
      "amazonec2-region=us-east-1",
      "amazonec2-vpc-id=vpc-xxxxx",
      "amazonec2-subnet-id=subnet-xxxxx",
      "amazonec2-zone=a",
      "amazonec2-instance-type=c5.xlarge",
      "amazonec2-request-spot-instance=true",
      "amazonec2-spot-price=0.10",
      "amazonec2-security-group=gitlab-runner-sg",
      "amazonec2-iam-instance-profile=GitLabRunnerProfile"
    ]

    # Off-peak settings for cost optimization
    [[runners.machine.autoscaling]]
      Periods = ["* * 0-7,19-23 * * mon-fri *", "* * * * * sat,sun *"]
      IdleCount = 0
      IdleTime = 300
      Timezone = "UTC"

  [runners.cache]
    Type = "s3"
    Shared = true
    [runners.cache.s3]
      ServerAddress = "s3.amazonaws.com"
      BucketName = "gitlab-runner-cache"
      BucketLocation = "us-east-1"
```

### Jenkins Spot Agents

```groovy
// jenkins/spot-cloud-config.groovy
// Configure Jenkins to use spot instances for build agents

import com.amazonaws.services.ec2.model.InstanceType
import hudson.plugins.ec2.*

def spotConfig = new SpotConfiguration(
    true,           // useBidPrice
    "0.10",        // spotMaxBidPrice
    false,          // fallbackToOndemand
    "900"          // spotBlockReservationDuration (15 minutes)
)

def ami = new SlaveTemplate(
    'ami-xxxxx',                    // AMI ID
    EC2AbstractSlave.Zone.us_east_1a,
    spotConfig,
    'default',                      // security group
    '/home/jenkins',                // remote FS root
    InstanceType.C5Large,
    false,                          // EBS optimized
    'jenkins-spot-agent',           // label
    Node.Mode.EXCLUSIVE,
    'Jenkins Spot Agent',           // description
    '',                             // init script
    '',                             // tmpDir
    '',                             // userData
    '1',                            // numExecutors
    'ubuntu',                       // remoteAdmin
    new UnixData('', '', '', '22', ''),
    '',                             // jvmopts
    false,                          // stop on terminate
    'subnet-xxxxx',                 // subnet ID
    [new EC2Tag('Name', 'jenkins-spot-agent')],
    '5',                            // idle termination minutes
    0,                              // minimum instances
    10,                             // instance cap
    'arn:aws:iam::xxx:instance-profile/JenkinsAgent',
    true,                           // use private DNS
    false,                          // associate public IP
    '',                             // custom device mapping
    true,                           // connect using public IP
    false,                          // monitoring
    false                           // t2 unlimited
)

// Add to Jenkins cloud configuration
Jenkins.instance.clouds.add(
    new AmazonEC2Cloud(
        'aws-spot',
        true,                       // use instance profile
        '',                         // credentialsId
        'us-east-1',
        null,                       // private key
        '300000',                   // instanceCapStr
        [ami],
        '',                         // roleArn
        ''                          // roleSessionName
    )
)
```

---

## Best Practices Summary

Following these best practices will help you maximize cost savings while maintaining reliability with spot instances.

### Architecture Best Practices

| Practice | Description | Impact |
|----------|-------------|--------|
| Instance Diversification | Use 10+ instance types across families | Reduces interruption rate by 50-80% |
| Multi-AZ Deployment | Spread across 3+ availability zones | Improves availability during zone outages |
| Graceful Shutdown | Handle SIGTERM and drain connections | Prevents request failures during interruption |
| Pod Disruption Budgets | Limit concurrent pod terminations | Maintains service availability |
| Checkpointing | Save progress for long-running jobs | Enables resumption after interruption |
| Queue-Based Processing | Use SQS/Pub/Sub for job distribution | Automatic retry on worker termination |

### Monitoring Checklist

```yaml
# prometheus/spot-alerts.yaml
# Essential alerts for spot instance monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: spot-instance-alerts
  namespace: monitoring
spec:
  groups:
    - name: spot-instances
      rules:
        # Alert on high interruption rate
        - alert: HighSpotInterruptionRate
          expr: |
            (
              sum(rate(kube_pod_container_status_terminated_reason{reason="NodeShutdown"}[1h]))
              /
              sum(kube_pod_status_phase{phase="Running"})
            ) > 0.05
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Spot interruption rate exceeds 5%"
            description: "Consider adding more instance types or using on-demand baseline"

        # Alert on spot capacity shortage
        - alert: SpotCapacityShortage
          expr: |
            kube_node_status_condition{condition="Ready",status="true"}
            <
            kube_deployment_spec_replicas * 0.8
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Unable to meet desired replica count"
            description: "Spot capacity may be limited; consider fallback to on-demand"

        # Alert on pending pods due to spot shortage
        - alert: PodsPendingSpotCapacity
          expr: |
            sum(kube_pod_status_phase{phase="Pending"}) by (namespace) > 10
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Multiple pods pending, possible spot capacity issue"
```

### Cost Optimization Checklist

1. **Start with non-critical workloads** - Validate your setup before expanding
2. **Monitor actual savings** - Track spot vs on-demand cost ratios
3. **Adjust instance mix** - Add types with lower interruption rates
4. **Use savings plans** - Combine with compute savings plans for baseline
5. **Right-size instances** - Avoid over-provisioning on spot
6. **Implement auto-scaling** - Scale to zero during off-hours
7. **Review interruption patterns** - Identify and avoid problematic instance types
8. **Set up cost alerts** - Monitor for unexpected on-demand fallback

---

## Conclusion

Spot instances offer substantial cost savings when used correctly. The key principles are:

- **Diversify** across instance types, families, and availability zones
- **Design for failure** with graceful shutdown and automatic recovery
- **Mix with on-demand** for guaranteed baseline capacity
- **Monitor continuously** to identify and address issues quickly

Start with CI/CD and batch workloads where interruptions have minimal impact. As you gain confidence, expand to stateless web services with proper redundancy. Keep stateful workloads on on-demand instances until you have robust checkpointing in place.

---

*Looking for comprehensive infrastructure monitoring? [OneUptime](https://oneuptime.com) provides real-time monitoring, alerting, and incident management to keep your spot-based infrastructure running smoothly.*
