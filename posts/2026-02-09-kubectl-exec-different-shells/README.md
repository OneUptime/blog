# How to Use kubectl exec with Different Shells for Container Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Shell

Description: Master kubectl exec with various shell types including bash, sh, zsh, and specialized shells for effective container debugging and troubleshooting in Kubernetes.

---

The kubectl exec command provides direct access to running containers, but not all containers have the same shell available. Understanding how to work with different shells and their quirks is essential for effective debugging. Some containers use bash, others use sh, Alpine uses ash, and minimal images might have no shell at all.

Choosing the right shell and knowing its capabilities determines what debugging tasks you can perform. Different shells have different built-in commands, syntax variations, and feature sets.

## Basic kubectl exec Syntax

The standard syntax for executing commands in pods:

```bash
# Execute command in single-container pod
kubectl exec my-pod -- ls -la

# Interactive shell in single-container pod
kubectl exec -it my-pod -- bash

# Execute in specific container of multi-container pod
kubectl exec -it my-pod -c container-name -- bash

# Execute in specific namespace
kubectl exec -it -n production my-pod -- bash

# Pass environment variables
kubectl exec my-pod -- env VAR=value command
```

## Detecting Available Shells

Find out which shells are available in a container:

```bash
# Check for available shells
kubectl exec my-pod -- cat /etc/shells

# Test if bash is available
kubectl exec my-pod -- which bash

# Test if sh is available
kubectl exec my-pod -- which sh

# List all executables in common shell locations
kubectl exec my-pod -- ls -la /bin/*sh /usr/bin/*sh 2>/dev/null

# Check shell that a process is using
kubectl exec my-pod -- ps aux | grep -E "bash|sh|zsh"
```

## Using bash

Bash is the most feature-rich shell, commonly found in Debian/Ubuntu-based images:

```bash
# Standard bash shell
kubectl exec -it my-pod -- bash

# Bash with specific options
kubectl exec -it my-pod -- bash -l  # Login shell
kubectl exec -it my-pod -- bash -i  # Interactive shell
kubectl exec -it my-pod -- bash -x  # Debug mode (print commands)

# Bash one-liners
kubectl exec my-pod -- bash -c 'for i in {1..5}; do echo $i; done'

# Using bash arrays
kubectl exec my-pod -- bash -c 'arr=(one two three); echo ${arr[1]}'

# Bash process substitution
kubectl exec my-pod -- bash -c 'diff <(cat file1.txt) <(cat file2.txt)'

# Bash here-documents
kubectl exec my-pod -- bash <<'EOF'
cd /app
for file in *.log; do
  echo "Processing $file"
  tail -n 10 "$file"
done
EOF
```

## Using sh (POSIX Shell)

The sh shell is the most portable but has fewer features:

```bash
# Standard sh shell
kubectl exec -it my-pod -- sh

# POSIX-compliant commands only
kubectl exec my-pod -- sh -c 'i=1; while [ $i -le 5 ]; do echo $i; i=$((i+1)); done'

# Multiple commands
kubectl exec my-pod -- sh -c 'cd /app && ls -la && pwd'

# Conditional execution
kubectl exec my-pod -- sh -c 'test -f /app/config.json && echo "Config exists" || echo "Config missing"'

# Simple loops (no brace expansion)
kubectl exec my-pod -- sh -c 'for i in 1 2 3 4 5; do echo $i; done'
```

## Using Alpine's ash

Alpine Linux uses ash, a lightweight shell similar to sh:

```bash
# Alpine containers use ash
kubectl exec -it alpine-pod -- /bin/ash

# Or use the sh symlink
kubectl exec -it alpine-pod -- sh

# Ash-specific features
kubectl exec alpine-pod -- ash -c 'echo $((2 + 2))'

# Install bash on Alpine if needed
kubectl exec alpine-pod -- ash -c 'apk add --no-cache bash'
kubectl exec -it alpine-pod -- bash
```

## Using zsh

Some containers may have zsh installed:

```bash
# Check if zsh is available
kubectl exec my-pod -- which zsh

# Use zsh interactively
kubectl exec -it my-pod -- zsh

# Zsh-specific features
kubectl exec my-pod -- zsh -c 'setopt extended_glob; ls **/*.txt'

# Zsh arrays (1-indexed unlike bash)
kubectl exec my-pod -- zsh -c 'arr=(one two three); echo $arr[1]'
```

## Handling Containers Without Shells

Debug containers that have no shell:

```bash
# Try different shells in order
for shell in bash sh ash zsh; do
  if kubectl exec my-pod -- which $shell 2>/dev/null; then
    echo "Found shell: $shell"
    kubectl exec -it my-pod -- $shell
    break
  fi
done

# Use kubectl debug to attach a shell
kubectl debug my-pod -it --image=busybox --target=my-pod

# Execute specific binaries directly
kubectl exec my-pod -- /app/my-binary --version
kubectl exec my-pod -- python3 -c 'print("Hello")'
kubectl exec my-pod -- node -e 'console.log("Hello")'
```

