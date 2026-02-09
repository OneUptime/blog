# How to Trace Privilege Escalation Attempts Across Microservices with OpenTelemetry Span Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Privilege Escalation, Microservices Security, Span Attributes

Description: Trace privilege escalation attempts across microservices using OpenTelemetry span attributes to detect unauthorized access patterns in distributed systems.

Privilege escalation in a microservices architecture is harder to detect than in a monolith. A user might call Service A with legitimate permissions, then Service A calls Service B on behalf of that user but with elevated privileges. Without distributed tracing that carries authorization context, these patterns are invisible. OpenTelemetry span attributes let you track the effective permission level at every service boundary.

## The Problem: Authorization Context Gets Lost

In a monolith, you check permissions once and you are done. In microservices, each service might independently check permissions, use a service account for internal calls, or pass along the original user's token. The gaps between these approaches are where privilege escalation happens.

## Recording Authorization Decisions in Spans

Every authorization check should be recorded as span attributes:

```python
# authz_tracing.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("security.authorization")

class AuthorizationTracer:
    def check_permission(self, user_id: str, resource: str, action: str,
                          user_roles: list, effective_permissions: list) -> bool:
        """Check permission and record the decision with full context."""
        with tracer.start_as_current_span(
            "authz.check",
            attributes={
                "authz.user_id": user_id,
                "authz.resource": resource,
                "authz.action": action,
                "authz.user_roles": ",".join(user_roles),
                "authz.requested_permission": f"{action}:{resource}",
            }
        ) as span:
            allowed = self._evaluate_permission(
                user_roles, effective_permissions, resource, action
            )

            span.set_attribute("authz.decision", "allow" if allowed else "deny")

            if not allowed:
                span.add_event("authorization_denied", {
                    "authz.user_id": user_id,
                    "authz.resource": resource,
                    "authz.action": action,
                    "authz.reason": "insufficient_permissions",
                })

                # Check if this looks like an escalation attempt
                self._check_escalation_pattern(
                    user_id, resource, action, user_roles, span
                )

            return allowed

    def _check_escalation_pattern(self, user_id, resource, action, roles, span):
        """Analyze if this denied request matches escalation patterns."""
        # Pattern 1: User trying admin-only actions
        admin_actions = ["delete", "admin_access", "modify_permissions", "export_all"]
        if action in admin_actions and "admin" not in roles:
            span.set_attribute("authz.escalation.suspected", True)
            span.set_attribute("authz.escalation.type", "admin_action_attempt")

        # Pattern 2: User trying to access another tenant's resources
        if self._is_cross_tenant_access(user_id, resource):
            span.set_attribute("authz.escalation.suspected", True)
            span.set_attribute("authz.escalation.type", "cross_tenant_access")

        # Pattern 3: User accessing resources above their role level
        if self._is_above_role_level(roles, resource, action):
            span.set_attribute("authz.escalation.suspected", True)
            span.set_attribute("authz.escalation.type", "role_level_violation")
```

## Propagating Authorization Context Across Services

The key to detecting cross-service escalation is carrying authorization context through the entire trace:

```python
# authz_propagation.py
from opentelemetry import context, baggage

def set_authz_context(user_id: str, roles: list, permissions: list,
                       original_scope: str):
    """Set authorization context that propagates across service boundaries."""
    ctx = context.get_current()
    ctx = baggage.set_baggage("authz.user_id", user_id, context=ctx)
    ctx = baggage.set_baggage("authz.roles", ",".join(roles), context=ctx)
    ctx = baggage.set_baggage("authz.scope", original_scope, context=ctx)
    context.attach(ctx)

def get_authz_context() -> dict:
    """Retrieve authorization context from propagated baggage."""
    return {
        "user_id": baggage.get_baggage("authz.user_id") or "unknown",
        "roles": (baggage.get_baggage("authz.roles") or "").split(","),
        "scope": baggage.get_baggage("authz.scope") or "unknown",
    }
```

## Cross-Service Escalation Detection

When Service B receives a request from Service A, it should compare the original user's permissions with what is being requested:

