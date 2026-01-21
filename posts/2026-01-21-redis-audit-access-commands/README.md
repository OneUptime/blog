# How to Audit Redis Access and Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Audit, Logging, Compliance, Security, Monitoring, Access Control

Description: A comprehensive guide to auditing Redis access and commands, covering logging strategies, monitoring command execution, tracking user activity, and implementing compliance-ready audit trails for production environments.

---

Auditing is essential for security, compliance, and troubleshooting. Knowing who accessed what data and when can help you detect security incidents, meet regulatory requirements, and debug issues. This guide covers comprehensive strategies for auditing Redis access and commands.

## Why Audit Redis?

### Security Benefits
- Detect unauthorized access attempts
- Identify suspicious patterns
- Investigate security incidents
- Track privileged operations

### Compliance Requirements
- PCI-DSS: Log access to cardholder data
- HIPAA: Audit access to protected health information
- SOC 2: Demonstrate access controls
- GDPR: Track data access for privacy compliance

## Built-in Auditing Features

### Redis Slowlog

Capture slow commands that might indicate issues:

```bash
# Configure slowlog
CONFIG SET slowlog-log-slower-than 10000  # Log commands > 10ms
CONFIG SET slowlog-max-len 1000           # Keep last 1000 entries

# View slowlog
SLOWLOG GET 10

# Output format:
# 1) Log entry ID
# 2) Timestamp
# 3) Execution time in microseconds
# 4) Command array
# 5) Client IP:port
# 6) Client name
```

### ACL LOG

Track authentication failures and permission violations:

```bash
# View ACL log
ACL LOG 10

# Example output:
1) 1) "count"
   2) (integer) 1
   3) "reason"
   4) "auth"
   5) "context"
   6) "toplevel"
   7) "object"
   8) ""
   9) "username"
   10) "alice"
   11) "age-seconds"
   12) "0.102"
   13) "client-info"
   14) "..."

# Reset ACL log
ACL LOG RESET
```

### MONITOR Command

Real-time command logging (use carefully - impacts performance):

```bash
# Start monitoring
redis-cli MONITOR

# Output shows all commands:
# 1609459200.000001 [0 127.0.0.1:52345] "SET" "key" "value"
# 1609459200.000002 [0 127.0.0.1:52345] "GET" "key"
```

## Comprehensive Audit System

### Python Audit Logger

