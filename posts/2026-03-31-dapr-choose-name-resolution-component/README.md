# How to Choose the Right Name Resolution Component for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Name Resolution, Service Discovery, Architecture, Best Practice

Description: A decision guide for choosing between Dapr's name resolution components - mDNS, Kubernetes DNS, Consul, SQLite, and NameFormat - based on your deployment environment.

---

## Why the Choice Matters

Dapr's name resolution component determines how your services discover each other. Choosing the wrong component can result in failed service invocations, poor performance in dynamic environments, or unnecessary complexity. The right choice depends on your runtime environment, infrastructure, and operational requirements.

## Decision Guide

### Kubernetes - Use Kubernetes DNS

For any workload running in Kubernetes, use the default `kubernetes` name resolution component. It requires no extra infrastructure, integrates with Kubernetes service discovery natively, and supports cross-namespace resolution.

```yaml
spec:
  nameResolution:
    component: "kubernetes"
    version: "v1"
    configuration:
      clusterDomain: "cluster.local"
```

### Local Development - Use mDNS

For local development on a single machine where you run multiple Dapr services in separate terminals, mDNS works with zero configuration:

```bash
dapr run --app-id myapp -- ./myapp
# No component config needed - mDNS is the default
```

### Docker Compose or Containers on One Host - Use SQLite

When services run in Docker containers that share a volume but multicast is not available, SQLite provides reliable file-based discovery:

```yaml
spec:
  nameResolution:
    component: "sqlite"
    version: "v1"
    configuration:
      connectionString: "/shared/dapr-ns.db"
```

### Multi-Cloud, Hybrid, or Bare Metal - Use Consul

For environments spanning multiple hosts, clouds, or on-premise infrastructure without Kubernetes:

```yaml
spec:
  nameResolution:
    component: "consul"
    version: "v1"
    configuration:
      client:
        address: "consul.internal:8500"
      queryOptions:
        datacenter: "dc1"
```

### Predictable Hostname Patterns - Use NameFormat

When your DNS already assigns hostnames based on service names (such as `service-myapp.prod.internal`), use NameFormat to avoid a separate registry:

```yaml
spec:
  nameResolution:
    component: "nameformat"
    version: "v1"
    configuration:
      format: "service-{appid}.prod.internal"
```

## Quick Comparison Matrix

| Environment | Recommended Component | Extra Infrastructure |
|-------------|----------------------|---------------------|
| Kubernetes | `kubernetes` | None |
| Local dev | `mdns` | None |
| Docker Compose | `sqlite` | Shared volume |
| Multi-host / hybrid | `consul` | Consul cluster |
| Custom DNS patterns | `nameformat` | DNS entries |
| AWS with Cloud Map | `cloudmap` | Cloud Map |

## Evaluating Trade-offs

Consider these factors when deciding:

**Operational overhead:** mDNS and Kubernetes DNS require no extra infrastructure. Consul requires deploying and managing a Consul cluster. SQLite only requires a shared filesystem.

**Scalability:** Kubernetes DNS scales with the cluster. Consul scales horizontally. mDNS and SQLite are limited to single-host or same-LAN environments.

**Reliability:** Consul offers health checking and automatic deregistration. SQLite and mDNS rely on timeouts to detect failed services.

**Security:** Consul supports TLS and ACL tokens. Kubernetes DNS inherits Kubernetes RBAC. mDNS has no authentication.

## Switching Components

Changing name resolution components requires restarting your Dapr sidecars. In Kubernetes:

```bash
kubectl apply -f new-nameresolution.yaml
kubectl rollout restart deployment/myapp
```

## Summary

Choose Kubernetes DNS for Kubernetes workloads, mDNS for local development, SQLite for Docker Compose environments, Consul for multi-host production deployments, and NameFormat when your infrastructure already provides predictable service hostnames. The right choice minimizes operational overhead while meeting your reliability and security requirements.
