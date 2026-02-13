# Bash Scripting Best Practices for Reliable Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bash, Shell Scripting, Linux, DevOps, Automation

Description: Essential best practices for writing maintainable, reliable, and safe Bash scripts including error handling, quoting, shellcheck, and common pitfalls to avoid.

---

Bash scripts have a way of starting as quick one-offs and ending up as critical infrastructure. A 10-line deployment script becomes 200 lines over a year, and suddenly a quoting bug takes down production. These best practices will help you write Bash that survives contact with reality.

## Start Every Script Right

The first few lines of a Bash script set the foundation for everything that follows. This header enables strict error handling and makes the script more predictable.

```bash
#!/usr/bin/env bash
# Use env to find bash, making the script portable across systems

# Exit on error, undefined variables, and pipe failures
set -euo pipefail

# Enable debug mode if DEBUG environment variable is set
[[ "${DEBUG:-}" == "true" ]] && set -x
```

Here is what each option does:

- `set -e`: Exit immediately if a command fails. Without this, the script keeps running after errors, often making things worse.
- `set -u`: Treat unset variables as errors. Catches typos in variable names that would otherwise silently expand to empty strings.
- `set -o pipefail`: A pipeline's exit code is the last non-zero exit code in the chain, not just the last command. Without this, `failing_command | grep something` reports success if grep succeeds, hiding the failure.

## Quote Everything

Unquoted variables are the single most common source of Bash bugs. When a variable is unquoted, Bash performs word splitting and glob expansion on it, which leads to surprising behavior.

This example shows why unquoted variables break in the presence of spaces and special characters.

```bash
# BAD: Unquoted variable breaks on spaces and special characters
file="my report (final).txt"
rm $file
# Bash expands this to: rm my report (final).txt
# That is 4 separate arguments, not 1

# GOOD: Always quote variables
rm "$file"
# Bash passes exactly one argument: "my report (final).txt"
```

The rule is simple: put double quotes around every variable expansion, command substitution, and arithmetic expansion unless you specifically need word splitting.

```bash
# Quote command substitutions too
current_date="$(date +%Y-%m-%d)"

# Quote in conditionals
if [[ "$status" == "ready" ]]; then
    echo "Proceeding"
fi

# Quote in loops
for f in "$@"; do
    process_file "$f"
done
```

The only time you intentionally skip quotes is when you need glob expansion or word splitting, and those cases should be documented with a comment explaining why.

## Use ShellCheck

ShellCheck is a static analysis tool for shell scripts. It catches bugs that are easy to miss during code review: unquoted variables, useless cat, incorrect test syntax, and hundreds of other issues.

Install and run it on every script before committing.

```bash
# Install ShellCheck
# On macOS:
brew install shellcheck

# On Ubuntu/Debian:
sudo apt-get install shellcheck

# Run it against your script
shellcheck deploy.sh
```

Integrate ShellCheck into your CI pipeline so it runs on every pull request. Here is a GitHub Actions step that does this.

```yaml
# GitHub Actions step to lint all shell scripts with ShellCheck
- name: Lint shell scripts
  uses: ludeeus/action-shellcheck@master
  with:
    scandir: "./scripts"
    severity: warning
```

When ShellCheck flags something you intentionally want to keep, disable the specific rule with a directive comment rather than ignoring the tool.

```bash
# Intentionally unquoted because we want glob expansion here
# shellcheck disable=SC2086
files=$pattern
```

## Handle Errors Gracefully

`set -e` catches most errors, but it does not handle cleanup. Use `trap` to run cleanup code when the script exits, whether normally or due to an error.

This pattern creates a temporary directory, guarantees it gets cleaned up, and handles errors with useful output.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Create a temporary working directory
WORK_DIR="$(mktemp -d)"

# Cleanup function runs on exit, error, or interrupt
cleanup() {
    local exit_code=$?
    rm -rf "$WORK_DIR"
    if [[ $exit_code -ne 0 ]]; then
        echo "ERROR: Script failed with exit code $exit_code" >&2
    fi
    exit "$exit_code"
}
trap cleanup EXIT

# Now use WORK_DIR safely, knowing it will be cleaned up
cp important_file.txt "$WORK_DIR/"
process_data "$WORK_DIR/important_file.txt"
```

The `trap cleanup EXIT` ensures the cleanup function runs regardless of how the script ends. This prevents temp files from accumulating and resources from leaking.

## Use Functions

Functions make Bash scripts readable, testable, and maintainable. Break your script into small functions with clear names.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Log a message with timestamp to stderr
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Log an error and exit with code 1
die() {
    log "FATAL: $*"
    exit 1
}

# Validate that required tools are installed
check_dependencies() {
    local deps=("jq" "curl" "aws")
    for dep in "${deps[@]}"; do
        command -v "$dep" > /dev/null 2>&1 \
            || die "Required tool not found: $dep"
    done
}

# Main entry point
main() {
    check_dependencies
    log "Starting deployment"
    deploy_application
    log "Deployment complete"
}

# Call main with all script arguments
main "$@"
```

Notice the `main` pattern at the bottom. Wrapping the script logic in a `main` function means the entire script is parsed before execution begins. Without it, Bash executes line by line, so editing a running script can cause bizarre behavior.

## Validate Inputs

