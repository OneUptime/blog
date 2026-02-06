# How to Implement Telemetry Data Ownership: Define Who Owns, Who Can Access, and Who Pays for Each Signal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Ownership, Governance, Enterprise Observability

Description: Implement a telemetry data ownership model that defines ownership, access permissions, and cost allocation for each observability signal.

In large organizations, telemetry data has no clear owner. Who is responsible for the payment service's traces? Who decides the retention period? Who pays for the storage? Without a clear ownership model, these questions lead to finger-pointing, waste, and compliance gaps. This post shows how to implement a formal telemetry data ownership framework.

## The Ownership Model

Every piece of telemetry data has three roles associated with it:

- **Owner**: The team that produces the telemetry and is accountable for its quality and cost.
- **Consumer**: Teams that use the telemetry for dashboards, alerts, or debugging.
- **Payer**: The cost center that pays for ingestion, storage, and query costs.

## Defining Ownership in Code

Create ownership declarations as structured data:

```yaml
# ownership/payment-service.yaml
apiVersion: ownership.observability/v1
kind: TelemetryOwnership
metadata:
  name: payment-service
  updated: "2026-02-06"
  approved_by: alice@company.com

spec:
  service: payment-service
  owner:
    team: payments
    contact: payments-team@company.com
    escalation: payments-oncall@company.com

  signals:
    traces:
      owner: payments
      payer: CC-PAYMENTS-1234
      retention_days: 30
      sampling_rate: 1.0
      access:
        - team: payments
          level: full      # Can see all attributes
        - team: platform
          level: metadata   # Can see span names and durations, not attributes
        - team: security
          level: full
          reason: "Compliance monitoring"
          expires: "2026-12-31"

    metrics:
      owner: payments
      payer: CC-PAYMENTS-1234
      retention_days: 90
      access:
        - team: payments
          level: full
        - team: sre
          level: full
          reason: "SLO monitoring"
        - team: finance
          level: aggregated  # Can see aggregated metrics only
          reason: "Revenue reporting"

    logs:
      owner: payments
      payer: CC-PAYMENTS-1234
      retention_days: 14
      access:
        - team: payments
          level: full
        - team: security
          level: full
          reason: "Audit trail"

  cost_allocation:
    model: producer_pays  # or "consumer_pays" or "shared"
    budget_monthly_usd: 3500
    alerts:
      - threshold_pct: 75
        notify: payments-team@company.com
      - threshold_pct: 90
        notify: payments-manager@company.com
```

## Ownership Database and API

