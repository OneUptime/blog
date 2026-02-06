# How to Implement Mutation Testing for OpenTelemetry Instrumentation to Verify Span Coverage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Mutation Testing, Instrumentation Coverage, Test Quality, Span Coverage

Description: Apply mutation testing techniques to your OpenTelemetry instrumentation to verify that your tests actually detect missing or broken spans.

You have written tests for your OpenTelemetry instrumentation. But how do you know those tests are good? If you removed a span from your code, would any test catch it? Mutation testing answers this question by deliberately introducing defects and checking if your test suite detects them. Applied to instrumentation, it verifies that your tests actually guard against span regressions.

## What Is Mutation Testing for Instrumentation

Traditional mutation testing modifies business logic (changing `+` to `-`, swapping `true` for `false`) and checks if tests fail. For instrumentation, the mutations are different:

- Remove a `start_as_current_span` call
- Delete a `set_attribute` call
- Change a span name
- Remove a span event
- Change the status code from ERROR to OK

If your tests still pass after one of these mutations, your test suite has a blind spot.

## Building a Simple Instrumentation Mutator

Here is a Python script that creates mutated versions of your instrumented code:

```python
# mutator.py
import ast
import copy
import sys

class InstrumentationMutator(ast.NodeTransformer):
    """Creates mutations in OpenTelemetry instrumentation code."""

    def __init__(self):
        self.mutations = []
        self.current_mutation = None

    def find_mutations(self, tree):
        """Walk the AST and identify all possible mutations."""
        self.mutations = []
        self._find_mutations_recursive(tree)
        return self.mutations

    def _find_mutations_recursive(self, node):
        for child in ast.walk(node):
            # Mutation type 1: Remove span creation (with block)
            if isinstance(child, ast.With):
                for item in child.items:
                    if self._is_span_creation(item.context_expr):
                        self.mutations.append({
                            "type": "remove_span",
                            "line": child.lineno,
                            "description": f"Remove span at line {child.lineno}",
                            "node": child,
                        })

            # Mutation type 2: Remove set_attribute calls
            if isinstance(child, ast.Expr) and isinstance(child.value, ast.Call):
                func = child.value.func
                if isinstance(func, ast.Attribute) and func.attr == "set_attribute":
                    self.mutations.append({
                        "type": "remove_attribute",
                        "line": child.lineno,
                        "description": f"Remove set_attribute at line {child.lineno}",
                        "node": child,
                    })

            # Mutation type 3: Remove add_event calls
            if isinstance(child, ast.Expr) and isinstance(child.value, ast.Call):
                func = child.value.func
                if isinstance(func, ast.Attribute) and func.attr == "add_event":
                    self.mutations.append({
                        "type": "remove_event",
                        "line": child.lineno,
                        "description": f"Remove add_event at line {child.lineno}",
                        "node": child,
                    })

    def _is_span_creation(self, node):
        """Check if a node is a tracer.start_as_current_span() call."""
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Attribute):
                return func.attr == "start_as_current_span"
        return False

    def apply_mutation(self, tree, mutation):
        """Apply a single mutation to the AST."""
        mutated = copy.deepcopy(tree)

        class Remover(ast.NodeTransformer):
            def visit(self, node):
                if (hasattr(node, 'lineno') and
                    node.lineno == mutation["line"] and
                    type(node) == type(mutation["node"])):
                    if mutation["type"] == "remove_span":
                        # Replace the with block with just its body
                        return node.body
                    elif mutation["type"] in ("remove_attribute", "remove_event"):
                        # Remove the statement entirely
                        return None
                return self.generic_visit(node)

        return Remover().visit(mutated)
```

## Running the Mutations

Create a test runner that applies each mutation and checks if the test suite catches it:

