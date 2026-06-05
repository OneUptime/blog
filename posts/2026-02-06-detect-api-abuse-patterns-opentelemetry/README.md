# How to Detect API Abuse Patterns with OpenTelemetry Rate Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, API Abuse, Credential Stuffing, Rate Metrics

Description: Detect API abuse patterns including credential stuffing, scraping, and enumeration attacks using OpenTelemetry rate metrics and span analysis.

API abuse comes in many forms. Credential stuffing uses stolen credentials to take over accounts. Scraping extracts data at scale. Enumeration probes your API to discover valid usernames, email addresses, or resource IDs. Each pattern has distinct telemetry signatures that you can catch with the right OpenTelemetry instrumentation.

## Defining Abuse Detection Metrics

```python
# abuse_metrics.py

from opentelemetry import metrics, trace

meter = metrics.get_meter("security.abuse")
tracer = trace.get_tracer("security.abuse")

# Request rate metrics
requests_per_ip = meter.create_counter(
    "security.abuse.requests_per_ip",
    description="Request count per source IP",
    unit="1",
)

# Response pattern metrics
response_status_counter = meter.create_counter(
    "security.abuse.response_status",
    description="Response status codes per source IP and endpoint",
    unit="1",
)

# Enumeration detection
sequential_id_counter = meter.create_counter(
    "security.abuse.sequential_ids",
    description="Requests with sequential resource IDs",
    unit="1",
)

# Scraping detection
unique_pages_per_session = meter.create_histogram(
    "security.abuse.unique_pages_per_session",
    description="Unique pages accessed per session in a time window",
    unit="1",
)

# Data volume metrics
response_data_volume = meter.create_counter(
    "security.abuse.response_data",
    description="Total response bytes per source",
    unit="By",
)
```

## Credential Stuffing Detection

Credential stuffing has a distinct pattern: high request rate to authentication endpoints with a high failure rate and many unique usernames:

```python
# credential_stuffing_detector.py
from collections import defaultdict
import time

from abuse_metrics import tracer

class CredentialStuffingDetector:
    def __init__(self):
        self.ip_auth_stats = defaultdict(lambda: {
            "attempts": 0,
            "failures": 0,
            "response_times": [],
            "unique_usernames": set(),
            "window_start": time.time(),
        })

    def analyze_auth_request(self, source_ip: str, username: str,
                              success: bool, response_time_ms: float):
        """Analyze an authentication request for credential stuffing signals."""
        with tracer.start_as_current_span(
            "security.abuse.auth_analysis",
            attributes={
                "security.source_ip": source_ip,
                "security.auth.success": success,
            }
        ) as span:
            stats = self.ip_auth_stats[source_ip]

            # Reset window every 5 minutes
            if time.time() - stats["window_start"] > 300:
                self._reset_stats(source_ip)
                stats = self.ip_auth_stats[source_ip]

            stats["attempts"] += 1
            if not success:
                stats["failures"] += 1
            stats["unique_usernames"].add(username)
            stats["response_times"].append(response_time_ms)

            failure_rate = stats["failures"] / max(stats["attempts"], 1)
            username_count = len(stats["unique_usernames"])
            response_times = stats["response_times"][-20:]
            avg_response_time = sum(response_times) / max(len(response_times), 1)
            max_response_variance = max(
                (abs(response_time - avg_response_time) for response_time in response_times),
                default=0,
            )

            span.set_attribute("security.abuse.attempt_count", stats["attempts"])
            span.set_attribute("security.abuse.failure_rate", failure_rate)
            span.set_attribute("security.abuse.unique_usernames", username_count)
            span.set_attribute("security.abuse.response_time_variance_ms", max_response_variance)

            # Credential stuffing indicators:
            # - High failure rate (> 90%)
            # - Many unique usernames from one IP
            # - Consistent response times (automated)
            is_stuffing = (
                stats["attempts"] > 20
                and failure_rate > 0.9
                and username_count > 10
                and max_response_variance < 50
            )

            if is_stuffing:
                span.add_event("credential_stuffing_detected", {
                    "security.source_ip": source_ip,
                    "security.attempts": stats["attempts"],
                    "security.failure_rate": failure_rate,
                    "security.unique_usernames": username_count,
                })
                return {"detected": True, "type": "credential_stuffing", "confidence": "high"}

            return {"detected": False}

    def _reset_stats(self, source_ip):
        self.ip_auth_stats[source_ip] = {
            "attempts": 0,
            "failures": 0,
            "response_times": [],
            "unique_usernames": set(),
            "window_start": time.time(),
        }
```

