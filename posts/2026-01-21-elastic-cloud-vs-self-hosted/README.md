# Elastic Cloud vs Self-Hosted Elasticsearch: Which to Choose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Elastic Cloud, Self-Hosted, Managed Service, Cloud, Cost Comparison

Description: A comprehensive comparison of Elastic Cloud managed service versus self-hosted Elasticsearch, covering costs, features, operational overhead, and decision factors.

---

Choosing between Elastic Cloud (managed service) and self-hosted Elasticsearch impacts cost, operations, and capabilities. This guide helps you make an informed decision.

## Overview

### Elastic Cloud

- **Provider**: Elastic NV
- **Type**: Fully managed SaaS
- **Deployment**: AWS, GCP, Azure
- **Pricing**: Consumption-based

### Self-Hosted Elasticsearch

- **Provider**: You (or cloud IaaS)
- **Type**: Self-managed
- **Deployment**: Anywhere
- **Pricing**: Infrastructure + labor

## Feature Comparison

### Core Features

| Feature | Elastic Cloud | Self-Hosted |
|---------|---------------|-------------|
| Full-text search | Yes | Yes |
| Aggregations | Yes | Yes |
| Machine learning | Yes (included) | Yes (subscription required) |
| Security | Yes (included) | Yes (basic free, advanced paid) |
| Alerting | Yes (included) | Yes (paid Watcher) |
| APM | Yes (included) | Yes (basic free) |
| Cross-cluster replication | Yes (included) | Yes (paid) |

### Operational Features

| Feature | Elastic Cloud | Self-Hosted |
|---------|---------------|-------------|
| Automatic upgrades | Yes | Manual |
| Auto-scaling | Yes | Manual or custom |
| Backup/restore | Automated | Manual setup |
| High availability | Built-in | Manual configuration |
| Monitoring | Built-in | Manual setup |
| Security patching | Automatic | Manual |

## Cost Analysis

### Elastic Cloud Pricing (2024 Estimates)

```plaintext
Standard Deployment:
- 4GB RAM, 120GB storage: ~$95/month
- 8GB RAM, 240GB storage: ~$190/month
- 16GB RAM, 480GB storage: ~$380/month

Enterprise:
- Includes premium support
- Custom pricing
- SLA guarantees
```

### Self-Hosted Cost Breakdown

```plaintext
AWS Example (3-node cluster):

Infrastructure:
- 3x m5.large (8GB RAM): $200/month
- 3x 500GB gp3 EBS: $120/month
- Load balancer: $20/month
- Data transfer: ~$50/month
Total Infrastructure: ~$390/month

Additional Costs:
- Elastic license (for enterprise features): Varies
- Operations labor: 10-20 hours/month
- On-call coverage: Variable
- Backup storage: ~$30/month

Total Estimated: $420+/month + labor
```

### TCO Comparison

| Cluster Size | Elastic Cloud | Self-Hosted (AWS) | Breakeven |
|--------------|---------------|-------------------|-----------|
| Small (8GB) | ~$190/month | ~$250/month + ops | Elastic Cloud |
| Medium (32GB) | ~$760/month | ~$600/month + ops | Depends on ops |
| Large (128GB) | ~$3,000/month | ~$1,800/month + ops | Self-hosted |

## Operational Comparison

### Day-to-Day Operations

**Elastic Cloud:**
```plaintext
Daily Tasks:
- Monitor dashboards (if needed)
- Review alerts (automated)

Weekly Tasks:
- Check capacity trends
- Review cost reports

Monthly Tasks:
- Review usage patterns
- Optimize queries if needed
```

**Self-Hosted:**
```plaintext
Daily Tasks:
- Check cluster health
- Monitor disk space
- Review logs for errors
- Check backup status

Weekly Tasks:
- Apply security patches
- Review performance metrics
- Test backup restoration
- Update documentation

Monthly Tasks:
- Capacity planning
- Performance tuning
- Security audits
- Cost optimization
```

### Upgrade Process

**Elastic Cloud:**
```bash
# Upgrades are managed via UI or API
# 1. Click "Upgrade" in console
# 2. Select target version
# 3. Rolling upgrade happens automatically

# API example
curl -X POST "https://api.elastic-cloud.com/api/v1/deployments/{id}/_upgrade" \
  -H "Authorization: ApiKey $API_KEY" \
  -d '{"version": "8.11.0"}'
```

