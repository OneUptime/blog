# How to Execute System Commands from Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, System Commands, subprocess, Automation, DevOps

Description: Learn how to run shell commands from Python safely using subprocess. Covers command execution, output capture, error handling, and security best practices.

---

Running shell commands from Python is essential for automation scripts, deployment tools, and system administration tasks. The `subprocess` module is the modern, secure way to do this. This guide covers everything from basic command execution to advanced patterns for production use.

## The subprocess Module

The `subprocess` module replaced older functions like `os.system()` and `os.popen()`. It provides better security, more control over input/output, and cleaner error handling.

## Basic Command Execution with run()

The `subprocess.run()` function is the recommended way to run commands in Python 3.5+.

```python
import subprocess

# Run a simple command
result = subprocess.run(['ls', '-la'], capture_output=True, text=True)

print("Return code:", result.returncode)
print("Output:", result.stdout)
print("Errors:", result.stderr)
```

### Understanding the Arguments

```python
import subprocess

# Command as a list (recommended)
# Each element is a separate argument - safer and clearer
result = subprocess.run(
    ['git', 'status', '--short'],  # Command and arguments as list
    capture_output=True,            # Capture stdout and stderr
    text=True,                      # Return strings instead of bytes
    cwd='/path/to/repo',           # Working directory
    timeout=30,                     # Kill after 30 seconds
    check=True,                     # Raise exception on non-zero exit
)
```

## Capturing Output

### Capture Both stdout and stderr

```python
import subprocess

result = subprocess.run(
    ['python', '--version'],
    capture_output=True,
    text=True
)

print(f"stdout: {result.stdout}")
print(f"stderr: {result.stderr}")
```

### Combine stdout and stderr

```python
import subprocess

result = subprocess.run(
    ['some_command'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,  # Redirect stderr to stdout
    text=True
)

# All output is in stdout
print(result.stdout)
```

### Stream Output in Real-Time

For long-running commands, you might want to see output as it happens.

```python
import subprocess

# Stream output line by line
process = subprocess.Popen(
    ['ping', '-c', '5', 'google.com'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True
)

# Read and print output as it comes
for line in process.stdout:
    print(line, end='')

process.wait()
print(f"Command finished with code: {process.returncode}")
```

## Error Handling

### Check for Command Failure

```python
import subprocess

# Method 1: Check returncode manually
result = subprocess.run(['false'])  # 'false' command always returns 1
if result.returncode != 0:
    print("Command failed!")

# Method 2: Use check=True to raise exception
try:
    result = subprocess.run(['false'], check=True)
except subprocess.CalledProcessError as e:
    print(f"Command failed with code {e.returncode}")
```

### Handle Timeouts

```python
import subprocess

try:
    result = subprocess.run(
        ['sleep', '10'],
        timeout=2,  # Kill after 2 seconds
        capture_output=True
    )
except subprocess.TimeoutExpired as e:
    print(f"Command timed out after {e.timeout} seconds")
```

### Handle Missing Commands

```python
import subprocess

try:
    result = subprocess.run(
        ['nonexistent_command'],
        capture_output=True,
        check=True
    )
except FileNotFoundError:
    print("Command not found")
except subprocess.CalledProcessError as e:
    print(f"Command failed: {e}")
```

## Providing Input

### Pass Input to Command

```python
import subprocess

# Send input to a command
result = subprocess.run(
    ['grep', 'error'],
    input='line 1\nerror found\nline 3',
    capture_output=True,
    text=True
)

print(result.stdout)  # error found
```

### Interactive Commands

```python
import subprocess

# For commands that need interaction, use Popen with communicate()
process = subprocess.Popen(
    ['python'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Send Python code as input
stdout, stderr = process.communicate(input='print("Hello from subprocess")\n')
print(stdout)  # Hello from subprocess
```

## Shell Commands vs Direct Execution

### Without Shell (Recommended)

```python
import subprocess

# Pass command as list - safer, no shell interpretation
result = subprocess.run(['ls', '-la', '/tmp'], capture_output=True, text=True)
```

### With Shell (Use Carefully)

```python
import subprocess

# shell=True allows shell features like pipes and wildcards
# But requires careful input handling to avoid injection
result = subprocess.run(
    'ls -la /tmp | grep log',
    shell=True,
    capture_output=True,
    text=True
)
```

### Building Pipelines Without Shell

