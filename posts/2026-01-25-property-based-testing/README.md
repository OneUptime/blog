# How to Configure Property-Based Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Property-Based Testing, Testing, QuickCheck, fast-check, Hypothesis, Test Automation

Description: Learn how to implement property-based testing to automatically generate test cases and discover edge cases that example-based tests miss.

---

Traditional tests check specific examples: "add(2, 3) should equal 5". But what about negative numbers? Large numbers? Zero? Property-based testing flips the approach. Instead of writing specific examples, you define properties that should always hold true, and the framework generates hundreds of test cases automatically.

## The Problem with Example-Based Tests

Consider this function:

```javascript
function reverseString(str) {
  return str.split('').reverse().join('');
}
```

Typical tests:

```javascript
test('reverses hello', () => {
  expect(reverseString('hello')).toBe('olleh');
});

test('reverses empty string', () => {
  expect(reverseString('')).toBe('');
});
```

These tests pass, but they miss edge cases:
- Unicode characters (emojis, accented letters)
- Very long strings
- Strings with special characters
- null or undefined input

Property-based testing would catch these automatically.

## Getting Started with fast-check (JavaScript)

Install fast-check:

```bash
npm install --save-dev fast-check
```

Write property-based tests:

```javascript
// reverseString.property.test.js
const fc = require('fast-check');
const { reverseString } = require('./reverseString');

describe('reverseString properties', () => {
  test('reversing twice returns original', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        // Property: reverse(reverse(x)) === x
        return reverseString(reverseString(str)) === str;
      })
    );
  });

  test('length is preserved', () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        // Property: length of reversed string equals original
        return reverseString(str).length === str.length;
      })
    );
  });

  test('first character becomes last', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }), // Non-empty strings
        (str) => {
          const reversed = reverseString(str);
          // First char of original is last char of reversed
          return str[0] === reversed[reversed.length - 1];
        }
      )
    );
  });
});
```

Run the tests:

```bash
npm test
```

fast-check generates hundreds of random strings and checks each property.

## Generators (Arbitraries)

fast-check provides generators for various data types:

```javascript
const fc = require('fast-check');

// Primitive generators
fc.integer()                    // Any integer
fc.integer({ min: 0, max: 100 }) // Bounded integer
fc.nat()                        // Natural numbers (>= 0)
fc.float()                      // Floating point
fc.boolean()                    // true or false
fc.string()                     // Any string
fc.string({ minLength: 1, maxLength: 10 }) // Bounded string
fc.char()                       // Single character

// Collection generators
fc.array(fc.integer())          // Array of integers
fc.array(fc.string(), { minLength: 1, maxLength: 5 })
fc.set(fc.integer())            // Set of unique integers
fc.dictionary(fc.string(), fc.integer()) // Object with string keys

// Composite generators
fc.tuple(fc.string(), fc.integer()) // [string, number]
fc.record({                     // Object with specific shape
  name: fc.string(),
  age: fc.nat({ max: 120 }),
  email: fc.emailAddress()
})

// Special generators
fc.uuid()                       // UUID string
fc.date()                       // Date object
fc.json()                       // Valid JSON
fc.emailAddress()               // Valid email format
fc.ipV4()                       // IPv4 address
fc.webUrl()                     // Valid URL
```

## Custom Generators

Create generators for your domain objects:

```javascript
// Custom user generator
const userArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  age: fc.integer({ min: 18, max: 120 }),
  roles: fc.array(fc.constantFrom('admin', 'user', 'guest'), {
    minLength: 1,
    maxLength: 3
  }),
  createdAt: fc.date({
    min: new Date('2020-01-01'),
    max: new Date()
  })
});

// Use in tests
test('user serialization roundtrip', () => {
  fc.assert(
    fc.property(userArb, (user) => {
      const json = JSON.stringify(user);
      const parsed = JSON.parse(json);
      return parsed.id === user.id && parsed.name === user.name;
    })
  );
});

// Generator with constraints
const validOrderArb = fc.record({
  items: fc.array(
    fc.record({
      productId: fc.uuid(),
      quantity: fc.integer({ min: 1, max: 100 }),
      price: fc.float({ min: 0.01, max: 10000, noNaN: true })
    }),
    { minLength: 1, maxLength: 20 }
  ),
  discount: fc.float({ min: 0, max: 0.5, noNaN: true }) // 0-50% discount
}).filter(order => {
  // Additional constraint: total must be positive
  const total = order.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  return total > 0;
});
```