**Self-Hosted:**
```bash
# 1. Review breaking changes
curl -X GET "localhost:9200/_cluster/health?pretty"

# 2. Create snapshot before upgrade
curl -X PUT "localhost:9200/_snapshot/backup/pre_upgrade"

# 3. Disable shard allocation
curl -X PUT "localhost:9200/_cluster/settings" -d '
{"persistent": {"cluster.routing.allocation.enable": "none"}}'

# 4. Stop and upgrade each node
systemctl stop elasticsearch
yum install elasticsearch-8.11.0
systemctl start elasticsearch

# 5. Re-enable allocation
curl -X PUT "localhost:9200/_cluster/settings" -d '
{"persistent": {"cluster.routing.allocation.enable": "all"}}'

# 6. Verify cluster health
curl -X GET "localhost:9200/_cluster/health?wait_for_status=green"
```

### Scaling

**Elastic Cloud:**
```bash
# Scale via API
curl -X PUT "https://api.elastic-cloud.com/api/v1/deployments/{id}" \
  -H "Authorization: ApiKey $API_KEY" \
  -d '{
    "resources": {
      "elasticsearch": [{
        "size": {
          "value": 8192,
          "resource": "memory"
        },
        "zone_count": 3
      }]
    }
  }'

# Auto-scaling based on storage
# Configured in deployment settings
```

**Self-Hosted:**
```bash
# 1. Provision new node
# 2. Configure elasticsearch.yml
cluster.name: my-cluster
node.name: new-node
discovery.seed_hosts: ["node1", "node2", "node3"]

# 3. Start Elasticsearch
systemctl start elasticsearch

# 4. Wait for node to join
curl -X GET "localhost:9200/_cat/nodes?v"

# 5. Rebalance shards (automatic)
curl -X GET "localhost:9200/_cluster/health?wait_for_status=green"
```

## Security Comparison

### Elastic Cloud Security

```plaintext
Built-in:
- TLS encryption (transit and rest)
- Role-based access control
- SAML/OIDC authentication
- IP filtering
- Audit logging
- Private Link support (AWS, Azure, GCP)
- SOC 2 Type II certified
- HIPAA eligible
```

### Self-Hosted Security

```yaml
# elasticsearch.yml - Manual configuration required

# Enable security
xpack.security.enabled: true

# TLS for transport
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12

# TLS for HTTP
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.keystore.path: http.p12

# Audit logging
xpack.security.audit.enabled: true
```

```bash
# Generate certificates
./bin/elasticsearch-certutil ca
./bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12

# Set up users
./bin/elasticsearch-setup-passwords auto

# Configure LDAP (requires manual setup)
```

## Monitoring and Alerting

### Elastic Cloud

```plaintext
Built-in monitoring:
- Cluster health dashboard
- Node performance metrics
- Index statistics
- Query performance
- Resource utilization
- Automated alerts

# No additional setup required
```

### Self-Hosted

```bash
# Deploy monitoring cluster
# Or use Metricbeat + Kibana

# metricbeat.yml
metricbeat.modules:
- module: elasticsearch
  metricsets:
    - node
    - node_stats
    - index
    - cluster_stats
  period: 10s
  hosts: ["localhost:9200"]

# Set up alerting with Watcher
curl -X PUT "localhost:9200/_watcher/watch/cluster_health" -d '
{
  "trigger": {"schedule": {"interval": "1m"}},
  "input": {
    "http": {
      "request": {"host": "localhost", "port": 9200, "path": "/_cluster/health"}
    }
  },
  "condition": {
    "compare": {"ctx.payload.status": {"eq": "red"}}
  },
  "actions": {
    "notify": {"email": {"to": "admin@example.com", "subject": "Cluster RED"}}
  }
}'
```

## Backup and Disaster Recovery

### Elastic Cloud

```plaintext
Automatic features:
- Continuous snapshots
- Cross-region replication
- Point-in-time recovery
- Managed snapshot repository

# Restore via UI or API
```

### Self-Hosted

```bash
# 1. Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/my_backup" -d '
{
  "type": "s3",
  "settings": {
    "bucket": "my-es-backups",
    "region": "us-east-1"
  }
}'

# 2. Create snapshot
curl -X PUT "localhost:9200/_snapshot/my_backup/snapshot_1?wait_for_completion=true"

# 3. Schedule snapshots (cron or SLM)
curl -X PUT "localhost:9200/_slm/policy/daily-snapshots" -d '
{
  "schedule": "0 30 1 * * ?",
  "name": "<daily-snap-{now/d}>",
  "repository": "my_backup",
  "config": {"indices": ["*"]},
  "retention": {"expire_after": "30d", "min_count": 5, "max_count": 50}
}'

# 4. Test restoration (critical!)
curl -X POST "localhost:9200/_snapshot/my_backup/snapshot_1/_restore"
```

