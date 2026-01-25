# How to Read and Write JSON Files in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, JSON, File I/O, Data Serialization, Configuration

Description: A complete guide to reading and writing JSON files in Python using the built-in json module, covering basic operations, handling errors, and working with complex data types.

---

> JSON has become the lingua franca of data exchange on the web. Whether you are saving application configuration, processing API responses, or storing structured data, understanding how to work with JSON files in Python is essential for every developer.

JSON (JavaScript Object Notation) is a lightweight, human-readable format that maps naturally to Python dictionaries and lists. Python's built-in `json` module makes it straightforward to parse JSON from files and strings, as well as serialize Python objects back to JSON.

---

## Basic JSON Reading

The simplest way to read a JSON file is with `json.load()`:

```python
import json

# Open the file and parse JSON content
with open('config.json', 'r') as file:
    data = json.load(file)

# Now data is a Python dictionary (or list, depending on JSON structure)
print(data)
print(type(data))  # <class 'dict'>
```

The `with` statement ensures the file is properly closed after reading, even if an error occurs.

### Reading JSON from a String

If you have JSON as a string (common when working with APIs), use `json.loads()`:

```python
import json

json_string = '{"name": "Alice", "age": 30, "active": true}'

# Parse JSON string to Python dict
data = json.loads(json_string)

print(data['name'])  # Output: Alice
print(data['active'])  # Output: True (converted to Python bool)
```

Notice that JSON's `true` becomes Python's `True`, and `null` becomes `None`.

---

## Basic JSON Writing

To write Python data to a JSON file, use `json.dump()`:

```python
import json

# Python dictionary to save
user_data = {
    'name': 'Bob',
    'email': 'bob@example.com',
    'roles': ['admin', 'user'],
    'settings': {
        'theme': 'dark',
        'notifications': True
    }
}

# Write to file
with open('user.json', 'w') as file:
    json.dump(user_data, file)
```

This creates a compact JSON file without formatting. For human-readable output, add formatting options:

```python
import json

user_data = {
    'name': 'Bob',
    'roles': ['admin', 'user']
}

# Pretty-print with indentation
with open('user_pretty.json', 'w') as file:
    json.dump(user_data, file, indent=4, sort_keys=True)
```

Output file content:
```json
{
    "name": "Bob",
    "roles": [
        "admin",
        "user"
    ]
}
```

### Converting Python Objects to JSON Strings

Use `json.dumps()` (with an 's' for string) to get a JSON string:

```python
import json

data = {'status': 'success', 'count': 42}

# Convert to JSON string
json_string = json.dumps(data)
print(json_string)  # Output: {"status": "success", "count": 42}

# With formatting
formatted = json.dumps(data, indent=2)
print(formatted)
```

---

## Handling Common Errors

### FileNotFoundError

Always handle the case where the file does not exist:

```python
import json
import os

def load_config(filepath):
    """Load JSON config file with proper error handling."""

    # Check if file exists first
    if not os.path.exists(filepath):
        print(f"Config file not found: {filepath}")
        return {}

    try:
        with open(filepath, 'r') as file:
            return json.load(file)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in {filepath}: {e}")
        return {}

config = load_config('settings.json')
```

### JSONDecodeError

Invalid JSON will raise a `JSONDecodeError`:

```python
import json

# This JSON has a syntax error (trailing comma)
bad_json = '{"name": "Alice", "age": 30,}'

try:
    data = json.loads(bad_json)
except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
    print(f"Error at line {e.lineno}, column {e.colno}")
    # Output: JSON parsing error: Expecting property name enclosed in double quotes
```

### Comprehensive Error Handling

```python
import json
from pathlib import Path

def safe_load_json(filepath):
    """Safely load JSON with comprehensive error handling."""

    path = Path(filepath)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {filepath}")

    if not path.is_file():
        raise ValueError(f"Path is not a file: {filepath}")

    try:
        with open(path, 'r', encoding='utf-8') as file:
            content = file.read()

            # Handle empty files
            if not content.strip():
                return {}

            return json.loads(content)

    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {filepath}: {e}")
    except PermissionError:
        raise PermissionError(f"Permission denied reading: {filepath}")

# Usage
try:
    data = safe_load_json('config.json')
except (FileNotFoundError, ValueError, PermissionError) as e:
    print(f"Error loading config: {e}")
    data = {}
```

---

## Working with Complex Data Types

JSON only supports a limited set of types: strings, numbers, booleans, null, arrays, and objects. Python has additional types that need special handling.

### Handling datetime Objects

```python
import json
from datetime import datetime, date

# This will fail
event = {
    'name': 'Conference',
    'date': datetime.now()
}

# json.dumps(event)  # TypeError: Object of type datetime is not JSON serializable

# Solution 1: Convert to ISO format string
event = {
    'name': 'Conference',
    'date': datetime.now().isoformat()
}
print(json.dumps(event))

# Solution 2: Custom encoder
class DateTimeEncoder(json.JSONEncoder):
    """Custom encoder that handles datetime objects."""

    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)

event = {
    'name': 'Conference',
    'date': datetime.now()
}
print(json.dumps(event, cls=DateTimeEncoder))
```

### Custom Decoder for datetime

