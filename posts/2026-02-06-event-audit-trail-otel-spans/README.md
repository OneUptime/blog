# How to Build an Event Audit Trail with OpenTelemetry Spans That Capture Every Event State Transition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audit Trail, Event State Transitions, Compliance

Description: Build a complete event audit trail using OpenTelemetry spans that record every state transition for compliance and debugging.

Audit trails are critical for compliance, debugging, and understanding how entities change over time. Instead of building a separate audit logging system, you can use OpenTelemetry spans to record every state transition. Each span captures the who, what, when, and why of a state change, and your tracing backend becomes your audit store.

## Designing the Audit Span Schema

Define a consistent set of attributes for audit spans:

```python
from opentelemetry import trace
from datetime import datetime
import json

tracer = trace.get_tracer("audit.trail")

# Standard attribute keys for audit spans
AUDIT_ENTITY_TYPE = "audit.entity.type"
AUDIT_ENTITY_ID = "audit.entity.id"
AUDIT_ACTION = "audit.action"
AUDIT_ACTOR_ID = "audit.actor.id"
AUDIT_ACTOR_TYPE = "audit.actor.type"
AUDIT_STATE_BEFORE = "audit.state.before"
AUDIT_STATE_AFTER = "audit.state.after"
AUDIT_TRANSITION = "audit.transition"
AUDIT_REASON = "audit.reason"
```

## The Audit Trail Recorder

Create a reusable class that wraps state transitions in spans:

```python
class AuditTrail:
    """Records state transitions as OpenTelemetry spans."""

    def __init__(self, entity_type):
        self.entity_type = entity_type

    def record_transition(self, entity_id, action, before_state, after_state,
                          actor_id, actor_type="user", reason=""):
        """Record a state transition as an OpenTelemetry span."""
        transition_label = self._compute_transition(before_state, after_state)

        with tracer.start_as_current_span(
            f"audit.{self.entity_type}.{action}",
            attributes={
                AUDIT_ENTITY_TYPE: self.entity_type,
                AUDIT_ENTITY_ID: str(entity_id),
                AUDIT_ACTION: action,
                AUDIT_ACTOR_ID: str(actor_id),
                AUDIT_ACTOR_TYPE: actor_type,
                AUDIT_STATE_BEFORE: json.dumps(before_state) if before_state else "null",
                AUDIT_STATE_AFTER: json.dumps(after_state) if after_state else "null",
                AUDIT_TRANSITION: transition_label,
                AUDIT_REASON: reason,
                "audit.timestamp": datetime.utcnow().isoformat(),
            }
        ) as span:
            # Record individual field changes as span events
            changes = self._diff_states(before_state, after_state)
            for field, change in changes.items():
                span.add_event(
                    "field_changed",
                    attributes={
                        "audit.field": field,
                        "audit.field.old_value": str(change["old"]),
                        "audit.field.new_value": str(change["new"]),
                    }
                )

            return span.get_span_context()

    def _compute_transition(self, before, after):
        """Describe the state transition in a human-readable way."""
        if before is None:
            return "created"
        if after is None:
            return "deleted"

        before_status = before.get("status", "unknown") if isinstance(before, dict) else "unknown"
        after_status = after.get("status", "unknown") if isinstance(after, dict) else "unknown"

        if before_status != after_status:
            return f"{before_status} -> {after_status}"
        return "updated"

    def _diff_states(self, before, after):
        """Compute the differences between two state dictionaries."""
        changes = {}
        if not isinstance(before, dict) or not isinstance(after, dict):
            return changes

        all_keys = set(list(before.keys()) + list(after.keys()))
        for key in all_keys:
            old_val = before.get(key)
            new_val = after.get(key)
            if old_val != new_val:
                changes[key] = {"old": old_val, "new": new_val}

        return changes
```

## Using the Audit Trail in Domain Logic

Here is how to use the audit trail in an order management system:

```python
order_audit = AuditTrail("order")

class OrderService:
    def __init__(self, db):
        self.db = db

    def create_order(self, order_data, user_id):
        """Create a new order and record the audit event."""
        order = self.db.insert("orders", order_data)

        order_audit.record_transition(
            entity_id=order["id"],
            action="create",
            before_state=None,
            after_state=order,
            actor_id=user_id,
            reason="Customer placed new order",
        )
        return order

    def approve_order(self, order_id, approver_id, reason=""):
        """Approve an order and record the state transition."""
        before = self.db.find_one("orders", order_id)

        updated = self.db.update("orders", order_id, {
            "status": "approved",
            "approved_by": approver_id,
            "approved_at": datetime.utcnow().isoformat(),
        })

        order_audit.record_transition(
            entity_id=order_id,
            action="approve",
            before_state=before,
            after_state=updated,
            actor_id=approver_id,
            actor_type="admin",
            reason=reason or "Order approved by admin",
        )
        return updated

    def cancel_order(self, order_id, user_id, cancellation_reason):
        """Cancel an order and record the state transition."""
        before = self.db.find_one("orders", order_id)

        updated = self.db.update("orders", order_id, {
            "status": "cancelled",
            "cancelled_by": user_id,
            "cancelled_at": datetime.utcnow().isoformat(),
            "cancellation_reason": cancellation_reason,
        })

        order_audit.record_transition(
            entity_id=order_id,
            action="cancel",
            before_state=before,
            after_state=updated,
            actor_id=user_id,
            reason=cancellation_reason,
        )
        return updated
```

## Chaining Audit Spans for Full Lifecycle

To connect all audit spans for a single entity into a trace, use a consistent trace context:

```python
from opentelemetry import context
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

class LifecycleAuditTrail(AuditTrail):
    """An audit trail that links all transitions for an entity."""

    def __init__(self, entity_type, entity_store):
        super().__init__(entity_type)
        self.entity_store = entity_store

    def record_transition(self, entity_id, action, before_state, after_state,
                          actor_id, actor_type="user", reason=""):
        # Look up the previous span context for this entity
        prev_context = self.entity_store.get_trace_context(entity_id)

        links = []
        if prev_context:
            links.append(trace.Link(prev_context))

        with tracer.start_as_current_span(
            f"audit.{self.entity_type}.{action}",
            links=links,
            attributes={
                AUDIT_ENTITY_TYPE: self.entity_type,
                AUDIT_ENTITY_ID: str(entity_id),
                AUDIT_ACTION: action,
                AUDIT_ACTOR_ID: str(actor_id),
                AUDIT_TRANSITION: self._compute_transition(before_state, after_state),
            }
        ) as span:
            # Store this span context for future linking
            self.entity_store.save_trace_context(
                entity_id,
                span.get_span_context()
            )

            changes = self._diff_states(before_state, after_state)
            for field, change in changes.items():
                span.add_event("field_changed", {
                    "audit.field": field,
                    "audit.field.old_value": str(change["old"]),
                    "audit.field.new_value": str(change["new"]),
                })
```

## Querying the Audit Trail

Since audit data lives in your tracing backend, you can query it using trace search. Look for spans where `audit.entity.id` matches your target entity and sort by timestamp. The span events show exactly which fields changed at each step.

This approach gives you an audit trail that is tightly integrated with your observability data. When someone asks "what happened to order 12345?", you can find every state transition, who made it, and the full request context around it.
