# How to Configure ECS Container Agent Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Container Agent, EC2, Configuration

Description: Learn how to configure the Amazon ECS container agent for EC2 instances including logging, networking, image cleanup, and task behavior settings

---

The ECS container agent is the piece of software that runs on each EC2 instance in your ECS cluster and manages the lifecycle of containers. It communicates with the ECS control plane, pulls container images, starts and stops tasks, and reports the health of running containers back to the service. Getting its configuration right can make the difference between a stable, well-performing cluster and one that causes you headaches.

In this guide, we will cover the most important ECS container agent settings, how to configure them, and what values to use for different scenarios.

## Where the Configuration Lives

The ECS agent configuration file is located at `/etc/ecs/ecs.config` on the EC2 instance. You typically set these values in your instance user data script during launch, but you can also modify them on a running instance (requires restarting the agent).

```bash
#!/bin/bash
# User data script for ECS-optimized AMI

# These settings are applied when the instance boots

cat >> /etc/ecs/ecs.config << 'EOF'
ECS_CLUSTER=my-production-cluster
ECS_ENABLE_CONTAINER_METADATA=true
ECS_CONTAINER_STOP_TIMEOUT=60s
ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h
ECS_IMAGE_CLEANUP_INTERVAL=30m
ECS_IMAGE_MINIMUM_CLEANUP_AGE=1h
ECS_ENABLE_SPOT_INSTANCE_DRAINING=true
EOF
```

## Essential Configuration Settings

### Cluster Assignment

The most fundamental setting - which cluster this instance should join.

```bash
# Tell the agent which cluster to join
ECS_CLUSTER=my-production-cluster
```

Without this, the instance joins the default cluster, which is almost never what you want.

### Container Metadata

Enabling container metadata lets your application query information about the task and container it is running in.

```bash
# Enable the container metadata file
ECS_ENABLE_CONTAINER_METADATA=true

# The task metadata endpoint v4 is injected automatically
# on EC2 Linux instances running ECS agent 1.39.0 or later
```

With the task metadata endpoint available, your container can use the `ECS_CONTAINER_METADATA_URI_V4` environment variable to get information like the task ARN, cluster name, and container instance ID. This is useful for logging and tracing.

### Container Stop Timeout

This controls how long the agent waits for a container to stop gracefully before force-killing it.

```bash
# Wait up to 120 seconds for containers to stop gracefully
ECS_CONTAINER_STOP_TIMEOUT=120s
```

The default is 30 seconds. If your application needs more time to drain connections, flush caches, or complete in-flight work, increase this value. But don't set it too high - during deployments, this delay is multiplied across all the tasks being replaced.

### Task Cleanup Configuration

After a task stops, the agent keeps the stopped container around for inspection. These settings control when it gets cleaned up.

```bash
# Wait 1 hour before cleaning up stopped task containers
ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h

# Add up to 10 minutes of jitter before task cleanup
ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION_JITTER=10m
```

Keeping stopped containers around for a while is helpful for debugging, but on busy instances it can consume disk space. For production, 1 hour is a reasonable balance.

## Image Management Settings

Docker images accumulate on instances over time as you deploy new versions. The agent can automatically clean up old images.

```bash
# Enable automatic image cleanup (on by default)
ECS_DISABLE_IMAGE_CLEANUP=false

# Run image cleanup every 30 minutes
ECS_IMAGE_CLEANUP_INTERVAL=30m

# Only clean up images older than 1 hour
ECS_IMAGE_MINIMUM_CLEANUP_AGE=1h

# Delete up to 5 images per cleanup cycle
ECS_NUM_IMAGES_DELETE_PER_CYCLE=5

# Use the default image pull behavior
ECS_IMAGE_PULL_BEHAVIOR=default
```

If you are running many different task definitions with different images, you might want to be more aggressive with cleanup to avoid running out of disk space.

## Networking Configuration

```bash
# Enable awsvpc task networking
ECS_ENABLE_TASK_ENI=true

# Block awsvpc tasks from accessing the instance metadata service
ECS_AWSVPC_BLOCK_IMDS=true
```

The `ECS_AWSVPC_BLOCK_IMDS` setting prevents containers using the awsvpc network mode from accessing the instance metadata service. This is a security best practice because otherwise containers could assume the instance IAM role.

## Logging Configuration

Control how the agent itself logs.

```bash
# Set agent log level (available: debug, info, warn, error, crit)
ECS_LOGLEVEL=info

# Set the log file location
ECS_LOGFILE=/var/log/ecs/ecs-agent.log

# Use the awslogs logging driver for the agent container
ECS_LOG_DRIVER=awslogs

# Keep task metrics collection enabled
ECS_DISABLE_METRICS=false
```

For troubleshooting agent issues, temporarily set `ECS_LOGLEVEL=debug`. Just remember to set it back to `info` afterward, as debug logging can be verbose and consume disk space.

## Spot Instance Configuration