```python
# ownership_api.py
from flask import Flask, jsonify, request
import yaml
import os
from pathlib import Path
from functools import wraps

app = Flask(__name__)
OWNERSHIP_DIR = os.getenv("OWNERSHIP_DIR", "./ownership")

def load_ownership_data():
    """Load all ownership declarations."""
    ownership = {}
    for path in Path(OWNERSHIP_DIR).glob("*.yaml"):
        with open(path) as f:
            data = yaml.safe_load(f)
        name = data["metadata"]["name"]
        ownership[name] = data
    return ownership

@app.route("/api/v1/ownership/<service>", methods=["GET"])
def get_ownership(service):
    """Get ownership info for a service."""
    data = load_ownership_data()
    if service not in data:
        return jsonify({"error": "Service not found"}), 404
    return jsonify(data[service])

@app.route("/api/v1/ownership/<service>/access", methods=["GET"])
def check_access(service):
    """Check if a team has access to a service's telemetry."""
    team = request.args.get("team")
    signal = request.args.get("signal", "traces")

    data = load_ownership_data()
    if service not in data:
        return jsonify({"error": "Service not found"}), 404

    spec = data[service]["spec"]
    signal_config = spec["signals"].get(signal, {})
    access_rules = signal_config.get("access", [])

    for rule in access_rules:
        if rule["team"] == team:
            return jsonify({
                "service": service,
                "team": team,
                "signal": signal,
                "access_level": rule["level"],
                "reason": rule.get("reason", ""),
                "expires": rule.get("expires", "never"),
                "granted": True,
            })

    return jsonify({
        "service": service,
        "team": team,
        "signal": signal,
        "granted": False,
        "message": "No access rule found for this team/signal combination"
    })

@app.route("/api/v1/team/<team>/owned-services", methods=["GET"])
def get_team_owned(team):
    """List services owned by a team."""
    data = load_ownership_data()
    owned = []
    for name, svc in data.items():
        if svc["spec"]["owner"]["team"] == team:
            owned.append({
                "service": name,
                "budget": svc["spec"]["cost_allocation"]["budget_monthly_usd"],
                "payer": svc["spec"]["signals"]["traces"]["payer"],
            })
    return jsonify({"team": team, "owned_services": owned})

@app.route("/api/v1/team/<team>/accessible-services", methods=["GET"])
def get_team_accessible(team):
    """List services a team can access."""
    data = load_ownership_data()
    accessible = []
    for name, svc in data.items():
        for signal_type in ["traces", "metrics", "logs"]:
            signal = svc["spec"]["signals"].get(signal_type, {})
            for rule in signal.get("access", []):
                if rule["team"] == team:
                    accessible.append({
                        "service": name,
                        "signal": signal_type,
                        "level": rule["level"],
                    })
    return jsonify({"team": team, "accessible_services": accessible})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8081)
```

## Enforcing Ownership at the Collector Level

Use the ownership data to generate Collector configurations that enforce access levels:

```python
# generate_access_configs.py
import yaml
from pathlib import Path

def generate_collector_config(ownership_data):
    """Generate routing and filtering rules from ownership data."""
    configs = {}

    for service_name, data in ownership_data.items():
        spec = data["spec"]

        for signal_type in ["traces", "metrics", "logs"]:
            signal = spec["signals"].get(signal_type, {})

            for access_rule in signal.get("access", []):
                team = access_rule["team"]
                level = access_rule["level"]

                if team not in configs:
                    configs[team] = {"allowed_services": [],
                                     "filter_rules": []}

                configs[team]["allowed_services"].append(service_name)

                if level == "metadata":
                    # Generate attribute stripping rules
                    configs[team]["filter_rules"].append({
                        "service": service_name,
                        "signal": signal_type,
                        "action": "strip_attributes",
                        "keep": ["service.name", "span.name",
                                 "duration", "status_code"],
                    })
                elif level == "aggregated":
                    configs[team]["filter_rules"].append({
                        "service": service_name,
                        "signal": signal_type,
                        "action": "aggregate_only",
                    })

    return configs

# Load all ownership files
ownership = {}
for path in Path("./ownership").glob("*.yaml"):
    with open(path) as f:
        data = yaml.safe_load(f)
    ownership[data["metadata"]["name"]] = data

configs = generate_collector_config(ownership)
print(yaml.dump(configs, default_flow_style=False))
```

## Cost Reporting by Owner

```sql
-- Monthly cost report by service owner
SELECT
    resource_attributes['team.name'] as owner_team,
    resource_attributes['service.name'] as service,
    count() as total_spans,
    count() * 0.0000005 as ingestion_cost_usd,
    sum(length(toString(attributes))) / (1024*1024*1024) as storage_gb,
    sum(length(toString(attributes))) / (1024*1024*1024) * 0.023
        as storage_cost_usd
FROM otel_traces
WHERE timestamp >= toStartOfMonth(now())
GROUP BY owner_team, service
ORDER BY ingestion_cost_usd DESC;
```

## Wrapping Up

A formal telemetry data ownership model brings clarity to who is responsible for what in your observability stack. By defining owners, access rules, and cost allocation in code, you create an auditable, enforceable framework that scales across the organization. The key insight is treating telemetry data with the same governance rigor you apply to production databases and APIs.
