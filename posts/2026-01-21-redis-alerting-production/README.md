# How to Set Up Redis Alerting for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Alerting, Production, Monitoring, Prometheus, PagerDuty, Slack

Description: A comprehensive guide to setting up Redis alerting for production environments, covering key metrics, alert thresholds, incident response, and integration with popular alerting platforms like Prometheus Alertmanager, PagerDuty, and Slack.

---

Production Redis deployments require proactive alerting to catch issues before they impact users. A well-designed alerting strategy helps you respond quickly to problems while avoiding alert fatigue. In this guide, we will explore how to set up comprehensive Redis alerting for production environments.

## Key Metrics to Alert On

### Critical Metrics (Immediate Response Required)

| Metric | Why It Matters | Typical Threshold |
|--------|----------------|-------------------|
| Redis down | Complete service outage | Instance unreachable |
| Memory > 90% | Near OOM, risk of eviction | > 90% of maxmemory |
| Replication broken | Data inconsistency risk | master_link_status != up |
| Rejected connections | Clients can't connect | Any increase |
| RDB/AOF save failed | Data durability at risk | Save status = 0 |

### Warning Metrics (Investigation Needed)

| Metric | Why It Matters | Typical Threshold |
|--------|----------------|-------------------|
| Memory > 75% | Approaching capacity | > 75% of maxmemory |
| High latency | Performance degradation | > 10ms average |
| Keys evicted | Memory pressure | > 0 keys/sec |
| Replication lag | Data consistency risk | > 10 seconds |
| Slow log growing | Performance issues | > 100 entries |
| Connection spike | Possible leak or attack | > 150% of baseline |

## Prometheus Alert Rules

### Complete Alert Configuration

Create `redis-alerts.yml`:

```yaml
groups:
  - name: redis-critical
    rules:
      # Instance Health
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis instance {{ $labels.instance }} is down"
          description: "Redis has been unreachable for more than 1 minute."
          runbook_url: "https://runbooks.example.com/redis-down"

      # Memory Critical
      - alert: RedisMemoryCritical
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis memory critical on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | printf \"%.1f\" }}%. Risk of OOM or mass eviction."
          runbook_url: "https://runbooks.example.com/redis-memory"

      # Replication Broken
      - alert: RedisReplicationBroken
        expr: redis_master_link_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis replication broken on {{ $labels.instance }}"
          description: "Replica lost connection to master. Data may be inconsistent."
          runbook_url: "https://runbooks.example.com/redis-replication"

      # Persistence Failed
      - alert: RedisRDBSaveFailed
        expr: redis_rdb_last_bgsave_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis RDB save failed on {{ $labels.instance }}"
          description: "RDB snapshot failed. Data durability at risk."
          runbook_url: "https://runbooks.example.com/redis-rdb"

      - alert: RedisAOFWriteError
        expr: redis_aof_last_write_status == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis AOF write failed on {{ $labels.instance }}"
          description: "AOF persistence failing. Check disk space and permissions."

      # Connection Issues
      - alert: RedisRejectingConnections
        expr: increase(redis_rejected_connections_total[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis rejecting connections on {{ $labels.instance }}"
          description: "Redis is rejecting connections. Check maxclients setting."

  - name: redis-warning
    rules:
      # Memory Warning
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 75
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory high on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | printf \"%.1f\" }}%."

      # Eviction
      - alert: RedisEvictingKeys
        expr: rate(redis_evicted_keys_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis evicting keys on {{ $labels.instance }}"
          description: "Evicting {{ $value | printf \"%.1f\" }} keys/sec due to memory pressure."

      # Cache Hit Rate
      - alert: RedisCacheHitRateLow
        expr: |
          rate(redis_keyspace_hits_total[5m]) /
          (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100 < 80
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Redis cache hit rate low on {{ $labels.instance }}"
          description: "Cache hit rate is {{ $value | printf \"%.1f\" }}%."

      # Replication Lag
      - alert: RedisReplicationLag
        expr: redis_master_last_io_seconds_ago > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis replication lag on {{ $labels.instance }}"
          description: "Replica is {{ $value }}s behind master."

      # Slow Log
      - alert: RedisSlowLogGrowing
        expr: redis_slowlog_length > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis slow log growing on {{ $labels.instance }}"
          description: "Slow log has {{ $value }} entries. Investigate slow commands."

      # Memory Fragmentation
      - alert: RedisMemoryFragmentationHigh
        expr: redis_memory_fragmentation_ratio > 1.5
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory fragmentation high on {{ $labels.instance }}"
          description: "Fragmentation ratio is {{ $value | printf \"%.2f\" }}."

      # Connections
      - alert: RedisConnectionsHigh
        expr: redis_connected_clients > 5000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis connections high on {{ $labels.instance }}"
          description: "{{ $value }} clients connected."

      - alert: RedisBlockedClients
        expr: redis_blocked_clients > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis has blocked clients on {{ $labels.instance }}"
          description: "{{ $value }} clients are blocked on BLPOP/BRPOP."

      # Command Latency
      - alert: RedisCommandLatencyHigh
        expr: |
          rate(redis_commands_duration_seconds_total[5m]) /
          rate(redis_commands_processed_total[5m]) * 1000 > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis command latency high on {{ $labels.instance }}"
          description: "Average command latency is {{ $value | printf \"%.1f\" }}ms."

  - name: redis-cluster
    rules:
      # Cluster State
      - alert: RedisClusterStateNotOk
        expr: redis_cluster_state == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cluster state is not OK"
          description: "Redis cluster is in failed state."

      # Cluster Slots
      - alert: RedisClusterSlotsFailing
        expr: redis_cluster_slots_fail > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cluster has failing slots"
          description: "{{ $value }} slots are in fail state."

      - alert: RedisClusterSlotsUnassigned
        expr: redis_cluster_slots_assigned < 16384
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis cluster has unassigned slots"
          description: "Only {{ $value }} of 16384 slots assigned."
```

