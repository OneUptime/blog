# How to Fix "RecursionError: maximum recursion depth exceeded"

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, RecursionError, Recursion, Stack Overflow, Optimization

Description: Understand why Python has a recursion limit, learn to fix recursion depth errors, and discover when to use iteration instead of recursion.

---

> When your recursive function calls itself too many times, Python raises a RecursionError to prevent a stack overflow. This guide explains why this happens, how to fix it, and when recursion is the wrong approach.

Python limits recursion depth to prevent infinite recursion from crashing your program. The default limit (usually 1000) is intentionally conservative. Understanding this limit helps you write better recursive code or know when to switch to iteration.

---

## Understanding the Error

```python
def countdown(n):
    print(n)
    countdown(n - 1)  # No base case!

countdown(10)
# RecursionError: maximum recursion depth exceeded while calling a Python object
```

Every function call adds a frame to the call stack. Without a stopping condition, the stack grows until Python stops it.

### Check the Current Limit

```python
import sys

print(sys.getrecursionlimit())  # Usually 1000
```

---

## Fix 1: Add a Base Case

The most common cause is a missing or incorrect base case:

```python
# WRONG: No base case
def factorial(n):
    return n * factorial(n - 1)  # Runs forever!

# CORRECT: With base case
def factorial(n):
    if n <= 1:  # Base case
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
```

### Common Base Case Patterns

```python
# Pattern 1: Check for empty/zero
def sum_list(lst):
    if not lst:  # Base case: empty list
        return 0
    return lst[0] + sum_list(lst[1:])

# Pattern 2: Check for single element
def find_max(lst):
    if len(lst) == 1:  # Base case: single element
        return lst[0]
    return max(lst[0], find_max(lst[1:]))

# Pattern 3: Check for threshold
def binary_search(arr, target, low, high):
    if low > high:  # Base case: not found
        return -1
    mid = (low + high) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] > target:
        return binary_search(arr, target, low, mid - 1)
    else:
        return binary_search(arr, target, mid + 1, high)
```

---

## Fix 2: Increase the Recursion Limit

For legitimate deep recursion, you can increase the limit:

```python
import sys

# Increase limit (use with caution)
sys.setrecursionlimit(10000)

# Now deeper recursion is allowed
def deep_recursion(n):
    if n == 0:
        return 0
    return 1 + deep_recursion(n - 1)

print(deep_recursion(5000))  # Works now
```

### Warning: Stack Overflow Risk

```python
# This can crash Python entirely!
sys.setrecursionlimit(100000)  # Dangerous

def very_deep(n):
    if n == 0:
        return 0
    return 1 + very_deep(n - 1)

very_deep(50000)  # May cause actual stack overflow (segfault)
```

The limit protects you. Increasing it too much can crash the Python interpreter with a segmentation fault, losing all your data.

---

## Fix 3: Convert to Iteration

Many recursive algorithms can be converted to iterative ones:

### Example: Factorial

```python
# Recursive (limited by recursion depth)
def factorial_recursive(n):
    if n <= 1:
        return 1
    return n * factorial_recursive(n - 1)

# Iterative (no depth limit)
def factorial_iterative(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

print(factorial_iterative(10000))  # Works fine!
```

### Example: Fibonacci

```python
# Recursive (slow and depth-limited)
def fib_recursive(n):
    if n <= 1:
        return n
    return fib_recursive(n - 1) + fib_recursive(n - 2)

# Iterative (fast and unlimited)
def fib_iterative(n):
    if n <= 1:
        return n
    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr

print(fib_iterative(10000))  # Fast!
```

### Example: Tree Traversal

```python
# Recursive
def traverse_recursive(node):
    if node is None:
        return []
    return (traverse_recursive(node.left) +
            [node.value] +
            traverse_recursive(node.right))

# Iterative with stack
def traverse_iterative(root):
    result = []
    stack = []
    node = root

    while stack or node:
        # Go left as far as possible
        while node:
            stack.append(node)
            node = node.left

        # Process node
        node = stack.pop()
        result.append(node.value)

        # Go right
        node = node.right

    return result
```

---

## Fix 4: Use Tail Recursion Optimization (Manually)

Python does not optimize tail recursion automatically, but you can simulate it:

```python
# Standard recursion (not tail-recursive)
def sum_to_n(n):
    if n == 0:
        return 0
    return n + sum_to_n(n - 1)  # Addition happens AFTER recursive call

# Tail-recursive version (still limited in Python)
def sum_to_n_tail(n, accumulator=0):
    if n == 0:
        return accumulator
    return sum_to_n_tail(n - 1, accumulator + n)  # Tail position

# Trampoline pattern (works around limit)
def trampoline(fn):
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)
        while callable(result):
            result = result()
        return result
    return wrapper

def sum_to_n_trampoline(n, accumulator=0):
    if n == 0:
        return accumulator
    return lambda: sum_to_n_trampoline(n - 1, accumulator + n)

# Usage
result = trampoline(sum_to_n_trampoline)(10000, 0)
print(result)  # 50005000
```

---

## Fix 5: Use Memoization

For recursive functions with overlapping subproblems:

```python
from functools import lru_cache

# Without memoization: exponential time, deep recursion
def fib_slow(n):
    if n <= 1:
        return n
    return fib_slow(n - 1) + fib_slow(n - 2)

# With memoization: linear time, still has depth limit
@lru_cache(maxsize=None)
def fib_memoized(n):
    if n <= 1:
        return n
    return fib_memoized(n - 1) + fib_memoized(n - 2)

# You might need to increase limit for large n
import sys
sys.setrecursionlimit(5000)
print(fib_memoized(3000))
```

---

## Debugging Infinite Recursion

### Add Print Statements

```python
def mystery_function(n, depth=0):
    print(f"{'  ' * depth}mystery_function({n})")  # Trace calls

    if n == 1:
        return 1
    elif n % 2 == 0:
        return mystery_function(n // 2, depth + 1)
    else:
        return mystery_function(3 * n + 1, depth + 1)

mystery_function(7)
```

### Track Call Depth

```python
def recursive_with_depth_check(n, max_depth=100, current_depth=0):
    if current_depth > max_depth:
        raise ValueError(f"Exceeded max depth at n={n}")

    if n <= 1:
        return n

    return recursive_with_depth_check(n - 1, max_depth, current_depth + 1)
```

---

## Common Patterns That Cause Issues

### Incorrect Reduction

```python
# WRONG: n never reaches 0 for negative input
def factorial_broken(n):
    if n == 0:
        return 1
    return n * factorial_broken(n - 1)

factorial_broken(-5)  # Infinite recursion!

# CORRECT: Handle edge cases
def factorial_safe(n):
    if n < 0:
        raise ValueError("Factorial not defined for negative numbers")
    if n <= 1:
        return 1
    return n * factorial_safe(n - 1)
```

### Mutual Recursion Gone Wrong

```python
# WRONG: Infinite mutual recursion
def is_even(n):
    if n == 0:
        return True
    return is_odd(n - 1)

def is_odd(n):
    if n == 0:
        return False
    return is_even(n - 1)

is_even(-1)  # Infinite recursion!

# CORRECT: Handle negative numbers
def is_even(n):
    n = abs(n)
    if n == 0:
        return True
    return is_odd(n - 1)

def is_odd(n):
    n = abs(n)
    if n == 0:
        return False
    return is_even(n - 1)
```

---

## When to Use Recursion vs Iteration

### Use Recursion When

- Problem is naturally recursive (trees, graphs)
- Code clarity is more important than performance
- Recursion depth is guaranteed to be small
- You can use memoization effectively

### Use Iteration When

- Processing large datasets
- Performance is critical
- Depth could be large or unbounded
- You are working with simple sequential processing

---

## Summary

When you see "RecursionError: maximum recursion depth exceeded":

1. **Check your base case**: Most common issue
2. **Verify recursion reduces toward base case**: Watch for edge cases
3. **Consider iteration**: Often a better choice for large data
4. **Use memoization**: Reduces redundant calls
5. **Increase limit carefully**: Only when you understand the risk

```python
# Quick fix checklist
def safe_recursive_function(n):
    # 1. Validate input
    if not isinstance(n, int) or n < 0:
        raise ValueError("Invalid input")

    # 2. Clear base case
    if n == 0:
        return 1

    # 3. Guaranteed progress toward base case
    return n * safe_recursive_function(n - 1)
```

Remember: The recursion limit exists to protect you. Work with it, not against it.
