# Amazon RDS vs Aurora vs Self-Hosted PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, AWS, RDS, Aurora, Cloud Database, Managed Services

Description: A comparison of Amazon RDS PostgreSQL, Aurora PostgreSQL, and self-hosted PostgreSQL, covering features, costs, and use case recommendations.

---

Choosing between managed and self-hosted PostgreSQL affects operational complexity, cost, and capabilities. This guide compares the options.

## Quick Comparison

| Feature | RDS PostgreSQL | Aurora PostgreSQL | Self-Hosted |
|---------|----------------|-------------------|-------------|
| Management | Fully managed | Fully managed | You manage |
| Storage | EBS-based | Distributed | Your choice |
| Max Storage | 64 TB | 128 TB | Unlimited |
| Read Replicas | 5 | 15 | Unlimited |
| Failover Time | 1-2 minutes | <30 seconds | Variable |
| Cost | $$$ | $$$$ | $ (+ ops cost) |

## Amazon RDS PostgreSQL

### Pros
- Simple setup and management
- Automated backups, patching
- Multi-AZ for HA
- Standard PostgreSQL compatibility

### Cons
- Storage performance tied to instance
- Slower failover than Aurora
- Limited read replicas
- Cost at scale

### Best For
- Standard workloads
- PostgreSQL compatibility requirements
- Simpler pricing model

```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier mydb \
    --db-instance-class db.r6g.large \
    --engine postgres \
    --master-username admin \
    --master-user-password secret \
    --allocated-storage 100
```

## Aurora PostgreSQL

### Pros
- Distributed storage (faster, more durable)
- Fast failover (<30 seconds)
- Up to 15 read replicas
- Serverless option available
- Better read scaling

### Cons
- Higher cost
- Some PostgreSQL incompatibilities
- Vendor lock-in
- Complex pricing

### Best For
- High availability requirements
- Read-heavy workloads
- Variable/unpredictable traffic (Serverless)

```bash
# Create Aurora cluster
aws rds create-db-cluster \
    --db-cluster-identifier myaurora \
    --engine aurora-postgresql \
    --master-username admin \
    --master-user-password secret

aws rds create-db-instance \
    --db-instance-identifier myaurora-instance \
    --db-cluster-identifier myaurora \
    --db-instance-class db.r6g.large \
    --engine aurora-postgresql
```

## Self-Hosted PostgreSQL

### Pros
- Full control
- No vendor lock-in
- Lowest infrastructure cost
- Any PostgreSQL version/extension
- Custom configuration

### Cons
- Operational overhead
- You handle backups, HA, patching
- Requires expertise
- Hidden costs (ops time)

### Best For
- Cost-sensitive at scale
- Specific requirements (extensions, versions)
- Existing PostgreSQL expertise
- On-premises requirements

## Cost Comparison (Approximate)

| Configuration | RDS | Aurora | Self-Hosted EC2 |
|--------------|-----|--------|-----------------|
| 2 vCPU, 8GB | ~$200/mo | ~$250/mo | ~$100/mo + ops |
| 8 vCPU, 32GB | ~$800/mo | ~$1000/mo | ~$400/mo + ops |
| HA (Multi-AZ) | 2x | 1.3x | 2x + setup |

## Decision Matrix

| Factor | Choose RDS | Choose Aurora | Choose Self-Hosted |
|--------|------------|---------------|-------------------|
| Budget | Medium | Higher OK | Minimize infra cost |
| Operations | Minimize | Minimize | Have expertise |
| Scale | Predictable | High/variable | Very high |
| HA needs | Standard | Critical | Can build |
| Compliance | Cloud OK | Cloud OK | On-prem required |

## Conclusion

- **RDS**: Balanced choice for most workloads
- **Aurora**: When high availability and read scaling are critical
- **Self-Hosted**: When you need full control or have strict cost/compliance requirements

Many organizations start with RDS, move to Aurora for scaling, or self-host for specialized needs.
