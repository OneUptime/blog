# How to Work with Files and Directories in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Files, Directories, pathlib, os, File Handling

Description: Learn how to read, write, and manipulate files and directories in Python using both the modern pathlib module and traditional os module approaches.

---

Working with files and directories is a fundamental skill for any Python developer. Whether you are reading configuration files, processing data, or organizing output, Python provides powerful tools for file operations. This guide covers both the modern `pathlib` approach and traditional `os` module methods.

## The Modern Way: pathlib

Python 3.4 introduced `pathlib`, which provides an object-oriented approach to file system paths. It is now the recommended way to work with files and directories.

```python
from pathlib import Path

# Create path objects
current_dir = Path(".")
home_dir = Path.home()
config_file = Path("/etc/config.json")

# Path properties
print(config_file.name)       # config.json
print(config_file.stem)       # config
print(config_file.suffix)     # .json
print(config_file.parent)     # /etc
print(config_file.is_absolute())  # True
```

### Building Paths

```python
from pathlib import Path

# Join paths using / operator
base = Path("/home/user")
full_path = base / "documents" / "report.txt"
print(full_path)  # /home/user/documents/report.txt

# Build paths from components
data_dir = Path("data")
output_file = data_dir / "results" / "output.csv"
```

## Reading Files

### Reading Text Files

```python
from pathlib import Path

# Read entire file at once
content = Path("myfile.txt").read_text()
print(content)

# Read with specific encoding
content = Path("myfile.txt").read_text(encoding="utf-8")

# Read line by line (memory efficient for large files)
with open("myfile.txt", "r") as f:
    for line in f:
        print(line.strip())

# Read all lines into a list
with open("myfile.txt", "r") as f:
    lines = f.readlines()
```

### Reading Binary Files

```python
from pathlib import Path

# Read binary data
data = Path("image.png").read_bytes()

# Process binary file
with open("data.bin", "rb") as f:
    header = f.read(4)  # Read first 4 bytes
    content = f.read()  # Read rest
```

### Reading JSON Files

```python
import json
from pathlib import Path

# Method 1: Using pathlib and json
content = Path("config.json").read_text()
config = json.loads(content)

# Method 2: Using open() with json.load()
with open("config.json", "r") as f:
    config = json.load(f)

print(config["database"]["host"])
```

### Reading CSV Files

```python
import csv

# Read CSV as list of dictionaries
with open("data.csv", "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(row["name"], row["email"])

# Read CSV as list of lists
with open("data.csv", "r") as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip header
    for row in reader:
        print(row[0], row[1])
```

## Writing Files

### Writing Text Files

```python
from pathlib import Path

# Write entire content at once
Path("output.txt").write_text("Hello, World!\n")

# Write with specific encoding
Path("output.txt").write_text("Hello, World!\n", encoding="utf-8")

# Write line by line
lines = ["Line 1", "Line 2", "Line 3"]
with open("output.txt", "w") as f:
    for line in lines:
        f.write(line + "\n")

# Append to existing file
with open("output.txt", "a") as f:
    f.write("Appended line\n")
```

### Writing JSON Files

```python
import json
from pathlib import Path

data = {
    "name": "MyApp",
    "version": "1.0.0",
    "settings": {
        "debug": True,
        "max_connections": 100
    }
}

# Method 1: Using pathlib
Path("config.json").write_text(
    json.dumps(data, indent=2)
)

# Method 2: Using open() with json.dump()
with open("config.json", "w") as f:
    json.dump(data, f, indent=2)
```

### Writing CSV Files

```python
import csv

# Write CSV with headers
data = [
    {"name": "Alice", "age": 30, "city": "New York"},
    {"name": "Bob", "age": 25, "city": "Boston"},
]

with open("people.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["name", "age", "city"])
    writer.writeheader()
    writer.writerows(data)
```

## Working with Directories

### Creating Directories

```python
from pathlib import Path

# Create single directory
Path("new_folder").mkdir()

# Create nested directories (like mkdir -p)
Path("path/to/nested/folder").mkdir(parents=True, exist_ok=True)

# exist_ok=True prevents error if directory exists
```

### Listing Directory Contents