```python
import redis
import json
import time
import hashlib
import threading
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('redis_audit')

class AuditEventType(Enum):
    COMMAND = "command"
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    CONNECTION = "connection"
    DISCONNECT = "disconnect"
    ERROR = "error"
    ACCESS_DENIED = "access_denied"

@dataclass
class AuditEvent:
    timestamp: str
    event_type: str
    username: Optional[str]
    client_ip: Optional[str]
    client_port: Optional[int]
    command: Optional[str]
    key: Optional[str]
    database: int
    success: bool
    error_message: Optional[str]
    execution_time_ms: Optional[float]
    additional_data: Optional[Dict[str, Any]]

    def to_dict(self):
        return {k: v for k, v in asdict(self).items() if v is not None}

    def to_json(self):
        return json.dumps(self.to_dict())

class RedisAuditLogger:
    """Comprehensive Redis audit logging system."""

    def __init__(self, redis_client, audit_storage=None):
        self.redis = redis_client
        self.audit_storage = audit_storage or self.redis
        self.audit_key_prefix = "audit:log:"
        self.sensitive_commands = ['AUTH', 'CONFIG', 'ACL', 'DEBUG', 'SHUTDOWN']
        self.sensitive_keys = ['password', 'secret', 'token', 'key', 'credential']

    def log_event(self, event: AuditEvent):
        """Store audit event."""
        # Store in Redis stream
        stream_key = f"{self.audit_key_prefix}stream"
        self.audit_storage.xadd(
            stream_key,
            event.to_dict(),
            maxlen=100000  # Keep last 100k events
        )

        # Also log to file/console
        if self._is_sensitive(event):
            logger.warning(f"SENSITIVE: {event.to_json()}")
        else:
            logger.info(f"AUDIT: {event.to_json()}")

        # Store summary for quick queries
        self._update_summaries(event)

    def _is_sensitive(self, event: AuditEvent) -> bool:
        """Check if event involves sensitive operations."""
        if event.command and event.command.upper() in self.sensitive_commands:
            return True
        if event.key:
            key_lower = event.key.lower()
            return any(s in key_lower for s in self.sensitive_keys)
        return False

    def _update_summaries(self, event: AuditEvent):
        """Update aggregated summaries for reporting."""
        today = datetime.utcnow().strftime('%Y-%m-%d')
        hour = datetime.utcnow().strftime('%Y-%m-%d:%H')

        pipe = self.audit_storage.pipeline()

        # Count by user
        if event.username:
            pipe.hincrby(f"{self.audit_key_prefix}users:{today}", event.username, 1)

        # Count by command
        if event.command:
            pipe.hincrby(f"{self.audit_key_prefix}commands:{today}", event.command, 1)

        # Count by IP
        if event.client_ip:
            pipe.hincrby(f"{self.audit_key_prefix}ips:{today}", event.client_ip, 1)

        # Count errors
        if not event.success:
            pipe.hincrby(f"{self.audit_key_prefix}errors:{today}", event.event_type, 1)

        # Hourly counts
        pipe.incr(f"{self.audit_key_prefix}hourly:{hour}")

        # Set expiry on summary keys (30 days)
        for key in [
            f"{self.audit_key_prefix}users:{today}",
            f"{self.audit_key_prefix}commands:{today}",
            f"{self.audit_key_prefix}ips:{today}",
            f"{self.audit_key_prefix}errors:{today}",
            f"{self.audit_key_prefix}hourly:{hour}",
        ]:
            pipe.expire(key, 30 * 24 * 3600)

        pipe.execute()

    def get_recent_events(self, count: int = 100,
                          username: str = None,
                          event_type: str = None) -> List[Dict]:
        """Retrieve recent audit events."""
        stream_key = f"{self.audit_key_prefix}stream"
        events = self.audit_storage.xrevrange(stream_key, count=count)

        results = []
        for event_id, event_data in events:
            if username and event_data.get(b'username', b'').decode() != username:
                continue
            if event_type and event_data.get(b'event_type', b'').decode() != event_type:
                continue

            decoded = {k.decode(): v.decode() for k, v in event_data.items()}
            decoded['event_id'] = event_id.decode()
            results.append(decoded)

        return results

    def get_user_activity(self, username: str, days: int = 7) -> Dict:
        """Get activity summary for a specific user."""
        activity = {
            'username': username,
            'daily_counts': {},
            'commands': [],
            'recent_events': []
        }

        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
            count = self.audit_storage.hget(
                f"{self.audit_key_prefix}users:{date}",
                username
            )
            if count:
                activity['daily_counts'][date] = int(count)

        activity['recent_events'] = self.get_recent_events(
            count=50,
            username=username
        )

        return activity

    def get_security_report(self) -> Dict:
        """Generate security-focused audit report."""
        today = datetime.utcnow().strftime('%Y-%m-%d')

        report = {
            'date': today,
            'auth_failures': [],
            'access_denied': [],
            'sensitive_access': [],
            'top_users': {},
            'top_ips': {},
            'error_summary': {},
        }

        # Get auth failures
        report['auth_failures'] = self.get_recent_events(
            count=100,
            event_type='auth_failure'
        )

        # Get access denied events
        report['access_denied'] = self.get_recent_events(
            count=100,
            event_type='access_denied'
        )

        # Get top users
        users = self.audit_storage.hgetall(f"{self.audit_key_prefix}users:{today}")
        report['top_users'] = {
            k.decode(): int(v) for k, v in
            sorted(users.items(), key=lambda x: int(x[1]), reverse=True)[:10]
        }

        # Get top IPs
        ips = self.audit_storage.hgetall(f"{self.audit_key_prefix}ips:{today}")
        report['top_ips'] = {
            k.decode(): int(v) for k, v in
            sorted(ips.items(), key=lambda x: int(x[1]), reverse=True)[:10]
        }

        # Get error summary
        errors = self.audit_storage.hgetall(f"{self.audit_key_prefix}errors:{today}")
        report['error_summary'] = {k.decode(): int(v) for k, v in errors.items()}

        return report


class AuditedRedisClient:
    """Redis client with automatic audit logging."""

    def __init__(self, host='localhost', port=6379, password=None,
                 username=None, client_name=None):
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=password,
            username=username,
            decode_responses=True
        )
        self.audit_logger = RedisAuditLogger(self.redis)
        self.username = username or 'default'
        self.client_name = client_name
        self.client_ip = 'local'  # In production, get from connection

        if client_name:
            self.redis.client_setname(client_name)

    def _create_event(self, command: str, key: str = None,
                      success: bool = True, error: str = None,
                      exec_time: float = None) -> AuditEvent:
        """Create audit event for a command."""
        return AuditEvent(
            timestamp=datetime.utcnow().isoformat(),
            event_type=AuditEventType.COMMAND.value,
            username=self.username,
            client_ip=self.client_ip,
            client_port=None,
            command=command,
            key=key,
            database=0,
            success=success,
            error_message=error,
            execution_time_ms=exec_time,
            additional_data={'client_name': self.client_name}
        )

    def _execute_with_audit(self, command: str, key: str = None, *args, **kwargs):
        """Execute command with audit logging."""
        start_time = time.time()

        try:
            # Get the actual Redis command method
            method = getattr(self.redis, command.lower())
            if key:
                result = method(key, *args, **kwargs)
            else:
                result = method(*args, **kwargs)

            exec_time = (time.time() - start_time) * 1000

            # Log successful execution
            event = self._create_event(
                command=command,
                key=key,
                success=True,
                exec_time=exec_time
            )
            self.audit_logger.log_event(event)

            return result

        except redis.ResponseError as e:
            exec_time = (time.time() - start_time) * 1000

            # Log failed execution
            event = self._create_event(
                command=command,
                key=key,
                success=False,
                error=str(e),
                exec_time=exec_time
            )
            self.audit_logger.log_event(event)

            raise

    def get(self, key: str):
        return self._execute_with_audit('GET', key)

    def set(self, key: str, value, **kwargs):
        return self._execute_with_audit('SET', key, value, **kwargs)

    def delete(self, *keys):
        for key in keys:
            self._execute_with_audit('DEL', key)
        return self.redis.delete(*keys)

    def hget(self, name: str, key: str):
        return self._execute_with_audit('HGET', name, key)

    def hset(self, name: str, key: str = None, value=None, mapping=None):
        return self._execute_with_audit('HSET', name, key, value, mapping=mapping)

    # Add more methods as needed...

    def get_audit_report(self):
        """Get security audit report."""
        return self.audit_logger.get_security_report()


# Usage Example
from datetime import timedelta

# Create audited client
client = AuditedRedisClient(
    host='localhost',
    password='your-password',
    username='app_user',
    client_name='order-service-1'
)

# Normal operations are automatically audited
client.set('order:123', 'pending')
client.get('order:123')

# Get audit report
report = client.get_audit_report()
print(json.dumps(report, indent=2))
```

