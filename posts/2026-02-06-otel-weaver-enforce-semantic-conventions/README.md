# Use OpenTelemetry Weaver to Enforce Semantic Convention Consistency Across Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Weaver, Semantic Conventions, Automation

Description: Use OpenTelemetry Weaver to validate and enforce semantic convention consistency across multiple teams and services automatically.

Semantic conventions are the backbone of useful telemetry. When every team follows the same naming and attribute patterns, your dashboards work across services, your alerts fire reliably, and debugging is straightforward. But conventions documented in a wiki only work when people remember to check the wiki. OpenTelemetry Weaver lets you automate this enforcement.

## What Is OpenTelemetry Weaver?

Weaver is a tool from the OpenTelemetry project that processes semantic convention definitions written in YAML. It can generate code, validate convention files, and produce documentation from a single source of truth. Think of it as a compiler for your telemetry conventions.

The core idea: define your conventions in structured YAML files, then use Weaver to generate typed constants, validate your definitions, and produce human-readable docs.

## Installing Weaver

```bash
# Download the latest Linux binary

curl -L -o /tmp/weaver.tar.xz \
  https://github.com/open-telemetry/weaver/releases/latest/download/weaver-x86_64-unknown-linux-gnu.tar.xz
tar -xJf /tmp/weaver.tar.xz -C /tmp
sudo install /tmp/weaver-x86_64-unknown-linux-gnu/weaver /usr/local/bin/weaver

# Or build from source with the Rust toolchain
git clone https://github.com/open-telemetry/weaver.git
cd weaver
cargo build --release
sudo install target/release/weaver /usr/local/bin/weaver
```

Verify the installation:

```bash
weaver --version
```

## Defining Your Conventions

Create a directory structure for your semantic conventions:

```text
semantic-conventions/
  manifest.yaml
  groups/
    order.yaml
    payment.yaml
    shipping.yaml
templates/
  python/
    weaver.yaml
    attributes.py.j2
  typescript/
    weaver.yaml
    attributes.ts.j2
```

For a custom registry, include a `manifest.yaml` file:

```yaml
name: commerce
description: Commerce domain semantic conventions
schema_url: https://example.com/schemas/commerce/1.0.0
```

Here is an example convention file for your order domain:

```yaml
# groups/order.yaml
groups:
  - id: order
    type: attribute_group
    brief: "Attributes describing an order in the commerce domain"
    attributes:
      - id: order.id
        type: string
        stability: development
        brief: "Unique order identifier"
        requirement_level: required
        examples: ["ord_abc123", "ord_def456"]

      - id: order.type
        type:
          allow_custom_values: false
          members:
            - id: one_time
              value: "one-time"
              stability: development
              brief: "Single purchase order"
            - id: subscription
              value: "subscription"
              stability: development
              brief: "Recurring subscription order"
            - id: trial
              value: "trial"
              stability: development
              brief: "Trial period order"
        stability: development
        brief: "The type of order"
        requirement_level: required

      - id: order.item_count
        type: int
        stability: development
        brief: "Number of items in the order"
        requirement_level: recommended
        examples: [1, 5, 20]

      - id: order.total_amount
        type: double
        stability: development
        brief: "Total order amount in the specified currency"
        requirement_level: recommended
        examples: [29.99, 149.00]
```

## Generating Typed Code

The real power of Weaver is code generation. Instead of developers manually typing attribute keys as strings, you generate typed constants they can import.

Create a Jinja2 template for Python:

```jinja2
# templates/python/attributes.py.j2
"""
Auto-generated OpenTelemetry attribute constants.
DO NOT EDIT MANUALLY. Run 'weaver registry generate python' to update.
"""

{% for group in ctx.groups %}
class {{ group.id | pascal_case }}Attributes:
    """{{ group.brief }}"""
{% for attr in group.attributes %}
    {{ attr.name | screaming_snake_case }}: str = "{{ attr.name }}"
    """{{ attr.brief }}"""
{% endfor %}
{% endfor %}
```

Configure that template as a generation target:

```yaml
# templates/python/weaver.yaml
templates:
  - template: attributes.py.j2
    application_mode: single
    file_name: attributes.py
```

Run the generation:

```bash
weaver registry generate python \
  --registry ./semantic-conventions \
  --templates ./templates \
  ./shared-libs/python/otel_conventions/
```

This produces a Python module that your teams import:

```python
from otel_conventions.attributes import OrderAttributes

# Now developers use typed constants instead of raw strings
span.set_attribute(OrderAttributes.ORDER_ID, order_id)
span.set_attribute(OrderAttributes.ORDER_TYPE, "subscription")
span.set_attribute(OrderAttributes.ORDER_ITEM_COUNT, len(items))
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

      - name: Set up Weaver
        uses: open-telemetry/weaver/.github/actions/setup-weaver@main

      - name: Validate convention definitions
        run: weaver registry check --registry ./semantic-conventions

      - name: Check generated code is up to date
        run: |
          weaver registry generate python \
            --registry ./semantic-conventions \
            --templates ./templates \
            ./tmp-generated/
          diff -r ./tmp-generated/ ./shared-libs/python/otel_conventions/
```

If someone changes a convention file without regenerating the code, CI fails.

## Cross-Team Enforcement

The key to cross-team consistency is making Weaver part of your shared infrastructure:

**Centralized convention repository**: Store all convention YAML files in a single repository that teams contribute to via pull requests. Changes require review from the observability platform team.

**Published packages**: Generate and publish typed attribute packages for every language your organization uses. Teams add them as dependencies rather than defining their own attribute strings.

**Collector-level checks**: Use the generated convention data to feed a custom processor, policy, or filter configuration that flags or drops non-conforming telemetry:

```python
# Script to generate a collector transform config from conventions
import yaml

with open("semantic-conventions/groups/order.yaml") as f:
    conventions = yaml.safe_load(f)

valid_prefixes = set()
for group in conventions["groups"]:
    for attr in group["attributes"]:
        valid_prefixes.add(attr["id"].split(".")[0])

# Generate a list of known valid attribute prefixes for collector validation
print("Known attribute prefixes:", valid_prefixes)
```

## Handling Convention Evolution

Conventions change over time. Weaver helps manage this by supporting deprecation annotations:

```yaml
attributes:
  - id: old_field_name
    type: string
    stability: development
    deprecated:
      reason: renamed
      renamed_to: new_field_name
      note: "Removal planned for v3.0."
    brief: "Legacy field"
    examples: ["legacy_value"]
```

When you regenerate code, your templates can use that deprecation metadata to emit language-appropriate annotations, so developers see warnings in their IDEs.

## Practical Tips

Start small. Do not try to define conventions for everything at once. Begin with the three or four most commonly used attribute groups, generate code for those, and expand as teams see the value.

Make the generated code easy to discover. Publish it as an internal package with good documentation. If developers have to hunt for it, they will just type string literals instead.

Run Weaver as a pre-commit hook so convention files are always validated before they reach CI. This tightens the feedback loop and saves pipeline minutes.

Weaver turns your semantic conventions from a document that people might read into infrastructure that is enforced automatically. That shift from voluntary compliance to structural enforcement is what makes conventions actually stick across a growing organization.
