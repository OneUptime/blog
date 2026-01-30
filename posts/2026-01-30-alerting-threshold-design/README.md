# How to Implement Alert Threshold Design

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Alerting, Monitoring, SRE, Observability

Description: Design effective alert thresholds using statistical analysis, baseline comparisons, and anomaly detection to reduce alert fatigue.

---

Alert fatigue kills on-call morale faster than any outage. When every page feels like noise, engineers stop trusting the pager, and real incidents slip through. The fix starts with threshold design, not more dashboards or tooling.

This guide covers practical techniques for building alert thresholds that catch real problems while letting your team sleep. We will walk through static vs dynamic thresholds, percentile-based approaches, rate of change detection, baseline comparisons, and a tuning process you can run monthly.

---

## The Problem With Naive Thresholds

Most teams start with thresholds like:

- CPU > 80% for 5 minutes
- Error rate > 1%
- Response time > 500ms

These work until they do not. Traffic patterns shift. Deployments change baseline performance. Seasonal spikes trigger false alarms at 2am. The result: a team that ignores alerts or over-tunes into blindness.

---

## Static vs Dynamic Thresholds

| Approach | Best For | Drawbacks |
|----------|----------|-----------|
| **Static** | Well-understood, stable systems | Requires manual tuning, misses anomalies |
| **Dynamic (baseline)** | Variable workloads, growth phases | Needs historical data, can drift |
| **Hybrid** | Production systems with predictable patterns + occasional spikes | More complex to implement |

### When to Use Static Thresholds

Static thresholds work well for:

- Hard limits (disk full at 95%, memory exhaustion)
- SLA boundaries (response time must stay under 2s per contract)
- Safety rails (connection pool exhausted)

The following Python code demonstrates a simple static threshold check that fires when a metric crosses a fixed boundary.

```python
# Static threshold alert check
# Use for hard limits where the boundary is well-defined

def check_static_threshold(
    metric_value: float,
    threshold: float,
    comparison: str = "gt"  # gt, lt, gte, lte
) -> bool:
    """
    Returns True if threshold is breached.

    Args:
        metric_value: Current metric reading
        threshold: Fixed threshold value
        comparison: How to compare (gt = greater than, etc.)
    """
    comparisons = {
        "gt": lambda v, t: v > t,
        "lt": lambda v, t: v < t,
        "gte": lambda v, t: v >= t,
        "lte": lambda v, t: v <= t,
    }

    compare_fn = comparisons.get(comparison, comparisons["gt"])
    return compare_fn(metric_value, threshold)


# Example: Alert if disk usage exceeds 90%
disk_usage = 92.5
if check_static_threshold(disk_usage, 90.0, "gt"):
    print(f"ALERT: Disk usage at {disk_usage}% exceeds 90% threshold")
```

### When to Use Dynamic Thresholds

Dynamic thresholds adapt to your system's behavior. They work well for:

- Metrics with daily/weekly patterns (traffic, request volume)
- Systems undergoing growth or optimization
- Multi-tenant platforms with variable load

---

## Percentile-Based Thresholds

Averages lie. A service with p50 latency of 50ms might have a p99 of 2 seconds, and your users at the tail are suffering. Percentile-based thresholds catch these problems.

### Choosing the Right Percentile

| Percentile | Use Case | Alert Sensitivity |
|------------|----------|-------------------|
| p50 (median) | General health, capacity planning | Low - catches major issues only |
| p90 | User experience for most requests | Medium - good default |
| p95 | SLO tracking, business-critical flows | Medium-high |
| p99 | Tail latency, premium tier users | High - may be noisy |
| p99.9 | Payment processing, critical paths | Very high - reserve for critical |

The following code calculates percentile values from a time series and checks against a threshold.

```python
import numpy as np
from typing import List, Tuple

def calculate_percentile_threshold(
    values: List[float],
    percentile: float,
    multiplier: float = 1.5
) -> Tuple[float, float]:
    """
    Calculate a percentile value and derive a threshold from it.

    Args:
        values: Historical metric values
        percentile: Which percentile to calculate (0-100)
        multiplier: How much above the percentile triggers an alert

    Returns:
        Tuple of (percentile_value, threshold)
    """
    p_value = np.percentile(values, percentile)
    threshold = p_value * multiplier
    return p_value, threshold


def check_percentile_alert(
    current_value: float,
    historical_values: List[float],
    percentile: float = 95,
    multiplier: float = 1.5
) -> dict:
    """
    Check if current value exceeds percentile-based threshold.

    Returns dict with alert status and context.
    """
    p_value, threshold = calculate_percentile_threshold(
        historical_values, percentile, multiplier
    )

    breached = current_value > threshold

    return {
        "alert": breached,
        "current_value": current_value,
        "percentile": percentile,
        "percentile_value": round(p_value, 2),
        "threshold": round(threshold, 2),
        "severity": "critical" if current_value > threshold * 1.5 else "warning"
    }


# Example: Check if current latency is abnormal
# Last 24 hours of p95 latency readings (one per minute)
historical_latency = [45, 48, 52, 47, 51, 49, 53, 48, 46, 50] * 144  # simulated
current_latency = 125  # ms

result = check_percentile_alert(
    current_value=current_latency,
    historical_values=historical_latency,
    percentile=95,
    multiplier=1.5
)

print(f"Alert triggered: {result['alert']}")
print(f"Current: {result['current_value']}ms, Threshold: {result['threshold']}ms")
# Output: Alert triggered: True
# Current: 125ms, Threshold: 79.5ms
```

### Sliding Window Percentiles

For real-time alerting, calculate percentiles over a sliding window rather than a fixed historical period. This code shows how to maintain a rolling percentile calculation.

