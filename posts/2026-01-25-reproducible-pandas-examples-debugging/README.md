# How to Create Reproducible Pandas Examples for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pandas, Debugging, Data Science, Best Practices

Description: Learn how to create minimal, reproducible pandas examples that make debugging easier and help others assist you when asking questions on forums.

---

When you hit a pandas bug or unexpected behavior, the fastest path to a solution is creating a minimal reproducible example (MRE). A good MRE strips away irrelevant code and data, isolating just the problem. This guide covers techniques for building effective examples that will help you debug faster and get better answers when asking for help.

## Why Reproducible Examples Matter

Every day, thousands of pandas questions go unanswered on Stack Overflow because the asker shared incomplete information. Without a way to reproduce the problem, helpers can only guess at solutions. A well-crafted example does three things:

1. Isolates the actual issue from surrounding code
2. Allows others to run your code and see the same error
3. Often reveals the bug just by creating it

## Creating Sample DataFrames

The foundation of any pandas example is a DataFrame that demonstrates your problem. Here are several approaches to create sample data.

### Dictionary Constructor

The simplest approach uses a dictionary. This works well for small examples with clear column relationships.

```python
import pandas as pd

# Create a simple DataFrame from a dictionary
# Each key becomes a column name, values become rows
df = pd.DataFrame({
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'salary': [50000, 60000, 70000]
})

print(df)
# Output:
#       name  age  salary
# 0    Alice   25   50000
# 1      Bob   30   60000
# 2  Charlie   35   70000
```

### From CSV String

When your issue involves parsing or data types from CSV files, use `pd.read_csv` with `StringIO` to simulate file reading.

```python
import pandas as pd
from io import StringIO

# Simulate reading a CSV file without creating an actual file
# This is useful when your problem involves CSV parsing behavior
csv_data = """name,age,salary,hire_date
Alice,25,50000,2020-01-15
Bob,30,60000,2019-06-20
Charlie,35,70000,2018-03-10"""

df = pd.read_csv(StringIO(csv_data), parse_dates=['hire_date'])

print(df.dtypes)
# Output:
# name                 object
# age                   int64
# salary                int64
# hire_date    datetime64[ns]
# dtype: object
```

### Random Data Generation

For issues involving calculations or aggregations, random data often works fine. Use a seed for reproducibility.

```python
import pandas as pd
import numpy as np

# Set seed so everyone gets the same random numbers
# This makes your example truly reproducible
np.random.seed(42)

df = pd.DataFrame({
    'category': np.random.choice(['A', 'B', 'C'], size=100),
    'value': np.random.randn(100),
    'count': np.random.randint(1, 100, size=100)
})

print(df.head())
# Everyone running this code sees identical output
```

### Date Range Examples

Date-related issues are common. Pandas provides excellent date generation tools.

```python
import pandas as pd

# Generate a date range with specific frequency
# 'D' for daily, 'H' for hourly, 'M' for month end, etc.
dates = pd.date_range(start='2024-01-01', periods=10, freq='D')

df = pd.DataFrame({
    'date': dates,
    'value': range(10)
})

# For timezone-aware examples
df_tz = pd.DataFrame({
    'timestamp': pd.date_range('2024-01-01', periods=5, freq='H', tz='UTC'),
    'value': [1.1, 2.2, 3.3, 4.4, 5.5]
})

print(df_tz.dtypes)
# timestamp    datetime64[ns, UTC]
# value                    float64
```

## Reproducing Multi-Index Issues

Many pandas bugs involve MultiIndex DataFrames. Here is how to create them cleanly.

```python
import pandas as pd
import numpy as np

# Create a MultiIndex from product of arrays
# This generates all combinations of the provided values
arrays = [
    ['Store_A', 'Store_A', 'Store_B', 'Store_B'],
    ['2024-Q1', '2024-Q2', '2024-Q1', '2024-Q2']
]

index = pd.MultiIndex.from_arrays(arrays, names=['store', 'quarter'])

df = pd.DataFrame({
    'revenue': [100, 120, 80, 95],
    'expenses': [70, 75, 60, 65]
}, index=index)

print(df)
# Output:
#                   revenue  expenses
# store   quarter
# Store_A 2024-Q1       100        70
#         2024-Q2       120        75
# Store_B 2024-Q1        80        60
#         2024-Q2        95        65

# Alternative: from_tuples for specific combinations
tuples = [('A', 1), ('A', 2), ('B', 1)]
index = pd.MultiIndex.from_tuples(tuples, names=['letter', 'number'])
```

## Including Expected Output

Always show what you expected versus what you got. This clarifies whether the behavior is a bug or a misunderstanding.

```python
import pandas as pd

# Setup: demonstrate the groupby issue
df = pd.DataFrame({
    'group': ['A', 'A', 'B', 'B'],
    'value': [1, 2, 3, 4]
})

# What I tried
result = df.groupby('group').sum()

# What I got
print("Actual output:")
print(result)
# Output:
#        value
# group
# A          3
# B          7

# What I expected (describe clearly)
# I expected the mean, not the sum
# Expected output:
#        value
# group
# A        1.5
# B        3.5
```

