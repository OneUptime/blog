# How to Use Podman as a Sandbox for Untrusted Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Security, Sandboxing, Isolation

Description: Learn how to use Podman to safely execute untrusted code in isolated containers with restricted resources, limited network access, and no ability to affect your host system.

---

> Running untrusted code in a Podman sandbox gives you the isolation you need to evaluate scripts, test third-party libraries, and analyze suspicious programs without risking your host system.

There are many situations where you need to run code you do not fully trust. You might be evaluating an open-source library, running student submissions in an educational platform, testing third-party scripts, or analyzing potentially malicious software. Running such code directly on your machine is risky. Podman provides robust sandboxing capabilities that let you execute untrusted code in an isolated environment with strict resource limits and minimal access to the outside world.

---

## Why Podman Is a Strong Sandbox Choice

Podman runs containers without a root daemon, which immediately reduces the attack surface compared to daemon-based container runtimes. Each rootless container runs under your user's UID namespace, meaning even a container escape would only give the attacker your unprivileged user permissions rather than root access.

Additionally, Podman supports SELinux labeling, seccomp profiles, and capability dropping out of the box. These layers of defense make it significantly harder for untrusted code to break out of the sandbox.

## Creating a Minimal Sandbox Image

The sandbox image should contain only what is absolutely necessary to run the target code:

```dockerfile
FROM alpine:3.23

# Install only the runtime needed

RUN apk add --no-cache python3

# Create an unprivileged user
RUN adduser -D -s /bin/sh sandbox
USER sandbox
WORKDIR /home/sandbox

# No CMD - we will specify it at runtime
```

```bash
podman build -t sandbox:python .
```

## Running Code with Maximum Isolation

Here is how to run untrusted Python code with aggressive isolation:

```bash
podman run --rm \
  --network none \
  --read-only \
  --read-only-tmpfs=false \
  --tmpfs /tmp:size=50m \
  --memory 256m \
  --cpus 0.5 \
  --pids-limit 50 \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --user sandbox \
  -v ./untrusted_script.py:/home/sandbox/script.py:ro,Z \
  sandbox:python \
  python3 /home/sandbox/script.py
```

Let us break down each security flag:

- `--network none` disables all network access
- `--read-only` makes the root filesystem read-only
- `--read-only-tmpfs=false` keeps Podman from adding extra writable tmpfs mounts under `/run`, `/tmp`, and `/var/tmp`
- `--tmpfs /tmp:size=50m` provides a writable temp directory with a size limit
- `--memory 256m` caps memory usage at 256 megabytes
- `--cpus 0.5` limits CPU usage to half a core
- `--pids-limit 50` prevents fork bombs by limiting the number of processes
- `--security-opt no-new-privileges` prevents privilege escalation
- `--cap-drop ALL` removes all Linux capabilities
- `--user sandbox` runs as an unprivileged user
- The `:ro` mount flag makes the script read-only inside the container

## Building a Sandbox Runner Script

Wrap the sandbox logic in a reusable script:

```bash
#!/bin/bash
# sandbox-run.sh - Execute untrusted code in a Podman sandbox

set -euo pipefail

SCRIPT_PATH="$1"
TIMEOUT="${2:-30}"
MEMORY="${3:-256m}"
CPU="${4:-0.5}"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: File not found: $SCRIPT_PATH"
    exit 1
fi

# This example keeps the runner focused on the Python image built above
EXTENSION="${SCRIPT_PATH##*.}"
if [ "$EXTENSION" != "py" ]; then
    echo "Unsupported file type: $EXTENSION"
    exit 1
fi

IMAGE="sandbox:python"
CMD=(python3 /sandbox/script.py)

echo "Running $SCRIPT_PATH in sandbox (timeout: ${TIMEOUT}s, memory: $MEMORY, cpu: $CPU)"

# Run with timeout
set +e
timeout "$TIMEOUT" podman run --rm \
  --network none \
  --read-only \
  --read-only-tmpfs=false \
  --tmpfs /tmp:size=50m \
  --memory "$MEMORY" \
  --cpus "$CPU" \
  --pids-limit 50 \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --user sandbox \
  -v "$(realpath "$SCRIPT_PATH"):/sandbox/script.py:ro,Z" \
  "$IMAGE" \
  "${CMD[@]}"

EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 124 ]; then
    echo "Execution timed out after ${TIMEOUT}s"
    exit 1
fi

exit $EXIT_CODE
```