### MONITOR-based Audit Collector

```python
import redis
import threading
import re
from datetime import datetime
from queue import Queue
import json

class RedisMonitorCollector:
    """Collect and process Redis MONITOR output for auditing."""

    def __init__(self, host='localhost', port=6379, password=None):
        self.redis = redis.Redis(host=host, port=port, password=password)
        self.running = False
        self.event_queue = Queue()
        self.handlers = []

        # Parse MONITOR output format
        # 1609459200.000001 [0 127.0.0.1:52345] "SET" "key" "value"
        self.monitor_pattern = re.compile(
            r'(\d+\.\d+)\s+\[(\d+)\s+(\d+\.\d+\.\d+\.\d+):(\d+)\]\s+"(\w+)"(.*)$'
        )

    def add_handler(self, handler):
        """Add event handler function."""
        self.handlers.append(handler)

    def start(self):
        """Start collecting MONITOR output."""
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop)
        self.process_thread = threading.Thread(target=self._process_loop)

        self.monitor_thread.start()
        self.process_thread.start()

    def stop(self):
        """Stop collecting."""
        self.running = False
        self.monitor_thread.join(timeout=5)
        self.process_thread.join(timeout=5)

    def _monitor_loop(self):
        """Read MONITOR output."""
        pubsub = self.redis.pubsub()

        with self.redis.monitor() as m:
            for event in m.listen():
                if not self.running:
                    break

                if isinstance(event, dict):
                    self.event_queue.put(event)

    def _process_loop(self):
        """Process collected events."""
        while self.running:
            try:
                event = self.event_queue.get(timeout=1)
                parsed = self._parse_event(event)
                if parsed:
                    for handler in self.handlers:
                        try:
                            handler(parsed)
                        except Exception as e:
                            print(f"Handler error: {e}")
            except:
                pass

    def _parse_event(self, event: dict) -> dict:
        """Parse MONITOR event into structured format."""
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'time': event.get('time'),
            'database': event.get('db'),
            'client': event.get('client_address'),
            'command': event.get('command'),
            'args': event.get('args', [])
        }


# Handler examples
def log_handler(event):
    """Simple logging handler."""
    print(f"[{event['timestamp']}] {event['client']}: {event['command']} {event['args']}")

def security_handler(event):
    """Flag potentially dangerous commands."""
    dangerous = ['FLUSHALL', 'FLUSHDB', 'CONFIG', 'DEBUG', 'KEYS', 'SHUTDOWN']
    if event['command'].upper() in dangerous:
        print(f"SECURITY ALERT: {event['command']} from {event['client']}")

def metrics_handler(event):
    """Collect command metrics."""
    # In production, send to Prometheus/StatsD
    pass


# Usage (Note: MONITOR impacts performance significantly)
# collector = RedisMonitorCollector(password='your-password')
# collector.add_handler(log_handler)
# collector.add_handler(security_handler)
# collector.start()
# time.sleep(60)  # Collect for 60 seconds
# collector.stop()
```

