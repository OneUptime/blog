# How to Use subprocess Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, subprocess, Shell Commands, System Administration, Automation

Description: Learn how to use Python's subprocess module to run external commands, capture output, handle pipes, and automate system tasks safely and effectively.

---

The `subprocess` module lets you spawn new processes, connect to their input/output/error pipes, and obtain their return codes. It is the recommended way to run external commands from Python, replacing older functions like `os.system()`.

## Basic Command Execution

### Using subprocess.run()

`subprocess.run()` is the recommended approach for most use cases (Python 3.5+):

```python
import subprocess

# Simple command
result = subprocess.run(["ls", "-la"], capture_output=True, text=True)
print(result.stdout)
print(f"Return code: {result.returncode}")

# Check for errors
if result.returncode != 0:
    print(f"Error: {result.stderr}")
```

### Capturing Output

```python
import subprocess

# Capture stdout and stderr
result = subprocess.run(
    ["python", "--version"],
    capture_output=True,
    text=True  # Return strings instead of bytes
)

print(f"Output: {result.stdout}")
print(f"Errors: {result.stderr}")
print(f"Return code: {result.returncode}")
```

### Checking for Success

```python
import subprocess

# Raise exception if command fails
try:
    result = subprocess.run(
        ["ls", "/nonexistent"],
        capture_output=True,
        text=True,
        check=True  # Raises CalledProcessError on non-zero exit
    )
except subprocess.CalledProcessError as e:
    print(f"Command failed with code {e.returncode}")
    print(f"Error output: {e.stderr}")
```

## Running Shell Commands

### With Shell=True (Use Carefully)

```python
import subprocess

# Shell features like pipes, wildcards
result = subprocess.run(
    "ls -la | grep .py",
    shell=True,
    capture_output=True,
    text=True
)
print(result.stdout)

# Environment variables
result = subprocess.run(
    "echo $HOME",
    shell=True,
    capture_output=True,
    text=True
)
print(result.stdout)
```

**Warning**: Using `shell=True` with user input is dangerous due to shell injection:

```python
# DANGEROUS - Never do this with user input!
filename = "file.txt; rm -rf /"
subprocess.run(f"cat {filename}", shell=True)  # Shell injection!

# SAFE - Use list form without shell
filename = "file.txt"
subprocess.run(["cat", filename])  # No shell injection possible
```

## Input and Output Handling

### Providing Input

```python
import subprocess

# Send input to command
result = subprocess.run(
    ["cat"],
    input="Hello, World!\n",
    capture_output=True,
    text=True
)
print(result.stdout)  # Hello, World!

# Send input to grep
result = subprocess.run(
    ["grep", "error"],
    input="line 1\nerror found\nline 3\n",
    capture_output=True,
    text=True
)
print(result.stdout)  # error found
```

### Working with Binary Data

```python
import subprocess

# Read binary file through command
result = subprocess.run(
    ["xxd", "image.png"],
    capture_output=True
    # No text=True, get bytes
)
print(result.stdout[:100])  # First 100 bytes

# Process binary input
binary_data = b"\x00\x01\x02\x03"
result = subprocess.run(
    ["xxd"],
    input=binary_data,
    capture_output=True
)
```

## Advanced: Using Popen

For more control, use `subprocess.Popen`:

```python
import subprocess

# Start process without waiting
process = subprocess.Popen(
    ["sleep", "5"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Do other work...

# Wait for completion and get output
stdout, stderr = process.communicate()
print(f"Return code: {process.returncode}")
```

### Real-time Output Processing

```python
import subprocess

# Process output line by line as it arrives
process = subprocess.Popen(
    ["ping", "-c", "5", "google.com"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Read output in real-time
for line in process.stdout:
    print(f"[OUTPUT] {line.strip()}")

process.wait()
```

### Piping Between Processes

```python
import subprocess

# Equivalent to: cat file.txt | grep "error" | wc -l

# First command: cat
p1 = subprocess.Popen(
    ["cat", "server.log"],
    stdout=subprocess.PIPE
)

# Second command: grep (reads from p1)
p2 = subprocess.Popen(
    ["grep", "error"],
    stdin=p1.stdout,
    stdout=subprocess.PIPE
)
p1.stdout.close()  # Allow p1 to receive SIGPIPE if p2 exits

# Third command: wc (reads from p2)
p3 = subprocess.Popen(
    ["wc", "-l"],
    stdin=p2.stdout,
    stdout=subprocess.PIPE,
    text=True
)
p2.stdout.close()

output, _ = p3.communicate()
print(f"Error count: {output.strip()}")
```

## Timeouts

```python
import subprocess

try:
    # Set timeout in seconds
    result = subprocess.run(
        ["sleep", "10"],
        timeout=5
    )
except subprocess.TimeoutExpired:
    print("Command timed out")

# With Popen
process = subprocess.Popen(["sleep", "10"])
try:
    process.wait(timeout=5)
except subprocess.TimeoutExpired:
    process.kill()  # Forcefully terminate
    process.wait()  # Clean up
```

## Environment Variables

```python
import subprocess
import os

# Pass custom environment
custom_env = os.environ.copy()
custom_env["MY_VAR"] = "my_value"
custom_env["DEBUG"] = "1"

result = subprocess.run(
    ["printenv", "MY_VAR"],
    env=custom_env,
    capture_output=True,
    text=True
)
print(result.stdout)  # my_value
```