## When to Choose Elastic Cloud

### Best for:

1. **Small to medium teams**
   - Limited Elasticsearch expertise
   - No dedicated operations team
   - Focus on development, not operations

2. **Rapid deployment needs**
   - Quick time-to-market
   - Prototype to production
   - Variable workloads

3. **Compliance requirements**
   - SOC 2 compliance needed
   - HIPAA requirements
   - Audit requirements

4. **Full Elastic Stack usage**
   - Using APM, SIEM, Observability
   - Need all enterprise features
   - Integrated experience

### Example Use Cases

```plaintext
- Startup building SaaS product
- Enterprise using full Elastic Stack
- Team without dedicated DevOps
- Project with unknown scale requirements
```

## When to Choose Self-Hosted

### Best for:

1. **Large-scale deployments**
   - Predictable, high-volume workloads
   - Cost-sensitive at scale
   - Dedicated operations team

2. **Data sovereignty requirements**
   - Must keep data in specific location
   - Air-gapped environments
   - Government/regulated industries

3. **Deep customization needs**
   - Custom plugins required
   - Specific hardware requirements
   - Integration with existing infrastructure

4. **Existing operations expertise**
   - Team familiar with Elasticsearch
   - Existing monitoring infrastructure
   - DevOps culture

### Example Use Cases

```plaintext
- Large e-commerce platform
- Financial services (data locality)
- Healthcare (HIPAA self-managed)
- Organizations with existing Kubernetes expertise
```

## Hybrid Approach

### Split Workloads

```plaintext
Elastic Cloud:
- Development environments
- Smaller production workloads
- Elastic Security/Observability

Self-Hosted:
- High-volume production search
- Data-sensitive workloads
- Cost-sensitive large clusters
```

### Cross-Cluster Search

```bash
# Self-hosted cluster configured to search Elastic Cloud
curl -X PUT "localhost:9200/_cluster/settings" -d '
{
  "persistent": {
    "cluster.remote.elastic_cloud.seeds": ["cluster-id.es.us-east-1.aws.found.io:9243"],
    "cluster.remote.elastic_cloud.skip_unavailable": true
  }
}'

# Search across both
curl -X GET "localhost:9200/local-index,elastic_cloud:cloud-index/_search"
```

## Decision Framework

| Factor | Choose Elastic Cloud | Choose Self-Hosted |
|--------|---------------------|-------------------|
| Team size | < 10 engineers | > 10 with ops expertise |
| Workload size | Small to medium | Large, predictable |
| Budget model | OpEx preferred | CapEx acceptable |
| Time to market | Fast | Flexible |
| Data location | Cloud regions OK | Specific location needed |
| Compliance | Cloud compliance OK | Self-managed compliance |
| Customization | Standard features | Custom plugins needed |
| Operations | Limited bandwidth | Dedicated team |

## Migration Paths

### From Self-Hosted to Elastic Cloud

```bash
# 1. Create snapshot repository accessible by both
# 2. Snapshot self-hosted cluster
# 3. Create Elastic Cloud deployment
# 4. Restore snapshot to Elastic Cloud
# 5. Update application configurations
# 6. Decommission self-hosted
```

### From Elastic Cloud to Self-Hosted

```bash
# 1. Set up self-hosted cluster
# 2. Configure cross-cluster replication or snapshot
# 3. Replicate data
# 4. Update application configurations
# 5. Cancel Elastic Cloud subscription
```

## Summary

### Choose Elastic Cloud if:
- You want operational simplicity
- You need quick deployment
- Your team lacks Elasticsearch expertise
- You want all features included
- Compliance (SOC 2, HIPAA) is required

### Choose Self-Hosted if:
- You have large, predictable workloads
- Cost optimization is critical at scale
- You need specific data locality
- You have operations expertise
- Custom configurations are required

The right choice depends on your team's capabilities, workload characteristics, budget constraints, and compliance requirements. Many organizations use a hybrid approach, leveraging Elastic Cloud for some workloads while self-hosting others.
