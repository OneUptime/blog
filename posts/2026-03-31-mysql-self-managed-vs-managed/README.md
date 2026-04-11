# How to Choose Between Self-Managed and Managed MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Architecture, Cloud, Database, Operation

Description: Compare self-managed and managed MySQL options across cost, control, operational overhead, and compliance requirements to choose the right approach for your team.

---

Choosing between self-managed MySQL on virtual machines or managed MySQL services from cloud providers is one of the first infrastructure decisions for any new database deployment. The right choice depends on team size, compliance requirements, performance needs, and operational maturity.

## What Self-Managed MySQL Gives You

Self-managed MySQL means you install, configure, patch, back up, and monitor MySQL yourself on VMs, bare metal, or Kubernetes. You have full control over:

- The exact MySQL version and build
- Storage layout, filesystem, and I/O scheduler
- Custom parameter tuning not available in managed services
- Network topology and replication architecture
- Total cost predictability for large-scale deployments

The tradeoff is operational burden. Your team handles version upgrades, backup verification, failover testing, capacity planning, and security patching.

A self-managed setup on EC2 with 32 GB RAM for MySQL might look like:

```bash
# Install MySQL 8.0 and configure buffer pool
sudo apt install -y mysql-server

cat > /etc/mysql/mysql.conf.d/tuning.cnf << 'EOF'
[mysqld]
innodb_buffer_pool_size = 24G
innodb_buffer_pool_instances = 8
innodb_log_file_size = 2G
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1
max_connections = 300
slow_query_log = ON
long_query_time = 1
EOF

sudo systemctl restart mysql
```

## What Managed MySQL Gives You

Managed services like AWS RDS, Google Cloud SQL, Azure Database for MySQL, Amazon Aurora, and DigitalOcean Managed Databases take over operational tasks:

- Automated daily backups with point-in-time recovery
- One-click minor version patching
- Multi-AZ high availability with automatic failover (typically under 60 seconds)
- Storage autoscaling
- Built-in monitoring and alerting

The tradeoff is reduced control and higher cost per GB of RAM compared to self-managed EC2.

## Cost Comparison

Compare approximate monthly costs for equivalent capacity:

```text
Self-managed (r6i.xlarge on EC2):
- Instance: ~$180/month
- 500 GB gp3 EBS: ~$40/month
- Snapshots, monitoring, ops time: ~$100/month
- Total: ~$320/month

Amazon RDS MySQL (db.r6g.xlarge, Multi-AZ):
- Instance: ~$420/month (includes standby)
- 500 GB gp3 storage: ~$57/month
- Total: ~$477/month
```

At scale with hundreds of instances, self-managed can save significantly. For small teams, managed services pay for themselves in saved engineering time.

## Decision Framework

Choose self-managed when:
- You have a dedicated DBA or experienced SRE team
- Compliance requires air-gapped or on-premises MySQL
- You need custom MySQL plugins or OS-level tuning (e.g., I/O scheduler, kernel parameters) not possible in managed services
- Running MySQL at very large scale where cost difference is significant

Choose managed when:
- Your team lacks dedicated database expertise
- You need fast failover without manual intervention
- Automated backups and point-in-time recovery are required with minimal setup
- You are starting a new application and want to move fast

## Hybrid Approach

Many teams use managed MySQL for production (reliability, backups) and self-managed Docker containers locally and in CI/CD:

```yaml
# docker-compose.yml for development
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: localdev
      MYSQL_DATABASE: myapp
    ports:
      - "3306:3306"
```

## Summary

Self-managed MySQL offers full control and lower per-unit cost at scale but requires significant operational investment. Managed MySQL services trade some configuration flexibility for automated backups, patching, and high availability. Most teams with fewer than five database engineers benefit from managed services, while large-scale deployments with dedicated DBA teams often find self-managed more cost-effective. Consider a hybrid approach where development uses Docker and production uses a managed service.