## Common Properties to Test

### Roundtrip / Serialization

```javascript
test('JSON roundtrip', () => {
  fc.assert(
    fc.property(fc.jsonValue(), (value) => {
      const roundtripped = JSON.parse(JSON.stringify(value));
      return JSON.stringify(roundtripped) === JSON.stringify(value);
    })
  );
});
```

### Idempotence

```javascript
test('sort is idempotent', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted1 = [...arr].sort((a, b) => a - b);
      const sorted2 = [...sorted1].sort((a, b) => a - b);
      return JSON.stringify(sorted1) === JSON.stringify(sorted2);
    })
  );
});
```

### Commutativity

```javascript
test('addition is commutative', () => {
  fc.assert(
    fc.property(fc.integer(), fc.integer(), (a, b) => {
      return add(a, b) === add(b, a);
    })
  );
});
```

### Associativity

```javascript
test('string concatenation is associative', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), fc.string(), (a, b, c) => {
      return (a + b) + c === a + (b + c);
    })
  );
});
```

### Identity

```javascript
test('adding zero is identity', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => {
      return add(n, 0) === n;
    })
  );
});
```

### Invariants

```javascript
test('sorted array is always sorted', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] < sorted[i - 1]) return false;
      }
      return true;
    })
  );
});
```

## Python with Hypothesis

Install Hypothesis:

```bash
pip install hypothesis
```

Write property-based tests:

```python
# test_math.py
from hypothesis import given, strategies as st

@given(st.integers(), st.integers())
def test_addition_commutative(a, b):
    assert a + b == b + a

@given(st.lists(st.integers()))
def test_sorted_is_sorted(lst):
    result = sorted(lst)
    for i in range(len(result) - 1):
        assert result[i] <= result[i + 1]

@given(st.text())
def test_reverse_twice_is_identity(s):
    assert s[::-1][::-1] == s

# Custom strategy for valid users
from hypothesis import composite

@composite
def users(draw):
    return {
        'name': draw(st.text(min_size=1, max_size=100)),
        'email': draw(st.emails()),
        'age': draw(st.integers(min_value=18, max_value=120))
    }

@given(users())
def test_user_validation(user):
    # Your validation logic
    assert len(user['name']) > 0
    assert '@' in user['email']
    assert 18 <= user['age'] <= 120
```

## Shrinking

When a property fails, the framework automatically shrinks the failing case to the smallest example:

```javascript
test('finds minimal failing case', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      // This will fail for arrays with more than 5 elements
      return arr.length <= 5;
    })
  );
});

// Output:
// Property failed after 23 tests
// Shrunk 12 times
// Counterexample: [0, 0, 0, 0, 0, 0]
```

The shrinker reduces [4829, -192, 0, 48, 12, 99, -4] to [0, 0, 0, 0, 0, 0] - the smallest array that still fails.

## Reproducing Failures

Save and replay failing seeds:

```javascript
// Reproduce a specific failure
test('reproducible test', () => {
  fc.assert(
    fc.property(fc.integer(), (n) => {
      return n !== 42;
    }),
    { seed: 1234567890 } // Use seed from failure output
  );
});
```

## Integration with Jest

```javascript
// jest.config.js
module.exports = {
  testMatch: ['**/*.test.js', '**/*.property.test.js'],
  // Increase timeout for property tests
  testTimeout: 30000
};
```

```javascript
// Configure fast-check globally
// setupTests.js
const fc = require('fast-check');

fc.configureGlobal({
  numRuns: 100,           // Number of test cases per property
  verbose: true,          // Show generated values on failure
  seed: Date.now()        // Reproducible by default
});
```

## Best Practices

1. Start with simple properties like roundtrip and idempotence
2. Use constrained generators to avoid testing invalid inputs
3. Keep properties simple and focused
4. Save failing seeds for regression tests
5. Balance number of runs vs test time
6. Combine with example-based tests for known edge cases
7. Use shrinking output to understand failures
8. Document properties as specifications

---

Property-based testing finds bugs that example-based tests miss. By generating hundreds of test cases automatically, it explores edge cases you never thought of. Start with fast-check or Hypothesis and add properties to your most critical functions. The bugs they find will convince you to use them everywhere.
