# How to Build an Internal Observability Catalog Where Teams Register Their Services and Telemetry Contracts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Service Catalog, Telemetry Contracts, Platform Engineering

Description: Build an internal observability catalog where teams register their services and define telemetry contracts for consistent instrumentation.

When you have hundreds of services, knowing which ones are instrumented, what telemetry they produce, and who owns them becomes a real problem. An internal observability catalog solves this by providing a registry where teams declare their services and define telemetry contracts, which are formal agreements about what signals a service produces.

## What is a Telemetry Contract

A telemetry contract is a declaration that says: "This service produces these specific traces, metrics, and logs, with these specific attributes." It is like an API contract but for observability data. Consumers of the telemetry (dashboards, alerts, SLOs) can depend on the contract being fulfilled.

## The Catalog Schema

Define a schema for service registration:

```yaml
# catalog/payment-api.yaml
apiVersion: catalog.observability/v1
kind: ServiceRegistration
metadata:
  name: payment-api
  team: payments
  owner: alice@company.com
  tier: critical
  repository: https://github.com/yourorg/payment-api

spec:
  telemetry:
    traces:
      # Declare which spans this service produces
      spans:
        - name: "POST /api/payments"
          kind: SERVER
          required_attributes:
            - key: http.method
              type: string
            - key: http.status_code
              type: int
            - key: payment.amount
              type: double
            - key: payment.currency
              type: string
            - key: payment.method
              type: string
          optional_attributes:
            - key: payment.fraud_score
              type: double

        - name: "payment.process"
          kind: INTERNAL
          required_attributes:
            - key: payment.gateway
              type: string
            - key: payment.status
              type: string

    metrics:
      # Declare which metrics this service produces
      - name: payment.transactions.total
        type: counter
        unit: "1"
        description: "Total number of payment transactions"
        labels:
          - status   # success, failure
          - method   # credit_card, debit, wire
          - currency

      - name: payment.amount.sum
        type: histogram
        unit: USD
        description: "Payment amounts"
        labels:
          - method
          - currency
        buckets: [10, 50, 100, 500, 1000, 5000, 10000]

      - name: payment.processing.duration
        type: histogram
        unit: ms
        description: "Payment processing duration"
        labels:
          - gateway
          - status

    logs:
      # Declare log patterns
      - level: ERROR
        pattern: "Payment failed: *"
        required_attributes:
          - payment.id
          - error.message
      - level: INFO
        pattern: "Payment processed: *"
        required_attributes:
          - payment.id
          - payment.amount

  dependencies:
    - name: user-service
      type: grpc
    - name: fraud-detection
      type: http
    - name: payment-gateway
      type: http
      external: true

  slos:
    - name: availability
      target: 99.99
      window: 30d
      metric: payment.transactions.total
      good_filter: 'status="success"'
    - name: latency
      target: 99.0
      window: 30d
      metric: payment.processing.duration
      threshold_ms: 500
```

## The Catalog API

Build a simple API that serves the catalog:

```python
# catalog_api.py
from flask import Flask, jsonify, request
import yaml
import os
from pathlib import Path

app = Flask(__name__)
CATALOG_DIR = os.getenv("CATALOG_DIR", "./catalog")

def load_catalog():
    """Load all service registrations from YAML files."""
    services = {}
    for path in Path(CATALOG_DIR).glob("*.yaml"):
        with open(path) as f:
            reg = yaml.safe_load(f)
        name = reg["metadata"]["name"]
        services[name] = reg
    return services

@app.route("/api/v1/services", methods=["GET"])
def list_services():
    """List all registered services."""
    catalog = load_catalog()
    return jsonify({
        "services": [
            {
                "name": name,
                "team": svc["metadata"]["team"],
                "owner": svc["metadata"]["owner"],
                "tier": svc["metadata"]["tier"],
                "signals": {
                    "traces": len(svc["spec"]["telemetry"]
                                   .get("traces", {}).get("spans", [])),
                    "metrics": len(svc["spec"]["telemetry"]
                                    .get("metrics", [])),
                },
            }
            for name, svc in catalog.items()
        ]
    })

@app.route("/api/v1/services/<name>", methods=["GET"])
def get_service(name):
    """Get a specific service registration."""
    catalog = load_catalog()
    if name not in catalog:
        return jsonify({"error": "Service not found"}), 404
    return jsonify(catalog[name])

@app.route("/api/v1/services/<name>/contract", methods=["GET"])
def get_contract(name):
    """Get the telemetry contract for a service."""
    catalog = load_catalog()
    if name not in catalog:
        return jsonify({"error": "Service not found"}), 404
    return jsonify(catalog[name]["spec"]["telemetry"])

@app.route("/api/v1/teams/<team>/services", methods=["GET"])
def get_team_services(team):
    """List all services owned by a team."""
    catalog = load_catalog()
    team_services = {
        name: svc for name, svc in catalog.items()
        if svc["metadata"]["team"] == team
    }
    return jsonify({"team": team, "services": list(team_services.keys())})

@app.route("/api/v1/dependencies/<name>", methods=["GET"])
def get_dependencies(name):
    """Get the dependency graph for a service."""
    catalog = load_catalog()
    if name not in catalog:
        return jsonify({"error": "Service not found"}), 404

    deps = catalog[name]["spec"].get("dependencies", [])
    # Recursively resolve dependencies
    resolved = resolve_deps(name, catalog, set())
    return jsonify({
        "service": name,
        "direct_dependencies": deps,
        "transitive_dependencies": list(resolved),
    })

def resolve_deps(name, catalog, visited):
    if name in visited:
        return set()
    visited.add(name)
    deps = set()
    if name in catalog:
        for dep in catalog[name]["spec"].get("dependencies", []):
            dep_name = dep["name"]
            deps.add(dep_name)
            deps.update(resolve_deps(dep_name, catalog, visited))
    return deps

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Contract Validation

Validate that services actually produce the telemetry they declared:

```python
# validate_contract.py
import requests

def validate_service_contract(service_name, prometheus_url, catalog_url):
    """Check if a service is fulfilling its telemetry contract."""
    # Get the contract
    contract = requests.get(
        f"{catalog_url}/api/v1/services/{service_name}/contract"
    ).json()

    violations = []

    # Check metrics exist in Prometheus
    for metric in contract.get("metrics", []):
        metric_name = metric["name"].replace(".", "_")
        result = requests.get(
            f"{prometheus_url}/api/v1/query",
            params={
                "query": f'{metric_name}{{service_name="{service_name}"}}'
            }
        ).json()

        if not result.get("data", {}).get("result"):
            violations.append(
                f"Metric '{metric['name']}' declared in contract "
                f"but not found in Prometheus"
            )

    # Check trace spans exist (query trace backend)
    for span_def in contract.get("traces", {}).get("spans", []):
        # Query your trace backend for recent spans matching the name
        # This is backend-specific
        pass

    return violations

# Run validation for all services
catalog = requests.get(f"{CATALOG_URL}/api/v1/services").json()
for svc in catalog["services"]:
    violations = validate_service_contract(
        svc["name"], PROMETHEUS_URL, CATALOG_URL
    )
    if violations:
        print(f"Contract violations for {svc['name']}:")
        for v in violations:
            print(f"  - {v}")
```

## Wrapping Up

An internal observability catalog transforms ad-hoc instrumentation into a managed, contractual system. Teams declare what telemetry their services produce, consumers depend on those declarations, and automated validation ensures contracts are fulfilled. This brings the same rigor to observability data that API catalogs bring to service interfaces.
