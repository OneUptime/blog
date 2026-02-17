# How to Fix 'ZeroDivisionError' in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Debugging, Error Handling, Common Errors, Mathematics

Description: Learn how to fix ZeroDivisionError in Python. Understand when this error occurs and implement defensive coding patterns to handle division safely.

---

The `ZeroDivisionError` occurs when you try to divide a number by zero. This is mathematically undefined, and Python raises an exception to prevent incorrect results. This guide covers common scenarios and best practices for handling division safely.

## Understanding ZeroDivisionError

```python
# Division by zero raises ZeroDivisionError
10 / 0    # ZeroDivisionError: division by zero
10 // 0   # ZeroDivisionError: integer division or modulo by zero
10 % 0    # ZeroDivisionError: integer division or modulo by zero
```

The error also occurs with float division (though floats have `inf` in some languages, Python raises an error):

```python
10.0 / 0.0  # ZeroDivisionError: float division by zero
```

## Solutions for Handling Division by Zero

### 1. Check Before Dividing

```python
def safe_divide(a, b):
    """Divide a by b, return None if b is zero."""
    if b == 0:
        return None
    return a / b

result = safe_divide(10, 0)
if result is not None:
    print(f"Result: {result}")
else:
    print("Cannot divide by zero")
```

### 2. Use try/except

```python
def divide(a, b):
    """Divide with exception handling."""
    try:
        return a / b
    except ZeroDivisionError:
        return None  # Or return a default value

# With error message
def divide_verbose(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        print(f"Warning: Cannot divide {a} by zero")
        return 0
```

### 3. Return a Default Value

```python
def safe_divide(a, b, default=0):
    """Divide a by b, return default if b is zero."""
    if b == 0:
        return default
    return a / b

# Use cases
percentage = safe_divide(completed, total, default=0) * 100
rate = safe_divide(amount, duration, default=float('inf'))
```

### 4. Use math.inf for Special Cases

```python
import math

def divide_or_infinity(a, b):
    """Return infinity for division by zero (like some calculators)."""
    if b == 0:
        if a > 0:
            return math.inf
        elif a < 0:
            return -math.inf
        else:
            return math.nan  # 0/0 is undefined
    return a / b

print(divide_or_infinity(10, 0))   # inf
print(divide_or_infinity(-10, 0))  # -inf
print(divide_or_infinity(0, 0))    # nan
```

## Common Scenarios

### Calculating Percentages

```python
def calculate_percentage(part, whole):
    """Calculate percentage safely."""
    if whole == 0:
        return 0  # Or return None, or raise custom exception
    return (part / whole) * 100

# Example: progress tracking
completed_tasks = 5
total_tasks = 0  # Oops, no tasks

progress = calculate_percentage(completed_tasks, total_tasks)
print(f"Progress: {progress}%")  # Progress: 0%
```

### Computing Averages

```python
def calculate_average(numbers):
    """Calculate average of a list."""
    if not numbers:  # Empty list
        return None
    return sum(numbers) / len(numbers)

scores = []
avg = calculate_average(scores)
if avg is not None:
    print(f"Average: {avg}")
else:
    print("No scores to average")

# Using statistics module (handles edge cases)
from statistics import mean, StatisticsError

try:
    avg = mean(scores)
except StatisticsError:
    avg = None
```

### Rate Calculations

```python
def calculate_rate(amount, duration):
    """Calculate rate (amount per unit time)."""
    if duration <= 0:
        raise ValueError("Duration must be positive")
    return amount / duration

# Speed calculation
def calculate_speed(distance, time):
    """Calculate speed in distance per time unit."""
    if time == 0:
        return float('inf') if distance > 0 else 0
    return distance / time
```

### Financial Calculations

```python
def calculate_roi(gain, investment):
    """Calculate return on investment."""
    if investment == 0:
        raise ValueError("Investment cannot be zero")
    return ((gain - investment) / investment) * 100

# Safer version
def safe_roi(gain, investment, default=0):
    """Calculate ROI with fallback."""
    if investment == 0:
        return default
    return ((gain - investment) / investment) * 100
```

### Processing Data from External Sources

