# How Portainer Nomad Support Worked (Removed in 2.20)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HashiCorp Nomad, Deprecated, History, Container Orchestration

Description: A historical overview of Portainer's experimental HashiCorp Nomad integration, which was removed in Portainer 2.20 due to limited adoption and maintenance costs.

---

Portainer briefly supported HashiCorp Nomad as an environment type managed through the Portainer Edge Agent. Introduced in Portainer 2.12.2, deprecated in 2.19.5, and removed in 2.20.0, it offered a UI for browsing Nomad environments and deploying workloads through Edge Stacks. This post documents what it looked like and why it was removed.

## What Was Nomad?

HashiCorp Nomad is a flexible workload orchestrator that supports Docker containers, raw binaries, Java apps, and VMs. Unlike Kubernetes, Nomad is simpler to operate and supports non-containerized workloads natively.

Key Nomad concepts:

- **Jobs** - the primary unit of work (roughly analogous to a Kubernetes workload object, depending on job type)
- **Task Groups** - groups of co-located tasks (loosely equivalent to Pods)
- **Tasks** - individual workloads (Docker containers, exec processes, etc.)
- **Allocations** - scheduled instances of a task group on a Nomad client node

## What the Integration Offered

The Portainer Nomad integration allowed operators to:

1. **Add a Nomad environment** - by deploying the Portainer Edge Agent (Standard or Async) and optionally supplying a Nomad ACL token
2. **View a Nomad dashboard** - see cluster node count plus summary tiles for jobs, groups, and tasks
3. **Browse jobs and tasks** - view job status, namespace, creation date, task status, group, allocation ID, and start date
4. **Deploy workloads** - use Edge Stacks / Edge Compute, which Portainer deployed to Nomad as Nomad jobs
5. **Access task events and logs** - view events plus stdout/stderr from Nomad-managed tasks

A sample Nomad job definition that Nomad itself accepts:

```hcl
# nginx.nomad - Nomad HCL job file

job "nginx" {
  datacenters = ["dc1"]
  type        = "service"

  group "web" {
    count = 2

    network {
      port "http" {
        static = 8080
      }
    }

    task "nginx" {
      driver = "docker"

      config {
        image = "nginx:1.25-alpine"
        ports = ["http"]
      }

      resources {
        cpu    = 200    # MHz
        memory = 128    # MB
      }
    }
  }
}
```

## Why It Was Removed

Portainer's public deprecation and removal notices cited limited user adoption and the considerable development resources required to maintain Nomad support. The integration also retained notable limitations: Portainer documents a known issue affecting versions 2.14.0 through 2.19.4 where only Service jobs were displayed in the UI, because System, Batch, and Sysbatch jobs could break the interface.

1. **Limited adoption** - few Portainer users were using Nomad versus Docker and Kubernetes
2. **Maintenance burden** - maintaining Nomad support required considerable engineering effort
3. **Incomplete feature coverage** - affected releases displayed only Service jobs in the Portainer UI

## Migration for Former Nomad Users

If you relied on Portainer for Nomad management, alternatives include:

- **Nomad UI** - the built-in Nomad web interface at `/ui` provides job browsing, log viewing, and allocation inspection
- **Levant** - a Nomad deployment tool with templating
- **Nomad Pack** - HashiCorp's packaging and templating tool for Nomad
- **Portainer on Kubernetes** - migrating workloads to Kubernetes gives you Portainer's full feature set

## Summary

Portainer's Nomad integration was a genuinely useful feature for the niche of users running Nomad clusters. Its removal in 2.20 reflected the realities Portainer cited publicly: limited user adoption, the considerable resources required to maintain Nomad support, and a feature set that never fully matched Portainer's more mature platforms.
