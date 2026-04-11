# How to Use Redis Cloud Fixed Plans vs Flexible Plans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cloud, Pricing, Capacity Planning, Cloud

Description: Understand the difference between Redis Cloud Fixed and Flexible plans to pick the right tier for your workload, team size, and budget.

---

Redis Cloud offers two main subscription tiers: **Essentials** (formerly called Fixed) and **Pro** (formerly called Flexible). Choosing between them affects cost, resource limits, and operational flexibility. This post explains how each works and when to use one over the other.

## Essentials Plans (Formerly Fixed)

Essentials plans provision a pre-sized database on shared infrastructure. You pay a flat monthly rate regardless of actual usage.

Key characteristics:
- **Predictable cost** - flat rate per month.
- **Shared infrastructure** - runs on multi-tenant clusters.
- **Limited scalability** - you must upgrade the plan to get more RAM.
- **Available sizes**: from 30 MB (free tier) up to 12 GB.

Use Essentials plans when:
- You have a stable, well-understood workload.
- You want a predictable bill with no surprises.
- Your team is small or the database is non-critical.

```text
Free tier:  30 MB  | $0/month
250 MB:      250 MB | ~$7/month
1 GB:        1 GB   | ~$20/month
2.5 GB:      2.5 GB | ~$47/month
```

## Pro Plans (Formerly Flexible)

Pro plans let you configure exact memory, throughput, replication, and module requirements. You are billed based on what you provision.

Key characteristics:
- **Granular control** - set exact memory, throughput (ops/sec), and replication factor.
- **Redis Stack modules** - enable RediSearch, RedisJSON, RedisTimeSeries, and RedisBloom.
- **Active-Active geo-distribution** available.
- **Scales up or down** without plan migration.

Use Pro plans when:
- You need Redis Stack modules (RediSearch, RedisJSON, etc.).
- Your workload is large (more than 12 GB) or highly variable.
- You need multi-region or Active-Active replication.
- You want fine-grained throughput control (committed ops/sec).

## Comparing the Two

| Feature | Essentials | Pro |
|---------|------------|-----|
| Max memory | 12 GB | Hundreds of GB |
| Redis Stack modules | No | Yes |
| Active-Active | No | Yes |
| Pricing model | Flat monthly | Provisioned usage |
| Scaling | Plan upgrade required | Adjust in-place |
| Best for | Small/stable workloads | Production at scale |

## Migrating from Essentials to Pro

When you outgrow an Essentials plan:

1. In the Redis Cloud console, create a new Pro subscription.
2. Back up your Essentials database using the Redis Cloud console's backup feature.
3. Import the backup into the Pro database using the Redis Cloud console's import feature.
4. Update your application's connection string.
5. Delete the Essentials subscription.

Note: Administrative commands like `REPLICAOF` and `SYNC` are blocked on Redis Cloud managed instances, so live-migration via replication must be handled through the Redis Cloud console or API rather than manual CLI commands.

## Cost Estimation for Pro Plans

For a Pro database with:
- 1 GB memory
- 1,000 ops/sec throughput
- Replication enabled (1 replica)

The monthly cost is approximately $60-80 depending on region. Use the Redis Cloud pricing calculator at [redis.io/pricing](https://redis.io/pricing) for exact figures.

## Summary

Essentials plans are the right choice for small, predictable workloads where cost simplicity matters most. Pro plans unlock Redis Stack modules, Active-Active geo-distribution, and in-place scaling for production applications. Start with Essentials for development and migrate to Pro when you need modules or your memory requirements exceed 12 GB.
