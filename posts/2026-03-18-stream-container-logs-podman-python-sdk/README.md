# How to Stream Container Logs with Podman Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Log, Monitoring

Description: A comprehensive guide to reading, streaming, filtering, and processing container logs using the Podman Python SDK, including real-time log tailing and log aggregation patterns.

---

> Container logs are your window into application behavior. The Podman Python SDK provides powerful log streaming capabilities that let you read, tail, and process container output in real time from Python.

Monitoring container logs is essential for debugging, auditing, and operational visibility. The Podman Python SDK lets you access container logs programmatically, enabling custom log pipelines, real-time monitoring dashboards, and automated alerting. This guide covers every aspect of working with container logs.

---

## Reading Container Logs

Fetch all logs from a container:

```python
from podman import PodmanClient

with PodmanClient() as client:
    container = client.containers.get("my-web-server")

    # Get all logs as bytes
    logs = container.logs()
    print(logs.decode("utf-8"))
```

### Reading stdout and stderr Separately

Separate standard output from standard error:

```python
from podman import PodmanClient

with PodmanClient() as client:
    container = client.containers.get("my-app")

    # Get only stdout
    stdout_logs = container.logs(stdout=True, stderr=False)
    print("STDOUT:")
    print(stdout_logs.decode("utf-8"))

    # Get only stderr
    stderr_logs = container.logs(stdout=False, stderr=True)
    print("STDERR:")
    print(stderr_logs.decode("utf-8"))
```

## Streaming Logs in Real Time

Stream logs as they arrive, similar to `podman logs -f`:

```python
from podman import PodmanClient

with PodmanClient() as client:
    container = client.containers.get("my-web-server")

    # Stream logs (follow mode)
    print(f"Streaming logs from {container.name}...")
    try:
        for log_line in container.logs(stream=True, follow=True):
            line = log_line.decode("utf-8").strip()
            if line:
                print(f"[{container.name}] {line}")
    except KeyboardInterrupt:
        print("\nStopped streaming.")
```

### Streaming with Timestamps

Include timestamps in the log output:

```python
from podman import PodmanClient

with PodmanClient() as client:
    container = client.containers.get("my-app")

    for log_line in container.logs(stream=True, follow=True, timestamps=True):
        line = log_line.decode("utf-8").strip()
        if line:
            print(line)
```

## Filtering Logs by Time

Retrieve logs from a specific time range:

```python
from podman import PodmanClient
from datetime import datetime, timedelta

with PodmanClient() as client:
    container = client.containers.get("my-app")

    # Logs since a specific time
    since_time = datetime.now() - timedelta(hours=1)
    recent_logs = container.logs(
        since=int(since_time.timestamp())
    )
    print("Logs from the last hour:")
    print(recent_logs.decode("utf-8"))
```

### Getting the Last N Lines

Retrieve only the most recent log lines:

```python
from podman import PodmanClient

with PodmanClient() as client:
    container = client.containers.get("my-app")

    # Get the last 50 lines
    tail_logs = container.logs(tail=50)
    print("Last 50 lines:")
    print(tail_logs.decode("utf-8"))
```

## Multi-Container Log Aggregation

Stream logs from multiple containers simultaneously using threads:

```python
from podman import PodmanClient
import threading
import queue

def stream_container_logs(container_name, log_queue):
    """Stream logs from a container into a shared queue."""
    try:
        with PodmanClient() as client:
            container = client.containers.get(container_name)
            for log_line in container.logs(stream=True, follow=True):
                line = log_line.decode("utf-8").strip()
                if line:
                    log_queue.put((container_name, line))
    except Exception as e:
        log_queue.put((container_name, f"ERROR: {e}"))

def aggregate_logs(container_names):
    """Aggregate logs from multiple containers."""
    log_queue = queue.Queue()

    threads = []
    for name in container_names:
        t = threading.Thread(
            target=stream_container_logs,
            args=(name, log_queue),
            daemon=True
        )
        t.start()
        threads.append(t)

    print("Aggregating logs from:", ", ".join(container_names))
    try:
        while True:
            try:
                container_name, message = log_queue.get(timeout=1)
            except queue.Empty:
                continue

            print(f"[{container_name}] {message}")
    except KeyboardInterrupt:
        print("\nStopped aggregation.")

# Usage

aggregate_logs(["web-server", "api-server", "db-server"])
```

## Log Processing and Filtering

Process log lines to extract useful information:

```python
from podman import PodmanClient
import re
import json

def process_nginx_logs(container_name):
    """Parse and analyze Nginx access logs."""
    log_pattern = re.compile(
        r'(\S+) \S+ \S+ \[(.+?)\] "(\S+) (\S+) \S+" (\d+) (\d+)'
    )

    status_counts = {}
    total_bytes = 0
    request_count = 0

    with PodmanClient() as client:
        container = client.containers.get(container_name)
        logs = container.logs(tail=1000)

        for line in logs.decode("utf-8").splitlines():
            match = log_pattern.match(line)
            if match:
                ip, timestamp, method, path, status, size = match.groups()
                request_count += 1
                total_bytes += int(size)

                status_counts[status] = status_counts.get(status, 0) + 1

    print(f"Log Analysis for {container_name}:")
    print(f"  Total requests: {request_count}")
    print(f"  Total bytes served: {total_bytes / 1024:.1f} KB")
    print(f"  Status codes:")
    for status, count in sorted(status_counts.items()):
        print(f"    {status}: {count}")

process_nginx_logs("my-web-server")
```

