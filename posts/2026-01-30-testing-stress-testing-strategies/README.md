# How to Implement Stress Testing Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, Performance, Stress Testing, Reliability

Description: Design stress tests to find system breaking points, identify failure modes, and validate recovery behavior under extreme load conditions.

---

Stress testing reveals how your system behaves when pushed beyond normal operating conditions. Unlike load testing, which validates expected traffic patterns, stress testing deliberately breaks things to find limits, expose failure modes, and verify recovery mechanisms. This guide covers practical strategies for implementing effective stress tests.

## Stress Testing vs Load Testing

Before diving into implementation, understand the distinction between these related but different testing approaches.

| Aspect | Load Testing | Stress Testing |
|--------|-------------|----------------|
| **Goal** | Validate expected performance | Find breaking points |
| **Traffic Pattern** | Normal to peak expected load | Beyond expected capacity |
| **Duration** | Sustained, realistic periods | Push until failure |
| **Success Criteria** | Meets SLAs under load | Graceful degradation, recovery |
| **When to Run** | Before releases, capacity planning | After load testing passes |
| **Focus** | Response times, throughput | Failure modes, recovery time |

Load testing asks: "Can we handle expected traffic?" Stress testing asks: "What happens when we can't?"

## Core Stress Testing Patterns

### Pattern 1: Gradual Ramp-Up to Breaking Point

Start low and increase load incrementally until the system fails. This approach identifies the exact threshold where degradation begins.

The following k6 script demonstrates a gradual ramp-up pattern that increases virtual users over time, then holds at peak before ramping down. Each stage increases load by 50 users over 2 minutes.

```javascript
// k6 stress test with gradual ramp-up
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics to track breaking point indicators
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    // Ramp up gradually to find the breaking point
    { duration: '2m', target: 50 },    // Warm up
    { duration: '2m', target: 100 },   // Normal load
    { duration: '2m', target: 200 },   // Above normal
    { duration: '2m', target: 400 },   // Stress begins
    { duration: '2m', target: 800 },   // Heavy stress
    { duration: '2m', target: 1000 },  // Near breaking point
    { duration: '2m', target: 1500 },  // Push past limits
    { duration: '5m', target: 1500 },  // Hold at peak stress
    { duration: '3m', target: 0 },     // Ramp down - observe recovery
  ],
  thresholds: {
    // These thresholds help identify degradation points
    'http_req_duration': ['p(95)<2000'],  // Will likely fail under stress
    'errors': ['rate<0.1'],                // Track when errors spike
  },
};

export default function () {
  const startTime = Date.now();

  // Test your critical endpoints
  const response = http.get('https://api.example.com/critical-endpoint');

  const duration = Date.now() - startTime;
  responseTime.add(duration);

  // Track errors including timeouts and 5xx responses
  const isError = response.status >= 500 || response.status === 0;
  errorRate.add(isError);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 1000,
  });

  // Realistic think time between requests
  sleep(Math.random() * 2 + 1);
}
```

### Pattern 2: Spike Testing

Spike testing hits your system with sudden traffic bursts. This simulates viral events, marketing campaigns, or unexpected traffic surges.

This script creates instant traffic spikes by jumping from baseline to peak load with no gradual ramp. The recovery periods between spikes let you observe how quickly the system returns to normal.

```javascript
// k6 spike test configuration
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },     // Baseline
    { duration: '10s', target: 1000 },  // Instant spike
    { duration: '3m', target: 1000 },   // Hold spike
    { duration: '10s', target: 50 },    // Drop back
    { duration: '2m', target: 50 },     // Recovery observation
    { duration: '10s', target: 2000 },  // Bigger spike
    { duration: '3m', target: 2000 },   // Hold
    { duration: '1m', target: 0 },      // Complete wind-down
  ],
};

export default function () {
  const endpoints = [
    '/api/users',
    '/api/products',
    '/api/checkout',
  ];

  // Hit multiple endpoints to stress different services
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`https://api.example.com${endpoint}`);

  check(response, {
    'not rate limited': (r) => r.status !== 429,
    'no server errors': (r) => r.status < 500,
  });

  sleep(0.5);
}
```

### Pattern 3: Soak Testing (Endurance)

Soak tests run for extended periods at moderate-to-high load. They reveal memory leaks, connection pool exhaustion, and resource degradation that only appear over time.

The following configuration runs for 4 hours at sustained high load. This duration helps surface issues like memory leaks, file descriptor exhaustion, and database connection pool problems.

```javascript
// k6 soak test for finding slow resource leaks
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const requestCount = new Counter('total_requests');