Never trust inputs, whether they come from arguments, environment variables, or user input. Validate early and fail fast.

This function validates that required arguments are present and shows usage information when they are missing.

```bash
# Validate required arguments and show usage
validate_args() {
    if [[ $# -lt 2 ]]; then
        echo "Usage: $(basename "$0") <environment> <version>" >&2
        echo "" >&2
        echo "Arguments:" >&2
        echo "  environment  Target environment (staging|production)" >&2
        echo "  version      Version to deploy (e.g., v1.2.3)" >&2
        exit 1
    fi

    local environment="$1"
    local version="$2"

    # Validate environment is an allowed value
    case "$environment" in
        staging|production) ;;
        *) die "Invalid environment: $environment. Must be staging or production." ;;
    esac

    # Validate version format
    if [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        die "Invalid version format: $version. Expected vX.Y.Z"
    fi
}
```

## Use Arrays for Lists

Bash arrays are the correct way to handle lists of items. Using space-separated strings breaks on entries that contain spaces.

```bash
# BAD: Space-separated string breaks on filenames with spaces
files="file1.txt my file.txt file3.txt"
for f in $files; do  # This iterates 4 times, not 3
    echo "$f"
done

# GOOD: Use an array
files=("file1.txt" "my file.txt" "file3.txt")
for f in "${files[@]}"; do  # This iterates 3 times, correctly
    echo "$f"
done
```

When building up a list of command arguments dynamically, arrays prevent quoting nightmares.

```bash
# Build command arguments dynamically using an array
build_curl_args() {
    local -a args=()
    args+=(-X POST)
    args+=(-H "Content-Type: application/json")

    if [[ -n "${AUTH_TOKEN:-}" ]]; then
        args+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi

    if [[ "${VERBOSE:-}" == "true" ]]; then
        args+=(-v)
    fi

    args+=("$API_URL")

    # Array expansion preserves argument boundaries
    curl "${args[@]}"
}
```

## Use `[[ ]]` Instead of `[ ]`

The double bracket `[[ ]]` is a Bash built-in that is safer and more capable than the POSIX `[ ]` test command.

```bash
# [[ ]] does not require quoting to prevent word splitting
name="hello world"
if [[ $name == "hello world" ]]; then  # Works fine
    echo "match"
fi

# [[ ]] supports regex matching
if [[ "$input" =~ ^[0-9]+$ ]]; then
    echo "Input is a number"
fi

# [[ ]] supports pattern matching
if [[ "$filename" == *.tar.gz ]]; then
    echo "Compressed tarball"
fi
```

## Prefer Long Options

When writing scripts (not typing commands interactively), use long options wherever available. They serve as documentation.

```bash
# Hard to read: what do these flags mean?
grep -rn -E "pattern" --include="*.sh" .

# Self-documenting with long options
grep --recursive --line-number --extended-regexp "pattern" --include="*.sh" .
```

Not all tools support long options (looking at you, `tar`), but when they do, use them.

## Handle Concurrent Execution

Scripts that run from cron or CI can overlap. Use a lock file to prevent concurrent execution when that would cause problems.

```bash
# Acquire a lock file to prevent concurrent execution
LOCK_FILE="/tmp/$(basename "$0").lock"

acquire_lock() {
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        # Check if the locking process is still running
        if [[ -f "$LOCK_FILE/pid" ]]; then
            local pid
            pid=$(cat "$LOCK_FILE/pid")
            if kill -0 "$pid" 2>/dev/null; then
                die "Another instance is running (PID $pid)"
            fi
            # Stale lock, clean it up
            log "Removing stale lock from PID $pid"
            rm -rf "$LOCK_FILE"
            mkdir "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE/pid"
}

release_lock() {
    rm -rf "$LOCK_FILE"
}

# Acquire lock at start, release on exit
acquire_lock
trap 'release_lock; cleanup' EXIT
```

Using `mkdir` for locking is an atomic operation on most filesystems, making it a reliable (if basic) locking mechanism.

## Logging and Output

Write diagnostic output to stderr and data output to stdout. This lets users redirect or pipe script output without mixing in log messages.

```bash
# Structured logging function that writes to stderr
log() {
    local level="${1:-INFO}"
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" >&2
}

# Usage
log INFO "Processing 42 files"
log WARN "Disk usage at 85%"
log ERROR "Failed to connect to database"

# Actual output goes to stdout
echo "$result"
```

## Script Template

Putting it all together, here is a template that incorporates these practices.

```bash
#!/usr/bin/env bash
set -euo pipefail
[[ "${DEBUG:-}" == "true" ]] && set -x

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }
die() { log "FATAL: $*"; exit 1; }

cleanup() {
    local exit_code=$?
    # Add cleanup logic here
    exit "$exit_code"
}
trap cleanup EXIT

check_dependencies() {
    local deps=("$@")
    for dep in "${deps[@]}"; do
        command -v "$dep" > /dev/null 2>&1 \
            || die "Missing dependency: $dep"
    done
}

main() {
    check_dependencies jq curl
    log "Starting $(basename "$0")"
    # Script logic here
    log "Done"
}

main "$@"
```

Copy this template as your starting point for any new script, and you will avoid the most common pitfalls from day one. Your future self (and your team) will thank you when that quick script inevitably becomes production infrastructure.
