# How to Configure Nomad Resource Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nomad, Resource Constraints, Performance, Scheduling, DevOps

Description: Learn how to set CPU and memory limits in Nomad jobs, avoid noisy neighbors, and tune reservations for reliable scheduling.

---

Resource constraints in Nomad control how much CPU and memory a task can use and how the scheduler places workloads. The right settings prevent noisy neighbors and improve stability. This guide explains how to size resources and enforce limits.

## Reservation vs Limit

Nomad uses two key values:

- **CPU requirement**: The amount of CPU required to run the task, specified in MHz.
- **Memory requirement**: The memory required in MB. By default, this is also the hard memory limit.

You can also set **memory limit** with `memory_max`. When `memory_max` is set, `memory` becomes the reservation and `memory_max` becomes the hard limit.

## Basic Resource Settings

```hcl
job "api" {
  datacenters = ["dc1"]

  group "api" {
    task "server" {
      driver = "docker"

      config {
        image = "example/api:1.0.0"
      }

      resources {
        cpu    = 500
        memory = 512
      }
    }
  }
}
```

CPU is specified in MHz. Memory is specified in MB.

## Setting Memory Limits

Use `memory_max` to cap memory for supported task drivers. If the task exceeds this hard limit, the operating system typically terminates it.

```hcl
resources {
  cpu        = 500
  memory     = 512
  memory_max = 768
}
```

## Burst CPU with `cpu` or Reserve `cores`

If you want tighter control, set `cores` to reserve CPU cores exclusively, or rely on `cpu` for flexible usage. You cannot set both `cpu` and `cores` in the same `resources` block. In multi-tenant clusters, avoid oversized CPU reservations to prevent starvation.

## Tuning Strategy

- Start with real usage measurements from staging.
- Add 20 to 30 percent headroom for spikes.
- Use `memory_max` only when you are confident the app can tolerate hard limits.
- Increase resources gradually and measure latency.

## Preventing Noisy Neighbors

- Use consistent CPU and memory reservations.
- Avoid placing many high-CPU tasks on the same node.
- Enable job constraints or affinities to spread heavy workloads.

## Example: Enforcing Host Constraints

```hcl
constraint {
  attribute = "${node.class}"
  value     = "compute"
}
```

This keeps CPU-heavy tasks on dedicated nodes.

## Conclusion

Nomad resource constraints are simple but powerful. Set realistic reservations, use limits only when needed, and monitor actual usage so your scheduler can make better placement decisions.
