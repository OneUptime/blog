# How to Implement Nomad Rolling Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Rolling Deployments, CI/CD, Reliability, DevOps

Description: Learn how to configure rolling updates in Nomad with update stanzas, health checks, and canary deployments for safe releases.

---

Rolling deployments in Nomad let you ship new versions with minimal downtime. This guide covers update strategies, canary releases, and rollback safety.

## The Update Stanza

Nomad uses an `update` block inside a task group to control rollout behavior.

```hcl
job "api" {
  datacenters = ["dc1"]

  group "api" {
    count = 6

    update {
      max_parallel = 2
      min_healthy_time = "30s"
      healthy_deadline = "5m"
      auto_revert = true
      canary = 1
    }

    task "server" {
      driver = "docker"
      config {
        image = "example/api:2.0.0"
      }
    }
  }
}
```

## Key Settings Explained

- **max_parallel**: How many allocations to update at once.
- **min_healthy_time**: How long allocations must stay healthy before proceeding.
- **healthy_deadline**: Time limit for allocations to become healthy.
- **auto_revert**: Roll back automatically if the deployment fails.
- **canary**: Number of canary allocations before the full rollout.

## Canary Releases

With `canary = 1`, Nomad deploys one allocation first. You can validate it and then promote the deployment:

```bash
nomad deployment promote <deployment-id>
```

If you do not promote it, Nomad can revert automatically if you enabled `auto_revert`.

## Health Checks

Use service checks to validate allocations. If checks fail, Nomad stops the rollout.

```hcl
service {
  name = "api"
  port = "http"
  check {
    type     = "http"
    path     = "/health"
    interval = "10s"
    timeout  = "2s"
  }
}
```

## Rollbacks

Roll back to the previous job version:

```bash
nomad job revert api
```

Use this for quick recovery when a deployment fails.

## Best Practices

- Keep `max_parallel` small for stateful services.
- Always include health checks to gate rollouts.
- Use canaries for high-risk changes.
- Automate `nomad deployment status` checks in CI.

## Conclusion

Nomad rolling deployments are reliable when you define good health checks and conservative update settings. Start with canaries, observe, and promote only when the new version proves stable.
