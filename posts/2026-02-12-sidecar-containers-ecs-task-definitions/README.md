# How to Run Sidecar Containers in ECS Task Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Docker, Containers, Microservices

Description: Learn how to configure and run sidecar containers in Amazon ECS task definitions for logging, monitoring, proxying, and more.

---

Sidecar containers are one of the most useful patterns in containerized architectures. If you've worked with Kubernetes, you've probably seen them everywhere - a logging agent running alongside your app, an Envoy proxy handling traffic, or a metrics exporter collecting data. ECS supports the same pattern through its task definitions, and getting it right can make a huge difference in how cleanly your services operate.

In this guide, we'll walk through what sidecar containers are, why they matter, and how to set them up in ECS task definitions with real examples.

## What Is a Sidecar Container?

A sidecar container is a secondary container that runs alongside your main application container within the same task. They share the same network namespace (on Fargate or `awsvpc` mode), so they can communicate over `localhost`. They can also share volumes for passing data back and forth.

Common sidecar use cases include:

- **Log routers** like Fluentd or Fluent Bit that ship logs to a central destination
- **Service mesh proxies** like Envoy for traffic management
- **Monitoring agents** that collect and export metrics
- **Config loaders** that pull secrets or configurations before the app starts

The key idea is separation of concerns. Your application container does what it's supposed to do, and the sidecar handles cross-cutting concerns without polluting your app's codebase.

## Basic Task Definition with a Sidecar

Let's start with a straightforward example. We'll set up a web application container alongside a Fluent Bit sidecar that forwards logs to CloudWatch.

Here's the task definition in JSON format:

```json
{
  "family": "webapp-with-logging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "webapp",
      "image": "my-registry/webapp:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "logConfiguration": {
        "logDriver": "awsfirelens",
        "options": {
          "Name": "cloudwatch",
          "region": "us-east-1",
          "log_group_name": "/ecs/webapp",
          "log_stream_prefix": "webapp-"
        }
      },
      "dependsOn": [
        {
          "containerName": "log-router",
          "condition": "START"
        }
      ]
    },
    {
      "name": "log-router",
      "image": "amazon/aws-for-fluent-bit:latest",
      "essential": true,
      "firelensConfiguration": {
        "type": "fluentbit",
        "options": {
          "config-file-type": "file",
          "config-file-value": "/fluent-bit/configs/parse-json.conf"
        }
      },
      "memory": 128
    }
  ]
}
```

A few things to notice here. The `dependsOn` field ensures that the log router starts before the webapp. The `firelensConfiguration` block is specific to AWS FireLens, which is ECS's native integration with Fluent Bit and Fluentd. And both containers share the same network, so if you needed to communicate between them, `localhost` would work just fine.

## Sharing Volumes Between Containers

Sometimes your sidecar needs access to files that the main container produces, or vice versa. ECS lets you define volumes at the task level and mount them into multiple containers.

Here's an example where an application writes data to a shared volume and a sidecar processes it:

```json
{
  "family": "data-processor",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "volumes": [
    {
      "name": "shared-data"
    }
  ],
  "containerDefinitions": [
    {
      "name": "app",
      "image": "my-registry/data-writer:latest",
      "essential": true,
      "mountPoints": [
        {
          "sourceVolume": "shared-data",
          "containerPath": "/data/output"
        }
      ]
    },
    {
      "name": "processor",
      "image": "my-registry/data-processor:latest",
      "essential": false,
      "mountPoints": [
        {
          "sourceVolume": "shared-data",
          "containerPath": "/data/input"
        }
      ]
    }
  ]
}
```

Both containers mount the same `shared-data` volume, but at different paths. The app writes to `/data/output` and the processor reads from `/data/input` - they're the same underlying storage.

Notice that the processor sidecar has `essential` set to `false`. This means if the processor crashes, the task keeps running. If the main app crashes, the whole task stops. You'll want to think carefully about which sidecars are essential vs. optional.

## Container Dependency Ordering

ECS gives you control over startup order through the `dependsOn` field. This is crucial when your sidecar needs to be ready before the main app starts.

The supported conditions are:

- **START** - The dependency container has started
- **COMPLETE** - The dependency container has run to completion (exited with code 0)
- **SUCCESS** - Same as COMPLETE but specifically exit code 0
- **HEALTHY** - The dependency container's health check is passing

Here's an example with an init sidecar that pulls configuration before the app starts:

```json
{
  "name": "config-loader",
  "image": "my-registry/config-loader:latest",
  "essential": false,
  "command": [
    "sh", "-c",
    "aws ssm get-parameter --name /app/config --output text --query Parameter.Value > /config/app.json"
  ],
  "mountPoints": [
    {
      "sourceVolume": "config-vol",
      "containerPath": "/config"
    }
  ]
},
{
  "name": "webapp",
  "image": "my-registry/webapp:latest",
  "essential": true,
  "dependsOn": [
    {
      "containerName": "config-loader",
      "condition": "SUCCESS"
    }
  ],
  "mountPoints": [
    {
      "sourceVolume": "config-vol",
      "containerPath": "/config",
      "readOnly": true
    }
  ]
}
```

The webapp won't start until `config-loader` exits successfully. This pattern is great for pulling secrets, running database migrations, or doing any one-time initialization.

## Envoy Proxy Sidecar for Service Mesh

If you're using AWS App Mesh, you'll run Envoy as a sidecar. Here's what that looks like:

```json
{
  "name": "envoy",
  "image": "840364872350.dkr.ecr.us-east-1.amazonaws.com/aws-appmesh-envoy:v1.27.0.0-prod",
  "essential": true,
  "environment": [
    {
      "name": "APPMESH_RESOURCE_ARN",
      "value": "arn:aws:appmesh:us-east-1:123456789012:mesh/my-mesh/virtualNode/my-service"
    }
  ],
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -s http://localhost:9901/server_info | grep state | grep -q LIVE"],
    "interval": 5,
    "timeout": 2,
    "retries": 3,
    "startPeriod": 10
  },
  "user": "1337"
}
```

The health check ensures that Envoy is actually ready to handle traffic before your app container starts receiving requests. Combined with `dependsOn` using the `HEALTHY` condition, you get a reliable startup sequence.

## Resource Allocation Tips

When you're running sidecars, remember that CPU and memory are shared across all containers in the task. On Fargate, you set CPU and memory at the task level, and each container gets a share.

A few practical tips:

1. **Set memory limits on sidecars.** If your Fluent Bit sidecar doesn't have a memory limit and it starts buffering too many logs, it can starve your main application of memory.

2. **Use soft limits (`memoryReservation`) for sidecars** and hard limits (`memory`) for the main container. This gives sidecars flexibility while protecting the app.

3. **Don't over-allocate.** A Fluent Bit sidecar typically needs 64-128 MB of memory. An Envoy proxy usually needs 128-256 MB. Your main app gets the rest.

Here's a balanced allocation example for a 1024 MB task:

```json
{
  "containerDefinitions": [
    {
      "name": "webapp",
      "memory": 768,
      "cpu": 384
    },
    {
      "name": "log-router",
      "memoryReservation": 64,
      "memory": 128,
      "cpu": 64
    },
    {
      "name": "envoy",
      "memoryReservation": 128,
      "memory": 256,
      "cpu": 64
    }
  ]
}
```

## Debugging Sidecar Issues

When things go wrong with sidecars, here's what to check:

- **Container exit codes** - Check the stopped task details in the ECS console or via the API. A sidecar that exits unexpectedly might indicate a misconfiguration.
- **Dependency cycles** - Make sure your `dependsOn` configuration doesn't create circular dependencies. ECS won't start the task if it detects one.
- **Health check timing** - If your sidecar has a health check and the main app depends on it being healthy, make sure the `startPeriod` is long enough for the sidecar to initialize.
- **Logs** - If your log router sidecar itself fails, you'll lose the log pipeline. Consider sending the log router's own logs to `awslogs` driver as a fallback.

For more on debugging container issues in ECS, check out our guide on [troubleshooting ECS task failures](https://oneuptime.com/blog/post/troubleshoot-ecs-task-failures/view).

## Monitoring Sidecars

You should monitor your sidecars just like any other container. Set up CloudWatch alarms on sidecar-specific metrics, track their CPU and memory usage, and make sure they're not silently failing.

If you're using Container Insights, you'll get per-container metrics automatically. That means you can see whether your Fluent Bit sidecar is consuming more memory over time, which could indicate a log buffering issue. For more details, see our post on [monitoring ECS with Container Insights](https://oneuptime.com/blog/post/monitor-ecs-container-insights/view).

## Wrapping Up

Sidecar containers in ECS are a powerful way to keep your services modular and maintainable. Whether you're routing logs, proxying traffic, or loading configuration, the pattern keeps cross-cutting concerns cleanly separated from your application logic.

The key things to remember: use `dependsOn` for startup ordering, share volumes for data exchange, set appropriate memory limits on sidecars, and always have a plan for what happens when a sidecar fails. Get these right, and your ECS tasks will be much easier to operate and debug.