```python
import json
from datetime import datetime
import re

def datetime_decoder(dct):
    """Decode ISO format strings back to datetime objects."""

    iso_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}')

    for key, value in dct.items():
        if isinstance(value, str) and iso_pattern.match(value):
            try:
                dct[key] = datetime.fromisoformat(value)
            except ValueError:
                pass  # Not a valid datetime, keep as string

    return dct

json_str = '{"event": "Meeting", "time": "2024-03-15T14:30:00"}'
data = json.loads(json_str, object_hook=datetime_decoder)
print(type(data['time']))  # <class 'datetime.datetime'>
```

### Handling Custom Classes

```python
import json

class User:
    def __init__(self, name, email, created_at=None):
        self.name = name
        self.email = email
        self.created_at = created_at or datetime.now()

    def to_dict(self):
        """Convert User to dictionary for JSON serialization."""
        return {
            '_type': 'User',  # Type marker for deserialization
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

    @classmethod
    def from_dict(cls, data):
        """Create User from dictionary."""
        return cls(
            name=data['name'],
            email=data['email'],
            created_at=datetime.fromisoformat(data['created_at'])
        )

# Custom encoder
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Custom decoder
def custom_decoder(dct):
    if dct.get('_type') == 'User':
        return User.from_dict(dct)
    return dct

# Serialize
user = User('Alice', 'alice@example.com')
json_str = json.dumps(user, cls=CustomEncoder, indent=2)
print(json_str)

# Deserialize
loaded_user = json.loads(json_str, object_hook=custom_decoder)
print(f"Loaded: {loaded_user.name}, {loaded_user.email}")
```

---

## Reading Large JSON Files

For very large JSON files, loading everything into memory at once can be problematic. Use `ijson` for streaming:

```python
# First install: pip install ijson
import ijson

def process_large_json(filepath):
    """Process large JSON file without loading entirely into memory."""

    with open(filepath, 'rb') as file:
        # Parse items from a JSON array incrementally
        parser = ijson.items(file, 'users.item')

        for user in parser:
            # Process one user at a time
            print(f"Processing: {user['name']}")
            # Your processing logic here

# For a file like: {"users": [{"name": "Alice"}, {"name": "Bob"}, ...]}
process_large_json('large_users.json')
```

---

## Writing JSON Lines Format

For logging or streaming data, JSON Lines format (one JSON object per line) is useful:

```python
import json

def append_jsonl(filepath, record):
    """Append a single record to a JSON Lines file."""
    with open(filepath, 'a') as file:
        file.write(json.dumps(record) + '\n')

def read_jsonl(filepath):
    """Read records from a JSON Lines file."""
    records = []
    with open(filepath, 'r') as file:
        for line in file:
            if line.strip():  # Skip empty lines
                records.append(json.loads(line))
    return records

# Write multiple records
events = [
    {'event': 'login', 'user': 'alice'},
    {'event': 'purchase', 'user': 'bob'},
    {'event': 'logout', 'user': 'alice'}
]

for event in events:
    append_jsonl('events.jsonl', event)

# Read back
loaded_events = read_jsonl('events.jsonl')
print(loaded_events)
```

---

## Configuration File Best Practices

A common use case is application configuration files:

```python
import json
import os
from pathlib import Path

class Config:
    """Configuration manager with JSON file backend."""

    def __init__(self, filepath, defaults=None):
        self.filepath = Path(filepath)
        self.defaults = defaults or {}
        self._data = {}
        self.load()

    def load(self):
        """Load configuration from file, using defaults for missing values."""
        if self.filepath.exists():
            try:
                with open(self.filepath, 'r') as file:
                    self._data = json.load(file)
            except json.JSONDecodeError:
                self._data = {}

        # Merge with defaults (defaults for missing keys)
        for key, value in self.defaults.items():
            if key not in self._data:
                self._data[key] = value

    def save(self):
        """Save current configuration to file."""
        # Ensure parent directory exists
        self.filepath.parent.mkdir(parents=True, exist_ok=True)

        with open(self.filepath, 'w') as file:
            json.dump(self._data, file, indent=2)

    def get(self, key, default=None):
        """Get configuration value."""
        return self._data.get(key, default)

    def set(self, key, value):
        """Set configuration value and save."""
        self._data[key] = value
        self.save()

# Usage
config = Config('app_config.json', defaults={
    'debug': False,
    'log_level': 'INFO',
    'max_connections': 100
})

print(config.get('debug'))  # False
config.set('debug', True)  # Saves automatically
```

---

## Security Considerations

Never use `eval()` to parse JSON. Always use `json.loads()`:

```python
import json

# DANGEROUS - Never do this!
# data = eval(json_string)  # Allows code execution

# Safe - Always do this
data = json.loads(json_string)
```

When loading JSON from untrusted sources, validate the structure:

```python
import json

def validate_user_data(data):
    """Validate that data has required fields."""
    required_fields = ['name', 'email']

    if not isinstance(data, dict):
        raise ValueError("Expected a JSON object")

    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    return data

json_input = '{"name": "Alice", "email": "alice@example.com"}'

try:
    data = json.loads(json_input)
    validated = validate_user_data(data)
    print(f"Valid user: {validated['name']}")
except (json.JSONDecodeError, ValueError) as e:
    print(f"Invalid input: {e}")
```

---

## Summary

Python's `json` module provides all the tools you need for working with JSON:

- `json.load()` / `json.loads()` for reading
- `json.dump()` / `json.dumps()` for writing
- Custom encoders/decoders for complex types
- Always handle `JSONDecodeError` for invalid input

For most applications, the built-in module is sufficient. For large files, consider streaming parsers like `ijson`. For performance-critical applications, explore alternatives like `orjson` or `ujson`.