```python
from collections import deque
from typing import Optional
import time

class SlidingWindowPercentile:
    """
    Maintain percentile calculations over a sliding time window.
    Useful for real-time threshold evaluation.
    """

    def __init__(
        self,
        window_seconds: int = 300,  # 5 minute window
        percentile: float = 95
    ):
        self.window_seconds = window_seconds
        self.percentile = percentile
        # Store (timestamp, value) tuples
        self.values: deque = deque()

    def add_value(self, value: float, timestamp: Optional[float] = None):
        """Add a new value to the window."""
        ts = timestamp or time.time()
        self.values.append((ts, value))
        self._evict_old_values(ts)

    def _evict_old_values(self, current_time: float):
        """Remove values outside the window."""
        cutoff = current_time - self.window_seconds
        while self.values and self.values[0][0] < cutoff:
            self.values.popleft()

    def get_percentile(self) -> Optional[float]:
        """Calculate the current percentile value."""
        if len(self.values) < 10:  # Need minimum samples
            return None

        vals = [v[1] for v in self.values]
        return np.percentile(vals, self.percentile)

    def check_threshold(
        self,
        current_value: float,
        multiplier: float = 1.5
    ) -> dict:
        """Check if current value breaches the dynamic threshold."""
        p_value = self.get_percentile()

        if p_value is None:
            return {"alert": False, "reason": "insufficient_data"}

        threshold = p_value * multiplier
        breached = current_value > threshold

        return {
            "alert": breached,
            "current_value": current_value,
            "baseline_p95": round(p_value, 2),
            "threshold": round(threshold, 2),
            "window_size": len(self.values)
        }


# Example usage
window = SlidingWindowPercentile(window_seconds=300, percentile=95)

# Simulate adding values over time
for latency in [45, 48, 52, 47, 51, 49, 53, 48, 46, 50, 47, 52]:
    window.add_value(latency)

# Check a potentially anomalous value
result = window.check_threshold(current_value=95, multiplier=1.5)
print(result)
```

---

## Rate of Change Alerts

Sometimes the absolute value is less important than how fast it is changing. A gradual rise to 80% CPU is different from a spike from 20% to 80% in 30 seconds.

### Derivative-Based Detection

Rate of change alerts catch:

- Sudden traffic spikes (DDoS, viral content, broken retry loops)
- Memory leaks accelerating
- Connection pool drain
- Cascading failures

The following code implements rate of change detection with configurable sensitivity.

```python
from dataclasses import dataclass
from typing import List, Optional
import time

@dataclass
class RateOfChangeAlert:
    triggered: bool
    current_rate: float  # units per second
    threshold_rate: float
    direction: str  # "increasing" or "decreasing"
    severity: str


def calculate_rate_of_change(
    values: List[tuple],  # List of (timestamp, value)
    window_seconds: int = 60
) -> Optional[float]:
    """
    Calculate the rate of change over a time window.

    Args:
        values: List of (timestamp, value) tuples, sorted by time
        window_seconds: How far back to look

    Returns:
        Rate of change in units per second, or None if insufficient data
    """
    if len(values) < 2:
        return None

    current_time = values[-1][0]
    cutoff = current_time - window_seconds

    # Find the oldest value within the window
    window_values = [(t, v) for t, v in values if t >= cutoff]

    if len(window_values) < 2:
        return None

    oldest = window_values[0]
    newest = window_values[-1]

    time_delta = newest[0] - oldest[0]
    if time_delta == 0:
        return None

    value_delta = newest[1] - oldest[1]
    return value_delta / time_delta


def check_rate_of_change(
    values: List[tuple],
    increase_threshold: float,  # units per second
    decrease_threshold: float,  # units per second (positive number)
    window_seconds: int = 60
) -> RateOfChangeAlert:
    """
    Check if rate of change exceeds thresholds.

    Args:
        values: Historical (timestamp, value) pairs
        increase_threshold: Alert if increasing faster than this
        decrease_threshold: Alert if decreasing faster than this
        window_seconds: Analysis window

    Returns:
        RateOfChangeAlert with status and details
    """
    rate = calculate_rate_of_change(values, window_seconds)

    if rate is None:
        return RateOfChangeAlert(
            triggered=False,
            current_rate=0,
            threshold_rate=0,
            direction="unknown",
            severity="none"
        )

    # Check for rapid increase
    if rate > increase_threshold:
        severity = "critical" if rate > increase_threshold * 2 else "warning"
        return RateOfChangeAlert(
            triggered=True,
            current_rate=round(rate, 4),
            threshold_rate=increase_threshold,
            direction="increasing",
            severity=severity
        )

    # Check for rapid decrease
    if rate < -decrease_threshold:
        severity = "critical" if rate < -decrease_threshold * 2 else "warning"
        return RateOfChangeAlert(
            triggered=True,
            current_rate=round(rate, 4),
            threshold_rate=decrease_threshold,
            direction="decreasing",
            severity=severity
        )

    return RateOfChangeAlert(
        triggered=False,
        current_rate=round(rate, 4),
        threshold_rate=increase_threshold,
        direction="stable",
        severity="none"
    )


# Example: Detect sudden error rate spike
# Error count readings every 10 seconds
now = time.time()
error_counts = [
    (now - 60, 10),
    (now - 50, 12),
    (now - 40, 15),
    (now - 30, 45),   # Spike starts here
    (now - 20, 120),
    (now - 10, 250),
    (now, 480),
]

alert = check_rate_of_change(
    values=error_counts,
    increase_threshold=5.0,  # More than 5 errors/second increase
    decrease_threshold=5.0,
    window_seconds=60
)

print(f"Alert: {alert.triggered}")
print(f"Rate: {alert.current_rate} errors/second")
print(f"Direction: {alert.direction}")
print(f"Severity: {alert.severity}")
# Output shows rapid increase detected
```

