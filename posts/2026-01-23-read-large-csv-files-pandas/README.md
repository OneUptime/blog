# How to Read Large CSV Files Efficiently in Pandas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pandas, CSV, Data Processing, Memory Optimization

Description: Learn techniques to efficiently read and process large CSV files with Pandas, including chunking, data type optimization, and memory-efficient alternatives.

---

> Working with CSV files that are gigabytes in size can quickly exhaust your system memory if you use the default `pd.read_csv()`. This guide covers practical techniques to process large files efficiently, from data type optimization to chunked processing.

When a CSV file is too large to fit in memory, Pandas provides several strategies to handle it. The right approach depends on your specific use case: whether you need all the data at once, can process it in chunks, or only need specific columns.

---

## Understanding the Memory Problem

```python
import pandas as pd

# This might crash with a 10GB file
df = pd.read_csv('huge_file.csv')  # MemoryError!

# Why? Pandas loads everything into memory at once
# A 10GB CSV can easily become 30GB+ in memory due to:
# - String columns stored as Python objects
# - Integer columns using 64-bit by default
# - Index overhead
```

---

## Strategy 1: Read Only What You Need

### Select Specific Columns

```python
# Only read the columns you actually need
df = pd.read_csv(
    'large_file.csv',
    usecols=['id', 'name', 'amount']  # Only these columns
)

# This can drastically reduce memory usage
# A file with 100 columns becomes much smaller with just 3
```

### Read a Sample First

```python
# Read first few rows to understand the data
sample = pd.read_csv('large_file.csv', nrows=1000)
print(sample.dtypes)
print(sample.describe())

# This helps you plan your processing strategy
```

### Skip Rows You Don't Need

```python
# Skip the first N rows (after header)
df = pd.read_csv('large_file.csv', skiprows=range(1, 1000000))

# Read every Nth row using a function
df = pd.read_csv(
    'large_file.csv',
    skiprows=lambda i: i > 0 and i % 10 != 0  # Every 10th row
)
```

---

## Strategy 2: Optimize Data Types

Data type optimization can reduce memory by 50-90%.

### Check Current Memory Usage

```python
def memory_usage(df):
    """Show memory usage per column."""
    usage = df.memory_usage(deep=True)
    total = usage.sum()
    print(f"Total: {total / 1024**2:.2f} MB")
    print("\nBy column:")
    for col in df.columns:
        print(f"  {col}: {usage[col] / 1024**2:.2f} MB")
    return total

memory_usage(df)
```

### Specify Data Types When Reading

```python
# Define optimal dtypes based on your data
dtype_spec = {
    'id': 'int32',           # Instead of int64
    'count': 'int16',        # For small integers
    'price': 'float32',      # Instead of float64
    'category': 'category',  # For repeated strings
    'flag': 'bool',          # For True/False
}

df = pd.read_csv('large_file.csv', dtype=dtype_spec)
```

### Automatic Type Optimization

```python
def optimize_dtypes(df):
    """Automatically optimize DataFrame dtypes."""

    for col in df.columns:
        col_type = df[col].dtype

        # Optimize integers
        if col_type == 'int64':
            c_min = df[col].min()
            c_max = df[col].max()

            if c_min >= 0:
                if c_max < 255:
                    df[col] = df[col].astype('uint8')
                elif c_max < 65535:
                    df[col] = df[col].astype('uint16')
                elif c_max < 4294967295:
                    df[col] = df[col].astype('uint32')
            else:
                if c_min > -128 and c_max < 127:
                    df[col] = df[col].astype('int8')
                elif c_min > -32768 and c_max < 32767:
                    df[col] = df[col].astype('int16')
                elif c_min > -2147483648 and c_max < 2147483647:
                    df[col] = df[col].astype('int32')

        # Optimize floats
        elif col_type == 'float64':
            df[col] = df[col].astype('float32')

        # Optimize objects (strings)
        elif col_type == 'object':
            num_unique = df[col].nunique()
            num_total = len(df[col])

            # Use category for columns with few unique values
            if num_unique / num_total < 0.5:
                df[col] = df[col].astype('category')

    return df

# Usage
df = pd.read_csv('large_file.csv')
df = optimize_dtypes(df)
```

---

## Strategy 3: Process in Chunks

For files too large to fit in memory, process them piece by piece.

### Basic Chunking

```python
# Process file in 100,000 row chunks
chunk_size = 100_000
results = []

for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    # Process each chunk
    processed = chunk[chunk['amount'] > 100]
    results.append(processed)

# Combine results if they fit in memory
final_df = pd.concat(results, ignore_index=True)
```

### Aggregating Without Loading Everything

```python
# Calculate statistics without loading full file
chunk_size = 100_000
total_sum = 0
total_count = 0

for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    total_sum += chunk['amount'].sum()
    total_count += len(chunk)

average = total_sum / total_count
print(f"Average: {average}")
```

### Filtering Large Files

```python
def filter_large_csv(input_file, output_file, filter_func, chunk_size=100_000):
    """Filter a large CSV file without loading it all."""

    first_chunk = True

    for chunk in pd.read_csv(input_file, chunksize=chunk_size):
        # Apply filter
        filtered = chunk[filter_func(chunk)]

        # Write to output
        filtered.to_csv(
            output_file,
            mode='a' if not first_chunk else 'w',
            header=first_chunk,
            index=False
        )

        first_chunk = False

# Usage
filter_large_csv(
    'large_file.csv',
    'filtered_file.csv',
    filter_func=lambda df: df['status'] == 'active'
)
```

### Parallel Chunk Processing

