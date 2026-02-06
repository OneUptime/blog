# How to Use OpenTelemetry to Detect Brute-Force Authentication Attacks in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Security, Brute Force Detection, Authentication

Description: Detect brute-force authentication attacks in real time using OpenTelemetry custom metrics and span attributes for security observability.

Brute-force attacks against authentication endpoints are one of the most common threats facing web applications. Traditional approaches rely on WAFs or separate security tools, but OpenTelemetry gives you the ability to detect these patterns from within your application with richer context than network-level tools can provide.

## What Makes Brute-Force Detection Possible with OpenTelemetry

Your application knows things that network tools do not: which user accounts are being targeted, whether the attempts use valid usernames, and what authentication methods are being tried. By emitting this information as OpenTelemetry metrics and span attributes, you create a detection pipeline that catches attacks early.

## Instrumenting the Authentication Endpoint

```python
# auth_security.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
from collections import defaultdict
import time

tracer = trace.get_tracer("security.auth")
meter = metrics.get_meter("security.auth")

# Metrics for detecting brute force
login_attempts = meter.create_counter(
    "security.auth.login_attempts",
    description="Number of login attempts",
    unit="1",
)

failed_logins = meter.create_counter(
    "security.auth.failed_logins",
    description="Number of failed login attempts",
    unit="1",
)

login_attempt_rate = meter.create_histogram(
    "security.auth.attempt_rate",
    description="Rate of login attempts per source IP",
    unit="attempts/min",
)

account_lockouts = meter.create_counter(
    "security.auth.lockouts",
    description="Number of account lockouts triggered",
    unit="1",
)

class AuthSecurityMonitor:
    def __init__(self):
        # In-memory counters for rate detection
        # In production, use Redis for distributed counting
        self.ip_attempt_counts = defaultdict(list)
        self.username_attempt_counts = defaultdict(list)

    async def process_login_attempt(self, username: str, source_ip: str,
                                      user_agent: str, success: bool):
        """Record and analyze a login attempt for brute-force patterns."""
        with tracer.start_as_current_span(
            "security.auth.attempt",
            attributes={
                "security.source_ip": source_ip,
                "security.username_hash": hash_username(username),
                "security.user_agent": user_agent,
                "security.login.success": success,
            }
        ) as span:
            now = time.time()

            # Record basic metrics
            login_attempts.add(1, {
                "security.login.success": str(success),
                "security.source_ip": source_ip,
            })

            if not success:
                failed_logins.add(1, {
                    "security.source_ip": source_ip,
                })

            # Track attempts per IP in the last 5 minutes
            self.ip_attempt_counts[source_ip].append(now)
            self._cleanup_old_attempts(self.ip_attempt_counts[source_ip], now, 300)

            # Track attempts per username in the last 10 minutes
            self.username_attempt_counts[username].append(now)
            self._cleanup_old_attempts(self.username_attempt_counts[username], now, 600)

            # Analyze for brute force patterns
            ip_rate = len(self.ip_attempt_counts[source_ip])
            username_rate = len(self.username_attempt_counts[username])

            login_attempt_rate.record(ip_rate, {
                "security.source_ip": source_ip,
            })

            span.set_attribute("security.ip_attempts_5min", ip_rate)
            span.set_attribute("security.username_attempts_10min", username_rate)

            # Detect brute force from single IP
            if ip_rate > 20:
                span.add_event("brute_force_detected", {
                    "security.detection.type": "ip_rate_exceeded",
                    "security.source_ip": source_ip,
                    "security.attempt_count": ip_rate,
                })
                await self._handle_brute_force(source_ip, "ip_rate", span)

            # Detect credential stuffing (many usernames from one IP)
            unique_usernames = self._count_unique_usernames(source_ip, now, 300)
            if unique_usernames > 10:
                span.add_event("credential_stuffing_detected", {
                    "security.detection.type": "credential_stuffing",
                    "security.unique_usernames": unique_usernames,
                })

    def _cleanup_old_attempts(self, attempts: list, now: float, window: int):
        """Remove attempts outside the time window."""
        cutoff = now - window
        while attempts and attempts[0] < cutoff:
            attempts.pop(0)

    async def _handle_brute_force(self, source_ip: str, detection_type: str, span):
        """Take action when brute force is detected."""
        with tracer.start_as_current_span(
            "security.brute_force.response",
            attributes={
                "security.source_ip": source_ip,
                "security.response.action": "block",
            }
        ):
            # Block the IP temporarily
            await block_ip_temporarily(source_ip, duration_minutes=30)

            account_lockouts.add(1, {
                "security.detection_type": detection_type,
            })
```

## GeoIP Anomaly Detection

Add geographic context to detect impossible travel patterns:

```python
# geo_detection.py
import geoip2.database

def check_geo_anomaly(user_id: str, source_ip: str, span):
    """Detect geographic anomalies in login attempts."""
    current_location = get_geo_location(source_ip)

    if current_location:
        span.set_attribute("security.geo.country", current_location["country"])
        span.set_attribute("security.geo.city", current_location["city"])

        last_login = get_last_login_location(user_id)
        if last_login:
            distance_km = calculate_distance(last_login, current_location)
            time_diff_hours = get_time_since_last_login(user_id)

            span.set_attribute("security.geo.distance_km", distance_km)
            span.set_attribute("security.geo.time_since_last_hours", time_diff_hours)

            # Impossible travel: too far in too short a time
            if distance_km > 500 and time_diff_hours < 1:
                span.add_event("impossible_travel_detected", {
                    "security.geo.distance_km": distance_km,
                    "security.geo.time_hours": time_diff_hours,
                })
                return True
    return False
```

## OpenTelemetry Collector Alerting Pipeline

Configure your collector to forward security events to your alerting system:

```yaml
# otel-collector-security.yaml
processors:
  filter/security_events:
    traces:
      include:
        match_type: regexp
        span_names:
          - "security\\..*"

  attributes/enrich:
    actions:
      - key: security.pipeline
        value: "brute_force_detection"
        action: insert

exporters:
  otlp/security:
    endpoint: security-backend:4317
  logging/security:
    loglevel: warn

service:
  pipelines:
    traces/security:
      receivers: [otlp]
      processors: [filter/security_events, attributes/enrich]
      exporters: [otlp/security, logging/security]
```

## Summary

Brute-force detection with OpenTelemetry gives you application-level visibility that network-based tools miss. You see not just the volume of requests, but which accounts are targeted, what credentials are being tried, and how the attack pattern evolves. Combined with automated blocking and geo-anomaly detection, this creates a defense layer that runs inside your application where it has the most context.