### Combining Rate and Absolute Thresholds

The best alerts often combine approaches. The following class shows how to layer multiple threshold types.

```python
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

class AlertType(Enum):
    NONE = "none"
    ABSOLUTE = "absolute"
    RATE = "rate"
    BOTH = "both"


@dataclass
class CompositeAlert:
    triggered: bool
    alert_type: AlertType
    absolute_breach: bool
    rate_breach: bool
    details: dict


class CompositeThreshold:
    """
    Combines absolute and rate-of-change thresholds.
    Triggers when either or both conditions are met.
    """

    def __init__(
        self,
        absolute_threshold: float,
        rate_threshold: float,  # units per second
        window_seconds: int = 60,
        require_both: bool = False  # AND vs OR logic
    ):
        self.absolute_threshold = absolute_threshold
        self.rate_threshold = rate_threshold
        self.window_seconds = window_seconds
        self.require_both = require_both
        self.values: List[tuple] = []

    def add_value(self, value: float, timestamp: Optional[float] = None):
        ts = timestamp or time.time()
        self.values.append((ts, value))

        # Keep only recent values
        cutoff = ts - (self.window_seconds * 2)
        self.values = [(t, v) for t, v in self.values if t >= cutoff]

    def check(self) -> CompositeAlert:
        if not self.values:
            return CompositeAlert(
                triggered=False,
                alert_type=AlertType.NONE,
                absolute_breach=False,
                rate_breach=False,
                details={}
            )

        current_value = self.values[-1][1]
        absolute_breach = current_value > self.absolute_threshold

        rate = calculate_rate_of_change(self.values, self.window_seconds)
        rate_breach = rate is not None and rate > self.rate_threshold

        # Determine if alert should trigger
        if self.require_both:
            triggered = absolute_breach and rate_breach
        else:
            triggered = absolute_breach or rate_breach

        # Classify alert type
        if absolute_breach and rate_breach:
            alert_type = AlertType.BOTH
        elif absolute_breach:
            alert_type = AlertType.ABSOLUTE
        elif rate_breach:
            alert_type = AlertType.RATE
        else:
            alert_type = AlertType.NONE

        return CompositeAlert(
            triggered=triggered,
            alert_type=alert_type,
            absolute_breach=absolute_breach,
            rate_breach=rate_breach,
            details={
                "current_value": current_value,
                "absolute_threshold": self.absolute_threshold,
                "current_rate": round(rate, 4) if rate else None,
                "rate_threshold": self.rate_threshold
            }
        )


# Example: Memory usage alert
# Fires if memory > 85% OR if memory is growing fast
memory_alert = CompositeThreshold(
    absolute_threshold=85.0,  # percent
    rate_threshold=0.5,       # percent per second
    window_seconds=60,
    require_both=False        # OR logic
)

# Simulate memory growth
now = time.time()
readings = [
    (now - 50, 60.0),
    (now - 40, 62.5),
    (now - 30, 67.0),
    (now - 20, 74.0),
    (now - 10, 79.5),
    (now, 82.0),
]

for ts, value in readings:
    memory_alert.add_value(value, ts)

result = memory_alert.check()
print(f"Triggered: {result.triggered}")
print(f"Type: {result.alert_type.value}")
print(f"Details: {result.details}")
```

---

## Baseline Comparison Thresholds

Systems have patterns. Traffic peaks at noon, dips at 3am, spikes on Monday mornings. Baseline comparison uses historical patterns to set context-aware thresholds.

### Time-of-Day Baselines

The following code builds hourly baselines from historical data and compares current values against the expected range.

```python
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple
import statistics

class HourlyBaseline:
    """
    Build and maintain hourly baselines for a metric.
    Accounts for time-of-day patterns.
    """

    def __init__(self, deviation_multiplier: float = 2.0):
        # Store values by hour (0-23)
        self.hourly_values: Dict[int, List[float]] = defaultdict(list)
        self.deviation_multiplier = deviation_multiplier
        self.min_samples = 20  # Need enough data per hour

    def add_historical_value(self, value: float, timestamp: datetime):
        """Add a historical value to build the baseline."""
        hour = timestamp.hour
        self.hourly_values[hour].append(value)

    def get_baseline_for_hour(self, hour: int) -> Optional[Tuple[float, float, float]]:
        """
        Get baseline stats for a given hour.

        Returns:
            Tuple of (mean, std_dev, threshold) or None if insufficient data
        """
        values = self.hourly_values.get(hour, [])

        if len(values) < self.min_samples:
            return None

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values)
        threshold = mean + (std_dev * self.deviation_multiplier)

        return mean, std_dev, threshold

    def check_value(
        self,
        current_value: float,
        current_time: Optional[datetime] = None
    ) -> dict:
        """
        Check if current value deviates from the hourly baseline.
        """
        if current_time is None:
            current_time = datetime.now()

        hour = current_time.hour
        baseline = self.get_baseline_for_hour(hour)

        if baseline is None:
            return {
                "alert": False,
                "reason": "insufficient_baseline_data",
                "hour": hour,
                "samples_available": len(self.hourly_values.get(hour, []))
            }

        mean, std_dev, threshold = baseline
        deviation = (current_value - mean) / std_dev if std_dev > 0 else 0

        alert = current_value > threshold

        return {
            "alert": alert,
            "current_value": current_value,
            "hour": hour,
            "baseline_mean": round(mean, 2),
            "baseline_std": round(std_dev, 2),
            "threshold": round(threshold, 2),
            "deviation_sigma": round(deviation, 2),
            "severity": "critical" if deviation > 3 else "warning" if alert else "none"
        }


# Example: Build baseline from 7 days of hourly traffic data
baseline = HourlyBaseline(deviation_multiplier=2.0)

# Simulate historical data (requests per minute)
# In production, load this from your metrics store
import random
for day in range(7):
    for hour in range(24):
        # Traffic pattern: low at night, peak at noon
        base_traffic = 100 + 200 * (1 - abs(hour - 12) / 12)
        for minute in range(60):
            value = base_traffic + random.gauss(0, base_traffic * 0.1)
            ts = datetime(2024, 1, day + 1, hour, minute)
            baseline.add_historical_value(value, ts)

# Check current traffic at 2pm
current_traffic = 450  # Unusually high
result = baseline.check_value(
    current_value=current_traffic,
    current_time=datetime(2024, 1, 15, 14, 0)
)

print(f"Alert: {result['alert']}")
print(f"Baseline for hour {result['hour']}: {result['baseline_mean']} +/- {result['baseline_std']}")
print(f"Deviation: {result['deviation_sigma']} sigma")
```

