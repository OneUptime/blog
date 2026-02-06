# How to Version Control OpenTelemetry Sampling Rules and Pipeline Configuration as Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Version Control, Sampling, Configuration Management

Description: Manage OpenTelemetry sampling rules and pipeline configurations in version control for auditable and reproducible observability settings.

Sampling rules and pipeline configurations change over time. Without version control, you lose track of when a rule was changed, who changed it, and why. By treating these configurations as code and storing them in Git, you get a complete audit trail, the ability to roll back changes, and the confidence that comes from code review.

## What to Version Control

Everything related to your OpenTelemetry pipeline should live in a Git repository:

- Collector configuration files
- Sampling rules (head-based and tail-based)
- Processing rules (attribute transformations, filtering)
- Export destinations and their settings
- Resource detection configuration

## Repository Structure

```
otel-config/
  README.md
  sampling/
    head-sampling.yaml
    tail-sampling.yaml
    sampling-rules.json
  collectors/
    agent/
      base.yaml
      production-overrides.yaml
      staging-overrides.yaml
    gateway/
      base.yaml
      production-overrides.yaml
  processing/
    attribute-rules.yaml
    filter-rules.yaml
  scripts/
    validate.sh
    merge-configs.py
  tests/
    test_sampling_rules.py
```

## Sampling Rules as Code

Define your tail-sampling rules in a structured format:

```yaml
# sampling/tail-sampling.yaml
# Version: 2.3.0
# Last modified: 2026-02-06
# Approved by: @platform-team

tail_sampling:
  # Decision wait time - how long to wait for all spans in a trace
  decision_wait: 10s

  # Number of traces kept in memory for decision
  num_traces: 200000

  policies:
    # Always sample errors
    - name: error-traces
      type: status_code
      status_code:
        status_codes:
          - ERROR
      # This policy alone is sufficient to keep a trace
      decision: Sample

    # Always sample slow traces (> 5 seconds)
    - name: slow-traces
      type: latency
      latency:
        threshold_ms: 5000

    # Sample 100% of payment service traces
    - name: payment-service
      type: string_attribute
      string_attribute:
        key: service.name
        values:
          - payment-service
          - payment-gateway
        enabled_regex_matching: false

    # Sample 10% of catalog browsing
    - name: catalog-probabilistic
      type: and
      and:
        and_sub_policy:
          - name: is-catalog
            type: string_attribute
            string_attribute:
              key: service.name
              values: [catalog-service]
          - name: sample-10pct
            type: probabilistic
            probabilistic:
              sampling_percentage: 10

    # Sample 1% of health checks
    - name: health-checks
      type: and
      and:
        and_sub_policy:
          - name: is-healthcheck
            type: string_attribute
            string_attribute:
              key: http.target
              values: ["/health", "/healthz", "/ready"]
          - name: sample-1pct
            type: probabilistic
            probabilistic:
              sampling_percentage: 1
```

## Configuration Merge Script

Use a script to merge base configs with environment-specific overrides:

```python
# scripts/merge-configs.py
import yaml
import sys
import copy
from pathlib import Path

def deep_merge(base, override):
    """Recursively merge override into base."""
    result = copy.deepcopy(base)
    for key, value in override.items():
        if (key in result and isinstance(result[key], dict)
                and isinstance(value, dict)):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result

def build_config(environment):
    """Build a complete Collector config for an environment."""
    # Load base configs
    with open("collectors/agent/base.yaml") as f:
        agent_base = yaml.safe_load(f)

    # Load environment overrides
    override_path = f"collectors/agent/{environment}-overrides.yaml"
    if Path(override_path).exists():
        with open(override_path) as f:
            overrides = yaml.safe_load(f)
        config = deep_merge(agent_base, overrides)
    else:
        config = agent_base

    # Inject sampling rules
    with open("sampling/tail-sampling.yaml") as f:
        sampling = yaml.safe_load(f)

    # Add tail sampling processor
    if "processors" not in config:
        config["processors"] = {}
    config["processors"]["tail_sampling"] = sampling["tail_sampling"]

    return config

if __name__ == "__main__":
    env = sys.argv[1] if len(sys.argv) > 1 else "production"
    config = build_config(env)
    print(yaml.dump(config, default_flow_style=False))
```

## Validation Tests

Write tests to ensure your sampling rules are valid:

```python
# tests/test_sampling_rules.py
import yaml
import pytest

def load_sampling_config():
    with open("sampling/tail-sampling.yaml") as f:
        return yaml.safe_load(f)

def test_error_traces_always_sampled():
    """Error traces must always be sampled."""
    config = load_sampling_config()
    policies = config["tail_sampling"]["policies"]
    error_policies = [
        p for p in policies
        if p.get("type") == "status_code"
    ]
    assert len(error_policies) > 0, \
        "Must have at least one error sampling policy"

def test_decision_wait_reasonable():
    """Decision wait must be between 5s and 30s."""
    config = load_sampling_config()
    wait = config["tail_sampling"]["decision_wait"]
    # Parse duration string
    seconds = int(wait.rstrip("s"))
    assert 5 <= seconds <= 30, \
        f"Decision wait {wait} is outside acceptable range"

def test_no_zero_percent_sampling():
    """No policy should sample at 0%."""
    config = load_sampling_config()
    for policy in config["tail_sampling"]["policies"]:
        if policy.get("type") == "probabilistic":
            pct = policy["probabilistic"]["sampling_percentage"]
            assert pct > 0, \
                f"Policy {policy['name']} has 0% sampling"

def test_critical_services_have_high_sampling():
    """Payment services must have 100% sampling."""
    config = load_sampling_config()
    policies = config["tail_sampling"]["policies"]
    payment_policy = next(
        (p for p in policies if p["name"] == "payment-service"),
        None
    )
    assert payment_policy is not None, \
        "Payment service must have a dedicated sampling policy"

def test_all_policies_have_names():
    """Every policy must have a descriptive name."""
    config = load_sampling_config()
    for policy in config["tail_sampling"]["policies"]:
        assert "name" in policy, "Policy missing name field"
        assert len(policy["name"]) > 3, \
            f"Policy name '{policy['name']}' is too short"
```

## CI Pipeline

```yaml
# .github/workflows/validate-config.yaml
name: Validate OTel Config
on:
  pull_request:
    paths:
      - "sampling/**"
      - "collectors/**"
      - "processing/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install pyyaml pytest
      - name: Run config tests
        run: pytest tests/ -v
      - name: Build and validate merged configs
        run: |
          for env in production staging; do
            echo "Building $env config..."
            python scripts/merge-configs.py $env > /tmp/config-$env.yaml
            # Validate with the Collector
            docker run --rm \
              -v /tmp/config-$env.yaml:/etc/otel/config.yaml \
              otel/opentelemetry-collector-contrib:latest \
              validate --config /etc/otel/config.yaml
          done
```

## Wrapping Up

Version controlling your OpenTelemetry sampling rules and pipeline configuration brings the same benefits to observability that version control brought to application code: auditability, rollback capability, and the safety of code review. Every change to sampling percentages or processing rules goes through a PR, gets reviewed, and leaves a permanent record in Git history.