If you are running ECS on Spot instances, this setting is essential.

```bash
# Enable graceful task draining when Spot interruption is detected
ECS_ENABLE_SPOT_INSTANCE_DRAINING=true
```

When enabled, the agent watches for Spot interruption notices. Upon receiving one, it sets the instance to DRAINING, which tells ECS to start moving tasks to other instances. For more on running Spot instances with ECS, see our guide on [ECS with Spot Instances and capacity providers](https://oneuptime.com/blog/post/2026-02-12-ecs-spot-instances-capacity-providers/view).

Resource Limits and Reservations

Control how much of the instance resources ECS can use for tasks.

```bash
# Subtract 256 MiB from the memory reported to ECS for task placement
ECS_RESERVED_MEMORY=256

# Mark these host ports as unavailable for task placement
ECS_RESERVED_PORTS=[22, 2375, 2376, 51678, 51679]
```

The `ECS_RESERVED_MEMORY` setting tells the agent to subtract this amount (in MiB) from the total memory reported to ECS for task placement. This helps prevent tasks from being scheduled against memory you want to leave for the OS and agent.

## Security Settings

```bash
# Disable privileged containers (recommended for production)
ECS_DISABLE_PRIVILEGED=true

# Enable SELinux support
ECS_SELINUX_CAPABLE=true

# Enable AppArmor support
ECS_APPARMOR_CAPABLE=true

# Block container access to instance metadata
ECS_AWSVPC_BLOCK_IMDS=true

# Keep introspection API access blocked from off-host clients
ECS_ALLOW_OFFHOST_INTROSPECTION_ACCESS=false
```

Disabling privileged containers prevents tasks from running with elevated host-level permissions. This is important in multi-tenant clusters or any production environment where you want defense in depth.

## Setting Configuration via CloudFormation

In CloudFormation or CDK, set agent configuration through the instance user data.

```yaml
# CloudFormation launch template with ECS agent configuration
ECSLaunchTemplate:
  Type: AWS::EC2::LaunchTemplate
  Properties:
    LaunchTemplateData:
      ImageId: !Ref ECSOptimizedAMI
      InstanceType: m5.large
      IamInstanceProfile:
        Arn: !GetAtt ECSInstanceProfile.Arn
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          cat >> /etc/ecs/ecs.config << EOF
          ECS_CLUSTER=${ECSCluster}
          ECS_ENABLE_CONTAINER_METADATA=true
          ECS_CONTAINER_STOP_TIMEOUT=120s
          ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h
          ECS_IMAGE_CLEANUP_INTERVAL=30m
          ECS_ENABLE_SPOT_INSTANCE_DRAINING=true
          ECS_RESERVED_MEMORY=256
          ECS_AWSVPC_BLOCK_IMDS=true
          EOF
```

## Applying Changes to Running Instances

If you need to change settings on a running instance:

```bash
# SSH into the instance and edit the config
sudo vi /etc/ecs/ecs.config

# Restart the ECS agent to apply changes
sudo systemctl restart ecs

# Verify the agent is running and connected
curl -s http://localhost:51678/v1/metadata | python3 -m json.tool
```

Note that restarting the agent does not affect running containers. They will continue to run while the agent reconnects to the ECS control plane.

## Recommended Production Configuration

Here is a complete production-ready configuration.

```bash
#!/bin/bash
cat >> /etc/ecs/ecs.config << 'EOF'
ECS_CLUSTER=production-cluster
ECS_ENABLE_CONTAINER_METADATA=true
ECS_CONTAINER_STOP_TIMEOUT=120s
ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=1h
ECS_IMAGE_CLEANUP_INTERVAL=30m
ECS_IMAGE_MINIMUM_CLEANUP_AGE=1h
ECS_NUM_IMAGES_DELETE_PER_CYCLE=5
ECS_ENABLE_SPOT_INSTANCE_DRAINING=true
ECS_RESERVED_MEMORY=256
ECS_AWSVPC_BLOCK_IMDS=true
ECS_DISABLE_PRIVILEGED=true
ECS_LOGLEVEL=info
ECS_ENABLE_TASK_ENI=true
EOF
```

## Troubleshooting Agent Issues

If the agent is not behaving as expected, check the agent log.

```bash
# Check the ECS agent logs
sudo journalctl -u ecs -f

# Or read the log file directly
sudo tail -f /var/log/ecs/ecs-agent.log

# Check the agent's introspection endpoint
curl -s http://localhost:51678/v1/metadata
curl -s http://localhost:51678/v1/tasks
```

For more on troubleshooting ECS issues, see our guide on [troubleshooting ECS task failures](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ecs-task-failures/view).

## Wrapping Up

The ECS container agent has dozens of configuration options, but you do not need to set them all. Focus on the essentials: cluster assignment, container stop timeout, image cleanup, Spot draining (if applicable), and the security settings. Get these right and your ECS instances will run reliably with minimal operational overhead.