## Scraping Detection

Scraping shows up as unusually high page access counts with specific patterns:

```python
# scraping_detector.py
from collections import defaultdict

from abuse_metrics import response_data_volume, tracer, unique_pages_per_session

class ScrapingDetector:
    def __init__(self):
        self.session_pages = defaultdict(set)
        self.session_data_volume = defaultdict(int)

    def analyze_request(self, session_id: str, source_ip: str,
                        endpoint: str, response_size: int, user_agent: str):
        """Analyze request patterns for scraping behavior."""
        with tracer.start_as_current_span(
            "security.abuse.scraping_analysis",
            attributes={
                "security.source_ip": source_ip,
                "security.endpoint": endpoint,
            }
        ) as span:
            self.session_pages[session_id].add(endpoint)
            self.session_data_volume[session_id] += response_size

            page_count = len(self.session_pages[session_id])
            total_bytes = self.session_data_volume[session_id]

            unique_pages_per_session.record(page_count, {
                "security.source_ip": source_ip,
            })

            response_data_volume.add(response_size, {
                "security.source_ip": source_ip,
                "security.endpoint": endpoint,
            })

            span.set_attribute("security.abuse.pages_accessed", page_count)
            span.set_attribute("security.abuse.data_volume_bytes", total_bytes)

            # Scraping indicators
            scraping_signals = []

            if page_count > 100:
                scraping_signals.append("high_page_count")

            if total_bytes > 50 * 1024 * 1024:  # 50MB
                scraping_signals.append("high_data_volume")

            if self._is_bot_user_agent(user_agent):
                scraping_signals.append("bot_user_agent")

            if self._has_systematic_pattern(self.session_pages[session_id]):
                scraping_signals.append("systematic_access")

            if len(scraping_signals) >= 2:
                span.add_event("scraping_detected", {
                    "security.signals": ",".join(scraping_signals),
                    "security.page_count": page_count,
                })
                return {"detected": True, "signals": scraping_signals}

            return {"detected": False}

    def _is_bot_user_agent(self, user_agent: str) -> bool:
        """Check for common automated client identifiers."""
        bot_indicators = ("bot", "crawler", "spider", "scraper", "curl", "wget", "python-requests")
        return any(indicator in user_agent.lower() for indicator in bot_indicators)

    def _has_systematic_pattern(self, pages: set) -> bool:
        """Check if page access follows a systematic pattern like pagination."""
        page_list = sorted(pages)
        if len(page_list) < 5:
            return False
        # Check for sequential pagination patterns
        pagination_pages = [p for p in page_list if "page=" in p or "offset=" in p]
        return len(pagination_pages) > len(page_list) * 0.5
```

## Enumeration Detection

Enumeration attacks probe your API to discover valid resources:

```python
# enumeration_detector.py
from collections import defaultdict

from abuse_metrics import response_status_counter, sequential_id_counter, tracer

class EnumerationDetector:
    def __init__(self):
        self.ip_endpoint_stats = defaultdict(lambda: {
            "total": 0,
            "403_count": 0,
            "404_count": 0,
        })

    def analyze_request(self, source_ip: str, endpoint: str,
                        resource_id: str, status_code: int):
        """Detect enumeration attacks targeting resource IDs."""
        with tracer.start_as_current_span(
            "security.abuse.enumeration_analysis",
            attributes={
                "security.source_ip": source_ip,
                "security.endpoint": endpoint,
                "http.response.status_code": status_code,
            }
        ) as span:
            response_status_counter.add(1, {
                "security.source_ip": source_ip,
                "security.endpoint": endpoint,
                "http.response.status_code": status_code,
            })

            # Track sequential ID access
            if resource_id and resource_id.isdigit():
                sequential_id_counter.add(1, {
                    "security.source_ip": source_ip,
                    "security.endpoint": endpoint,
                })

            # Enumeration indicators:
            # - High rate of 404/403 responses
            # - Sequential or incremental resource IDs
            # - Fast request timing (automated)
            stats = self._get_ip_endpoint_stats(source_ip, endpoint, status_code)

            not_found_rate = stats.get("404_count", 0) / max(stats.get("total", 1), 1)
            forbidden_rate = stats.get("403_count", 0) / max(stats.get("total", 1), 1)

            if not_found_rate > 0.7 and stats.get("total", 0) > 30:
                span.add_event("enumeration_detected", {
                    "security.type": "resource_enumeration",
                    "security.not_found_rate": not_found_rate,
                    "security.total_requests": stats["total"],
                })
                return {"detected": True, "type": "enumeration"}

            if forbidden_rate > 0.7 and stats.get("total", 0) > 20:
                span.add_event("enumeration_detected", {
                    "security.type": "permission_enumeration",
                    "security.forbidden_rate": forbidden_rate,
                })
                return {"detected": True, "type": "permission_probing"}

            return {"detected": False}

    def _get_ip_endpoint_stats(self, source_ip: str, endpoint: str, status_code: int):
        stats = self.ip_endpoint_stats[(source_ip, endpoint)]
        stats["total"] += 1
        if status_code == 403:
            stats["403_count"] += 1
        elif status_code == 404:
            stats["404_count"] += 1
        return stats
```

## Unified Abuse Detection Middleware

Tie all the detectors together in a single middleware:

```python
# abuse_detection_middleware.py
import time

from fastapi import Request

from abuse_metrics import requests_per_ip
from credential_stuffing_detector import CredentialStuffingDetector
from enumeration_detector import EnumerationDetector
from scraping_detector import ScrapingDetector

credential_detector = CredentialStuffingDetector()
enumeration_detector = EnumerationDetector()
scraping_detector = ScrapingDetector()

async def abuse_detection_middleware(request: Request, call_next):
    source_ip = request.client.host if request.client else "unknown"
    start_time = time.perf_counter()
    requests_per_ip.add(1, {"security.source_ip": source_ip})

    response = await call_next(request)
    response_time_ms = (time.perf_counter() - start_time) * 1000

    # Run detectors based on endpoint type
    if "/auth/" in request.url.path:
        credential_detector.analyze_auth_request(
            source_ip, getattr(request.state, "username", ""),
            response.status_code == 200, response_time_ms
        )

    resource_id = next(
        (
            str(value)
            for key, value in request.path_params.items()
            if key == "id" or key.endswith("_id")
        ),
        "",
    )
    enumeration_detector.analyze_request(
        source_ip, request.url.path, resource_id, response.status_code
    )

    scraping_detector.analyze_request(
        getattr(request.state, "session_id", source_ip), source_ip,
        request.url.path, int(response.headers.get("content-length", 0)),
        request.headers.get("user-agent", ""),
    )

    return response
```

## The Value of Rate Metrics

Each abuse type has a signature in your rate metrics. Credential stuffing shows as a spike in auth failures with high username cardinality. Scraping shows as abnormal data volume from a single source. Enumeration shows as high 404 rates on parameterized endpoints. With OpenTelemetry capturing these signals, you can build automated responses that trigger before the abuse causes real damage.