### Day-of-Week Adjustments

Traffic on Monday at 10am differs from Sunday at 10am. This extension handles weekly patterns.

```python
class WeeklyBaseline:
    """
    Build baselines accounting for both hour and day of week.
    More accurate for business applications with weekly cycles.
    """

    def __init__(self, deviation_multiplier: float = 2.0):
        # Key: (day_of_week, hour) where Monday = 0
        self.baselines: Dict[Tuple[int, int], List[float]] = defaultdict(list)
        self.deviation_multiplier = deviation_multiplier
        self.min_samples = 4  # At least 4 weeks of data per slot

    def add_value(self, value: float, timestamp: datetime):
        """Add a value to the appropriate time slot."""
        key = (timestamp.weekday(), timestamp.hour)
        self.baselines[key].append(value)

    def get_baseline(
        self,
        day_of_week: int,
        hour: int
    ) -> Optional[Tuple[float, float, float, float]]:
        """
        Get baseline for a specific day/hour combination.

        Returns:
            (mean, std_dev, upper_threshold, lower_threshold) or None
        """
        key = (day_of_week, hour)
        values = self.baselines.get(key, [])

        if len(values) < self.min_samples:
            return None

        mean = statistics.mean(values)
        std_dev = statistics.stdev(values) if len(values) > 1 else mean * 0.1

        upper = mean + (std_dev * self.deviation_multiplier)
        lower = max(0, mean - (std_dev * self.deviation_multiplier))

        return mean, std_dev, upper, lower

    def check_value(self, current_value: float, timestamp: datetime) -> dict:
        """Check if value is anomalous for this time slot."""
        baseline = self.get_baseline(timestamp.weekday(), timestamp.hour)

        if baseline is None:
            return {
                "alert": False,
                "reason": "insufficient_data",
                "day": timestamp.strftime("%A"),
                "hour": timestamp.hour
            }

        mean, std_dev, upper, lower = baseline

        # Alert on both high and low anomalies
        too_high = current_value > upper
        too_low = current_value < lower

        deviation = (current_value - mean) / std_dev if std_dev > 0 else 0

        return {
            "alert": too_high or too_low,
            "direction": "high" if too_high else "low" if too_low else "normal",
            "current_value": current_value,
            "expected_mean": round(mean, 2),
            "expected_range": (round(lower, 2), round(upper, 2)),
            "deviation_sigma": round(deviation, 2),
            "day": timestamp.strftime("%A"),
            "hour": timestamp.hour
        }


# Example usage
weekly = WeeklyBaseline(deviation_multiplier=2.5)

# Load 8 weeks of hourly data
# In production, query from your metrics database
for week in range(8):
    for day in range(7):
        for hour in range(24):
            # Weekday traffic higher than weekend
            is_weekday = day < 5
            base = 300 if is_weekday else 150
            # Peak at business hours
            if is_weekday and 9 <= hour <= 17:
                base *= 1.5

            value = base + random.gauss(0, base * 0.15)
            ts = datetime(2024, 1, week * 7 + day + 1, hour, 0)
            weekly.add_value(value, ts)

# Check: Monday 10am with unusually low traffic
result = weekly.check_value(
    current_value=180,  # Expected ~450 for Monday 10am
    timestamp=datetime(2024, 3, 4, 10, 0)  # A Monday
)

print(f"Alert: {result['alert']}")
print(f"Direction: {result['direction']}")
print(f"Expected: {result['expected_mean']} in range {result['expected_range']}")
```

---

## Threshold Tuning Process

Setting thresholds is not a one-time task. Run this monthly review process.

### Step 1: Collect Alert Metrics

Track these for every alert rule:

| Metric | Target | What It Tells You |
|--------|--------|-------------------|
| Fire count per week | < 5 per rule | High count = too sensitive |
| Acknowledgment time | < 5 min | Slow ack = low trust in alert |
| Resolution time | Varies by severity | Long resolution = wrong escalation |
| False positive rate | < 10% | High FP = threshold too tight |
| Incidents missed | 0 | Any miss = threshold too loose |

The following code shows how to calculate these metrics from alert history.