```python
def process_records(records):
    """Process records, calculating ratios."""
    results = []

    for record in records:
        numerator = record.get("value", 0)
        denominator = record.get("count", 0)

        if denominator == 0:
            ratio = None
        else:
            ratio = numerator / denominator

        results.append({
            "id": record.get("id"),
            "ratio": ratio
        })

    return results

# Example with pandas
import pandas as pd

df = pd.DataFrame({
    "revenue": [100, 200, 0],
    "units": [10, 0, 0]
})

# Replace inf with NaN
df["price_per_unit"] = df["revenue"] / df["units"].replace(0, pd.NA)
```

## Using Decimal for Precision

```python
from decimal import Decimal, DivisionByZero, InvalidOperation

def precise_divide(a, b):
    """Divide using Decimal for precision."""
    try:
        return Decimal(str(a)) / Decimal(str(b))
    except (DivisionByZero, InvalidOperation):
        return None

result = precise_divide(10, 3)
print(result)  # 3.333333333333333333333333333

result = precise_divide(10, 0)
print(result)  # None
```

## Numpy and Zero Division

```python
import numpy as np

# NumPy returns inf instead of raising error
a = np.array([1, 2, 3])
b = np.array([1, 0, 3])

# This gives a warning but returns inf
with np.errstate(divide='ignore', invalid='ignore'):
    result = a / b
print(result)  # [1. inf 1.]

# Replace inf with a specific value
result = np.where(b != 0, a / b, 0)
print(result)  # [1. 0. 1.]

# Or use numpy's divide with where
result = np.divide(a, b, out=np.zeros_like(a, dtype=float), where=b != 0)
```

## Custom Exception

```python
class DivisionError(Exception):
    """Custom exception for division errors."""
    pass

def strict_divide(a, b):
    """Divide with custom exception."""
    if b == 0:
        raise DivisionError(f"Cannot divide {a} by zero")
    return a / b

# Usage
try:
    result = strict_divide(10, 0)
except DivisionError as e:
    print(f"Error: {e}")
    result = 0
```

## Real World Example: Analytics Calculator

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Metrics:
    views: int
    clicks: int
    conversions: int
    revenue: float

class AnalyticsCalculator:
    """Calculate analytics metrics safely."""

    def __init__(self, metrics: Metrics):
        self.metrics = metrics

    def click_through_rate(self) -> Optional[float]:
        """Calculate CTR as percentage."""
        if self.metrics.views == 0:
            return None
        return (self.metrics.clicks / self.metrics.views) * 100

    def conversion_rate(self) -> Optional[float]:
        """Calculate conversion rate as percentage."""
        if self.metrics.clicks == 0:
            return None
        return (self.metrics.conversions / self.metrics.clicks) * 100

    def revenue_per_click(self) -> Optional[float]:
        """Calculate revenue per click."""
        if self.metrics.clicks == 0:
            return None
        return self.metrics.revenue / self.metrics.clicks

    def revenue_per_conversion(self) -> Optional[float]:
        """Calculate revenue per conversion."""
        if self.metrics.conversions == 0:
            return None
        return self.metrics.revenue / self.metrics.conversions

    def summary(self) -> dict:
        """Get all metrics with safe division."""
        def format_metric(value, suffix=""):
            if value is None:
                return "N/A"
            return f"{value:.2f}{suffix}"

        return {
            "ctr": format_metric(self.click_through_rate(), "%"),
            "conversion_rate": format_metric(self.conversion_rate(), "%"),
            "revenue_per_click": format_metric(self.revenue_per_click(), "$"),
            "revenue_per_conversion": format_metric(self.revenue_per_conversion(), "$")
        }

# Usage
metrics = Metrics(views=1000, clicks=50, conversions=0, revenue=100.0)
calc = AnalyticsCalculator(metrics)

print(calc.summary())
# {'ctr': '5.00%', 'conversion_rate': '0.00%',
#  'revenue_per_click': '2.00$', 'revenue_per_conversion': 'N/A'}
```

## Summary

| Approach | When to Use |
|----------|-------------|
| Check before dividing | When you expect zeros and have a clear default |
| try/except | When zeros are exceptional but possible |
| Return None | When caller should decide how to handle |
| Return default value | When a sensible default exists |
| Return infinity | For rate/ratio calculations |
| Raise custom exception | When division by zero is a programming error |

ZeroDivisionError is easy to prevent with proper validation. Check your divisors before dividing, especially when working with user input or external data.