## Working Directory

```python
import subprocess

# Run command in specific directory
result = subprocess.run(
    ["ls", "-la"],
    cwd="/tmp",
    capture_output=True,
    text=True
)
print(result.stdout)
```

## Error Handling

```python
import subprocess

def run_command(cmd, timeout=30):
    """Run command with comprehensive error handling."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=True
        )
        return {
            "success": True,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }

    except subprocess.CalledProcessError as e:
        return {
            "success": False,
            "error": "Command failed",
            "stdout": e.stdout,
            "stderr": e.stderr,
            "returncode": e.returncode
        }

    except subprocess.TimeoutExpired as e:
        return {
            "success": False,
            "error": f"Command timed out after {timeout}s",
            "stdout": e.stdout,
            "stderr": e.stderr
        }

    except FileNotFoundError:
        return {
            "success": False,
            "error": f"Command not found: {cmd[0]}"
        }

# Usage
result = run_command(["git", "status"])
if result["success"]:
    print(result["stdout"])
else:
    print(f"Error: {result['error']}")
```

## Common Use Cases

### Running Git Commands

```python
import subprocess

def git_status():
    """Get git repository status."""
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip().split("\n") if result.stdout.strip() else []

def git_commit(message):
    """Create a git commit."""
    # Stage all changes
    subprocess.run(["git", "add", "-A"], check=True)

    # Commit
    result = subprocess.run(
        ["git", "commit", "-m", message],
        capture_output=True,
        text=True
    )
    return result.returncode == 0
```

### System Information

```python
import subprocess
import platform

def get_system_info():
    """Get system information."""
    info = {"platform": platform.system()}

    if platform.system() == "Linux":
        # Get memory info
        result = subprocess.run(
            ["free", "-h"],
            capture_output=True,
            text=True
        )
        info["memory"] = result.stdout

        # Get disk usage
        result = subprocess.run(
            ["df", "-h"],
            capture_output=True,
            text=True
        )
        info["disk"] = result.stdout

    return info
```

### Running Python Scripts

```python
import subprocess
import sys

def run_python_script(script_path, *args):
    """Run a Python script with arguments."""
    result = subprocess.run(
        [sys.executable, script_path, *args],
        capture_output=True,
        text=True
    )
    return result

# Example
result = run_python_script("analyze.py", "--input", "data.csv")
print(result.stdout)
```

## Security Best Practices

```python
import subprocess
import shlex

# 1. Never use shell=True with user input
user_input = "file.txt; rm -rf /"
# BAD: subprocess.run(f"cat {user_input}", shell=True)
# GOOD:
subprocess.run(["cat", user_input])

# 2. Use shlex.quote() if you must use shell
safe_input = shlex.quote(user_input)
subprocess.run(f"cat {safe_input}", shell=True)

# 3. Validate and sanitize input
import re

def safe_filename(filename):
    """Ensure filename is safe."""
    if not re.match(r'^[\w\-.]+$', filename):
        raise ValueError("Invalid filename")
    return filename

# 4. Use absolute paths for executables
subprocess.run(["/usr/bin/ls", "-la"])
```

## Real World Example: Backup Script

```python
import subprocess
from datetime import datetime
from pathlib import Path

class BackupManager:
    """Manage database backups using system commands."""

    def __init__(self, backup_dir="/backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def backup_postgres(self, database, host="localhost", user="postgres"):
        """Create PostgreSQL backup."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.backup_dir / f"{database}_{timestamp}.sql.gz"

        # pg_dump | gzip
        pg_dump = subprocess.Popen(
            ["pg_dump", "-h", host, "-U", user, database],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        gzip = subprocess.Popen(
            ["gzip"],
            stdin=pg_dump.stdout,
            stdout=open(filename, "wb"),
            stderr=subprocess.PIPE
        )
        pg_dump.stdout.close()

        _, gzip_stderr = gzip.communicate()
        _, pg_stderr = pg_dump.communicate()

        if pg_dump.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {pg_stderr.decode()}")

        if gzip.returncode != 0:
            raise RuntimeError(f"gzip failed: {gzip_stderr.decode()}")

        return filename

    def compress_directory(self, source_dir, archive_name=None):
        """Create compressed archive of directory."""
        source = Path(source_dir)
        if archive_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archive_name = f"{source.name}_{timestamp}.tar.gz"

        archive_path = self.backup_dir / archive_name

        result = subprocess.run(
            ["tar", "-czf", str(archive_path), "-C", str(source.parent), source.name],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise RuntimeError(f"tar failed: {result.stderr}")

        return archive_path

# Usage
backup = BackupManager("/var/backups")
archive = backup.compress_directory("/var/www/app")
print(f"Backup created: {archive}")
```

## Summary

| Task | Code |
|------|------|
| Run and capture | `subprocess.run(cmd, capture_output=True, text=True)` |
| Check success | `subprocess.run(cmd, check=True)` |
| With timeout | `subprocess.run(cmd, timeout=30)` |
| Custom environment | `subprocess.run(cmd, env={...})` |
| Working directory | `subprocess.run(cmd, cwd="/path")` |
| Send input | `subprocess.run(cmd, input="data")` |
| Real-time output | `Popen` with stdout iteration |
| Pipe processes | `Popen` with stdin/stdout chaining |

The subprocess module is essential for system automation in Python. Always use the list form of commands to avoid shell injection, and handle errors gracefully with try/except.