```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
from enum import Enum

class AlertOutcome(Enum):
    TRUE_POSITIVE = "true_positive"  # Real incident
    FALSE_POSITIVE = "false_positive"  # No action needed
    ACKNOWLEDGED = "acknowledged"  # Investigated but no incident
    ESCALATED = "escalated"  # Handed to another team


@dataclass
class AlertRecord:
    alert_id: str
    rule_name: str
    fired_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]
    outcome: AlertOutcome


def calculate_alert_metrics(
    alerts: List[AlertRecord],
    period_days: int = 30
) -> dict:
    """
    Calculate key metrics for alert quality assessment.
    """
    cutoff = datetime.now() - timedelta(days=period_days)
    recent = [a for a in alerts if a.fired_at >= cutoff]

    if not recent:
        return {"error": "no_alerts_in_period"}

    total = len(recent)

    # Count outcomes
    true_positives = sum(1 for a in recent if a.outcome == AlertOutcome.TRUE_POSITIVE)
    false_positives = sum(1 for a in recent if a.outcome == AlertOutcome.FALSE_POSITIVE)

    # Calculate acknowledgment times
    ack_times = []
    for a in recent:
        if a.acknowledged_at:
            ack_time = (a.acknowledged_at - a.fired_at).total_seconds() / 60
            ack_times.append(ack_time)

    avg_ack_time = statistics.mean(ack_times) if ack_times else None

    # Calculate resolution times for true positives
    resolution_times = []
    for a in recent:
        if a.outcome == AlertOutcome.TRUE_POSITIVE and a.resolved_at:
            res_time = (a.resolved_at - a.fired_at).total_seconds() / 60
            resolution_times.append(res_time)

    avg_resolution = statistics.mean(resolution_times) if resolution_times else None

    # Group by rule
    by_rule = defaultdict(list)
    for a in recent:
        by_rule[a.rule_name].append(a)

    rule_stats = {}
    for rule, rule_alerts in by_rule.items():
        fp_count = sum(1 for a in rule_alerts if a.outcome == AlertOutcome.FALSE_POSITIVE)
        rule_stats[rule] = {
            "fire_count": len(rule_alerts),
            "fires_per_week": len(rule_alerts) / (period_days / 7),
            "false_positive_rate": fp_count / len(rule_alerts) if rule_alerts else 0
        }

    return {
        "period_days": period_days,
        "total_alerts": total,
        "true_positive_rate": true_positives / total if total else 0,
        "false_positive_rate": false_positives / total if total else 0,
        "avg_acknowledgment_minutes": round(avg_ack_time, 1) if avg_ack_time else None,
        "avg_resolution_minutes": round(avg_resolution, 1) if avg_resolution else None,
        "alerts_per_week": total / (period_days / 7),
        "rule_breakdown": rule_stats,
        "noisiest_rules": sorted(
            rule_stats.items(),
            key=lambda x: x[1]["fires_per_week"],
            reverse=True
        )[:5]
    }


# Example: Analyze last month's alerts
# In production, load from your alert management system
sample_alerts = [
    AlertRecord(
        alert_id="1",
        rule_name="high_cpu",
        fired_at=datetime.now() - timedelta(days=5),
        acknowledged_at=datetime.now() - timedelta(days=5, minutes=-3),
        resolved_at=datetime.now() - timedelta(days=5, minutes=-45),
        outcome=AlertOutcome.TRUE_POSITIVE
    ),
    AlertRecord(
        alert_id="2",
        rule_name="high_cpu",
        fired_at=datetime.now() - timedelta(days=3),
        acknowledged_at=datetime.now() - timedelta(days=3, minutes=-8),
        resolved_at=datetime.now() - timedelta(days=3, minutes=-10),
        outcome=AlertOutcome.FALSE_POSITIVE
    ),
    # Add more sample alerts...
]

metrics = calculate_alert_metrics(sample_alerts, period_days=30)
print(f"False positive rate: {metrics['false_positive_rate']:.1%}")
print(f"Avg ack time: {metrics['avg_acknowledgment_minutes']} minutes")
```

### Step 2: Review Noisy Alerts

For each alert firing more than 5 times per week, ask:

1. Is the threshold too tight?
2. Is the metric the right one to watch?
3. Should this be a warning log instead of a page?
4. Is there a better signal (SLO burn rate)?

### Step 3: Review Missed Incidents

For each incident that was not caught by alerts:

1. Was the right metric instrumented?
2. Was the threshold too loose?
3. Was the alert routed correctly?
4. Was the runbook clear enough to act on?

### Step 4: Implement Adjustments

Use this configuration approach for maintainable threshold definitions.

```yaml
# alert-thresholds.yaml
# Version controlled, reviewed via PR

alerts:
  - name: api_latency_high
    metric: http_request_duration_seconds
    filters:
      service: api-gateway
      endpoint: "/api/v1/*"

    threshold:
      type: percentile
      percentile: 95
      # Absolute ceiling
      max_value: 2.0  # seconds
      # Dynamic: multiplier over baseline
      baseline_multiplier: 2.0
      baseline_window: 7d

    for_duration: 5m  # Must persist for 5 minutes

    severity: warning
    escalate_to: critical
    escalate_after: 15m

    runbook: "https://wiki/runbooks/api-latency"

    tuning:
      last_reviewed: 2024-01-15
      reviewed_by: oncall-team
      notes: "Raised from 1.5x to 2.0x after Black Friday baseline shift"

  - name: error_rate_spike
    metric: http_requests_total
    filters:
      status: "5xx"

    threshold:
      type: rate_of_change
      # Alert if error rate increases by more than 2% per minute
      rate_per_minute: 2.0
      # Also alert if absolute rate exceeds 5%
      absolute_max: 5.0

    for_duration: 2m
    severity: critical

    tuning:
      last_reviewed: 2024-01-10
      notes: "Reduced from 5% to 2% after missed slow-burn incident"

  - name: disk_usage_high
    metric: node_filesystem_avail_bytes

    threshold:
      type: static
      comparison: lt  # Less than
      value: 10  # GB
      # Or percentage based
      percentage: 10  # Alert when < 10% free

    for_duration: 10m
    severity: warning
    escalate_to: critical
    escalate_after: 30m
```

The following code parses and evaluates these threshold configurations.