## Shell-Specific Debugging Techniques

Using bash for advanced debugging:

```bash
# Enable bash debugging
kubectl exec -it my-pod -- bash -x

# Inside the shell:
set -x  # Enable command tracing
set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Pipe failures cause errors

# Check bash version and features
echo $BASH_VERSION
compgen -b  # List all builtins

# Use bash debugging commands
declare -p  # Show all variables
declare -f  # Show all functions
type command  # Show command type
```

Using sh for minimal environments:

```bash
kubectl exec -it my-pod -- sh

# Inside sh:
set -x  # Enable tracing
set -e  # Exit on error

# Check what's available
command -v ls
type cd

# Use POSIX-compliant constructs only
[ -f /app/file ] && echo "exists"
test -d /app/dir || mkdir -p /app/dir
```

## Multi-Line Commands and Scripts

Execute multi-line scripts:

```bash
# Using bash
kubectl exec my-pod -- bash <<'EOF'
#!/bin/bash
set -e

echo "Starting diagnostics..."

echo "Checking disk space:"
df -h

echo "Checking memory:"
free -h

echo "Checking running processes:"
ps aux | head -10

echo "Diagnostics complete"
EOF

# Using sh
kubectl exec my-pod -- sh <<'EOF'
echo "Simple diagnostics"
df -h
ps aux
EOF

# Save script and execute
cat > /tmp/debug-script.sh <<'EOF'
#!/bin/bash
echo "Debug script running in pod"
date
hostname
uptime
EOF

kubectl cp /tmp/debug-script.sh my-pod:/tmp/debug.sh
kubectl exec my-pod -- chmod +x /tmp/debug.sh
kubectl exec my-pod -- /tmp/debug.sh
```

## Interactive Debugging Sessions

Create effective debugging sessions:

```bash
# Start interactive bash with history
kubectl exec -it my-pod -- bash -l

# Inside the pod:
# Set up useful aliases
alias ll='ls -lah'
alias psg='ps aux | grep'

# Set up useful functions
loggrep() {
  grep -r "$1" /var/log/
}

# Enable tab completion (if available)
set completion-ignore-case on

# Check application logs
tail -f /var/log/app.log

# Monitor processes
watch -n 1 'ps aux | grep myapp'

# Test network connectivity
while true; do
  curl -s http://service:8080/health || echo "Failed"
  sleep 5
done
```

## Debugging with Different Shell Features

Bash features for debugging:

```bash
# Using bash associative arrays
kubectl exec my-pod -- bash -c '
declare -A config
config[host]="localhost"
config[port]=8080
echo "Connecting to ${config[host]}:${config[port]}"
'

# Using bash extended globbing
kubectl exec my-pod -- bash -c '
shopt -s extglob
ls !(*.log)  # List all files except .log files
'

# Using bash string manipulation
kubectl exec my-pod -- bash -c '
file="/path/to/file.txt"
echo "Basename: ${file##*/}"
echo "Directory: ${file%/*}"
echo "Extension: ${file##*.}"
'
```

## Error Handling in Different Shells

Robust error handling:

```bash
# Bash error handling
kubectl exec my-pod -- bash -c '
set -euo pipefail

trap "echo Error occurred; exit 1" ERR

command1 || { echo "Command1 failed"; exit 1; }
command2 && echo "Command2 succeeded" || echo "Command2 failed"
'

# Sh error handling (more limited)
kubectl exec my-pod -- sh -c '
set -e

command1 || exit 1
if command2; then
  echo "Success"
else
  echo "Failed"
  exit 1
fi
'
```

## Shell Wrapper Script

Create a smart wrapper that detects and uses the best available shell:

```bash
#!/bin/bash
# Save as kubectl-smart-exec

POD_NAME=$1
shift
COMMAND="$@"

# Detect available shell
for SHELL in bash zsh ash sh; do
  if kubectl exec "$POD_NAME" -- which "$SHELL" &>/dev/null; then
    echo "Using shell: $SHELL"
    if [ -z "$COMMAND" ]; then
      kubectl exec -it "$POD_NAME" -- "$SHELL"
    else
      kubectl exec "$POD_NAME" -- "$SHELL" -c "$COMMAND"
    fi
    exit $?
  fi
done

echo "No shell found in container"
exit 1

# Usage:
# kubectl-smart-exec my-pod
# kubectl-smart-exec my-pod "ls -la /app"
```

## Best Practices

Always use -it flags for interactive shells. Quote complex commands to prevent local shell expansion. Use bash for feature-rich debugging when available. Fall back to sh for compatibility in minimal images. Test shell availability before assuming bash is present. Use set -e in scripts to catch errors early. Prefer POSIX-compliant commands for portability.

Understanding shell differences and kubectl exec capabilities enables effective debugging across diverse container environments, from full-featured Ubuntu images to minimal Alpine containers.