```python
from pathlib import Path

# List all items in directory
for item in Path(".").iterdir():
    print(item)

# List only files
for item in Path(".").iterdir():
    if item.is_file():
        print(f"File: {item}")

# List only directories
for item in Path(".").iterdir():
    if item.is_dir():
        print(f"Directory: {item}")

# Find files matching pattern (glob)
for py_file in Path(".").glob("*.py"):
    print(py_file)

# Recursive glob (all subdirectories)
for py_file in Path(".").rglob("*.py"):
    print(py_file)
```

### Checking Path Properties

```python
from pathlib import Path

path = Path("myfile.txt")

# Check if path exists
if path.exists():
    print("Path exists")

# Check if it is a file
if path.is_file():
    print("It is a file")

# Check if it is a directory
if path.is_dir():
    print("It is a directory")

# Get file size
size = path.stat().st_size
print(f"File size: {size} bytes")

# Get modification time
import datetime
mtime = path.stat().st_mtime
mod_time = datetime.datetime.fromtimestamp(mtime)
print(f"Modified: {mod_time}")
```

### Moving and Copying Files

```python
from pathlib import Path
import shutil

# Rename/move a file
source = Path("old_name.txt")
source.rename("new_name.txt")

# Move to different directory
source = Path("file.txt")
source.rename(Path("backup") / "file.txt")

# Copy file (requires shutil)
shutil.copy("source.txt", "destination.txt")

# Copy directory recursively
shutil.copytree("source_dir", "destination_dir")
```

### Deleting Files and Directories

```python
from pathlib import Path
import shutil

# Delete a file
Path("unwanted.txt").unlink()

# Delete file only if it exists
Path("maybe_exists.txt").unlink(missing_ok=True)

# Delete empty directory
Path("empty_folder").rmdir()

# Delete directory with contents (requires shutil)
shutil.rmtree("folder_with_contents")
```

## Working with Temporary Files

```python
import tempfile
from pathlib import Path

# Create temporary file
with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
    f.write("Temporary content")
    temp_path = f.name

print(f"Temp file: {temp_path}")
Path(temp_path).unlink()  # Clean up

# Create temporary directory
with tempfile.TemporaryDirectory() as tmpdir:
    temp_file = Path(tmpdir) / "data.txt"
    temp_file.write_text("Some data")
    # Directory and contents deleted when context exits
```

## Error Handling

```python
from pathlib import Path

# Handle file not found
try:
    content = Path("nonexistent.txt").read_text()
except FileNotFoundError:
    print("File does not exist")

# Handle permission errors
try:
    Path("/root/secret.txt").write_text("data")
except PermissionError:
    print("Permission denied")

# Handle multiple errors
try:
    with open("file.txt", "r") as f:
        data = f.read()
except FileNotFoundError:
    print("File not found")
except PermissionError:
    print("Permission denied")
except IOError as e:
    print(f"IO error: {e}")
```

## Real World Example: Log File Processor

```python
from pathlib import Path
from datetime import datetime
import json

def process_log_directory(log_dir, output_dir):
    """Process all log files and create summary."""
    log_path = Path(log_dir)
    output_path = Path(output_dir)

    # Create output directory if needed
    output_path.mkdir(parents=True, exist_ok=True)

    results = []

    # Process each log file
    for log_file in log_path.glob("*.log"):
        print(f"Processing {log_file.name}")

        line_count = 0
        error_count = 0

        with open(log_file, "r") as f:
            for line in f:
                line_count += 1
                if "ERROR" in line:
                    error_count += 1

        results.append({
            "file": log_file.name,
            "lines": line_count,
            "errors": error_count
        })

    # Write summary
    summary_file = output_path / "summary.json"
    summary_file.write_text(json.dumps(results, indent=2))

    return results

# Usage
results = process_log_directory("logs", "output")
for r in results:
    print(f"{r['file']}: {r['errors']} errors in {r['lines']} lines")
```

## Summary

| Task | pathlib Method | os Method |
|------|---------------|-----------|
| Create path | `Path("file.txt")` | `os.path.join()` |
| Read file | `path.read_text()` | `open().read()` |
| Write file | `path.write_text()` | `open().write()` |
| Check exists | `path.exists()` | `os.path.exists()` |
| List directory | `path.iterdir()` | `os.listdir()` |
| Create directory | `path.mkdir()` | `os.makedirs()` |
| Delete file | `path.unlink()` | `os.remove()` |

Use `pathlib` for new code. It provides a cleaner, more intuitive API for file operations. The traditional `os` and `os.path` modules are still useful for compatibility with older code.