```python
import yaml
from typing import Any, Dict
from dataclasses import dataclass

@dataclass
class ThresholdConfig:
    name: str
    metric: str
    threshold_type: str
    params: Dict[str, Any]
    duration_seconds: int
    severity: str


def parse_threshold_config(yaml_path: str) -> List[ThresholdConfig]:
    """Parse threshold configuration from YAML."""
    with open(yaml_path) as f:
        config = yaml.safe_load(f)

    thresholds = []
    for alert in config.get("alerts", []):
        # Parse duration string like "5m" to seconds
        duration_str = alert.get("for_duration", "0s")
        duration_seconds = parse_duration(duration_str)

        thresholds.append(ThresholdConfig(
            name=alert["name"],
            metric=alert["metric"],
            threshold_type=alert["threshold"]["type"],
            params=alert["threshold"],
            duration_seconds=duration_seconds,
            severity=alert.get("severity", "warning")
        ))

    return thresholds


def parse_duration(duration_str: str) -> int:
    """Convert duration string to seconds."""
    unit = duration_str[-1]
    value = int(duration_str[:-1])

    multipliers = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    return value * multipliers.get(unit, 1)


class ThresholdEvaluator:
    """Evaluate metrics against threshold configurations."""

    def __init__(self, configs: List[ThresholdConfig]):
        self.configs = {c.name: c for c in configs}
        # Track how long conditions have been met
        self.condition_start: Dict[str, datetime] = {}

    def evaluate(
        self,
        alert_name: str,
        current_value: float,
        historical_values: Optional[List[float]] = None
    ) -> dict:
        """
        Evaluate a metric against its threshold configuration.
        """
        config = self.configs.get(alert_name)
        if not config:
            return {"error": f"Unknown alert: {alert_name}"}

        # Evaluate based on threshold type
        if config.threshold_type == "static":
            breach = self._check_static(current_value, config.params)
        elif config.threshold_type == "percentile":
            breach = self._check_percentile(
                current_value, historical_values, config.params
            )
        elif config.threshold_type == "rate_of_change":
            breach = self._check_rate(historical_values, config.params)
        else:
            breach = False

        # Check duration requirement
        now = datetime.now()
        if breach:
            if alert_name not in self.condition_start:
                self.condition_start[alert_name] = now

            elapsed = (now - self.condition_start[alert_name]).total_seconds()
            should_fire = elapsed >= config.duration_seconds
        else:
            self.condition_start.pop(alert_name, None)
            should_fire = False
            elapsed = 0

        return {
            "alert_name": alert_name,
            "threshold_breached": breach,
            "should_fire": should_fire,
            "elapsed_seconds": elapsed,
            "required_seconds": config.duration_seconds,
            "severity": config.severity if should_fire else "none"
        }

    def _check_static(self, value: float, params: dict) -> bool:
        comparison = params.get("comparison", "gt")
        threshold = params.get("value", 0)

        ops = {
            "gt": lambda v, t: v > t,
            "lt": lambda v, t: v < t,
            "gte": lambda v, t: v >= t,
            "lte": lambda v, t: v <= t,
        }
        return ops.get(comparison, ops["gt"])(value, threshold)

    def _check_percentile(
        self,
        value: float,
        historical: Optional[List[float]],
        params: dict
    ) -> bool:
        if not historical or len(historical) < 10:
            # Fall back to absolute max if no history
            return value > params.get("max_value", float("inf"))

        percentile = params.get("percentile", 95)
        multiplier = params.get("baseline_multiplier", 1.5)

        p_value = np.percentile(historical, percentile)
        threshold = p_value * multiplier

        max_value = params.get("max_value", float("inf"))
        return value > min(threshold, max_value)

    def _check_rate(
        self,
        historical: Optional[List[tuple]],
        params: dict
    ) -> bool:
        if not historical or len(historical) < 2:
            return False

        rate = calculate_rate_of_change(historical, window_seconds=60)
        if rate is None:
            return False

        # Convert rate per second to per minute
        rate_per_min = rate * 60
        threshold = params.get("rate_per_minute", 1.0)

        return rate_per_min > threshold
```

---

## Avoiding Alert Fatigue

Alert fatigue happens when engineers receive so many alerts that they start ignoring them. Here is how to prevent it.

### Alert Budget

Set a hard limit on alerts per week per engineer.

| Severity | Max Per Week | Action if Exceeded |
|----------|--------------|-------------------|
| Critical (page) | 2-3 | Immediate threshold review |
| Warning (ticket) | 10-15 | Monthly review |
| Info (log) | Unlimited | No action needed |

### Correlation and Deduplication

One incident should not generate 50 alerts. Group related alerts.