### Slowlog Analysis

```python
class SlowlogAnalyzer:
    """Analyze Redis slowlog for audit and performance."""

    def __init__(self, redis_client):
        self.redis = redis_client

    def get_slowlog(self, count: int = 100) -> list:
        """Get formatted slowlog entries."""
        raw_entries = self.redis.slowlog_get(count)
        entries = []

        for entry in raw_entries:
            entries.append({
                'id': entry['id'],
                'timestamp': datetime.fromtimestamp(entry['start_time']).isoformat(),
                'duration_ms': entry['duration'] / 1000,
                'command': ' '.join(str(arg) for arg in entry['command'][:5]),
                'client': entry.get('client_address', 'unknown'),
                'client_name': entry.get('client_name', ''),
            })

        return entries

    def get_slowlog_summary(self) -> dict:
        """Get summary statistics from slowlog."""
        entries = self.get_slowlog(1000)

        if not entries:
            return {'count': 0}

        durations = [e['duration_ms'] for e in entries]
        commands = {}
        clients = {}

        for entry in entries:
            cmd = entry['command'].split()[0]
            commands[cmd] = commands.get(cmd, 0) + 1

            client = entry['client']
            clients[client] = clients.get(client, 0) + 1

        return {
            'count': len(entries),
            'min_duration_ms': min(durations),
            'max_duration_ms': max(durations),
            'avg_duration_ms': sum(durations) / len(durations),
            'top_commands': dict(sorted(commands.items(), key=lambda x: x[1], reverse=True)[:10]),
            'top_clients': dict(sorted(clients.items(), key=lambda x: x[1], reverse=True)[:10]),
        }

    def find_suspicious_patterns(self) -> list:
        """Identify suspicious patterns in slowlog."""
        entries = self.get_slowlog(1000)
        suspicious = []

        for entry in entries:
            # Very slow queries
            if entry['duration_ms'] > 1000:  # > 1 second
                suspicious.append({
                    'type': 'very_slow_query',
                    'entry': entry,
                    'reason': f"Query took {entry['duration_ms']:.0f}ms"
                })

            # Dangerous commands
            cmd = entry['command'].split()[0].upper()
            if cmd in ['KEYS', 'SMEMBERS', 'HGETALL'] and entry['duration_ms'] > 100:
                suspicious.append({
                    'type': 'expensive_command',
                    'entry': entry,
                    'reason': f"{cmd} command took {entry['duration_ms']:.0f}ms"
                })

        return suspicious


# Usage
analyzer = SlowlogAnalyzer(redis.Redis(password='your-password'))

# Get summary
summary = analyzer.get_slowlog_summary()
print(f"Slowlog entries: {summary['count']}")
print(f"Avg duration: {summary['avg_duration_ms']:.2f}ms")
print(f"Max duration: {summary['max_duration_ms']:.2f}ms")

# Find suspicious patterns
suspicious = analyzer.find_suspicious_patterns()
for item in suspicious:
    print(f"SUSPICIOUS: {item['type']} - {item['reason']}")
```

