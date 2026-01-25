# How to Serialize Objects with pickle in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pickle, Serialization, Data Persistence, Object Storage

Description: Learn how to use Python's pickle module to serialize and deserialize objects, along with security considerations and alternatives for different use cases.

---

> Pickle lets you save any Python object to a file and load it back later, preserving its exact state. This is useful for caching, storing machine learning models, or saving application state. However, pickle comes with security implications you need to understand.

Python's `pickle` module converts Python objects into a byte stream (serialization) and reconstructs them later (deserialization). Unlike JSON, pickle can handle almost any Python object, including custom classes, functions, and nested structures.

---

## Basic Serialization

### Saving Objects to Files

```python
import pickle

# Sample data
data = {
    'users': ['Alice', 'Bob', 'Charlie'],
    'scores': [95, 87, 92],
    'metadata': {'version': 1, 'created': '2024-01-25'}
}

# Save to file
with open('data.pkl', 'wb') as f:  # Note: 'wb' for write binary
    pickle.dump(data, f)

print("Data saved successfully")
```

### Loading Objects from Files

```python
import pickle

# Load from file
with open('data.pkl', 'rb') as f:  # Note: 'rb' for read binary
    loaded_data = pickle.load(f)

print(loaded_data)
# {'users': ['Alice', 'Bob', 'Charlie'], 'scores': [95, 87, 92], ...}
```

### Serializing to Bytes

```python
import pickle

data = [1, 2, 3, {'key': 'value'}]

# Serialize to bytes (useful for network transfer, databases)
serialized = pickle.dumps(data)
print(type(serialized))  # <class 'bytes'>

# Deserialize from bytes
restored = pickle.loads(serialized)
print(restored)  # [1, 2, 3, {'key': 'value'}]
```

---

## Pickling Custom Classes

```python
import pickle

class User:
    def __init__(self, name, email):
        self.name = name
        self.email = email
        self._cache = None  # Private attribute

    def __repr__(self):
        return f"User({self.name!r}, {self.email!r})"

# Create and pickle
user = User("Alice", "alice@example.com")

with open('user.pkl', 'wb') as f:
    pickle.dump(user, f)

# Load it back
with open('user.pkl', 'rb') as f:
    loaded_user = pickle.load(f)

print(loaded_user)  # User('Alice', 'alice@example.com')
print(loaded_user.name)  # Alice
```

### Customizing Pickling Behavior

Control what gets pickled with `__getstate__` and `__setstate__`:

```python
import pickle

class DatabaseConnection:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self._connection = self._connect()  # Not picklable

    def _connect(self):
        # Simulate database connection
        print(f"Connecting to {self.host}:{self.port}")
        return f"Connection to {self.host}"

    def __getstate__(self):
        """Define what to pickle."""
        state = self.__dict__.copy()
        # Remove non-picklable attributes
        del state['_connection']
        return state

    def __setstate__(self, state):
        """Define how to restore from pickle."""
        self.__dict__.update(state)
        # Reconnect after unpickling
        self._connection = self._connect()

# Test it
conn = DatabaseConnection('localhost', 5432)
# Output: Connecting to localhost:5432

# Pickle and restore
serialized = pickle.dumps(conn)
restored = pickle.loads(serialized)
# Output: Connecting to localhost:5432 (reconnects automatically)

print(restored.host)  # localhost
```

### Using __reduce__ for Complex Cases

```python
import pickle

class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __reduce__(self):
        """Return a callable and args to recreate the object."""
        return (self.__class__, ())

# The singleton pattern is preserved through pickling
s1 = Singleton()
data = pickle.dumps(s1)
s2 = pickle.loads(data)

print(s1 is Singleton._instance)  # True
```

---

## Protocol Versions

Pickle has multiple protocol versions with different features:

```python
import pickle

data = {'key': 'value'}

# Check available protocols
print(f"Highest protocol: {pickle.HIGHEST_PROTOCOL}")  # 5 in Python 3.8+
print(f"Default protocol: {pickle.DEFAULT_PROTOCOL}")

# Use specific protocol
with open('data_v4.pkl', 'wb') as f:
    pickle.dump(data, f, protocol=4)

# Protocol 0: ASCII, human-readable, slowest
# Protocol 1: Old binary format
# Protocol 2: New-style classes
# Protocol 3: Python 3 support
# Protocol 4: Large objects, more efficient (default in 3.8+)
# Protocol 5: Out-of-band data, buffer protocol (3.8+)

# For maximum compatibility with older Python versions
with open('compatible.pkl', 'wb') as f:
    pickle.dump(data, f, protocol=2)

# For best performance with current Python
with open('fast.pkl', 'wb') as f:
    pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
```

---

## Security Warning

**Never unpickle data from untrusted sources.** Pickle can execute arbitrary code:

```python
import pickle
import os

# DANGEROUS: This could be in a malicious pickle file
class Malicious:
    def __reduce__(self):
        # This runs when unpickled!
        return (os.system, ('echo "I could delete your files!"',))

# Creating malicious pickle data
malicious_data = pickle.dumps(Malicious())

# DON'T DO THIS with untrusted data!
# pickle.loads(malicious_data)  # Would execute the command
```

### Safe Alternatives for Untrusted Data

