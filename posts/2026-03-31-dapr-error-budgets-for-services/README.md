# How to Implement Error Budgets for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SRE, Error Budget, Observability, SLO

Description: Learn how to implement SLO-based error budgets for Dapr services, tracking consumption and automatically throttling deployments when budgets run low.

---

## What Is an Error Budget

An error budget is the acceptable amount of unreliability permitted by your SLO. If your SLO is 99.9% success rate, your monthly error budget is 0.1% of requests - about 43 minutes of downtime or roughly 4,320 failed requests out of 4.32 million. When the budget is exhausted, the team shifts focus from new features to reliability work.

## Tracking Error Budget Consumption in Dapr

Use a dedicated state store to track request outcomes per service:

```python
from dapr.clients import DaprClient
from flask import Flask, jsonify, request
import json
from datetime import datetime

app = Flask(__name__)

SLO_TARGET = 0.999  # 99.9%
MONTHLY_REQUEST_ESTIMATE = 4_320_000

def record_request_outcome(service_id: str, success: bool):
    with DaprClient() as client:
        month_key = datetime.utcnow().strftime("%Y-%m")
        key = f"slo:{service_id}:{month_key}"

        raw = client.get_state(store_name="slo-state", key=key)
        stats = json.loads(raw.data) if raw.data else {
            "total": 0,
            "failures": 0,
            "budgetTotal": MONTHLY_REQUEST_ESTIMATE * (1 - SLO_TARGET)
        }

        stats["total"] += 1
        if not success:
            stats["failures"] += 1

        stats["budgetConsumed"] = stats["failures"] / stats["budgetTotal"] if stats["budgetTotal"] > 0 else 0

        client.save_state(
            store_name="slo-state",
            key=key,
            value=json.dumps(stats)
        )

        if stats["budgetConsumed"] > 0.8:
            trigger_budget_alert(service_id, stats)
```

## Middleware for Automatic Tracking

Create a Flask middleware that records outcomes without changing business logic:

```python
from functools import wraps

def track_slo(service_id: str):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                response = f(*args, **kwargs)
                status_code = response[1] if isinstance(response, tuple) else 200
                success = status_code < 500
                record_request_outcome(service_id, success)
                return response
            except Exception as e:
                record_request_outcome(service_id, False)
                raise
        return wrapper
    return decorator

@app.route("/charge", methods=["POST"])
@track_slo("payment-service")
def charge():
    # Business logic here
    return {"charged": True}, 200
```

## Error Budget Dashboard Endpoint

Expose budget status for dashboards and CI gates:

```python
@app.route("/error-budget/<service_id>", methods=["GET"])
def get_error_budget(service_id: str):
    month_key = datetime.utcnow().strftime("%Y-%m")
    key = f"slo:{service_id}:{month_key}"

    with DaprClient() as client:
        raw = client.get_state(store_name="slo-state", key=key)
        if not raw.data:
            return jsonify({"budgetConsumed": 0, "status": "healthy"}), 200

        stats = json.loads(raw.data)
        return jsonify({
            "serviceId": service_id,
            "sloTarget": SLO_TARGET,
            "totalRequests": stats["total"],
            "failures": stats["failures"],
            "budgetConsumed": stats["budgetConsumed"],
            "budgetRemaining": 1 - stats["budgetConsumed"],
            "status": "critical" if stats["budgetConsumed"] > 1.0 else
                      "warning" if stats["budgetConsumed"] > 0.8 else "healthy"
        })
```

## CI/CD Budget Gate

Block deployments when error budget is critically low:

```bash
#!/bin/bash
BUDGET=$(curl -s http://slo-api/error-budget/payment-service | jq '.budgetConsumed')
THRESHOLD=0.9

if (( $(echo "$BUDGET > $THRESHOLD" | bc -l) )); then
  echo "Error budget exhausted ($BUDGET). Blocking deployment."
  exit 1
fi

echo "Budget healthy ($BUDGET). Proceeding with deployment."
```

## Summary

Implementing error budgets for Dapr services requires tracking request outcomes in a state store, calculating SLO consumption in real time, and surfacing budget status to dashboards and CI pipelines. Middleware wrappers automate tracking without coupling error budget logic to business code. When budget consumption exceeds 80%, automated alerts shift engineering focus to reliability before the budget is fully exhausted.
