# How to Implement Attribute-Based Access Control with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ABAC, Authorization, Security, Access Control

Description: Build fine-grained attribute-based access control for Dapr services by combining JWT claims, resource metadata, and environment attributes in policy decisions.

---

## ABAC vs RBAC

Role-Based Access Control (RBAC) assigns permissions to roles. Attribute-Based Access Control (ABAC) evaluates attributes of the subject (user), resource, action, and environment together. This enables policies like "a manager can approve expenses up to $10,000 if they are in the same department as the requester."

## Architecture

Dapr handles service-level access via access control policies and mTLS. Application-level ABAC decisions are evaluated in a policy engine that reads attributes from JWT claims, request context, and resource metadata.

## JWT Claims as Subject Attributes

```yaml
# Dapr JWT middleware extracts these claims as headers
# X-JWT-Sub: user-123
# X-JWT-Department: engineering
# X-JWT-CostCenter: cc-450
# X-JWT-EmployeeLevel: 4
```

## Policy Engine

```python
from dataclasses import dataclass
from typing import Any
from enum import Enum

class Effect(Enum):
    ALLOW = "allow"
    DENY = "deny"

@dataclass
class PolicyContext:
    subject: dict[str, Any]   # JWT claims
    resource: dict[str, Any]  # Resource metadata
    action: str                # HTTP method + path
    environment: dict[str, Any]  # Time, IP, etc.

class ABACPolicyEngine:
    def evaluate(self, ctx: PolicyContext) -> Effect:
        for policy in self._policies:
            if policy.matches(ctx):
                return policy.effect
        return Effect.DENY  # Default deny

    @property
    def _policies(self):
        return [
            ExpenseApprovalPolicy(),
            DocumentReadPolicy(),
        ]


class ExpenseApprovalPolicy:
    effect = Effect.ALLOW

    def matches(self, ctx: PolicyContext) -> bool:
        if ctx.action != "POST:/v1/expenses/approve":
            return False
        level = int(ctx.subject.get("employeeLevel", 0))
        amount = float(ctx.resource.get("amount", 0))
        dept_match = ctx.subject.get("department") == ctx.resource.get("department")
        return dept_match and (
            (level >= 4 and amount <= 10000) or
            (level >= 6 and amount <= 100000)
        )


class DocumentReadPolicy:
    effect = Effect.ALLOW

    def matches(self, ctx: PolicyContext) -> bool:
        if ctx.action != "GET:/v1/documents":
            return False
        doc_classification = ctx.resource.get("classification", "public")
        user_clearance = ctx.subject.get("clearance", "public")
        clearance_levels = ["public", "internal", "confidential", "secret"]
        return (clearance_levels.index(user_clearance) >=
                clearance_levels.index(doc_classification))
```

## FastAPI Integration

```python
from fastapi import FastAPI, Request, HTTPException
from abac import ABACPolicyEngine, PolicyContext, Effect
from functools import wraps
from datetime import datetime, timezone

app = FastAPI()
engine = ABACPolicyEngine()

def abac_check(action: str, resource_loader):
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            subject = {
                "sub": request.headers.get("X-JWT-Sub"),
                "department": request.headers.get("X-JWT-Department"),
                "employeeLevel": request.headers.get("X-JWT-EmployeeLevel", "1"),
                "clearance": request.headers.get("X-JWT-Clearance", "public"),
            }
            resource = await resource_loader(request, *args, **kwargs)
            ctx = PolicyContext(
                subject=subject,
                resource=resource,
                action=action,
                environment={"time": datetime.now(timezone.utc).isoformat(), "ip": request.client.host}
            )
            if engine.evaluate(ctx) == Effect.DENY:
                raise HTTPException(403, "Access denied by ABAC policy")
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


async def load_expense(request: Request, expense_id: str):
    return await db.get_expense(expense_id)

@app.post("/v1/expenses/approve/{expense_id}")
@abac_check("POST:/v1/expenses/approve", load_expense)
async def approve_expense(request: Request, expense_id: str):
    return await expense_service.approve(expense_id)
```

## Summary

ABAC with Dapr combines sidecar-level mTLS identity verification with application-level attribute evaluation. JWT claims flow through Dapr's middleware as headers, giving your policy engine rich subject context without re-fetching user details. The pattern naturally extends to environment attributes like time-of-day restrictions or IP allowlists.