```python
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Set

@dataclass
class Alert:
    id: str
    name: str
    service: str
    fired_at: datetime
    labels: dict


class AlertCorrelator:
    """
    Group related alerts to reduce noise.
    Prevents one incident from paging multiple times.
    """

    def __init__(
        self,
        correlation_window: int = 300,  # 5 minutes
        group_by: List[str] = None  # Labels to group by
    ):
        self.correlation_window = correlation_window
        self.group_by = group_by or ["service", "environment"]
        self.active_groups: Dict[str, List[Alert]] = defaultdict(list)
        self.suppressed_alerts: Set[str] = set()

    def process_alert(self, alert: Alert) -> dict:
        """
        Process an incoming alert. Returns routing decision.
        """
        # Generate group key from labels
        group_key = self._get_group_key(alert)

        # Clean old alerts from group
        self._clean_old_alerts(group_key, alert.fired_at)

        existing = self.active_groups[group_key]

        if not existing:
            # First alert in group - this is the primary
            self.active_groups[group_key].append(alert)
            return {
                "action": "fire",
                "alert_id": alert.id,
                "is_primary": True,
                "group_key": group_key,
                "related_alerts": 0
            }
        else:
            # Related alert - suppress the page, add to group
            self.active_groups[group_key].append(alert)
            self.suppressed_alerts.add(alert.id)

            return {
                "action": "suppress",
                "alert_id": alert.id,
                "is_primary": False,
                "group_key": group_key,
                "primary_alert": existing[0].id,
                "related_alerts": len(existing)
            }

    def _get_group_key(self, alert: Alert) -> str:
        """Generate correlation key from alert labels."""
        parts = [alert.labels.get(key, "unknown") for key in self.group_by]
        return ":".join(parts)

    def _clean_old_alerts(self, group_key: str, current_time: datetime):
        """Remove alerts outside the correlation window."""
        cutoff = current_time - timedelta(seconds=self.correlation_window)
        self.active_groups[group_key] = [
            a for a in self.active_groups[group_key]
            if a.fired_at >= cutoff
        ]

    def get_summary(self, group_key: str) -> dict:
        """Get summary of alerts in a correlation group."""
        alerts = self.active_groups.get(group_key, [])
        if not alerts:
            return {"group_key": group_key, "count": 0}

        return {
            "group_key": group_key,
            "count": len(alerts),
            "primary_alert": alerts[0].name,
            "first_fired": alerts[0].fired_at.isoformat(),
            "affected_alerts": [a.name for a in alerts],
            "suppressed_count": len(alerts) - 1
        }


# Example: Database overload causes multiple service alerts
correlator = AlertCorrelator(
    correlation_window=300,
    group_by=["environment", "cluster"]
)

now = datetime.now()

# Database alert fires first
db_alert = Alert(
    id="alert-1",
    name="database_connections_high",
    service="postgres-primary",
    fired_at=now,
    labels={"environment": "prod", "cluster": "us-east"}
)

result = correlator.process_alert(db_alert)
print(f"DB alert: {result['action']}")  # fire

# Downstream service alerts fire
for i, service in enumerate(["api-gateway", "user-service", "order-service"]):
    alert = Alert(
        id=f"alert-{i+2}",
        name=f"{service}_latency_high",
        service=service,
        fired_at=now + timedelta(seconds=30 * i),
        labels={"environment": "prod", "cluster": "us-east"}
    )
    result = correlator.process_alert(alert)
    print(f"{service} alert: {result['action']}")  # suppress

# Get summary
summary = correlator.get_summary("prod:us-east")
print(f"Total alerts in group: {summary['count']}")
print(f"Suppressed: {summary['suppressed_count']}")
```

### Escalation Tiers

Not every alert needs to page someone. Use tiers.

| Tier | Routing | Example |
|------|---------|---------|
| Page (Critical) | Phone call, SMS | Service down, SLO burn critical |
| Notify (Warning) | Slack, email | Performance degraded, capacity warning |
| Log (Info) | Dashboard, log aggregator | Anomaly detected, threshold approached |

```python
from enum import Enum
from dataclasses import dataclass
from typing import Callable, List

class AlertTier(Enum):
    PAGE = "page"      # Wake someone up
    NOTIFY = "notify"  # Slack/email during business hours
    LOG = "log"        # Dashboard/log only


@dataclass
class EscalationRule:
    name: str
    tier: AlertTier
    condition: Callable[[dict], bool]
    channels: List[str]


class EscalationRouter:
    """
    Route alerts to appropriate channels based on severity and context.
    """

    def __init__(self):
        self.rules: List[EscalationRule] = []
        self.default_tier = AlertTier.LOG

    def add_rule(self, rule: EscalationRule):
        self.rules.append(rule)

    def route(self, alert: dict) -> dict:
        """
        Determine routing for an alert.
        """
        for rule in self.rules:
            if rule.condition(alert):
                return {
                    "tier": rule.tier.value,
                    "channels": rule.channels,
                    "rule_matched": rule.name
                }

        return {
            "tier": self.default_tier.value,
            "channels": ["logs"],
            "rule_matched": "default"
        }


# Example configuration
router = EscalationRouter()

# Critical: Service completely down
router.add_rule(EscalationRule(
    name="service_down",
    tier=AlertTier.PAGE,
    condition=lambda a: a.get("availability", 100) < 50,
    channels=["pagerduty", "slack-incidents"]
))

# Critical: SLO budget exhausted
router.add_rule(EscalationRule(
    name="slo_budget_exhausted",
    tier=AlertTier.PAGE,
    condition=lambda a: a.get("slo_budget_remaining", 100) < 10,
    channels=["pagerduty", "slack-incidents"]
))

# Warning: Degraded performance
router.add_rule(EscalationRule(
    name="performance_degraded",
    tier=AlertTier.NOTIFY,
    condition=lambda a: a.get("latency_p95", 0) > a.get("slo_latency", 1000),
    channels=["slack-alerts", "email-oncall"]
))

# Warning: Capacity approaching limit
router.add_rule(EscalationRule(
    name="capacity_warning",
    tier=AlertTier.NOTIFY,
    condition=lambda a: a.get("capacity_used_pct", 0) > 80,
    channels=["slack-alerts"]
))

# Test routing
alerts = [
    {"name": "api-gateway", "availability": 30, "severity": "critical"},
    {"name": "user-service", "latency_p95": 1500, "slo_latency": 500},
    {"name": "cache", "capacity_used_pct": 85},
    {"name": "worker", "error_rate": 0.5},  # No rule matches
]

for alert in alerts:
    routing = router.route(alert)
    print(f"{alert['name']}: {routing['tier']} via {routing['channels']}")
```

---

## Putting It Together: A Complete Example

Here is a complete alert configuration for a typical web service.