## Compliance-Ready Audit Reports

```python
class ComplianceAuditReporter:
    """Generate compliance-ready audit reports."""

    def __init__(self, audit_logger: RedisAuditLogger):
        self.audit_logger = audit_logger

    def generate_pci_report(self, start_date: str, end_date: str) -> dict:
        """Generate PCI-DSS compliant audit report."""
        return {
            'report_type': 'PCI-DSS Compliance Audit',
            'period': {'start': start_date, 'end': end_date},
            'sections': {
                'access_control': self._pci_access_control(),
                'authentication': self._pci_authentication(),
                'audit_trail': self._pci_audit_trail(),
                'network_security': self._pci_network_security(),
            }
        }

    def _pci_access_control(self) -> dict:
        """PCI Requirement 7: Restrict access."""
        return {
            'requirement': '7.1 - Limit access to system components',
            'findings': {
                'users_with_access': len(self.audit_logger.audit_storage.acl_users()),
                'privileged_users': self._count_privileged_users(),
                'access_reviews': 'Automated daily review enabled',
            }
        }

    def _pci_authentication(self) -> dict:
        """PCI Requirement 8: Authentication."""
        report = self.audit_logger.get_security_report()
        return {
            'requirement': '8.1 - Identify and authenticate access',
            'findings': {
                'auth_failures_today': len(report['auth_failures']),
                'unique_users_today': len(report['top_users']),
                'mfa_status': 'N/A for Redis - network level controls in place',
            }
        }

    def _pci_audit_trail(self) -> dict:
        """PCI Requirement 10: Track and monitor access."""
        return {
            'requirement': '10.1 - Implement audit trails',
            'findings': {
                'logging_enabled': True,
                'log_retention_days': 90,
                'tamper_protection': 'Stream-based immutable logs',
                'review_frequency': 'Daily automated + weekly manual',
            }
        }

    def _pci_network_security(self) -> dict:
        """PCI Requirement 1: Firewall configuration."""
        return {
            'requirement': '1.1 - Firewall and router configuration',
            'findings': {
                'tls_enabled': self._check_tls(),
                'bind_address': self._get_bind_address(),
                'protected_mode': self._check_protected_mode(),
            }
        }

    def _count_privileged_users(self) -> int:
        users = self.audit_logger.audit_storage.acl_list()
        privileged = 0
        for user in users:
            if '+@all' in user or '+@admin' in user:
                privileged += 1
        return privileged

    def _check_tls(self) -> bool:
        try:
            port = self.audit_logger.audit_storage.config_get('tls-port')
            return port.get('tls-port', '0') != '0'
        except:
            return False

    def _get_bind_address(self) -> str:
        try:
            return self.audit_logger.audit_storage.config_get('bind').get('bind', 'unknown')
        except:
            return 'unknown'

    def _check_protected_mode(self) -> bool:
        try:
            mode = self.audit_logger.audit_storage.config_get('protected-mode')
            return mode.get('protected-mode', 'yes') == 'yes'
        except:
            return False

    def export_csv(self, events: list, filename: str):
        """Export audit events to CSV."""
        import csv

        if not events:
            return

        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=events[0].keys())
            writer.writeheader()
            writer.writerows(events)

    def export_json(self, report: dict, filename: str):
        """Export report to JSON."""
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
```