## Alertmanager Configuration

### Route Configuration

```yaml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  slack_api_url: 'https://hooks.slack.com/services/xxx/yyy/zzz'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'default'
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical Redis alerts go to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true

    # Warning alerts go to Slack
    - match:
        severity: warning
      receiver: 'slack-warnings'
      group_wait: 1m
      repeat_interval: 1h

receivers:
  - name: 'default'
    email_configs:
      - to: 'ops-team@example.com'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'your-pagerduty-service-key'
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.default.instances" .Alerts.Firing }}'
          resolved: '{{ template "pagerduty.default.instances" .Alerts.Resolved }}'
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'

  - name: 'slack-warnings'
    slack_configs:
      - channel: '#redis-alerts'
        send_resolved: true
        title: '{{ .Status | toUpper }} {{ .CommonLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Instance:* {{ .Labels.instance }}
          *Description:* {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  # If Redis is down, suppress other Redis alerts
  - source_match:
      alertname: RedisDown
    target_match_re:
      alertname: Redis.*
    equal: ['instance']
```

## Python Alerting Script

For environments without Prometheus, here's a Python-based alerting solution:

```python
import redis
import time
import requests
import json
from dataclasses import dataclass
from typing import List, Dict, Callable, Optional
from datetime import datetime, timedelta
from enum import Enum

class Severity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"

@dataclass
class Alert:
    name: str
    severity: Severity
    message: str
    instance: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False

class AlertRule:
    def __init__(self, name: str, severity: Severity, check_fn: Callable,
                 threshold: float, duration_seconds: int = 60,
                 description: str = ""):
        self.name = name
        self.severity = severity
        self.check_fn = check_fn
        self.threshold = threshold
        self.duration_seconds = duration_seconds
        self.description = description
        self.firing_since: Optional[datetime] = None
        self.last_value: Optional[float] = None

    def evaluate(self, redis_info: Dict) -> Optional[Alert]:
        """Evaluate the rule and return Alert if triggered."""
        try:
            value = self.check_fn(redis_info)
            self.last_value = value
            is_firing = value > self.threshold

            now = datetime.now()

            if is_firing:
                if self.firing_since is None:
                    self.firing_since = now

                # Check if duration exceeded
                if (now - self.firing_since).seconds >= self.duration_seconds:
                    return Alert(
                        name=self.name,
                        severity=self.severity,
                        message=self.description.format(value=value, threshold=self.threshold),
                        instance="",  # Set by caller
                        value=value,
                        threshold=self.threshold,
                        timestamp=now
                    )
            else:
                # Reset if not firing
                if self.firing_since is not None:
                    self.firing_since = None
                    return Alert(
                        name=self.name,
                        severity=self.severity,
                        message=f"{self.name} resolved",
                        instance="",
                        value=value,
                        threshold=self.threshold,
                        timestamp=now,
                        resolved=True
                    )

        except Exception as e:
            print(f"Error evaluating rule {self.name}: {e}")

        return None

class RedisAlerter:
    def __init__(self, redis_host: str, redis_port: int = 6379,
                 redis_password: str = None, instance_name: str = None):
        self.redis = redis.Redis(
            host=redis_host,
            port=redis_port,
            password=redis_password,
            decode_responses=True
        )
        self.instance_name = instance_name or f"{redis_host}:{redis_port}"
        self.rules: List[AlertRule] = []
        self.active_alerts: Dict[str, Alert] = {}
        self.notification_handlers: List[Callable] = []

    def add_rule(self, rule: AlertRule):
        """Add an alert rule."""
        self.rules.append(rule)

    def add_notification_handler(self, handler: Callable):
        """Add a notification handler."""
        self.notification_handlers.append(handler)

    def setup_default_rules(self):
        """Set up standard Redis alerting rules."""
        # Memory critical
        self.add_rule(AlertRule(
            name="RedisMemoryCritical",
            severity=Severity.CRITICAL,
            check_fn=lambda info: (info['used_memory'] / info.get('maxmemory', float('inf'))) * 100
                if info.get('maxmemory', 0) > 0 else 0,
            threshold=90,
            duration_seconds=300,
            description="Memory usage is {value:.1f}% (threshold: {threshold}%)"
        ))

        # Memory warning
        self.add_rule(AlertRule(
            name="RedisMemoryHigh",
            severity=Severity.WARNING,
            check_fn=lambda info: (info['used_memory'] / info.get('maxmemory', float('inf'))) * 100
                if info.get('maxmemory', 0) > 0 else 0,
            threshold=75,
            duration_seconds=600,
            description="Memory usage is {value:.1f}% (threshold: {threshold}%)"
        ))

        # Connected clients
        self.add_rule(AlertRule(
            name="RedisConnectionsHigh",
            severity=Severity.WARNING,
            check_fn=lambda info: info.get('connected_clients', 0),
            threshold=5000,
            duration_seconds=300,
            description="Connected clients: {value} (threshold: {threshold})"
        ))

        # Blocked clients
        self.add_rule(AlertRule(
            name="RedisBlockedClients",
            severity=Severity.WARNING,
            check_fn=lambda info: info.get('blocked_clients', 0),
            threshold=10,
            duration_seconds=300,
            description="Blocked clients: {value} (threshold: {threshold})"
        ))

        # Slow log
        self.add_rule(AlertRule(
            name="RedisSlowLogGrowing",
            severity=Severity.WARNING,
            check_fn=lambda info: len(self.redis.slowlog_get(128)),
            threshold=100,
            duration_seconds=600,
            description="Slow log entries: {value} (threshold: {threshold})"
        ))

        # Memory fragmentation
        self.add_rule(AlertRule(
            name="RedisMemoryFragmentation",
            severity=Severity.WARNING,
            check_fn=lambda info: info.get('mem_fragmentation_ratio', 1),
            threshold=1.5,
            duration_seconds=1800,
            description="Memory fragmentation ratio: {value:.2f} (threshold: {threshold})"
        ))

    def get_redis_info(self) -> Dict:
        """Get all Redis info."""
        info = {}
        for section in ['server', 'clients', 'memory', 'stats', 'replication', 'cpu', 'keyspace']:
            try:
                section_info = self.redis.info(section)
                info.update(section_info)
            except:
                pass
        return info

    def check_connectivity(self) -> bool:
        """Check if Redis is reachable."""
        try:
            self.redis.ping()
            return True
        except:
            return False

    def evaluate_rules(self):
        """Evaluate all rules and trigger notifications."""
        # Check connectivity first
        if not self.check_connectivity():
            alert = Alert(
                name="RedisDown",
                severity=Severity.CRITICAL,
                message=f"Redis instance {self.instance_name} is unreachable",
                instance=self.instance_name,
                value=0,
                threshold=1,
                timestamp=datetime.now()
            )
            self._handle_alert(alert)
            return

        # Get current info
        info = self.get_redis_info()

        # Evaluate each rule
        for rule in self.rules:
            alert = rule.evaluate(info)
            if alert:
                alert.instance = self.instance_name
                self._handle_alert(alert)

    def _handle_alert(self, alert: Alert):
        """Handle an alert - store and notify."""
        key = f"{alert.name}:{alert.instance}"

        if alert.resolved:
            if key in self.active_alerts:
                del self.active_alerts[key]
                self._notify(alert)
        else:
            if key not in self.active_alerts:
                self.active_alerts[key] = alert
                self._notify(alert)

    def _notify(self, alert: Alert):
        """Send notifications."""
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                print(f"Notification handler error: {e}")

    def run(self, interval_seconds: int = 30):
        """Run the alerter in a loop."""
        print(f"Starting Redis alerter for {self.instance_name}")
        print(f"Checking every {interval_seconds} seconds")
        print(f"Loaded {len(self.rules)} alert rules")

        while True:
            try:
                self.evaluate_rules()
            except Exception as e:
                print(f"Error in evaluation loop: {e}")

            time.sleep(interval_seconds)


# Notification Handlers

def slack_notification_handler(webhook_url: str):
    """Create a Slack notification handler."""
    def handler(alert: Alert):
        color = {
            Severity.CRITICAL: "danger",
            Severity.WARNING: "warning",
            Severity.INFO: "good"
        }.get(alert.severity, "warning")

        if alert.resolved:
            color = "good"
            title = f"RESOLVED: {alert.name}"
        else:
            title = f"{alert.severity.value.upper()}: {alert.name}"

        payload = {
            "attachments": [{
                "color": color,
                "title": title,
                "text": alert.message,
                "fields": [
                    {"title": "Instance", "value": alert.instance, "short": True},
                    {"title": "Value", "value": f"{alert.value:.2f}", "short": True},
                    {"title": "Threshold", "value": f"{alert.threshold:.2f}", "short": True},
                    {"title": "Time", "value": alert.timestamp.isoformat(), "short": True},
                ],
                "footer": "Redis Alerter"
            }]
        }

        requests.post(webhook_url, json=payload)

    return handler


def pagerduty_notification_handler(routing_key: str):
    """Create a PagerDuty notification handler."""
    def handler(alert: Alert):
        if alert.severity != Severity.CRITICAL:
            return

        event_action = "resolve" if alert.resolved else "trigger"

        payload = {
            "routing_key": routing_key,
            "event_action": event_action,
            "dedup_key": f"{alert.name}:{alert.instance}",
            "payload": {
                "summary": f"{alert.name} on {alert.instance}",
                "severity": "critical",
                "source": alert.instance,
                "custom_details": {
                    "message": alert.message,
                    "value": alert.value,
                    "threshold": alert.threshold,
                }
            }
        }

        requests.post(
            "https://events.pagerduty.com/v2/enqueue",
            json=payload
        )

    return handler


def console_notification_handler(alert: Alert):
    """Print alerts to console."""
    status = "RESOLVED" if alert.resolved else alert.severity.value.upper()
    print(f"[{alert.timestamp.isoformat()}] {status}: {alert.name}")
    print(f"  Instance: {alert.instance}")
    print(f"  Message: {alert.message}")
    print(f"  Value: {alert.value}, Threshold: {alert.threshold}")
    print()


# Usage
if __name__ == '__main__':
    alerter = RedisAlerter(
        redis_host='localhost',
        redis_port=6379,
        instance_name='redis-prod-1'
    )

    # Set up default rules
    alerter.setup_default_rules()

    # Add notification handlers
    alerter.add_notification_handler(console_notification_handler)

    # Optionally add Slack
    # alerter.add_notification_handler(
    #     slack_notification_handler('https://hooks.slack.com/services/xxx')
    # )

    # Optionally add PagerDuty
    # alerter.add_notification_handler(
    #     pagerduty_notification_handler('your-routing-key')
    # )

    # Run
    alerter.run(interval_seconds=30)
```