```python
import pandas as pd
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

def process_chunk(chunk_data):
    """Process a single chunk."""
    # Your processing logic
    return chunk_data.groupby('category')['amount'].sum()

def parallel_process_csv(filepath, chunk_size=100_000):
    """Process CSV in parallel using multiple cores."""

    chunks = list(pd.read_csv(filepath, chunksize=chunk_size))

    # Process chunks in parallel
    num_workers = multiprocessing.cpu_count()

    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        results = list(executor.map(process_chunk, chunks))

    # Combine results
    return pd.concat(results).groupby(level=0).sum()

# Usage
result = parallel_process_csv('large_file.csv')
```

---

## Strategy 4: Use Memory-Efficient Alternatives

### Using Dask for Out-of-Core Processing

```python
# Install: pip install dask
import dask.dataframe as dd

# Dask reads lazily and processes in parallel
df = dd.read_csv('large_file.csv')

# Operations are lazy - not executed until needed
filtered = df[df['amount'] > 100]
grouped = filtered.groupby('category')['amount'].sum()

# Execute and get result
result = grouped.compute()
```

### Using Polars for Speed

```python
# Install: pip install polars
import polars as pl

# Polars is faster and more memory efficient
df = pl.read_csv('large_file.csv')

# Lazy evaluation with scan_csv
lazy_df = pl.scan_csv('large_file.csv')
result = (
    lazy_df
    .filter(pl.col('amount') > 100)
    .groupby('category')
    .agg(pl.col('amount').sum())
    .collect()
)
```

### Using SQLite for Query Flexibility

```python
import sqlite3
import pandas as pd

def csv_to_sqlite(csv_file, db_file, table_name, chunk_size=100_000):
    """Load CSV into SQLite for efficient querying."""

    conn = sqlite3.connect(db_file)

    for i, chunk in enumerate(pd.read_csv(csv_file, chunksize=chunk_size)):
        chunk.to_sql(
            table_name,
            conn,
            if_exists='append' if i > 0 else 'replace',
            index=False
        )
        print(f"Loaded chunk {i + 1}")

    # Create indexes for faster queries
    conn.execute(f"CREATE INDEX IF NOT EXISTS idx_category ON {table_name}(category)")
    conn.commit()
    conn.close()

# Load CSV into SQLite
csv_to_sqlite('large_file.csv', 'data.db', 'transactions')

# Now query efficiently
conn = sqlite3.connect('data.db')
result = pd.read_sql(
    "SELECT category, SUM(amount) as total FROM transactions GROUP BY category",
    conn
)
```

---

## Strategy 5: Efficient File Formats

### Convert to Parquet

```python
# Parquet is much more efficient than CSV
# - Compressed storage
# - Columnar format (read only needed columns)
# - Preserves data types

# Convert CSV to Parquet (one-time operation)
for i, chunk in enumerate(pd.read_csv('large_file.csv', chunksize=100_000)):
    chunk.to_parquet(f'data_part_{i}.parquet', index=False)

# Read Parquet files (much faster and smaller)
df = pd.read_parquet('data_part_0.parquet')

# Read specific columns from Parquet
df = pd.read_parquet('data_part_0.parquet', columns=['id', 'amount'])
```

### Feather Format for Speed

```python
# Feather is fast for read/write (no compression)
df.to_feather('data.feather')
df = pd.read_feather('data.feather')
```

---

## Practical Example: Processing a 10GB Log File

```python
import pandas as pd
from datetime import datetime

def process_large_log_file(filepath):
    """Process a large log file to extract daily statistics."""

    dtype_spec = {
        'timestamp': str,
        'user_id': 'int32',
        'action': 'category',
        'duration_ms': 'int32'
    }

    daily_stats = {}
    chunk_size = 500_000

    for chunk in pd.read_csv(filepath, dtype=dtype_spec, chunksize=chunk_size):
        # Parse dates
        chunk['date'] = pd.to_datetime(chunk['timestamp']).dt.date

        # Calculate statistics per day
        for date, group in chunk.groupby('date'):
            if date not in daily_stats:
                daily_stats[date] = {
                    'total_actions': 0,
                    'unique_users': set(),
                    'total_duration': 0
                }

            daily_stats[date]['total_actions'] += len(group)
            daily_stats[date]['unique_users'].update(group['user_id'])
            daily_stats[date]['total_duration'] += group['duration_ms'].sum()

    # Convert to DataFrame
    result = pd.DataFrame([
        {
            'date': date,
            'total_actions': stats['total_actions'],
            'unique_users': len(stats['unique_users']),
            'avg_duration': stats['total_duration'] / stats['total_actions']
        }
        for date, stats in daily_stats.items()
    ])

    return result.sort_values('date')

# Usage
stats = process_large_log_file('access_logs.csv')
print(stats)
```

---

## Memory Monitoring

```python
import psutil
import os

def get_memory_usage():
    """Get current process memory usage in MB."""
    process = psutil.Process(os.getpid())
    return process.memory_info().rss / 1024 / 1024

print(f"Before: {get_memory_usage():.2f} MB")

# Load data
df = pd.read_csv('large_file.csv')

print(f"After: {get_memory_usage():.2f} MB")
```

---

## Summary

Techniques for handling large CSV files:

1. **Read only what you need**: Use `usecols`, `nrows`, `skiprows`
2. **Optimize data types**: Use appropriate dtypes, convert to category
3. **Process in chunks**: Use `chunksize` parameter
4. **Use alternatives**: Dask, Polars, SQLite for very large files
5. **Convert formats**: Parquet is much more efficient than CSV

Choose based on your needs:
- **Need full data in memory**: Optimize dtypes
- **Can process iteratively**: Use chunking
- **Need SQL-like queries**: Use SQLite or Dask
- **Working with same data repeatedly**: Convert to Parquet