```python
# For simple data, use JSON (safe)
import json

data = {'name': 'Alice', 'scores': [1, 2, 3]}
json_str = json.dumps(data)
restored = json.loads(json_str)  # Safe!

# For structured data, use marshmallow or pydantic
from pydantic import BaseModel

class UserData(BaseModel):
    name: str
    email: str

# Only accepts valid data, no code execution
user = UserData.parse_raw('{"name": "Alice", "email": "alice@example.com"}')
```

---

## Practical Use Cases

### Caching Expensive Computations

```python
import pickle
import os
import hashlib

def cached_computation(func):
    """Decorator to cache function results using pickle."""

    def wrapper(*args, **kwargs):
        # Create unique cache key
        key_data = pickle.dumps((func.__name__, args, sorted(kwargs.items())))
        cache_key = hashlib.md5(key_data).hexdigest()
        cache_file = f'.cache/{cache_key}.pkl'

        # Check cache
        if os.path.exists(cache_file):
            with open(cache_file, 'rb') as f:
                print("Loading from cache...")
                return pickle.load(f)

        # Compute and cache
        result = func(*args, **kwargs)

        os.makedirs('.cache', exist_ok=True)
        with open(cache_file, 'wb') as f:
            pickle.dump(result, f)

        return result

    return wrapper

@cached_computation
def expensive_calculation(n):
    """Simulates expensive computation."""
    import time
    time.sleep(2)  # Simulate long computation
    return sum(range(n))

# First call: slow
result1 = expensive_calculation(1000000)

# Second call: instant (from cache)
result2 = expensive_calculation(1000000)
```

### Saving Machine Learning Models

```python
import pickle

# Assuming you have a trained model
class SimpleModel:
    def __init__(self):
        self.weights = None

    def train(self, data):
        # Training logic
        self.weights = [0.5, 0.3, 0.2]

    def predict(self, x):
        return sum(w * xi for w, xi in zip(self.weights, x))

# Train model
model = SimpleModel()
model.train([1, 2, 3])

# Save model
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)

# Later: load and use
with open('model.pkl', 'rb') as f:
    loaded_model = pickle.load(f)

prediction = loaded_model.predict([1, 2, 3])
print(f"Prediction: {prediction}")
```

### Session State Persistence

```python
import pickle
import os
from datetime import datetime

class SessionManager:
    def __init__(self, session_file='session.pkl'):
        self.session_file = session_file
        self.data = self._load()

    def _load(self):
        """Load existing session or create new one."""
        if os.path.exists(self.session_file):
            try:
                with open(self.session_file, 'rb') as f:
                    return pickle.load(f)
            except (pickle.PickleError, EOFError):
                pass
        return {'created': datetime.now(), 'data': {}}

    def save(self):
        """Save session to file."""
        with open(self.session_file, 'wb') as f:
            pickle.dump(self.data, f)

    def set(self, key, value):
        self.data['data'][key] = value
        self.save()

    def get(self, key, default=None):
        return self.data['data'].get(key, default)

# Usage
session = SessionManager()
session.set('user', 'Alice')
session.set('preferences', {'theme': 'dark'})

# Later, in a new Python session
session = SessionManager()
print(session.get('user'))  # Alice
```

---

## Working with Large Objects

### Incremental Pickling

```python
import pickle

class IncrementalPickler:
    """Pickle multiple objects to a single file."""

    def __init__(self, filepath):
        self.filepath = filepath

    def save_objects(self, objects):
        """Save multiple objects."""
        with open(self.filepath, 'wb') as f:
            for obj in objects:
                pickle.dump(obj, f)

    def load_objects(self):
        """Load all objects as a generator."""
        with open(self.filepath, 'rb') as f:
            while True:
                try:
                    yield pickle.load(f)
                except EOFError:
                    break

# Usage
pickler = IncrementalPickler('objects.pkl')

# Save multiple objects
pickler.save_objects([
    {'type': 'user', 'name': 'Alice'},
    {'type': 'user', 'name': 'Bob'},
    {'type': 'config', 'setting': 'value'}
])

# Load objects one at a time (memory efficient)
for obj in pickler.load_objects():
    print(obj)
```

### Compression

```python
import pickle
import gzip

data = {'large': list(range(100000))}

# Save with compression
with gzip.open('data.pkl.gz', 'wb') as f:
    pickle.dump(data, f)

# Load compressed
with gzip.open('data.pkl.gz', 'rb') as f:
    loaded = pickle.load(f)

# Compare sizes
import os
print(f"Compressed: {os.path.getsize('data.pkl.gz')} bytes")
```

---

## Alternatives to Pickle

| Use Case | Recommended |
|----------|-------------|
| Simple data, cross-language | JSON |
| DataFrames | Parquet, Feather |
| ML models | joblib, ONNX |
| Configuration | YAML, TOML |
| Human-readable | JSON, YAML |
| Untrusted data | JSON with validation |

```python
# joblib is better for numpy arrays and ML models
import joblib

model = train_model()
joblib.dump(model, 'model.joblib')
loaded = joblib.load('model.joblib')
```

---

## Summary

Pickle is powerful for Python object serialization:

- **Use `dump`/`load`** for files, `dumps`/`loads` for bytes
- **Customize** with `__getstate__`, `__setstate__`, `__reduce__`
- **Use higher protocols** for better performance
- **Never unpickle untrusted data** - it can execute code
- **Consider alternatives** like JSON or joblib for specific use cases

Pickle is best for trusted, Python-only scenarios like caching, session state, and saving models you trained yourself.
