# How to Monitor RBAC Authorization Decisions Across Services with OpenTelemetry Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RBAC, Authorization, Security

Description: Record RBAC authorization decisions as OpenTelemetry span attributes to monitor access patterns and detect permission anomalies across services.

Role-Based Access Control (RBAC) is the most common authorization model in microservices. Users get assigned roles, roles get assigned permissions, and every request gets checked against these permissions. But most teams implement RBAC and then never look at how it actually works in production. Are there roles that grant too many permissions? Are users consistently hitting permission denials for resources they should be able to access? Are there permission checks that never deny anyone, suggesting they are too permissive?

By recording RBAC decisions as OpenTelemetry span attributes, you can answer these questions with real production data.

## Designing the RBAC Span Attributes

Before writing code, define a consistent set of attributes for authorization decisions:

```yaml
# RBAC span attribute schema
authz.decision: "allow" | "deny"
authz.policy.name: "the policy or rule that made the decision"
authz.user.id: "the user or service identity"
authz.user.roles: "comma-separated list of roles"
authz.resource.type: "the type of resource being accessed"
authz.resource.id: "the specific resource identifier"
authz.action: "the action being attempted (read, write, delete, etc.)"
authz.evaluation_time_ms: "how long the authorization check took"
authz.cached: "whether the decision came from a cache"
```

## Implementing the Instrumented RBAC Middleware

Here is a Python implementation that wraps your RBAC checks with OpenTelemetry instrumentation:

```python
import time
from opentelemetry import trace, metrics
from functools import wraps

tracer = trace.get_tracer("rbac-authz")
meter = metrics.get_meter("rbac-authz")

# Metrics for authorization decisions
authz_decision_counter = meter.create_counter(
    "authz.decisions",
    description="Authorization decisions by result, action, and resource type",
)

authz_latency = meter.create_histogram(
    "authz.evaluation_time",
    description="Time to evaluate authorization in milliseconds",
    unit="ms",
)

denied_permissions_counter = meter.create_counter(
    "authz.denials",
    description="Permission denials by user, role, and resource",
)

class RBACAuthorizer:
    """
    RBAC authorization engine that records decisions
    as OpenTelemetry span attributes and metrics.
    """

    def __init__(self, policy_engine):
        self.policy_engine = policy_engine
        self.cache = {}

    def authorize(self, user, action, resource_type, resource_id=None):
        """
        Check if the user is authorized to perform the action
        on the given resource. Records the decision on the
        current span and emits metrics.
        """
        span = trace.get_current_span()
        start = time.monotonic()

        # Check the cache first
        cache_key = f"{user.id}:{action}:{resource_type}:{resource_id}"
        cached = cache_key in self.cache
        decision = self.cache.get(cache_key)

        if decision is None:
            # Evaluate the policy
            decision = self.policy_engine.evaluate(
                user=user,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
            )
            self.cache[cache_key] = decision

        elapsed_ms = (time.monotonic() - start) * 1000

        # Record on the span
        roles_str = ",".join(user.roles)
        span.set_attribute("authz.decision", decision.result)
        span.set_attribute("authz.policy.name", decision.matched_policy)
        span.set_attribute("authz.user.id", user.id)
        span.set_attribute("authz.user.roles", roles_str)
        span.set_attribute("authz.resource.type", resource_type)
        span.set_attribute("authz.resource.id", str(resource_id or ""))
        span.set_attribute("authz.action", action)
        span.set_attribute("authz.evaluation_time_ms", elapsed_ms)
        span.set_attribute("authz.cached", cached)

        # Record metrics
        metric_attrs = {
            "decision": decision.result,
            "action": action,
            "resource_type": resource_type,
            "policy": decision.matched_policy,
        }

        authz_decision_counter.add(1, metric_attrs)
        authz_latency.record(elapsed_ms, metric_attrs)

        if decision.result == "deny":
            span.add_event("authz.denied", {
                "user.id": user.id,
                "user.roles": roles_str,
                "action": action,
                "resource_type": resource_type,
                "resource_id": str(resource_id or ""),
                "reason": decision.reason,
                "matched_policy": decision.matched_policy,
            })

            denied_permissions_counter.add(1, {
                "user.id": user.id,
                "role": user.primary_role,
                "action": action,
                "resource_type": resource_type,
            })

        return decision.result == "allow"
```