## Incident Response Runbooks

### Redis Down

```markdown
## Redis Down Runbook

### Symptoms
- redis_up == 0
- Connection refused errors

### Immediate Actions
1. Check if process is running: `systemctl status redis` or `docker ps`
2. Check logs: `tail -f /var/log/redis/redis.log`
3. Check disk space: `df -h`
4. Check memory: `free -m`

### Common Causes
- OOM killer terminated process
- Disk full preventing persistence
- Configuration error after restart
- Network partition

### Resolution Steps
1. If OOM: Reduce maxmemory, add RAM, or scale horizontally
2. If disk full: Clear space, disable persistence temporarily
3. If config error: Check redis.conf, validate with redis-server --test-memory
4. If network: Check firewall rules, verify connectivity

### Verification
- `redis-cli ping` returns PONG
- Application can connect
- Replication resumes (if applicable)
```

### Memory Critical

```markdown
## Redis Memory Critical Runbook

### Symptoms
- Memory usage > 90% of maxmemory
- Possible key eviction
- Performance degradation

### Immediate Actions
1. Check memory: `redis-cli INFO memory`
2. Check eviction: `redis-cli INFO stats | grep evicted`
3. Find big keys: `redis-cli --bigkeys`

### Mitigation Options
1. **Quick**: Increase maxmemory if RAM available
   ```
   CONFIG SET maxmemory 4gb
   ```

2. **Expire old data**: Add TTLs to keys without expiration
   ```python
   for key in r.scan_iter():
       if r.ttl(key) == -1:
           r.expire(key, 86400)
   ```

3. **Delete unused keys**: Remove orphaned or stale data

4. **Scale out**: Add more Redis instances

### Long-term Fixes
- Review data retention policies
- Implement proper TTLs
- Consider Redis Cluster for horizontal scaling
- Review data structures for efficiency
```

