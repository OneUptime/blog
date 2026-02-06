# How to Use OpenTelemetry Weaver to Enforce Semantic Convention Consistency Across Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Weaver, Semantic Conventions, Automation

Description: Use OpenTelemetry Weaver to validate and enforce semantic convention consistency across multiple teams and services automatically.

Semantic conventions are the backbone of useful telemetry. When every team follows the same naming and attribute patterns, your dashboards work across services, your alerts fire reliably, and debugging is straightforward. But conventions documented in a wiki only work when people remember to check the wiki. OpenTelemetry Weaver lets you automate this enforcement.

## What Is OpenTelemetry Weaver?

Weaver is a tool from the OpenTelemetry project that processes semantic convention definitions written in YAML. It can generate code, validate convention files, and produce documentation from a single source of truth. Think of it as a compiler for your telemetry conventions.

The core idea: define your conventions in structured YAML files, then use Weaver to generate typed constants, validate your definitions, and produce human-readable docs.

## Installing Weaver

```bash
# Install via cargo (Rust toolchain required)
cargo install weaver

# Or download a pre-built binary from the releases page
curl -L https://github.com/open-telemetry/weaver/releases/latest/download/weaver-x86_64-linux.tar.gz \
  | tar xz -C /usr/local/bin/
```

Verify the installation:

```bash
weaver --version
```

## Defining Your Conventions

Create a directory structure for your semantic conventions:

```
semantic-conventions/
  groups/
    order.yaml
    payment.yaml
    shipping.yaml
  templates/
    python/
      attributes.py.j2
    typescript/
      attributes.ts.j2
  weaver.yaml
```

Here is an example convention file for your order domain:

```yaml
# groups/order.yaml
groups:
  - id: order
    type: attribute_group
    brief: "Attributes describing an order in the commerce domain"
    prefix: order
    attributes:
      - id: id
        type: string
        brief: "Unique order identifier"
        requirement_level: required
        examples: ["ord_abc123", "ord_def456"]

      - id: type
        type:
          allow_custom_values: false
          members:
            - id: one_time
              value: "one-time"
              brief: "Single purchase order"
            - id: subscription
              value: "subscription"
              brief: "Recurring subscription order"
            - id: trial
              value: "trial"
              brief: "Trial period order"
        brief: "The type of order"
        requirement_level: required

      - id: item_count
        type: int
        brief: "Number of items in the order"
        requirement_level: recommended
        examples: [1, 5, 20]

      - id: total_amount
        type: double
        brief: "Total order amount in the specified currency"
        requirement_level: recommended
        examples: [29.99, 149.00]
```

## Generating Typed Code

The real power of Weaver is code generation. Instead of developers manually typing attribute keys as strings, you generate typed constants they can import.

Create a Jinja2 template for Python:

```python
# templates/python/attributes.py.j2
"""
Auto-generated OpenTelemetry attribute constants.
DO NOT EDIT MANUALLY. Run 'weaver generate' to update.
"""

{% for group in groups %}
class {{ group.id | capitalize }}Attributes:
    """{{ group.brief }}"""
    {% for attr in group.attributes %}
    {{ attr.id | upper }}: str = "{{ group.prefix }}.{{ attr.id }}"
    """{{ attr.brief }}"""
    {% endfor %}
{% endfor %}
```

Run the generation:

```bash
weaver generate \
  --semantic-conventions ./semantic-conventions/groups/ \
  --templates ./semantic-conventions/templates/python/ \
  --output ./shared-libs/python/otel_conventions/
```

This produces a Python module that your teams import:

```python
from otel_conventions.attributes import OrderAttributes

# Now developers use typed constants instead of raw strings
span.set_attribute(OrderAttributes.ID, order_id)
span.set_attribute(OrderAttributes.TYPE, "subscription")
span.set_attribute(OrderAttributes.ITEM_COUNT, len(items))
```

Typos become import errors. Missing attributes become obvious during code review.

## Validating Conventions in CI

Add a validation step to your CI pipeline that checks convention files for correctness:

```yaml
# .github/workflows/validate-conventions.yml
name: Validate Semantic Conventions
on:
  pull_request:
    paths:
      - 'semantic-conventions/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Weaver
        run: cargo install weaver

      - name: Validate convention definitions
        run: weaver check ./semantic-conventions/groups/

      - name: Check generated code is up to date
        run: |
          weaver generate \
            --semantic-conventions ./semantic-conventions/groups/ \
            --templates ./semantic-conventions/templates/python/ \
            --output ./tmp-generated/
          diff -r ./tmp-generated/ ./shared-libs/python/otel_conventions/
```

If someone changes a convention file without regenerating the code, CI fails.

## Cross-Team Enforcement

The key to cross-team consistency is making Weaver part of your shared infrastructure:

**Centralized convention repository**: Store all convention YAML files in a single repository that teams contribute to via pull requests. Changes require review from the observability platform team.

**Published packages**: Generate and publish typed attribute packages for every language your organization uses. Teams add them as dependencies rather than defining their own attribute strings.

**Collector-level validation**: Use the generated convention data to configure OpenTelemetry Collector processors that warn on or reject non-conforming attributes:

```python
# Script to generate a collector transform config from conventions
import yaml

with open("semantic-conventions/groups/order.yaml") as f:
    conventions = yaml.safe_load(f)

valid_prefixes = set()
for group in conventions["groups"]:
    valid_prefixes.add(group["prefix"])

# Generate a list of known valid attribute prefixes for collector validation
print("Known attribute prefixes:", valid_prefixes)
```

## Handling Convention Evolution

Conventions change over time. Weaver helps manage this by supporting deprecation annotations:

```yaml
attributes:
  - id: old_field_name
    type: string
    deprecated: "Use new_field_name instead. Removal planned for v3.0."
    brief: "Legacy field"
```

When you regenerate code, the deprecated attributes get marked with language-appropriate deprecation annotations, so developers see warnings in their IDEs.

## Practical Tips

Start small. Do not try to define conventions for everything at once. Begin with the three or four most commonly used attribute groups, generate code for those, and expand as teams see the value.

Make the generated code easy to discover. Publish it as an internal package with good documentation. If developers have to hunt for it, they will just type string literals instead.

Run Weaver as a pre-commit hook so convention files are always validated before they reach CI. This tightens the feedback loop and saves pipeline minutes.

Weaver turns your semantic conventions from a document that people might read into infrastructure that is enforced automatically. That shift from voluntary compliance to structural enforcement is what makes conventions actually stick across a growing organization.
