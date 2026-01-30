# How to Build Property-Based Testing with Hypothesis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Testing, Hypothesis, Quality

Description: Learn how to use property-based testing with Hypothesis in Python to discover edge cases and improve test coverage.

---

Traditional unit tests verify specific examples: given input X, expect output Y. While useful, this approach can miss edge cases that developers don't anticipate. Property-based testing flips this paradigm by generating hundreds of random test cases based on properties your code should always satisfy.

## What is Property-Based Testing?

Property-based testing focuses on defining invariants or properties that should hold true for any valid input. Instead of writing individual test cases, you describe the shape of your inputs and let the testing framework generate diverse examples automatically.

Hypothesis is Python's premier property-based testing library. It integrates seamlessly with pytest and provides powerful data generation strategies that can uncover bugs traditional testing misses.

Install Hypothesis with pip:

```python
pip install hypothesis
```

## The @given Decorator

The `@given` decorator is the heart of Hypothesis. It tells Hypothesis what kind of data to generate for your test function:

```python
from hypothesis import given
from hypothesis import strategies as st

def add(a: int, b: int) -> int:
    return a + b

@given(st.integers(), st.integers())
def test_addition_is_commutative(a, b):
    assert add(a, b) == add(b, a)

@given(st.integers())
def test_addition_identity(a):
    assert add(a, 0) == a
```

Hypothesis will run these tests with hundreds of different integer values, including edge cases like zero, negative numbers, and extremely large values.

## Strategies for Data Generation

Strategies define how Hypothesis generates test data. The library provides strategies for all Python primitives and complex composite types:

```python
from hypothesis import given
from hypothesis import strategies as st

# Basic strategies
@given(st.text())
def test_string_reverse_twice(s):
    assert s[::-1][::-1] == s

# Composite strategies
@given(st.lists(st.integers(), min_size=1))
def test_list_sort_preserves_length(lst):
    assert len(sorted(lst)) == len(lst)

# Custom strategies with constraints
@given(st.integers(min_value=1, max_value=100))
def test_positive_bounded_integers(n):
    assert 1 <= n <= 100

# Building complex objects
@st.composite
def user_strategy(draw):
    name = draw(st.text(min_size=1, max_size=50))
    age = draw(st.integers(min_value=0, max_value=150))
    email = draw(st.emails())
    return {"name": name, "age": age, "email": email}

@given(user_strategy())
def test_user_serialization(user):
    import json
    serialized = json.dumps(user)
    deserialized = json.loads(serialized)
    assert deserialized == user
```

## Stateful Testing

Hypothesis supports stateful testing through rule-based state machines. This is powerful for testing APIs and systems that maintain state:

```python
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
from hypothesis import strategies as st

class ShoppingCartMachine(RuleBasedStateMachine):
    def __init__(self):
        super().__init__()
        self.cart = {}

    @rule(item=st.text(min_size=1), quantity=st.integers(min_value=1, max_value=10))
    def add_item(self, item, quantity):
        self.cart[item] = self.cart.get(item, 0) + quantity

    @rule(item=st.text(min_size=1))
    def remove_item(self, item):
        if item in self.cart:
            del self.cart[item]

    @invariant()
    def quantities_are_positive(self):
        for quantity in self.cart.values():
            assert quantity > 0

TestShoppingCart = ShoppingCartMachine.TestCase
```

Hypothesis generates sequences of operations and verifies that invariants hold after each step.

## Shrinking: Finding Minimal Failing Examples

One of Hypothesis's most valuable features is automatic shrinking. When a test fails, Hypothesis doesn't just report the first failing case. It systematically reduces the input to find the simplest example that still triggers the failure:

```python
from hypothesis import given
from hypothesis import strategies as st

def buggy_function(items):
    if len(items) > 3 and items[2] == "x":
        raise ValueError("Bug!")
    return items

@given(st.lists(st.text()))
def test_buggy_function(items):
    buggy_function(items)  # Hypothesis will find ["", "", "x", ""]
```

Instead of reporting a complex failing list, Hypothesis shrinks it to the minimal case: a list with exactly four elements where the third is "x".

## Pytest Integration

Hypothesis works out of the box with pytest. You can combine it with fixtures and parametrize:

```python
import pytest
from hypothesis import given, settings, Verbosity
from hypothesis import strategies as st

@pytest.fixture
def database_connection():
    # Setup connection
    yield connection
    # Teardown

@given(st.text())
@settings(max_examples=500, verbosity=Verbosity.verbose)
def test_with_database(database_connection, text):
    database_connection.store(text)
    assert database_connection.retrieve() == text

# Combining with parametrize
@pytest.mark.parametrize("operation", ["add", "subtract", "multiply"])
@given(st.integers(), st.integers())
def test_operations(operation, a, b):
    result = calculate(operation, a, b)
    assert isinstance(result, (int, float))
```

## Best Practices

When adopting property-based testing, focus on properties like:
- **Roundtrip properties**: Encoding then decoding returns the original value
- **Invariants**: Sorting preserves length; adding then removing returns original state
- **Commutativity**: Order of operations doesn't matter for certain functions
- **Idempotency**: Applying an operation twice yields the same result as once

Property-based testing doesn't replace example-based tests but complements them. Use Hypothesis to explore edge cases and build confidence in your code's correctness across the entire input space.