## Handling Large Data Issues

Sometimes your issue only appears with large datasets. Create a scaled-down version that still shows the problem.

```python
import pandas as pd
import numpy as np

# If the issue requires many rows, document the minimum needed
# Start small and increase until the problem appears
np.random.seed(42)

# Example: memory issue that appears with many groups
n_rows = 10000  # Minimum rows where issue appears
n_groups = 1000  # Minimum groups where issue appears

df = pd.DataFrame({
    'group_id': np.random.randint(0, n_groups, n_rows),
    'value': np.random.randn(n_rows)
})

# Describe the issue
# "With this data size, the groupby operation takes 10+ seconds"
# or "Memory usage spikes to 8GB during this operation"
```

## Copying DataFrame Structure

When your real DataFrame has complex structure, use `head()` and `to_dict()` to share it.

```python
import pandas as pd

# If you have an existing DataFrame, extract a small sample
# that demonstrates the issue

# Option 1: Use to_dict for exact reproduction
df = pd.DataFrame({
    'col_a': [1, 2, None],
    'col_b': ['x', 'y', 'z']
})

# Share this output so others can recreate
print(df.head().to_dict())
# {'col_a': {0: 1.0, 1: 2.0, 2: nan}, 'col_b': {0: 'x', 1: 'y', 2: 'z'}}

# Recreate from dict output
from numpy import nan
df_copy = pd.DataFrame({'col_a': {0: 1.0, 1: 2.0, 2: nan}, 'col_b': {0: 'x', 1: 'y', 2: 'z'}})

# Option 2: Use to_clipboard() if available
# df.head(5).to_clipboard()  # Paste into your question
```

## Showing dtypes and Memory

Data type issues are common. Always include this information.

```python
import pandas as pd
from io import StringIO

csv_data = """id,value,flag
1,100,true
2,200,false"""

df = pd.read_csv(StringIO(csv_data))

# Include dtype information in your example
# This often reveals the problem immediately
print(df.dtypes)
# id        int64
# value     int64
# flag     object  # Note: 'true' is a string, not boolean!

# Memory usage can reveal issues with large data
print(df.memory_usage(deep=True))
```

## Complete Example Template

Here is a template you can copy and fill in for your questions.

```python
import pandas as pd
import numpy as np
from io import StringIO

# Pandas version (include this - behavior changes between versions)
print(f"Pandas version: {pd.__version__}")

# 1. Create minimal sample data
df = pd.DataFrame({
    'col1': [1, 2, 3],
    'col2': ['a', 'b', 'c']
})

# 2. Show the data
print("Input DataFrame:")
print(df)
print(f"\nDtypes:\n{df.dtypes}")

# 3. Code that demonstrates the issue
# result = df.some_operation()

# 4. Actual output
# print("\nActual output:")
# print(result)

# 5. Expected output (describe what you wanted)
# "I expected the result to be..."
```

## Common Pitfalls to Avoid

When creating reproducible examples, watch out for these mistakes.

```python
# BAD: References external file
# df = pd.read_csv('my_data.csv')  # Nobody else has this file

# GOOD: Use StringIO with sample data
from io import StringIO
df = pd.read_csv(StringIO("col1,col2\n1,a\n2,b"))

# BAD: Uses undefined variables
# df = process_data(raw_df)  # What is raw_df? What does process_data do?

# GOOD: Define everything
raw_df = pd.DataFrame({'x': [1, 2, 3]})
def process_data(df):
    return df * 2
df = process_data(raw_df)

# BAD: Includes irrelevant code
# df = df.drop(columns=['unused1', 'unused2'])
# df = df.rename(columns={'old': 'new'})
# df = df[df['filter'] > 0]  # If this is not related to your issue, remove it

# GOOD: Only include code relevant to the problem
df = pd.DataFrame({'value': [1, 2, 3]})
# The issue is with this specific operation:
result = df.value.apply(lambda x: x / 0)  # ZeroDivisionError
```

## Using pd.util.testing

Pandas includes testing utilities that can help create sample data.

```python
import pandas as pd
import pandas._testing as tm

# Create a random DataFrame with specified shape
# Useful for quick examples when exact values do not matter
df = tm.makeDataFrame()  # 30 rows, 4 columns of random floats
print(df.head())

# Create DataFrame with missing values
df_with_na = tm.makeMissingDataframe()

# Create time series DataFrame
ts_df = tm.makeTimeDataFrame()
```

## Summary

Creating reproducible pandas examples takes practice, but it pays off. A good example should be self-contained, minimal, and clearly document expected versus actual behavior. When you take time to isolate your problem, you often solve it yourself. When you need help from others, a clear example gets you answers faster.

Key points:
- Use dictionaries or StringIO for sample data
- Set random seeds for reproducibility
- Include pandas version and dtypes
- Show expected versus actual output
- Remove irrelevant code
- Make it copy-paste runnable