export const options = {
  stages: [
    { duration: '5m', target: 200 },   // Ramp up
    { duration: '4h', target: 200 },   // Sustained load for hours
    { duration: '5m', target: 0 },     // Ramp down
  ],
  // Lower thresholds for long-running tests
  thresholds: {
    'http_req_duration': ['p(99)<3000'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  requestCount.add(1);

  // Simulate realistic user session
  const session = http.batch([
    ['GET', 'https://api.example.com/api/session'],
    ['GET', 'https://api.example.com/api/user/profile'],
    ['GET', 'https://api.example.com/api/notifications'],
  ]);

  session.forEach((response, index) => {
    check(response, {
      [`request ${index} succeeded`]: (r) => r.status === 200,
    });
  });

  sleep(5); // Longer think time for soak tests
}
```

## Finding Breaking Points Systematically

The goal of stress testing is to identify exactly where and how your system fails. Use this methodical approach.

### Step 1: Establish Baseline Metrics

Before stress testing, capture normal operation metrics. This Python script collects baseline measurements from your monitoring system.

```python
# baseline_collector.py
# Collects baseline metrics before stress testing begins

import requests
import statistics
import time
from dataclasses import dataclass
from typing import List, Dict

@dataclass
class BaselineMetrics:
    """Stores baseline performance characteristics"""
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    error_rate_percent: float
    requests_per_second: float
    cpu_utilization_percent: float
    memory_utilization_percent: float

def collect_baseline(
    endpoint: str,
    duration_seconds: int = 300,
    requests_per_second: int = 10
) -> BaselineMetrics:
    """
    Collect baseline metrics by sending steady traffic
    and measuring system response.
    """
    response_times: List[float] = []
    errors: int = 0
    total_requests: int = 0

    interval = 1.0 / requests_per_second
    end_time = time.time() + duration_seconds

    print(f"Collecting baseline for {duration_seconds} seconds...")

    while time.time() < end_time:
        start = time.time()

        try:
            response = requests.get(endpoint, timeout=10)
            response_times.append(response.elapsed.total_seconds() * 1000)

            if response.status_code >= 500:
                errors += 1

        except requests.exceptions.RequestException:
            errors += 1
            response_times.append(10000)  # Timeout penalty

        total_requests += 1

        # Maintain steady request rate
        elapsed = time.time() - start
        if elapsed < interval:
            time.sleep(interval - elapsed)

    # Calculate percentiles
    sorted_times = sorted(response_times)
    p95_index = int(len(sorted_times) * 0.95)
    p99_index = int(len(sorted_times) * 0.99)

    return BaselineMetrics(
        avg_response_time_ms=statistics.mean(response_times),
        p95_response_time_ms=sorted_times[p95_index],
        p99_response_time_ms=sorted_times[p99_index],
        error_rate_percent=(errors / total_requests) * 100,
        requests_per_second=total_requests / duration_seconds,
        cpu_utilization_percent=0.0,  # Fetch from monitoring
        memory_utilization_percent=0.0,  # Fetch from monitoring
    )

def compare_to_baseline(
    current: Dict[str, float],
    baseline: BaselineMetrics
) -> Dict[str, str]:
    """
    Compare current metrics against baseline to identify degradation.
    Returns degradation status for each metric.
    """
    degradation = {}

    # Response time degradation thresholds
    if current['avg_response_time_ms'] > baseline.avg_response_time_ms * 2:
        degradation['response_time'] = 'CRITICAL'
    elif current['avg_response_time_ms'] > baseline.avg_response_time_ms * 1.5:
        degradation['response_time'] = 'WARNING'
    else:
        degradation['response_time'] = 'OK'

    # Error rate degradation
    if current['error_rate_percent'] > baseline.error_rate_percent + 5:
        degradation['error_rate'] = 'CRITICAL'
    elif current['error_rate_percent'] > baseline.error_rate_percent + 1:
        degradation['error_rate'] = 'WARNING'
    else:
        degradation['error_rate'] = 'OK'

    return degradation
```

### Step 2: Binary Search for Capacity Limits

Instead of guessing capacity, use binary search to find exact breaking points efficiently.

This script automates the process of finding your system's maximum capacity by running successive tests at different load levels. It narrows down the breaking point through binary search.

```python
# capacity_finder.py
# Finds exact breaking point using binary search approach

import subprocess
import json
import time
from typing import Tuple, Optional

def run_k6_test(target_vus: int, duration: str = "2m") -> dict:
    """
    Run a k6 test at specified virtual user count.
    Returns parsed results including error rate and response times.
    """
    # Generate k6 script dynamically
    k6_script = f"""
    import http from 'k6/http';
    import {{ check }} from 'k6';

    export const options = {{
        vus: {target_vus},
        duration: '{duration}',
    }};

    export default function () {{
        const res = http.get('https://api.example.com/health');
        check(res, {{ 'status is 200': (r) => r.status === 200 }});
    }}
    """

    # Write script to temp file
    with open('/tmp/stress_test.js', 'w') as f:
        f.write(k6_script)

    # Run k6 with JSON output
    result = subprocess.run(
        ['k6', 'run', '--out', 'json=/tmp/k6_results.json', '/tmp/stress_test.js'],
        capture_output=True,
        text=True
    )

    # Parse results (simplified - actual implementation would parse k6 JSON)
    return parse_k6_results('/tmp/k6_results.json')

def parse_k6_results(filepath: str) -> dict:
    """Parse k6 JSON output and extract key metrics."""
    # Implementation depends on k6 output format
    # Returns dict with error_rate, p95_response_time, etc.
    pass

def is_system_healthy(results: dict, thresholds: dict) -> bool:
    """
    Determine if system is healthy based on test results.
    """
    if results['error_rate'] > thresholds['max_error_rate']:
        return False
    if results['p95_response_time'] > thresholds['max_p95_ms']:
        return False
    return True

def find_breaking_point(
    min_vus: int = 10,
    max_vus: int = 10000,
    thresholds: Optional[dict] = None
) -> Tuple[int, int]:
    """
    Binary search to find the breaking point.
    Returns (last_healthy_vus, first_unhealthy_vus).
    """
    if thresholds is None:
        thresholds = {
            'max_error_rate': 0.01,  # 1% errors
            'max_p95_ms': 2000,      # 2 second p95
        }

    last_healthy = min_vus
    first_unhealthy = max_vus

    print(f"Starting binary search between {min_vus} and {max_vus} VUs")

    while max_vus - min_vus > 50:  # Precision of 50 VUs
        mid_vus = (min_vus + max_vus) // 2

        print(f"\nTesting at {mid_vus} virtual users...")
        results = run_k6_test(mid_vus)

        if is_system_healthy(results, thresholds):
            print(f"  System healthy at {mid_vus} VUs")
            last_healthy = mid_vus
            min_vus = mid_vus
        else:
            print(f"  System degraded at {mid_vus} VUs")
            first_unhealthy = mid_vus
            max_vus = mid_vus

        # Cool-down period between tests
        print("  Cooling down for 60 seconds...")
        time.sleep(60)

    return (last_healthy, first_unhealthy)

if __name__ == "__main__":
    healthy, unhealthy = find_breaking_point(
        min_vus=100,
        max_vus=5000
    )
    print(f"\nBreaking point found:")
    print(f"  Last healthy: {healthy} VUs")
    print(f"  First degraded: {unhealthy} VUs")
    print(f"  Safe capacity (80%): {int(healthy * 0.8)} VUs")
```

## Monitoring During Stress Tests

Effective stress testing requires comprehensive monitoring. Set up dashboards and alerts specifically for stress test runs.

### Essential Metrics to Track

| Category | Metric | What It Reveals |
|----------|--------|-----------------|
| **Application** | Request rate | Actual throughput achieved |
| **Application** | Error rate | When failures begin |
| **Application** | Response time (p50, p95, p99) | Latency degradation |
| **Application** | Queue depth | Request backlog building |
| **Infrastructure** | CPU utilization | Processing bottlenecks |
| **Infrastructure** | Memory usage | Memory pressure, potential OOM |
| **Infrastructure** | Disk I/O | Storage bottlenecks |
| **Infrastructure** | Network bandwidth | Network saturation |
| **Dependencies** | Database connections | Connection pool exhaustion |
| **Dependencies** | Database query time | DB becoming bottleneck |
| **Dependencies** | Cache hit rate | Cache effectiveness under load |

### Real-Time Monitoring Script

This script monitors critical metrics in real-time during stress tests and alerts when degradation thresholds are crossed.

```python
# stress_monitor.py
# Real-time monitoring during stress tests

import time
import requests
from datetime import datetime
from typing import Dict, List, Callable
from dataclasses import dataclass

@dataclass
class MetricThreshold:
    """Defines warning and critical thresholds for a metric"""
    warning: float
    critical: float
    comparison: str  # 'above' or 'below'

class StressTestMonitor:
    """
    Monitors system health during stress tests.
    Collects metrics, detects degradation, and logs events.
    """

    def __init__(self, prometheus_url: str):
        self.prometheus_url = prometheus_url
        self.thresholds: Dict[str, MetricThreshold] = {}
        self.alerts: List[dict] = []
        self.metrics_history: List[dict] = []

    def set_threshold(
        self,
        metric_name: str,
        warning: float,
        critical: float,
        comparison: str = 'above'
    ):
        """Set alerting thresholds for a metric."""
        self.thresholds[metric_name] = MetricThreshold(
            warning=warning,
            critical=critical,
            comparison=comparison
        )

    def query_prometheus(self, query: str) -> float:
        """Execute PromQL query and return result."""
        response = requests.get(
            f"{self.prometheus_url}/api/v1/query",
            params={'query': query}
        )
        data = response.json()

        if data['status'] == 'success' and data['data']['result']:
            return float(data['data']['result'][0]['value'][1])
        return 0.0

    def collect_metrics(self) -> Dict[str, float]:
        """Collect all monitored metrics."""
        metrics = {
            'error_rate': self.query_prometheus(
                'sum(rate(http_requests_total{status=~"5.."}[1m])) / '
                'sum(rate(http_requests_total[1m])) * 100'
            ),
            'p95_latency_ms': self.query_prometheus(
                'histogram_quantile(0.95, '
                'sum(rate(http_request_duration_seconds_bucket[1m])) by (le)) * 1000'
            ),
            'p99_latency_ms': self.query_prometheus(
                'histogram_quantile(0.99, '
                'sum(rate(http_request_duration_seconds_bucket[1m])) by (le)) * 1000'
            ),
            'request_rate': self.query_prometheus(
                'sum(rate(http_requests_total[1m]))'
            ),
            'cpu_percent': self.query_prometheus(
                'avg(100 - (avg by(instance) '
                '(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100))'
            ),
            'memory_percent': self.query_prometheus(
                '(1 - (node_memory_MemAvailable_bytes / '
                'node_memory_MemTotal_bytes)) * 100'
            ),
            'db_connections': self.query_prometheus(
                'pg_stat_activity_count{state="active"}'
            ),
            'db_query_time_ms': self.query_prometheus(
                'avg(pg_stat_statements_mean_time_seconds) * 1000'
            ),
        }

        metrics['timestamp'] = datetime.now().isoformat()
        return metrics

    def check_thresholds(self, metrics: Dict[str, float]) -> List[dict]:
        """Check metrics against thresholds and return alerts."""
        new_alerts = []

        for metric_name, threshold in self.thresholds.items():
            if metric_name not in metrics:
                continue

            value = metrics[metric_name]
            status = 'ok'

            if threshold.comparison == 'above':
                if value >= threshold.critical:
                    status = 'critical'
                elif value >= threshold.warning:
                    status = 'warning'
            else:  # below
                if value <= threshold.critical:
                    status = 'critical'
                elif value <= threshold.warning:
                    status = 'warning'

            if status != 'ok':
                alert = {
                    'metric': metric_name,
                    'value': value,
                    'status': status,
                    'threshold': threshold.critical if status == 'critical' else threshold.warning,
                    'timestamp': metrics['timestamp'],
                }
                new_alerts.append(alert)

        return new_alerts

    def run(self, duration_seconds: int, interval_seconds: int = 5):
        """
        Run monitoring for specified duration.
        Collects metrics and checks thresholds at regular intervals.
        """
        print(f"Starting stress test monitoring for {duration_seconds} seconds")
        print("-" * 60)

        end_time = time.time() + duration_seconds

        while time.time() < end_time:
            metrics = self.collect_metrics()
            self.metrics_history.append(metrics)

            alerts = self.check_thresholds(metrics)
            self.alerts.extend(alerts)

            # Print current status
            print(f"\n[{metrics['timestamp']}]")
            print(f"  Request Rate: {metrics['request_rate']:.1f}/s")
            print(f"  Error Rate: {metrics['error_rate']:.2f}%")
            print(f"  P95 Latency: {metrics['p95_latency_ms']:.0f}ms")
            print(f"  CPU: {metrics['cpu_percent']:.1f}%")
            print(f"  Memory: {metrics['memory_percent']:.1f}%")

            for alert in alerts:
                status_icon = "[CRITICAL]" if alert['status'] == 'critical' else "[WARNING]"
                print(f"  {status_icon} {alert['metric']}: "
                      f"{alert['value']:.2f} (threshold: {alert['threshold']})")

            time.sleep(interval_seconds)

        return self.generate_report()

    def generate_report(self) -> dict:
        """Generate summary report of the stress test monitoring."""
        if not self.metrics_history:
            return {}

        # Calculate statistics for each metric
        report = {
            'duration_seconds': len(self.metrics_history) * 5,
            'total_alerts': len(self.alerts),
            'critical_alerts': len([a for a in self.alerts if a['status'] == 'critical']),
            'metrics_summary': {},
        }

        for metric in ['error_rate', 'p95_latency_ms', 'cpu_percent', 'memory_percent']:
            values = [m[metric] for m in self.metrics_history if metric in m]
            if values:
                report['metrics_summary'][metric] = {
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                }

        return report


# Usage example
if __name__ == "__main__":
    monitor = StressTestMonitor("http://prometheus:9090")

    # Set thresholds for alerts
    monitor.set_threshold('error_rate', warning=1.0, critical=5.0)
    monitor.set_threshold('p95_latency_ms', warning=1000, critical=3000)
    monitor.set_threshold('cpu_percent', warning=80, critical=95)
    monitor.set_threshold('memory_percent', warning=85, critical=95)

    # Run monitoring for the duration of stress test
    report = monitor.run(duration_seconds=1800)  # 30 minutes

    print("\n" + "=" * 60)
    print("STRESS TEST MONITORING REPORT")
    print("=" * 60)
    print(json.dumps(report, indent=2))
```

## Identifying Failure Modes

Different systems fail in different ways. Your stress tests should identify which failure modes apply to your system.

### Common Failure Mode Categories

| Failure Mode | Symptoms | Root Cause | Mitigation |
|-------------|----------|------------|------------|
| **Cascade Failure** | Sudden complete outage | One component failure triggers others | Circuit breakers, bulkheads |
| **Gradual Degradation** | Slowly increasing latency | Resource exhaustion | Backpressure, load shedding |
| **Thundering Herd** | Recovery causes second failure | All clients retry simultaneously | Jittered retries, queue limits |
| **Memory Exhaustion** | OOM kills, restarts | Memory leaks, unbounded caches | Memory limits, bounded data structures |
| **Connection Exhaustion** | Connection timeouts | Pool exhaustion | Connection limits, timeouts |
| **Thread Starvation** | Requests queue indefinitely | Blocking operations on thread pool | Async operations, dedicated pools |

### Failure Mode Detection Script

This script helps identify which failure modes your system exhibits by analyzing metric patterns during stress tests.

```python
# failure_detector.py
# Analyzes stress test data to identify failure modes

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum

class FailureMode(Enum):
    CASCADE = "cascade_failure"
    GRADUAL_DEGRADATION = "gradual_degradation"
    THUNDERING_HERD = "thundering_herd"
    MEMORY_EXHAUSTION = "memory_exhaustion"
    CONNECTION_EXHAUSTION = "connection_exhaustion"
    THREAD_STARVATION = "thread_starvation"

@dataclass
class FailureModeAnalysis:
    """Results of failure mode analysis"""
    mode: FailureMode
    confidence: float  # 0.0 to 1.0
    evidence: List[str]
    recommendations: List[str]

class FailureModeDetector:
    """
    Analyzes metrics history to identify failure modes.
    Uses pattern matching on metric trends.
    """

    def __init__(self, metrics_history: List[Dict[str, float]]):
        self.metrics = metrics_history

    def detect_cascade_failure(self) -> Optional[FailureModeAnalysis]:
        """
        Cascade failures show sudden, complete failure.
        Error rate jumps from low to very high in short period.
        """
        evidence = []

        # Look for sudden error rate spike
        error_rates = [m.get('error_rate', 0) for m in self.metrics]

        for i in range(1, len(error_rates)):
            if error_rates[i-1] < 5 and error_rates[i] > 50:
                evidence.append(
                    f"Error rate jumped from {error_rates[i-1]:.1f}% "
                    f"to {error_rates[i]:.1f}% in one interval"
                )
                break

        # Check if multiple services failed together
        # (would need service-specific metrics)

        if not evidence:
            return None

        return FailureModeAnalysis(
            mode=FailureMode.CASCADE,
            confidence=0.8 if len(evidence) > 1 else 0.5,
            evidence=evidence,
            recommendations=[
                "Implement circuit breakers between services",
                "Add bulkhead isolation to prevent failure propagation",
                "Set aggressive timeouts on downstream calls",
                "Add fallback responses for degraded dependencies",
            ]
        )

    def detect_gradual_degradation(self) -> Optional[FailureModeAnalysis]:
        """
        Gradual degradation shows steadily increasing latency
        before errors begin.
        """
        evidence = []

        latencies = [m.get('p95_latency_ms', 0) for m in self.metrics]

        # Check for steady increase
        increasing_count = 0
        for i in range(1, len(latencies)):
            if latencies[i] > latencies[i-1] * 1.1:  # 10% increase
                increasing_count += 1

        if increasing_count > len(latencies) * 0.5:
            evidence.append(
                f"Latency increased steadily over {increasing_count} intervals"
            )
            evidence.append(
                f"P95 latency grew from {latencies[0]:.0f}ms to {latencies[-1]:.0f}ms"
            )

        if not evidence:
            return None

        return FailureModeAnalysis(
            mode=FailureMode.GRADUAL_DEGRADATION,
            confidence=0.7,
            evidence=evidence,
            recommendations=[
                "Implement load shedding to reject excess requests early",
                "Add backpressure mechanisms to slow incoming traffic",
                "Set request timeouts to prevent queue buildup",
                "Scale horizontally based on latency, not just CPU",
            ]
        )

    def detect_memory_exhaustion(self) -> Optional[FailureModeAnalysis]:
        """
        Memory exhaustion shows memory climbing to limit,
        then sudden failures or restarts.
        """
        evidence = []

        memory_usage = [m.get('memory_percent', 0) for m in self.metrics]

        # Check for memory approaching limit
        high_memory_count = sum(1 for m in memory_usage if m > 90)

        if high_memory_count > len(memory_usage) * 0.2:
            evidence.append(
                f"Memory exceeded 90% in {high_memory_count} intervals"
            )

        # Check for memory never decreasing (potential leak)
        if all(memory_usage[i] >= memory_usage[i-1] * 0.95
               for i in range(1, min(20, len(memory_usage)))):
            evidence.append("Memory usage only increased during test (potential leak)")

        if not evidence:
            return None

        return FailureModeAnalysis(
            mode=FailureMode.MEMORY_EXHAUSTION,
            confidence=0.75,
            evidence=evidence,
            recommendations=[
                "Review code for memory leaks (unclosed connections, growing caches)",
                "Set memory limits on containers",
                "Implement bounded data structures",
                "Add memory pressure monitoring with early warnings",
                "Consider heap dump analysis for leak identification",
            ]
        )

    def detect_connection_exhaustion(self) -> Optional[FailureModeAnalysis]:
        """
        Connection exhaustion shows DB connections at limit
        while errors increase.
        """
        evidence = []

        connections = [m.get('db_connections', 0) for m in self.metrics]
        error_rates = [m.get('error_rate', 0) for m in self.metrics]

        # Check for connections plateauing while errors increase
        max_connections = max(connections) if connections else 0

        # If connections stay at max while errors grow
        at_max_count = sum(1 for c in connections if c >= max_connections * 0.95)

        if at_max_count > len(connections) * 0.3:
            evidence.append(
                f"Database connections at/near limit ({max_connections}) "
                f"for {at_max_count} intervals"
            )

            # Check if errors correlate
            avg_error_at_max = sum(
                error_rates[i] for i, c in enumerate(connections)
                if c >= max_connections * 0.95
            ) / max(at_max_count, 1)

            if avg_error_at_max > 5:
                evidence.append(
                    f"Error rate averaged {avg_error_at_max:.1f}% when connections exhausted"
                )

        if not evidence:
            return None

        return FailureModeAnalysis(
            mode=FailureMode.CONNECTION_EXHAUSTION,
            confidence=0.8,
            evidence=evidence,
            recommendations=[
                "Increase connection pool size (with caution)",
                "Reduce connection hold time with shorter timeouts",
                "Implement connection queueing with timeouts",
                "Add read replicas to distribute load",
                "Review queries for long-running transactions",
            ]
        )

    def analyze_all(self) -> List[FailureModeAnalysis]:
        """Run all failure mode detections and return findings."""
        detectors = [
            self.detect_cascade_failure,
            self.detect_gradual_degradation,
            self.detect_memory_exhaustion,
            self.detect_connection_exhaustion,
        ]

        findings = []
        for detector in detectors:
            result = detector()
            if result:
                findings.append(result)

        # Sort by confidence
        findings.sort(key=lambda x: x.confidence, reverse=True)

        return findings
```

## Recovery Testing

After breaking your system, you need to verify it recovers properly. Recovery testing validates that your system returns to normal operation after failures.

### Recovery Test Scenarios

| Scenario | Test Method | Success Criteria |
|----------|-------------|------------------|
| **Load removal** | Drop traffic to zero after stress | Returns to baseline within 5 minutes |
| **Pod restart** | Kill pods during stress | New pods healthy, no data loss |
| **Database failover** | Trigger DB failover under load | Connections recover, no corruption |
| **Cache cold start** | Clear cache during stress | Performance recovers without cascade |
| **Circuit breaker reset** | Allow circuits to close after recovery | No thundering herd on recovery |

### Recovery Test Implementation

This k6 script tests system recovery by applying stress, then monitoring how the system returns to baseline.

```javascript
// k6 recovery test
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const recoveryTime = new Trend('recovery_time');

export const options = {
  scenarios: {
    // Phase 1: Establish baseline
    baseline: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      startTime: '0s',
      tags: { phase: 'baseline' },
    },
    // Phase 2: Apply stress
    stress: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '5m',
      startTime: '2m',
      tags: { phase: 'stress' },
    },
    // Phase 3: Recovery observation
    recovery: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      startTime: '7m',
      tags: { phase: 'recovery' },
    },
  },
};