```python
class ServiceAlertConfig:
    """
    Complete alert configuration for a web service.
    Combines multiple threshold types with proper escalation.
    """

    def __init__(self, service_name: str):
        self.service_name = service_name

        # Initialize components
        self.latency_baseline = WeeklyBaseline(deviation_multiplier=2.5)
        self.error_rate_tracker = SlidingWindowPercentile(
            window_seconds=300, percentile=95
        )
        self.correlator = AlertCorrelator(
            correlation_window=300,
            group_by=["service", "environment"]
        )
        self.router = EscalationRouter()

        # Configure escalation rules
        self._setup_escalation()

        # Static thresholds for hard limits
        self.static_thresholds = {
            "cpu_percent": 95,
            "memory_percent": 90,
            "disk_percent": 90,
            "connection_pool_used_percent": 85,
        }

    def _setup_escalation(self):
        # Page for critical issues
        self.router.add_rule(EscalationRule(
            name="critical",
            tier=AlertTier.PAGE,
            condition=lambda a: a.get("severity") == "critical",
            channels=["pagerduty", "slack-incidents"]
        ))

        # Notify for warnings
        self.router.add_rule(EscalationRule(
            name="warning",
            tier=AlertTier.NOTIFY,
            condition=lambda a: a.get("severity") == "warning",
            channels=["slack-alerts"]
        ))

    def check_all(
        self,
        metrics: dict,
        timestamp: datetime
    ) -> List[dict]:
        """
        Run all threshold checks and return alerts.
        """
        alerts = []

        # Static threshold checks
        for metric, threshold in self.static_thresholds.items():
            value = metrics.get(metric)
            if value and value > threshold:
                alerts.append({
                    "type": "static",
                    "metric": metric,
                    "value": value,
                    "threshold": threshold,
                    "severity": "critical" if value > threshold * 1.1 else "warning"
                })

        # Latency baseline check
        latency = metrics.get("latency_p95")
        if latency:
            result = self.latency_baseline.check_value(latency, timestamp)
            if result.get("alert"):
                alerts.append({
                    "type": "baseline",
                    "metric": "latency_p95",
                    "value": latency,
                    "expected": result["expected_mean"],
                    "deviation_sigma": result["deviation_sigma"],
                    "severity": result.get("severity", "warning")
                })

        # Error rate percentile check
        error_rate = metrics.get("error_rate")
        if error_rate:
            self.error_rate_tracker.add_value(error_rate, timestamp.timestamp())
            result = self.error_rate_tracker.check_threshold(error_rate)
            if result.get("alert"):
                alerts.append({
                    "type": "percentile",
                    "metric": "error_rate",
                    "value": error_rate,
                    "threshold": result["threshold"],
                    "severity": "critical" if error_rate > 5 else "warning"
                })

        # Deduplicate and route
        processed = []
        for alert in alerts:
            alert["service"] = self.service_name
            alert["timestamp"] = timestamp.isoformat()

            # Create Alert object for correlation
            alert_obj = Alert(
                id=f"{self.service_name}-{alert['metric']}-{timestamp.timestamp()}",
                name=f"{self.service_name}_{alert['metric']}",
                service=self.service_name,
                fired_at=timestamp,
                labels={"service": self.service_name, "environment": "prod"}
            )

            correlation_result = self.correlator.process_alert(alert_obj)

            if correlation_result["action"] == "fire":
                routing = self.router.route(alert)
                alert["routing"] = routing
                processed.append(alert)
            else:
                alert["suppressed"] = True
                alert["primary_alert"] = correlation_result["primary_alert"]

        return processed


# Example usage
config = ServiceAlertConfig("api-gateway")

# Simulate loading baseline data
for week in range(4):
    for day in range(7):
        for hour in range(24):
            ts = datetime(2024, 1, week * 7 + day + 1, hour, 0)
            # Simulate latency pattern
            base_latency = 100 + 50 * (1 if day < 5 and 9 <= hour <= 17 else 0)
            config.latency_baseline.add_value(
                base_latency + random.gauss(0, 10),
                ts
            )

# Check current metrics
current_metrics = {
    "cpu_percent": 78,
    "memory_percent": 65,
    "disk_percent": 45,
    "latency_p95": 280,  # Higher than normal
    "error_rate": 2.1,
}

alerts = config.check_all(
    metrics=current_metrics,
    timestamp=datetime.now()
)

for alert in alerts:
    if not alert.get("suppressed"):
        print(f"ALERT: {alert['metric']} = {alert['value']}")
        print(f"  Type: {alert['type']}, Severity: {alert['severity']}")
        print(f"  Route: {alert['routing']['channels']}")
```

---

## Key Takeaways

1. **Start with SLOs, not metrics.** Alert on what affects users, not what looks interesting on a dashboard.

2. **Layer threshold types.** Use static for hard limits, percentiles for latency, rate of change for sudden spikes, and baselines for pattern-aware detection.

3. **Build in duration requirements.** A brief spike is not the same as a sustained problem. Require conditions to persist before firing.

4. **Correlate and deduplicate.** One incident should produce one page, not twenty.

5. **Review monthly.** Track false positive rates, alert counts, and missed incidents. Adjust thresholds based on data.

6. **Set alert budgets.** Limit pages per engineer per week. If you exceed the budget, fix the threshold.

7. **Route by severity.** Not everything needs to wake someone up. Use tiers: page, notify, and log.

Good threshold design is not about catching every anomaly. It is about catching the anomalies that matter while letting your team rest.

---

## Related Reading

- [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [SRE On-Call Rotation Design](https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view)
- [What is Toil and How to Eliminate It](https://oneuptime.com/blog/post/2025-10-01-what-is-toil-and-how-to-eliminate-it/view)