```python
import subprocess

# Safer alternative to shell pipes
# First command
p1 = subprocess.Popen(
    ['ls', '-la', '/tmp'],
    stdout=subprocess.PIPE
)

# Second command takes first command's output
p2 = subprocess.Popen(
    ['grep', 'log'],
    stdin=p1.stdout,
    stdout=subprocess.PIPE,
    text=True
)

# Allow p1 to receive SIGPIPE if p2 exits
p1.stdout.close()

# Get final output
output, _ = p2.communicate()
print(output)
```

## Security Considerations

### Never Use shell=True with User Input

```python
import subprocess

# DANGEROUS: Command injection vulnerability
user_input = "file.txt; rm -rf /"  # Malicious input
# subprocess.run(f'cat {user_input}', shell=True)  # DO NOT DO THIS!

# SAFE: Arguments are passed directly, not interpreted
subprocess.run(['cat', user_input], capture_output=True)  # user_input is just a filename
```

### Validate and Sanitize Input

```python
import subprocess
import shlex
import re

def safe_filename(filename):
    """Ensure filename contains only safe characters."""
    if not re.match(r'^[\w\-. ]+$', filename):
        raise ValueError(f"Invalid filename: {filename}")
    return filename

def read_file(filename):
    """Safely read a file using cat."""
    safe_name = safe_filename(filename)
    result = subprocess.run(
        ['cat', safe_name],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout
```

## Environment Variables

### Inherit Current Environment

```python
import subprocess
import os

# Commands inherit current environment by default
result = subprocess.run(['printenv', 'HOME'], capture_output=True, text=True)
print(result.stdout)  # Your home directory
```

### Modify Environment

```python
import subprocess
import os

# Add or override environment variables
my_env = os.environ.copy()
my_env['MY_VAR'] = 'my_value'
my_env['PATH'] = '/custom/bin:' + my_env['PATH']

result = subprocess.run(
    ['printenv', 'MY_VAR'],
    env=my_env,
    capture_output=True,
    text=True
)
print(result.stdout)  # my_value
```

## Working Directory

```python
import subprocess

# Run command in a specific directory
result = subprocess.run(
    ['git', 'log', '--oneline', '-5'],
    cwd='/path/to/your/repo',
    capture_output=True,
    text=True
)
print(result.stdout)
```

## Practical Examples

### Running Git Commands

```python
import subprocess

def git_status(repo_path):
    """Get git status for a repository."""
    result = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=repo_path,
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout.strip()

def git_commit(repo_path, message):
    """Create a git commit."""
    # Stage all changes
    subprocess.run(
        ['git', 'add', '-A'],
        cwd=repo_path,
        check=True
    )

    # Commit
    subprocess.run(
        ['git', 'commit', '-m', message],
        cwd=repo_path,
        check=True
    )
```

### System Information

```python
import subprocess

def get_disk_usage():
    """Get disk usage information."""
    result = subprocess.run(
        ['df', '-h'],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout

def get_memory_info():
    """Get memory information (Linux)."""
    result = subprocess.run(
        ['free', '-h'],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout
```

### Running Docker Commands

```python
import subprocess
import json

def docker_ps():
    """List running Docker containers."""
    result = subprocess.run(
        ['docker', 'ps', '--format', '{{json .}}'],
        capture_output=True,
        text=True,
        check=True
    )

    containers = []
    for line in result.stdout.strip().split('\n'):
        if line:
            containers.append(json.loads(line))
    return containers

def docker_exec(container, command):
    """Execute a command in a Docker container."""
    result = subprocess.run(
        ['docker', 'exec', container] + command,
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout
```

## Comparison of Methods

| Method | Use Case | Notes |
|--------|----------|-------|
| `subprocess.run()` | Simple commands | Recommended for most cases |
| `subprocess.Popen()` | Complex I/O, streaming | More control, more complex |
| `os.system()` | Never | Deprecated, insecure |
| `os.popen()` | Never | Deprecated, use subprocess |

## Summary

The `subprocess` module is Python's tool for running external commands. Key practices:

- Use `subprocess.run()` for most cases
- Pass commands as lists, not strings
- Avoid `shell=True` unless necessary, and never with user input
- Use `capture_output=True` and `text=True` for easy output handling
- Handle errors with `check=True` or manual returncode checking
- Set timeouts for commands that might hang

With these patterns, you can safely automate system tasks, build deployment scripts, and integrate external tools into your Python applications.
