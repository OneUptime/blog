# How to Fix RDS Multi-AZ Failover Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, High Availability, Database, Troubleshooting

Description: Understand why RDS Multi-AZ failovers happen, minimize their impact on your application, and set up proper monitoring for failover events.

---

Your application suddenly lost database connectivity for 15-30 seconds, and when you check the RDS events, you see:

```
Multi-AZ instance failover started
Multi-AZ instance failover completed
```

RDS Multi-AZ failovers are a normal part of the high availability design, but they can still cause application errors if you're not prepared. Let's understand why they happen and how to minimize their impact.

## What Happens During a Failover

In a Multi-AZ deployment, RDS maintains a standby replica in a different Availability Zone. During a failover:

1. The standby is promoted to primary
2. The DNS record for the RDS endpoint is updated to point to the new primary
3. The old primary is demoted or replaced
4. Applications reconnect to the new primary

The whole process typically takes 15-30 seconds for most database engines, though it can be as quick as 10 seconds or take up to a minute in some cases.

```mermaid
sequenceDiagram
    participant App as Application
    participant DNS as RDS DNS
    participant P1 as Primary (AZ-A)
    participant S1 as Standby (AZ-B)
    Note over P1: Issue detected
    DNS->>S1: Promote to Primary
    Note over P1: Demoted
    Note over S1: Now Primary
    DNS->>App: DNS updated
    App->>S1: Reconnects
```

## Why Failovers Happen

Check your RDS events to see what triggered the failover:

```bash
# Check recent RDS events
aws rds describe-events \
  --source-identifier my-database \
  --source-type db-instance \
  --duration 1440 \
  --query 'Events[*].{Date:Date,Message:Message}'
```

Common triggers include:

### 1. Planned Maintenance

AWS applies maintenance patches during your maintenance window. If the patch requires a reboot, a failover happens.

```bash
# Check your maintenance window
aws rds describe-db-instances \
  --db-instance-identifier my-database \
  --query 'DBInstances[0].PreferredMaintenanceWindow'

# Check pending maintenance actions
aws rds describe-pending-maintenance-actions \
  --resource-identifier arn:aws:rds:us-east-1:123456789012:db:my-database
```

You can defer non-critical maintenance or schedule it for a convenient time:

```bash
# Change the maintenance window to Sunday 3 AM UTC
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --preferred-maintenance-window "sun:03:00-sun:04:00"
```

### 2. AZ-Level Issues

If the AZ hosting your primary instance experiences hardware issues, networking problems, or even a full outage, RDS automatically fails over to the standby.

You can't prevent AZ-level issues, but you can make sure your application handles the failover gracefully.

### 3. Instance Class Issues

Hardware failures on the underlying host can trigger a failover. RDS detects the failure and switches to the standby.

### 4. Database Crash

If the database engine crashes (due to out-of-memory, corrupted pages, or bugs), RDS restarts it. In Multi-AZ, this triggers a failover to the healthy standby.

### 5. Manual Failover

Someone on your team (or an automated process) might have triggered a failover deliberately:

```bash
# This command forces a failover (someone may have run this)
aws rds reboot-db-instance \
  --db-instance-identifier my-database \
  --force-failover
```

## Making Your Application Failover-Resilient

### 1. Use the RDS DNS Endpoint

Always connect using the RDS endpoint, never a direct IP address. The endpoint DNS record gets updated during failover.

```python
# Good - uses the DNS endpoint
connection = pymysql.connect(
    host='my-database.abc123.us-east-1.rds.amazonaws.com',
    user='admin',
    password='secret',
    database='mydb'
)

# Bad - hardcoded IP will break on failover
connection = pymysql.connect(
    host='10.0.1.45',
    user='admin',
    password='secret',
    database='mydb'
)
```

### 2. Reduce DNS Caching

After a failover, the RDS DNS record points to the new primary. If your application caches DNS, it might keep connecting to the old (dead) IP.

For Java applications:

```java
// In JVM startup options
-Dsun.net.inetaddr.ttl=30
-Dsun.net.inetaddr.negative.ttl=10
```

In your code:

```java
// Or set programmatically
java.security.Security.setProperty("networkaddress.cache.ttl", "30");
java.security.Security.setProperty("networkaddress.cache.negative.ttl", "10");
```

For Python, the OS-level DNS cache matters more. On Linux, most applications use the system resolver which doesn't cache by default.

### 3. Configure Connection Pool for Failover

Your connection pool should detect broken connections and replace them:

```python
from sqlalchemy import create_engine

engine = create_engine(
    'mysql+pymysql://admin:secret@my-database.abc123.us-east-1.rds.amazonaws.com:3306/mydb',
    pool_pre_ping=True,     # Validate connections before use
    pool_recycle=300,        # Recycle connections every 5 minutes
    pool_size=10,
    max_overflow=20,
    connect_args={
        'connect_timeout': 5,
        'read_timeout': 30
    }
)
```

### 4. Implement Retry Logic

During the failover window, connections will fail. Retry with backoff:

```python
import time
from sqlalchemy.exc import OperationalError

def execute_with_retry(engine, query, params=None, max_retries=5):
    """Execute a query with retry logic for failover scenarios."""
    for attempt in range(max_retries):
        try:
            with engine.connect() as conn:
                result = conn.execute(query, params)
                return result
        except OperationalError as e:
            if attempt < max_retries - 1:
                wait_time = min(2 ** attempt, 30)  # Max 30 second wait
                print(f"Database error (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
            else:
                raise
```

### 5. Use RDS Proxy

RDS Proxy handles failover much more gracefully than direct connections. It maintains a connection pool to RDS and transparently handles failovers, reducing failover time to as little as a few seconds.

```bash
# Create RDS Proxy
aws rds create-db-proxy \
  --db-proxy-name my-proxy \
  --engine-family MYSQL \
  --auth '[{"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:us-east-1:123456789012:secret:db-creds","IAMAuth":"DISABLED"}]' \
  --role-arn arn:aws:iam::123456789012:role/rds-proxy-role \
  --vpc-subnet-ids subnet-0abc123 subnet-0def456

# Register the target
aws rds register-db-proxy-targets \
  --db-proxy-name my-proxy \
  --db-instance-identifiers my-database
```

Connect to the proxy endpoint instead of the RDS endpoint. The proxy will handle failover routing for you.

## Testing Failover

You should test failover before it happens in production. Force a failover during a maintenance window:

```bash
# Force a failover (this will cause a brief outage)
aws rds reboot-db-instance \
  --db-instance-identifier my-database \
  --force-failover
```

While the failover is happening, watch your application logs. You should see:
- Connection errors for 15-30 seconds
- Automatic reconnection after the failover completes
- No data loss or corruption

## Monitoring Failover Events

Set up notifications for failover events:

```bash
# Create an RDS event subscription for failover notifications
aws rds create-event-subscription \
  --subscription-name failover-alerts \
  --sns-topic-arn arn:aws:sns:us-east-1:123456789012:alerts \
  --source-type db-instance \
  --event-categories '["failover"]' \
  --source-ids my-database \
  --enabled
```

Also monitor these CloudWatch metrics around failover events:

```bash
# Track key metrics that indicate failover impact
for metric in DatabaseConnections CPUUtilization ReadLatency WriteLatency; do
  aws cloudwatch get-metric-statistics \
    --namespace AWS/RDS \
    --metric-name $metric \
    --dimensions Name=DBInstanceIdentifier,Value=my-database \
    --start-time $(date -u -v-2H +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 60 \
    --statistics Average Maximum
done
```

For comprehensive failover monitoring with correlation to application-level impact, [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can track database health, failover events, and application errors on a single dashboard, giving you a clear picture of how failovers affect your users.

## Summary

RDS Multi-AZ failovers are a feature, not a bug. They protect your database from AZ-level failures. The key to surviving them is preparation:

1. **Always use the DNS endpoint** - Never hardcode IPs
2. **Keep DNS TTL low** - 30 seconds or less
3. **Validate connections** before using them
4. **Implement retry logic** with exponential backoff
5. **Consider RDS Proxy** for seamless failover handling
6. **Test failover** regularly so you know your app handles it
7. **Monitor events** so you know when failovers happen

The goal isn't to prevent failovers but to make them invisible to your users.