// Store baseline metrics for comparison
let baselineP95 = 0;
let stressComplete = false;
let recoveryStart = 0;
let recoveryComplete = false;

export default function () {
  const response = http.get('https://api.example.com/health');

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  // Track recovery timing
  const currentPhase = __ENV.PHASE || 'unknown';

  if (currentPhase === 'baseline' && !baselineP95) {
    // Capture baseline (simplified - actual implementation would aggregate)
    baselineP95 = response.timings.duration;
  }

  if (currentPhase === 'recovery') {
    if (!recoveryStart) {
      recoveryStart = Date.now();
    }

    // Check if performance has returned to baseline
    const currentP95 = response.timings.duration;

    if (!recoveryComplete && currentP95 <= baselineP95 * 1.2) {
      const recoveryDuration = (Date.now() - recoveryStart) / 1000;
      recoveryTime.add(recoveryDuration);
      recoveryComplete = true;
      console.log(`System recovered to baseline in ${recoveryDuration} seconds`);
    }
  }

  sleep(1);
}
```

### Automated Recovery Verification

This script verifies recovery after stress test completion by checking metrics return to baseline.

```python
# recovery_verifier.py
# Verifies system recovery after stress testing

import time
import requests
from typing import Dict, Tuple

class RecoveryVerifier:
    """
    Verifies system has recovered to baseline after stress.
    Monitors metrics until they return to normal or timeout.
    """

    def __init__(self, prometheus_url: str, baseline_metrics: Dict[str, float]):
        self.prometheus_url = prometheus_url
        self.baseline = baseline_metrics

    def query_metric(self, query: str) -> float:
        """Execute Prometheus query."""
        response = requests.get(
            f"{self.prometheus_url}/api/v1/query",
            params={'query': query}
        )
        data = response.json()
        if data['status'] == 'success' and data['data']['result']:
            return float(data['data']['result'][0]['value'][1])
        return 0.0

    def get_current_metrics(self) -> Dict[str, float]:
        """Get current system metrics."""
        return {
            'error_rate': self.query_metric(
                'sum(rate(http_requests_total{status=~"5.."}[1m])) / '
                'sum(rate(http_requests_total[1m])) * 100'
            ),
            'p95_latency_ms': self.query_metric(
                'histogram_quantile(0.95, '
                'sum(rate(http_request_duration_seconds_bucket[1m])) by (le)) * 1000'
            ),
            'request_rate': self.query_metric(
                'sum(rate(http_requests_total[1m]))'
            ),
        }

    def is_recovered(self, current: Dict[str, float]) -> Tuple[bool, Dict[str, str]]:
        """
        Check if current metrics have recovered to baseline.
        Returns (is_recovered, status_per_metric).
        """
        status = {}
        all_recovered = True

        # Error rate should be at or below baseline
        if current['error_rate'] <= self.baseline['error_rate'] * 1.5:
            status['error_rate'] = 'recovered'
        else:
            status['error_rate'] = f"still elevated ({current['error_rate']:.2f}%)"
            all_recovered = False

        # Latency should be within 20% of baseline
        if current['p95_latency_ms'] <= self.baseline['p95_latency_ms'] * 1.2:
            status['p95_latency'] = 'recovered'
        else:
            status['p95_latency'] = f"still elevated ({current['p95_latency_ms']:.0f}ms)"
            all_recovered = False

        return all_recovered, status

    def wait_for_recovery(
        self,
        timeout_seconds: int = 300,
        check_interval: int = 10
    ) -> Dict:
        """
        Wait for system to recover, or timeout.
        Returns recovery report.
        """
        print("Waiting for system recovery...")
        print(f"Baseline: error_rate={self.baseline['error_rate']:.2f}%, "
              f"p95={self.baseline['p95_latency_ms']:.0f}ms")
        print("-" * 50)

        start_time = time.time()
        recovery_achieved = False
        recovery_time = None

        while time.time() - start_time < timeout_seconds:
            current = self.get_current_metrics()
            recovered, status = self.is_recovered(current)

            elapsed = time.time() - start_time
            print(f"[{elapsed:.0f}s] error_rate: {status['error_rate']}, "
                  f"p95_latency: {status['p95_latency']}")

            if recovered:
                recovery_achieved = True
                recovery_time = elapsed
                print(f"\nSystem recovered in {elapsed:.0f} seconds!")
                break

            time.sleep(check_interval)

        return {
            'recovered': recovery_achieved,
            'recovery_time_seconds': recovery_time,
            'timeout_seconds': timeout_seconds,
            'final_metrics': self.get_current_metrics(),
        }