```python
# escalation_detector.py
from opentelemetry import trace, metrics

tracer = trace.get_tracer("security.escalation")
meter = metrics.get_meter("security.escalation")

escalation_attempts = meter.create_counter(
    "security.escalation.attempts",
    description="Suspected privilege escalation attempts",
    unit="1",
)

authz_denials = meter.create_counter(
    "security.authz.denials",
    description="Authorization denials across services",
    unit="1",
)

class CrossServiceEscalationDetector:
    def check_inter_service_request(self, calling_service: str,
                                      target_service: str,
                                      target_action: str):
        """Detect if an inter-service call exceeds the original user's permissions."""
        authz_ctx = get_authz_context()

        with tracer.start_as_current_span(
            "authz.cross_service_check",
            attributes={
                "authz.calling_service": calling_service,
                "authz.target_service": target_service,
                "authz.target_action": target_action,
                "authz.original_user": authz_ctx["user_id"],
                "authz.original_roles": ",".join(authz_ctx["roles"]),
                "authz.original_scope": authz_ctx["scope"],
            }
        ) as span:
            # Check if the target action is within the original scope
            if not self._action_within_scope(target_action, authz_ctx["scope"]):
                span.set_attribute("authz.escalation.detected", True)
                span.set_attribute("authz.escalation.type", "scope_expansion")

                escalation_attempts.add(1, {
                    "authz.calling_service": calling_service,
                    "authz.target_service": target_service,
                    "authz.escalation_type": "scope_expansion",
                })

                span.add_event("privilege_escalation_detected", {
                    "authz.original_scope": authz_ctx["scope"],
                    "authz.attempted_action": target_action,
                    "authz.calling_service": calling_service,
                })

                return False

            # Check if the user's roles allow this action
            if not self._roles_permit_action(authz_ctx["roles"], target_action):
                span.set_attribute("authz.escalation.detected", True)
                span.set_attribute("authz.escalation.type", "role_bypass")

                escalation_attempts.add(1, {
                    "authz.calling_service": calling_service,
                    "authz.target_service": target_service,
                    "authz.escalation_type": "role_bypass",
                })

                return False

            return True

    def _action_within_scope(self, action: str, scope: str) -> bool:
        """Check if an action falls within the granted scope."""
        scope_permissions = {
            "read": ["read", "list"],
            "write": ["read", "list", "create", "update"],
            "admin": ["read", "list", "create", "update", "delete", "admin_access"],
        }
        allowed = scope_permissions.get(scope, [])
        return action in allowed

    def _roles_permit_action(self, roles: list, action: str) -> bool:
        """Check if any of the user's roles permit the action."""
        role_permissions = {
            "viewer": ["read", "list"],
            "editor": ["read", "list", "create", "update"],
            "admin": ["read", "list", "create", "update", "delete", "admin_access"],
        }
        for role in roles:
            if action in role_permissions.get(role, []):
                return True
        return False
```

## Service Middleware for Escalation Checks

```python
# authz_middleware.py
async def authorization_middleware(request, call_next):
    """Middleware that checks for escalation on every inter-service call."""
    detector = CrossServiceEscalationDetector()

    # Determine if this is an inter-service call
    calling_service = request.headers.get("X-Calling-Service")

    if calling_service:
        action = determine_action(request.method, request.url.path)
        allowed = detector.check_inter_service_request(
            calling_service=calling_service,
            target_service="current-service",
            target_action=action,
        )

        if not allowed:
            authz_denials.add(1, {
                "authz.calling_service": calling_service,
                "authz.action": action,
            })
            return JSONResponse(
                status_code=403,
                content={"error": "Insufficient privileges for this operation"},
            )

    return await call_next(request)
```

## Analyzing Escalation Traces

The traces from this instrumentation tell a story. When you see a trace where `authz.escalation.detected = True`, you can follow the full chain: which user initiated the request, which service they called, what that service tried to do on their behalf, and where the escalation was caught. This is far more useful than a simple "403 Forbidden" log entry, because it shows the path the request took across services before the escalation was detected.

Look for patterns like the same user repeatedly triggering escalation detections on different services (systematic probing), or a single service consistently making calls above the original user's permission level (buggy service-to-service authorization). Both patterns are impossible to catch without distributed tracing that carries authorization context.
