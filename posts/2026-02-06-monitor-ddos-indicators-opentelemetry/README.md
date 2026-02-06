# How to Use OpenTelemetry to Monitor DDoS Attack Indicators (Request Spikes, GeoIP Anomalies, Connection Floods)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DDoS Detection, Security Monitoring, GeoIP

Description: Monitor DDoS attack indicators including request spikes, GeoIP anomalies, and connection floods using OpenTelemetry metrics and traces.

DDoS attacks are not always volumetric blasts that overwhelm your bandwidth. Application-layer DDoS attacks can look like normal traffic at the network level while exhausting your application resources. OpenTelemetry gives you the application-level visibility to detect these attacks early, before they cause outages.

## DDoS Indicator Metrics

```python
# ddos_metrics.py
from opentelemetry import metrics, trace

meter = metrics.get_meter("security.ddos")
tracer = trace.get_tracer("security.ddos")

# Request rate metrics
request_rate = meter.create_counter(
    "ddos.request.rate",
    description="Request count for DDoS monitoring",
    unit="1",
)

# Connection metrics
active_connections = meter.create_up_down_counter(
    "ddos.connections.active",
    description="Currently active connections",
    unit="1",
)

new_connections_rate = meter.create_counter(
    "ddos.connections.new",
    description="New connections per second",
    unit="1",
)

# Geographic distribution
requests_by_country = meter.create_counter(
    "ddos.requests.by_country",
    description="Request count by country code",
    unit="1",
)

# Response time degradation
response_time = meter.create_histogram(
    "ddos.response_time",
    description="Response time for DDoS impact measurement",
    unit="ms",
)

# Error rate spike detection
error_counter = meter.create_counter(
    "ddos.errors",
    description="Error count for spike detection",
    unit="1",
)

# Resource exhaustion signals
concurrent_requests = meter.create_up_down_counter(
    "ddos.concurrent_requests",
    description="Currently processing requests",
    unit="1",
)
```

## Request Spike Detection

Track request rates with enough granularity to detect sudden spikes:

```python
# spike_detector.py
from collections import deque
import time
import statistics

class RequestSpikeDetector:
    def __init__(self, window_size: int = 60, spike_multiplier: float = 3.0):
        self.window_size = window_size  # seconds
        self.spike_multiplier = spike_multiplier
        self.request_counts = deque(maxlen=window_size)
        self.current_second = 0
        self.current_count = 0

    def record_request(self, source_ip: str, endpoint: str, country: str):
        """Record a request and check for spike conditions."""
        now = int(time.time())

        # Roll to new second if needed
        if now != self.current_second:
            self.request_counts.append(self.current_count)
            self.current_second = now
            self.current_count = 0

        self.current_count += 1

        request_rate.add(1, {
            "ddos.source_ip": source_ip,
            "ddos.endpoint": endpoint,
        })

        requests_by_country.add(1, {
            "ddos.country": country,
        })

        # Check for spike
        if len(self.request_counts) >= 30:
            return self._check_spike()

        return None

    def _check_spike(self):
        """Determine if current request rate is a spike."""
        recent = list(self.request_counts)
        if not recent:
            return None

        baseline = statistics.median(recent[:-5]) if len(recent) > 5 else statistics.median(recent)
        current_rate = statistics.mean(recent[-5:]) if len(recent) >= 5 else recent[-1]

        if baseline > 0 and current_rate > baseline * self.spike_multiplier:
            with tracer.start_as_current_span(
                "ddos.spike_detected",
                attributes={
                    "ddos.baseline_rps": baseline,
                    "ddos.current_rps": current_rate,
                    "ddos.spike_multiplier": current_rate / baseline,
                }
            ) as span:
                span.add_event("request_spike", {
                    "ddos.baseline": baseline,
                    "ddos.current": current_rate,
                })
                return {
                    "type": "request_spike",
                    "baseline_rps": baseline,
                    "current_rps": current_rate,
                    "multiplier": current_rate / baseline,
                }

        return None
```

## GeoIP Anomaly Detection

Sudden traffic from countries you do not normally serve is a strong DDoS indicator:

