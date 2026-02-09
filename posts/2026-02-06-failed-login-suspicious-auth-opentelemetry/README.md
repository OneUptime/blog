# How to Track Failed Login Attempts and Suspicious Authentication Patterns with OpenTelemetry Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Authentication Security, Failed Logins, Custom Metrics

Description: Track failed login attempts and suspicious authentication patterns using OpenTelemetry custom metrics for proactive security monitoring.

Failed login attempts are the earliest signal of credential-based attacks. But raw counts are not enough. You need to understand the patterns: Is one IP trying many accounts? Is one account being targeted from many IPs? Are the failures happening with valid usernames or random strings? OpenTelemetry custom metrics let you capture these patterns in a way that is both actionable and efficient.

## Comprehensive Login Metrics

```python
# login_metrics.py
from opentelemetry import metrics, trace

meter = metrics.get_meter("auth.security")
tracer = trace.get_tracer("auth.security")

# Basic login counters
login_total = meter.create_counter(
    "auth.login.total",
    description="Total login attempts",
    unit="1",
)

login_failures = meter.create_counter(
    "auth.login.failures",
    description="Failed login attempts by failure reason",
    unit="1",
)

login_success = meter.create_counter(
    "auth.login.success",
    description="Successful login attempts",
    unit="1",
)

# Pattern detection metrics
login_failure_streak = meter.create_histogram(
    "auth.login.failure_streak",
    description="Consecutive failures before success or lockout",
    unit="1",
)

unique_ips_per_account = meter.create_histogram(
    "auth.login.unique_ips_per_account",
    description="Unique IPs attempting login for a single account in a window",
    unit="1",
)

unique_accounts_per_ip = meter.create_histogram(
    "auth.login.unique_accounts_per_ip",
    description="Unique accounts attempted from a single IP in a window",
    unit="1",
)

# Time-based metrics
time_between_attempts = meter.create_histogram(
    "auth.login.time_between_attempts",
    description="Time between consecutive login attempts from the same source",
    unit="ms",
)
```

## The Authentication Monitor

```python
# auth_monitor.py
from collections import defaultdict
import time
import hashlib

class AuthenticationMonitor:
    def __init__(self):
        self.ip_accounts = defaultdict(set)       # IP -> set of attempted accounts
        self.account_ips = defaultdict(set)        # account -> set of source IPs
        self.ip_last_attempt = {}                  # IP -> timestamp of last attempt
        self.account_failure_streak = defaultdict(int)
        self.window_start = time.time()

    def record_login_attempt(self, username: str, source_ip: str,
                              success: bool, failure_reason: str = None,
                              auth_method: str = "password"):
        """Record a login attempt with full context for pattern analysis."""
        # Hash the username for metrics to avoid cardinality explosion
        username_hash = hashlib.sha256(username.encode()).hexdigest()[:12]

        with tracer.start_as_current_span(
            "auth.login.attempt",
            attributes={
                "auth.source_ip": source_ip,
                "auth.username_hash": username_hash,
                "auth.method": auth_method,
                "auth.success": success,
            }
        ) as span:
            common_attrs = {
                "auth.method": auth_method,
                "auth.source_ip": source_ip,
            }

            login_total.add(1, common_attrs)

            if success:
                login_success.add(1, common_attrs)

                # Record the failure streak that preceded this success
                streak = self.account_failure_streak.get(username, 0)
                if streak > 0:
                    login_failure_streak.record(streak, {
                        "auth.outcome": "eventual_success",
                    })
                    span.set_attribute("auth.prior_failure_streak", streak)
                self.account_failure_streak[username] = 0

            else:
                login_failures.add(1, {
                    **common_attrs,
                    "auth.failure_reason": failure_reason or "unknown",
                })

                self.account_failure_streak[username] = \
                    self.account_failure_streak.get(username, 0) + 1

                span.set_attribute("auth.failure_reason", failure_reason or "unknown")
                span.set_attribute("auth.failure_streak",
                                 self.account_failure_streak[username])

            # Track IP-to-account relationships
            self.ip_accounts[source_ip].add(username)
            self.account_ips[username].add(source_ip)

            # Record unique accounts per IP
            accounts_from_ip = len(self.ip_accounts[source_ip])
            unique_accounts_per_ip.record(accounts_from_ip, {
                "auth.source_ip": source_ip,
            })

            # Record unique IPs per account
            ips_for_account = len(self.account_ips[username])
            unique_ips_per_account.record(ips_for_account, {
                "auth.username_hash": username_hash,
            })

            # Track timing between attempts
            now = time.time()
            if source_ip in self.ip_last_attempt:
                gap_ms = (now - self.ip_last_attempt[source_ip]) * 1000
                time_between_attempts.record(gap_ms, {
                    "auth.source_ip": source_ip,
                })
                span.set_attribute("auth.time_since_last_attempt_ms", gap_ms)

                # Very fast consecutive attempts suggest automation
                if gap_ms < 100:
                    span.add_event("automated_attempt_suspected", {
                        "auth.gap_ms": gap_ms,
                    })

            self.ip_last_attempt[source_ip] = now

            # Check for suspicious patterns
            self._check_patterns(source_ip, username, span)

    def _check_patterns(self, source_ip: str, username: str, span):
        """Analyze current state for suspicious patterns."""
        accounts_from_ip = len(self.ip_accounts[source_ip])
        ips_for_account = len(self.account_ips[username])
        streak = self.account_failure_streak.get(username, 0)

        # Pattern: Credential stuffing (many accounts from one IP)
        if accounts_from_ip > 15:
            span.add_event("pattern_credential_stuffing", {
                "auth.unique_accounts": accounts_from_ip,
                "auth.source_ip": source_ip,
            })
            span.set_attribute("auth.pattern", "credential_stuffing")

        # Pattern: Distributed brute force (many IPs targeting one account)
        if ips_for_account > 10:
            span.add_event("pattern_distributed_brute_force", {
                "auth.unique_ips": ips_for_account,
                "auth.target_account": hashlib.sha256(username.encode()).hexdigest()[:12],
            })
            span.set_attribute("auth.pattern", "distributed_brute_force")

        # Pattern: Account lockout approaching
        if streak >= 4:
            span.add_event("lockout_approaching", {
                "auth.failure_streak": streak,
                "auth.lockout_threshold": 5,
            })

    def reset_window(self):
        """Reset sliding window counters."""
        self.ip_accounts.clear()
        self.account_ips.clear()
        self.ip_last_attempt.clear()
        self.window_start = time.time()
```

## Integration with Your Auth Endpoint

```python
# auth_endpoint.py
from fastapi import APIRouter, Request

router = APIRouter()
monitor = AuthenticationMonitor()

@router.post("/auth/login")
async def login(request: Request, credentials: LoginCredentials):
    source_ip = request.client.host

    user = await authenticate(credentials.username, credentials.password)

    if user:
        monitor.record_login_attempt(
            username=credentials.username,
            source_ip=source_ip,
            success=True,
            auth_method="password",
        )
        return {"token": generate_token(user)}
    else:
        reason = "invalid_password" if user_exists(credentials.username) else "unknown_user"
        monitor.record_login_attempt(
            username=credentials.username,
            source_ip=source_ip,
            success=False,
            failure_reason=reason,
            auth_method="password",
        )
        return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
```

## What the Data Tells You

The distinction between `unknown_user` and `invalid_password` failure reasons is powerful. If most failures are `unknown_user`, the attacker does not have your user list and is guessing. If most are `invalid_password`, they have valid usernames (perhaps from a breach) and are trying passwords. This shapes your response: the first scenario needs rate limiting, the second needs mandatory password resets for affected accounts.