## Best Practices

### 1. Alert Hygiene

```yaml
# Good: Actionable alerts with context
- alert: RedisMemoryHigh
  annotations:
    summary: "Redis memory at {{ $value }}%"
    runbook_url: "https://wiki.example.com/redis-memory"
    dashboard_url: "https://grafana.example.com/d/redis"

# Bad: Vague alerts
- alert: RedisProblem
  annotations:
    summary: "Something is wrong with Redis"
```

### 2. Appropriate Thresholds

```yaml
# Adjust based on your environment
memory_warning: 75%    # Time to investigate
memory_critical: 90%   # Immediate action needed

# Not too sensitive
connections_warning: 80% of maxclients
# Not too late
connections_critical: 95% of maxclients
```

### 3. Alert Routing

```yaml
# Critical: Wake someone up
severity: critical -> PagerDuty

# Warning: Investigate during business hours
severity: warning -> Slack #redis-alerts

# Info: Log and dashboard
severity: info -> Logging only
```

### 4. Alert Suppression

```yaml
# Suppress child alerts when parent is firing
inhibit_rules:
  - source_match:
      alertname: RedisDown
    target_match_re:
      alertname: Redis.*
    equal: ['instance']
```

## Conclusion

Effective Redis alerting requires:

1. **Right metrics**: Focus on actionable indicators
2. **Appropriate thresholds**: Balance between too noisy and too late
3. **Clear routing**: Critical to on-call, warnings to team channels
4. **Runbooks**: Enable quick response with documented procedures
5. **Regular review**: Tune alerts based on actual incidents

With proper alerting in place, you can maintain high Redis availability while avoiding alert fatigue.