```python
# run_mutations.py
import ast
import subprocess
import tempfile
import shutil
import os
from mutator import InstrumentationMutator

def run_mutation_tests(source_file, test_command):
    """Run mutation testing on a source file."""
    with open(source_file) as f:
        source = f.read()

    tree = ast.parse(source)
    mutator = InstrumentationMutator()
    mutations = mutator.find_mutations(tree)

    print(f"Found {len(mutations)} possible mutations in {source_file}")

    killed = 0
    survived = 0
    results = []

    for i, mutation in enumerate(mutations):
        print(f"\nMutation {i+1}/{len(mutations)}: {mutation['description']}")

        # Create a mutated version of the source
        mutated_tree = mutator.apply_mutation(tree, mutation)
        mutated_source = ast.unparse(mutated_tree)

        # Write the mutated source to a temp file
        backup = source_file + ".backup"
        shutil.copy2(source_file, backup)

        try:
            with open(source_file, "w") as f:
                f.write(mutated_source)

            # Run the test suite
            result = subprocess.run(
                test_command,
                shell=True,
                capture_output=True,
                timeout=60,
            )

            if result.returncode != 0:
                print(f"  KILLED - Tests detected the mutation")
                killed += 1
                results.append({"mutation": mutation, "status": "killed"})
            else:
                print(f"  SURVIVED - Tests did NOT detect the mutation!")
                survived += 1
                results.append({"mutation": mutation, "status": "survived"})

        except subprocess.TimeoutExpired:
            print(f"  TIMEOUT - treating as killed")
            killed += 1
            results.append({"mutation": mutation, "status": "timeout"})
        finally:
            # Restore the original file
            shutil.move(backup, source_file)

    # Print summary
    total = killed + survived
    score = (killed / total * 100) if total > 0 else 0
    print(f"\nMutation Score: {score:.1f}%")
    print(f"  Killed: {killed}/{total}")
    print(f"  Survived: {survived}/{total}")

    if survived > 0:
        print("\nSurviving mutations (gaps in your test coverage):")
        for r in results:
            if r["status"] == "survived":
                print(f"  - {r['mutation']['description']}")

    return score

if __name__ == "__main__":
    score = run_mutation_tests(
        source_file="myapp/order_service.py",
        test_command="pytest tests/test_order_instrumentation.py -x -q",
    )
    # Fail CI if mutation score is below threshold
    if score < 80:
        print(f"\nMutation score {score:.1f}% is below 80% threshold")
        exit(1)
```

## Example: A Service with Instrumentation

Here is the kind of code you would mutation test:

```python
# myapp/order_service.py
from opentelemetry import trace

tracer = trace.get_tracer("order-service")

class OrderService:
    def create_order(self, user_id, items):
        with tracer.start_as_current_span("create_order") as span:
            span.set_attribute("order.user_id", user_id)
            span.set_attribute("order.item_count", len(items))

            if not items:
                span.set_status(trace.Status(trace.StatusCode.ERROR, "items cannot be empty"))
                raise ValueError("items cannot be empty")

            order = self._save_to_database(user_id, items)
            span.set_attribute("order.id", order["id"])
            span.add_event("order_created", {"order.id": order["id"]})

            self._publish_event(order)
            span.set_status(trace.Status(trace.StatusCode.OK))
            return order
```

The mutator would find these mutation points:
1. Remove the `start_as_current_span("create_order")` context manager
2. Remove `set_attribute("order.user_id", ...)`
3. Remove `set_attribute("order.item_count", ...)`
4. Remove `set_attribute("order.id", ...)`
5. Remove `add_event("order_created", ...)`
6. Remove `set_status(ERROR)` call
7. Remove `set_status(OK)` call

If your tests are thorough, they should fail for every single mutation. Any mutation that survives points to a missing assertion in your tests.

## Integration with CI

```yaml
# .github/workflows/mutation.yaml
name: Instrumentation Mutation Testing
on: [pull_request]

jobs:
  mutation-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: python run_mutations.py
```

Mutation testing for instrumentation is an advanced technique, but it answers a question that code coverage cannot: "Do my tests actually verify that my instrumentation is correct, or do they just happen to pass alongside it?" If your mutation score is low, you know exactly which spans and attributes your tests are not protecting.