# Usage example
if __name__ == "__main__":
    # Define baseline from earlier collection
    baseline = {
        'error_rate': 0.1,
        'p95_latency_ms': 150,
        'request_rate': 100,
    }

    verifier = RecoveryVerifier(
        prometheus_url="http://prometheus:9090",
        baseline_metrics=baseline
    )

    # After stress test completes, verify recovery
    print("Stress test complete. Starting recovery verification...")

    result = verifier.wait_for_recovery(timeout_seconds=600)

    if result['recovered']:
        print(f"\nRecovery successful in {result['recovery_time_seconds']} seconds")
    else:
        print(f"\nRecovery FAILED - system did not return to baseline within timeout")
        print(f"Final metrics: {result['final_metrics']}")
```

## Stress Testing Checklist

Use this checklist when planning and executing stress tests.

### Pre-Test Preparation

- [ ] Baseline metrics collected and documented
- [ ] Monitoring dashboards configured for stress test metrics
- [ ] Alerting thresholds set (and potentially adjusted for test duration)
- [ ] Runbooks ready for unexpected failures
- [ ] Stakeholders notified of test window
- [ ] Rollback procedures documented
- [ ] Data backup verified (if testing production)

### During Test Execution

- [ ] Monitor error rates continuously
- [ ] Watch for cascade failures across services
- [ ] Track resource utilization (CPU, memory, connections)
- [ ] Note the exact load level when degradation begins
- [ ] Capture logs and traces for failure analysis
- [ ] Document unexpected behaviors

### Post-Test Analysis

- [ ] Identify breaking point (requests per second or concurrent users)
- [ ] Document failure modes observed
- [ ] Verify system recovered to baseline
- [ ] Calculate time to recovery
- [ ] Create action items for identified weaknesses
- [ ] Update capacity planning based on findings

## Summary

| Stress Test Type | Purpose | Key Metric to Watch |
|-----------------|---------|-------------------|
| Gradual Ramp | Find exact breaking point | Load level when p95 degrades |
| Spike Test | Test sudden traffic bursts | Recovery time after spike |
| Soak Test | Find slow resource leaks | Memory and connections over time |
| Recovery Test | Validate system healing | Time to return to baseline |

Effective stress testing is not about proving your system is fast. It is about knowing exactly how it fails and confirming it recovers gracefully. Run stress tests regularly, especially before major releases and after infrastructure changes. The failures you find in controlled tests are far better than the ones your users find in production.

Start with gradual ramp-up tests to establish your breaking point. Add spike tests to validate burst handling. Use soak tests before major releases to catch resource leaks. Always verify recovery after stress events. Document every failure mode you discover and build mitigations before they become incidents.