## Setting Up Centralized Logging

### Sending Audit Logs to Elasticsearch

```python
from elasticsearch import Elasticsearch
from datetime import datetime

class ElasticsearchAuditHandler:
    """Send Redis audit events to Elasticsearch."""

    def __init__(self, es_hosts=['localhost:9200'], index_prefix='redis-audit'):
        self.es = Elasticsearch(es_hosts)
        self.index_prefix = index_prefix

    def handle(self, event: dict):
        """Handle audit event by sending to Elasticsearch."""
        index_name = f"{self.index_prefix}-{datetime.utcnow().strftime('%Y.%m.%d')}"

        doc = {
            '@timestamp': event.get('timestamp', datetime.utcnow().isoformat()),
            'event_type': event.get('event_type'),
            'username': event.get('username'),
            'client_ip': event.get('client_ip'),
            'command': event.get('command'),
            'key': event.get('key'),
            'success': event.get('success'),
            'error_message': event.get('error_message'),
            'execution_time_ms': event.get('execution_time_ms'),
        }

        self.es.index(index=index_name, body=doc)
```

### Sending to Loki/Grafana

```python
import requests

class LokiAuditHandler:
    """Send Redis audit events to Loki."""

    def __init__(self, loki_url='http://localhost:3100/loki/api/v1/push'):
        self.loki_url = loki_url

    def handle(self, event: dict):
        """Handle audit event by sending to Loki."""
        timestamp = int(datetime.utcnow().timestamp() * 1e9)

        payload = {
            'streams': [{
                'stream': {
                    'job': 'redis-audit',
                    'level': 'info' if event.get('success') else 'error',
                    'username': event.get('username', 'unknown'),
                },
                'values': [
                    [str(timestamp), json.dumps(event)]
                ]
            }]
        }

        requests.post(self.loki_url, json=payload)
```

## Best Practices

### 1. Log Retention Policy

```python
# Set appropriate retention
# - Security events: 1 year minimum
# - Access logs: 90 days
# - Performance logs: 30 days

# Configure in Redis
CONFIG SET maxmemory-policy volatile-ttl
```

### 2. Protect Audit Logs

```bash
# Use separate Redis instance for audit logs
# or write to append-only storage

# ACL for audit log access
ACL SETUSER audit_reader on >audit-pass ~audit:* +@read -@write
ACL SETUSER audit_writer on >writer-pass ~audit:* +xadd +expire
```

### 3. Regular Reviews

```python
# Schedule daily audit review
def daily_audit_review():
    report = audit_logger.get_security_report()

    # Alert on anomalies
    if len(report['auth_failures']) > 10:
        send_alert("High number of auth failures")

    if any(count > 10000 for count in report['top_ips'].values()):
        send_alert("Unusual activity from single IP")
```

## Conclusion

Effective Redis auditing requires:

1. **Comprehensive logging**: Capture all relevant events
2. **Structured storage**: Use Redis streams for efficient audit storage
3. **Real-time analysis**: Monitor for suspicious patterns
4. **Compliance reports**: Generate audit reports for regulations
5. **Centralized collection**: Send logs to SIEM/log management
6. **Regular reviews**: Automated and manual audit reviews

With proper auditing in place, you can meet compliance requirements, detect security incidents, and maintain visibility into your Redis usage.