```python
# geo_anomaly_detector.py
from collections import defaultdict, Counter

class GeoAnomalyDetector:
    def __init__(self):
        self.baseline_distribution = {}  # country -> percentage
        self.current_window = Counter()
        self.window_total = 0

    def set_baseline(self, distribution: dict):
        """Set the normal geographic distribution of traffic."""
        self.baseline_distribution = distribution

    def record_request(self, country_code: str):
        """Record request origin and check for geographic anomalies."""
        self.current_window[country_code] += 1
        self.window_total += 1

        # Check every 100 requests
        if self.window_total % 100 == 0:
            return self._check_anomaly()
        return None

    def _check_anomaly(self):
        """Compare current distribution to baseline."""
        if self.window_total < 100:
            return None

        anomalies = []
        for country, count in self.current_window.items():
            current_pct = (count / self.window_total) * 100
            baseline_pct = self.baseline_distribution.get(country, 0)

            # New country appearing with significant traffic
            if baseline_pct == 0 and current_pct > 5:
                anomalies.append({
                    "country": country,
                    "current_pct": current_pct,
                    "baseline_pct": 0,
                    "type": "new_source_country",
                })

            # Existing country with abnormal increase
            elif baseline_pct > 0 and current_pct > baseline_pct * 3:
                anomalies.append({
                    "country": country,
                    "current_pct": current_pct,
                    "baseline_pct": baseline_pct,
                    "type": "traffic_surge",
                })

        if anomalies:
            with tracer.start_as_current_span(
                "ddos.geo_anomaly_detected",
                attributes={
                    "ddos.anomaly_count": len(anomalies),
                }
            ) as span:
                for a in anomalies:
                    span.add_event(f"geo_anomaly_{a['type']}", {
                        "ddos.country": a["country"],
                        "ddos.current_pct": a["current_pct"],
                        "ddos.baseline_pct": a["baseline_pct"],
                    })
                return anomalies

        return None
```

## Connection Flood Detection

Application-layer connection floods try to exhaust your server's connection pool:

```python
# connection_monitor.py
class ConnectionFloodDetector:
    def __init__(self, max_connections_per_ip: int = 100):
        self.connections_per_ip = defaultdict(int)
        self.max_per_ip = max_connections_per_ip

    def on_connection_open(self, source_ip: str):
        """Track new connections."""
        self.connections_per_ip[source_ip] += 1
        new_connections_rate.add(1, {"ddos.source_ip": source_ip})
        active_connections.add(1, {"ddos.source_ip": source_ip})

        if self.connections_per_ip[source_ip] > self.max_per_ip:
            with tracer.start_as_current_span(
                "ddos.connection_flood",
                attributes={
                    "ddos.source_ip": source_ip,
                    "ddos.connection_count": self.connections_per_ip[source_ip],
                    "ddos.max_allowed": self.max_per_ip,
                }
            ) as span:
                span.add_event("connection_flood_detected")
                return True
        return False

    def on_connection_close(self, source_ip: str):
        """Track closed connections."""
        self.connections_per_ip[source_ip] = max(0, self.connections_per_ip[source_ip] - 1)
        active_connections.add(-1, {"ddos.source_ip": source_ip})
```

## Slowloris Detection

Slowloris attacks send requests very slowly to tie up server threads:

```python
# slowloris_detector.py
class SlowlorisDetector:
    def track_request_duration(self, source_ip: str, request_start: float,
                                headers_complete: float, body_complete: float):
        """Detect abnormally slow request sending patterns."""
        header_time = headers_complete - request_start
        body_time = body_complete - headers_complete

        with tracer.start_as_current_span(
            "ddos.request_timing",
            attributes={
                "ddos.source_ip": source_ip,
                "ddos.header_time_s": header_time,
                "ddos.body_time_s": body_time,
            }
        ) as span:
            # Normal requests complete headers in under 5 seconds
            if header_time > 10:
                span.add_event("slow_headers_detected", {
                    "ddos.header_time_s": header_time,
                    "ddos.attack_type": "slowloris",
                })
                return {"detected": True, "type": "slowloris"}

        return {"detected": False}
```

## Combining Signals

No single indicator definitively identifies a DDoS attack. The power of monitoring with OpenTelemetry is that you can correlate multiple signals: a request spike combined with a geographic anomaly and rising error rates is a much stronger signal than any one of these alone. Build your alerting rules to look for combinations, not individual metrics, and you will catch attacks faster with fewer false alarms.