### Filtering Logs for Errors

Extract only error messages from logs:

```python
from podman import PodmanClient
import re

def find_errors(container_name, patterns=None):
    """Search container logs for error patterns."""
    if patterns is None:
        patterns = [
            r"(?i)error",
            r"(?i)exception",
            r"(?i)fatal",
            r"(?i)failed",
            r"(?i)traceback"
        ]

    compiled_patterns = [re.compile(p) for p in patterns]

    with PodmanClient() as client:
        container = client.containers.get(container_name)
        logs = container.logs()
        lines = logs.decode("utf-8").splitlines()

        errors = []
        for i, line in enumerate(lines):
            for pattern in compiled_patterns:
                if pattern.search(line):
                    errors.append({
                        "line_number": i + 1,
                        "content": line.strip(),
                        "pattern": pattern.pattern
                    })
                    break

        print(f"Found {len(errors)} errors in {container_name}:")
        for error in errors:
            print(f"  Line {error['line_number']}: {error['content']}")

        return errors

find_errors("my-app")
```

## Writing Logs to Files

Save container logs to files for archival:

```python
from podman import PodmanClient
from datetime import datetime
import os

def save_logs(container_name, log_dir="/tmp/container-logs"):
    """Save container logs to a file."""
    os.makedirs(log_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{container_name}_{timestamp}.log"
    filepath = os.path.join(log_dir, filename)

    with PodmanClient() as client:
        container = client.containers.get(container_name)
        logs = container.logs(timestamps=True)

        with open(filepath, "wb") as f:
            f.write(logs)

        size = os.path.getsize(filepath)
        print(f"Saved logs to {filepath} ({size / 1024:.1f} KB)")
        return filepath

save_logs("my-web-server")
```

### Rotating Log Files

Implement log rotation for continuous collection:

```python
from podman import PodmanClient
from datetime import datetime
import os
import glob

def rotate_logs(container_name, log_dir="/tmp/container-logs", max_files=10):
    """Save logs with rotation, keeping only the most recent files."""
    os.makedirs(log_dir, exist_ok=True)

    # Save current logs
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{container_name}_{timestamp}.log"
    filepath = os.path.join(log_dir, filename)

    with PodmanClient() as client:
        container = client.containers.get(container_name)
        logs = container.logs(timestamps=True)

        with open(filepath, "wb") as f:
            f.write(logs)

    # Rotate: remove oldest files if we exceed max_files
    pattern = os.path.join(log_dir, f"{container_name}_*.log")
    existing = sorted(glob.glob(pattern))

    while len(existing) > max_files:
        oldest = existing.pop(0)
        os.remove(oldest)
        print(f"Rotated out: {os.path.basename(oldest)}")

    print(f"Saved: {filename} ({len(existing)} files kept)")

rotate_logs("my-web-server", max_files=5)
```

## Real-Time Log Monitoring with Alerts

Build a log monitor that triggers alerts on specific patterns:

```python
from podman import PodmanClient
import re
from datetime import datetime

class LogMonitor:
    """Monitor container logs and trigger alerts."""

    def __init__(self, container_name):
        self.container_name = container_name
        self.alert_rules = []
        self.alert_count = 0

    def add_rule(self, name, pattern, callback=None):
        """Add an alert rule."""
        self.alert_rules.append({
            "name": name,
            "pattern": re.compile(pattern),
            "callback": callback or self._default_alert
        })

    def _default_alert(self, rule_name, line):
        """Default alert handler."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[ALERT {timestamp}] {rule_name}: {line}")

    def start(self):
        """Start monitoring logs."""
        with PodmanClient() as client:
            container = client.containers.get(self.container_name)
            print(f"Monitoring {self.container_name} ({len(self.alert_rules)} rules)")

            try:
                for log_line in container.logs(stream=True, follow=True, tail=0):
                    line = log_line.decode("utf-8").strip()
                    if not line:
                        continue

                    for rule in self.alert_rules:
                        if rule["pattern"].search(line):
                            self.alert_count += 1
                            rule["callback"](rule["name"], line)
            except KeyboardInterrupt:
                print(f"\nStopped. Total alerts: {self.alert_count}")

# Usage
monitor = LogMonitor("my-web-server")
monitor.add_rule("HTTP Error", r" [45]\d{2} ")
monitor.add_rule("Slow Response", r"upstream timed out")
monitor.add_rule("Connection Reset", r"connection reset by peer")
monitor.start()
```

## Conclusion

The Podman Python SDK provides comprehensive log access capabilities, from simple log retrieval to real-time streaming and multi-container aggregation. By building on these primitives, you can create custom monitoring solutions, automated alerting systems, and log processing pipelines tailored to your application needs. Effective log management is critical for maintaining healthy containerized applications.