Usage:

```bash
chmod +x sandbox-run.sh
./sandbox-run.sh suspicious_script.py 10 128m 0.25
```

## Custom Seccomp Profiles

For even tighter security, create a custom seccomp profile that is derived from Podman's default profile for the exact runtime you are sandboxing. A tiny hand-written allowlist is likely to block syscalls Python needs during startup.

Apply it:

```bash
podman run --rm \
  --network none \
  --read-only \
  --read-only-tmpfs=false \
  --tmpfs /tmp:size=50m \
  --security-opt seccomp=sandbox-seccomp.json \
  --cap-drop ALL \
  --user sandbox \
  -v ./script.py:/sandbox/script.py:ro,Z \
  sandbox:python \
  python3 /sandbox/script.py
```

## Capturing Output Safely

When sandboxing untrusted code, you want to capture its output without letting it escape the container:

```bash
#!/bin/bash
# capture-output.sh

OUTPUT_DIR=$(mktemp -d)
STDOUT_FILE="$OUTPUT_DIR/stdout.log"
STDERR_FILE="$OUTPUT_DIR/stderr.log"

podman run --rm \
  --network none \
  --read-only \
  --read-only-tmpfs=false \
  --tmpfs /tmp:size=50m \
  --memory 256m \
  --cpus 0.5 \
  --pids-limit 50 \
  --cap-drop ALL \
  --user sandbox \
  -v ./script.py:/sandbox/script.py:ro,Z \
  sandbox:python \
  python3 /sandbox/script.py \
  > "$STDOUT_FILE" 2> "$STDERR_FILE"

EXIT_CODE=$?

echo "Exit code: $EXIT_CODE"
echo "Stdout (first 1000 chars):"
head -c 1000 "$STDOUT_FILE"
echo ""
echo "Stderr (first 1000 chars):"
head -c 1000 "$STDERR_FILE"

# Cleanup
rm -rf "$OUTPUT_DIR"
```

## API-Based Sandbox Service

Build a simple HTTP service that accepts code and runs it in a sandbox:

```python
# sandbox_server.py
from flask import Flask, request, jsonify
import subprocess
import tempfile
import os

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json() or {}
    code = data.get('code', '')
    language = str(data.get('language', 'python')).lower()
    timeout = min(data.get('timeout', 10), 30)

    if language not in ('python', 'py'):
        return jsonify({
            'error': 'Unsupported language',
            'exit_code': -1
        }), 400

    # Write code to a temporary file
    with tempfile.NamedTemporaryFile(
        mode='w', suffix='.py',
        delete=False
    ) as f:
        f.write(code)
        temp_path = f.name

    try:
        result = subprocess.run(
            ['./sandbox-run.sh', temp_path, str(timeout)],
            capture_output=True,
            text=True,
            timeout=timeout + 5
        )
        return jsonify({
            'stdout': result.stdout[:10000],
            'stderr': result.stderr[:10000],
            'exit_code': result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({
            'error': 'Execution timed out',
            'exit_code': -1
        }), 408
    finally:
        os.unlink(temp_path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Testing the Sandbox

Verify your sandbox works by testing common escape attempts:

```python
# test_sandbox.py - These should all fail in a properly configured sandbox

import os
import socket
import subprocess

# Test 1: Network access should fail
try:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("8.8.8.8", 53))
    print("FAIL: Network access succeeded")
except Exception as e:
    print(f"PASS: Network blocked - {e}")

# Test 2: Writing to filesystem should fail
try:
    with open("/etc/test", "w") as f:
        f.write("test")
    print("FAIL: Filesystem write succeeded")
except Exception as e:
    print(f"PASS: Filesystem protected - {e}")

# Test 3: Fork bomb should be limited
try:
    for i in range(100):
        os.fork()
    print("FAIL: Fork bomb not limited")
except Exception as e:
    print(f"PASS: Fork limited - {e}")
```

## Conclusion

Podman provides excellent sandboxing capabilities for running untrusted code. By combining network isolation, read-only filesystems, resource limits, capability dropping, and custom seccomp profiles, you can create a sandbox that is genuinely difficult to escape. Running Podman rootless adds an additional layer of protection by keeping the container workload inside your unprivileged user context. Whether you are building an online code execution platform, evaluating third-party libraries, or analyzing suspicious scripts, Podman sandboxes give you the confidence to run code without fear.