## Using the Authorizer in Route Handlers

Apply the RBAC check in your route handlers:

```python
from flask import Flask, request, g

app = Flask(__name__)
authorizer = RBACAuthorizer(policy_engine=load_policies())

def require_permission(action, resource_type):
    """Decorator that enforces RBAC permissions."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = g.current_user
            resource_id = kwargs.get("resource_id") or kwargs.get("id")

            with tracer.start_as_current_span(
                f"authz.check.{action}.{resource_type}"
            ):
                allowed = authorizer.authorize(
                    user=user,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                )

                if not allowed:
                    return {"error": "Forbidden"}, 403

            return f(*args, **kwargs)
        return decorated
    return decorator


@app.route("/api/v1/orders/<order_id>", methods=["GET"])
@require_permission("read", "order")
def get_order(order_id):
    order = db.get_order(order_id)
    return order.to_dict()


@app.route("/api/v1/orders/<order_id>", methods=["DELETE"])
@require_permission("delete", "order")
def delete_order(order_id):
    db.delete_order(order_id)
    return {"status": "deleted"}


@app.route("/api/v1/admin/users", methods=["GET"])
@require_permission("list", "user")
def list_users():
    users = db.list_users()
    return [u.to_dict() for u in users]
```

## Analyzing RBAC Data

With this data flowing into your observability backend, you can build powerful queries to understand your authorization posture.

### Find Overly Permissive Policies

Policies that never deny anyone might be too broad:

```sql
-- Policies that have never denied a request in the last 30 days
SELECT DISTINCT policy
FROM authz_decisions
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY policy
HAVING COUNT(CASE WHEN decision = 'deny' THEN 1 END) = 0
  AND COUNT(*) > 100;
```

### Find Users Hitting Permission Walls

Users who frequently get denied may need role adjustments:

```sql
-- Users with the most denials in the last 7 days
SELECT
  user_id,
  user_roles,
  action,
  resource_type,
  COUNT(*) AS denial_count
FROM span_events
WHERE
  name = 'authz.denied'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY user_id, user_roles, action, resource_type
ORDER BY denial_count DESC
LIMIT 20;
```

### Detect Privilege Escalation Attempts

Look for users trying actions far above their role:

```sql
-- Admin actions attempted by non-admin roles
SELECT
  attributes['authz.user.id'] AS user_id,
  attributes['authz.user.roles'] AS roles,
  attributes['authz.action'] AS action,
  attributes['authz.resource.type'] AS resource,
  COUNT(*) AS attempt_count
FROM spans
WHERE
  attributes['authz.decision'] = 'deny'
  AND attributes['authz.action'] IN ('delete', 'admin', 'configure')
  AND attributes['authz.user.roles'] NOT LIKE '%admin%'
  AND start_time > NOW() - INTERVAL '24 hours'
GROUP BY user_id, roles, action, resource
ORDER BY attempt_count DESC;
```

## Alert Rules

```yaml
groups:
  - name: rbac-alerts
    rules:
      - alert: HighDenialRate
        expr: |
          sum(rate(authz_denials_total[5m]))
          /
          sum(rate(authz_decisions_total[5m]))
          > 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "More than 20% of authorization checks are being denied"

      - alert: AuthzSlowEvaluation
        expr: |
          histogram_quantile(0.99, rate(authz_evaluation_time_bucket[5m])) > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 authorization evaluation time exceeds 50ms"
```

## Summary

Recording RBAC authorization decisions as OpenTelemetry span attributes transforms your access control from a black box into a transparent, observable system. You can see which policies fire most often, which users are bumping into permission walls, and whether your roles are sized correctly. This data-driven approach to RBAC management helps you maintain the principle of least privilege while minimizing friction for legitimate users.
