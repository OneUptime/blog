# How to Run a Container with Auto-Remove in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Cleanup, Automation

Description: Learn how to use the auto-remove flag in Podman to automatically clean up containers after they exit, keeping your system tidy.

---

> Auto-remove keeps your container list clean by automatically deleting containers the moment they stop running.

When containers exit, they remain on the system in a stopped state by default. Over time, stopped containers accumulate and consume disk space, clutter `podman ps -a` output, and make management harder. The `--rm` flag tells Podman to automatically remove the container and its writable layer as soon as it exits.

---

## Basic Auto-Remove

Use the `--rm` flag to enable automatic cleanup:

```bash
# Container is removed immediately after it exits

podman run --rm --name temporary-basic alpine echo "This container will be auto-removed"

# Verify it is gone
podman ps -a --filter name=temporary-basic --format "{{.Names}}" | wc -l
```

## Auto-Remove with Named Containers

Even named containers can be auto-removed:

```bash
# Named container that auto-removes
podman run --rm --name temporary-worker alpine sh -c "
  echo 'Doing some work...'
  sleep 2
  echo 'Done!'
"

# The named container is gone
podman ps -a --filter name=temporary-worker
```

## Without Auto-Remove (Default)

By comparison, without `--rm`, stopped containers linger:

```bash
# Without --rm, the container stays after exiting
podman run --name leftover alpine echo "Done"

# The container is still listed
podman ps -a --filter name=leftover --format "table {{.Names}}\t{{.Status}}"

# You must manually remove it
podman rm leftover
```

## Auto-Remove for One-Off Commands

The most common use case is running one-off commands:

```bash
# Run a quick command and clean up
podman run --rm alpine cat /etc/os-release

# Check the current date in a container
podman run --rm alpine date

# Calculate a checksum
echo "test content" > /tmp/testfile
podman run --rm -v /tmp/testfile:/data/file:Z alpine md5sum /data/file

# Run a database migration
podman run --rm \
  -e DATABASE_URL=postgres://db:5432/mydb \
  my-app-image python manage.py migrate 2>/dev/null || echo "(example only)"
```

## Auto-Remove for Testing

```bash
# Quick test of a container image
podman run --rm -it alpine sh -c "
  echo 'OS Info:'
  cat /etc/os-release | head -3
  echo ''
  echo 'Available tools:'
  which curl wget python3 2>/dev/null || echo 'Basic image'
"

# Test network connectivity
podman run --rm alpine sh -c "
  ping -c 2 8.8.8.8 && echo 'Network is working'
"

# Test a web server configuration
podman run --rm -v /tmp/nginx.conf:/etc/nginx/nginx.conf:Z nginx:latest nginx -t 2>/dev/null || echo "(example only)"
```

## Auto-Remove with Exit Codes

The container is removed regardless of exit code:

```bash
# Successful exit (code 0) - container is removed
podman run --rm alpine sh -c "exit 0"
echo "Exit code: $?"

# Failed exit (code 1) - container is still removed
podman run --rm alpine sh -c "exit 1"
echo "Exit code: $?"

# The exit code is still available to the caller
# even though the container is removed
```

## Auto-Remove with Volumes

Auto-remove does NOT delete named volumes:

```bash
# Create a volume with data
podman run --rm -v mydata:/data alpine sh -c "echo 'persistent' > /data/test.txt"

# The container is gone, but the volume remains
podman volume inspect mydata > /dev/null 2>&1 && echo "Volume still exists"

# Access the data from a new container
podman run --rm -v mydata:/data alpine cat /data/test.txt

# Clean up the volume manually if desired
podman volume rm mydata
```

## Auto-Remove with Anonymous Volumes

Anonymous volumes ARE removed with the container:

```bash
# Anonymous volume is created and removed with the container
podman run --rm -v /data alpine sh -c "echo 'temporary' > /data/test.txt"

# The anonymous volume is gone along with the container
```

## Auto-Remove Cannot Be Combined with --restart

```bash
# This will produce an error: --rm and --restart are incompatible
podman run --rm --restart always alpine echo "test" 2>&1 || echo "Cannot combine --rm with --restart (expected)"

# Use one or the other:
# --rm for ephemeral, one-off containers
# --restart for long-running services
```

## Auto-Remove for CI/CD Pipelines

```bash
# Build step: compile code
podman run --rm \
  -v ./src:/src:Z \
  -v ./build:/build:Z \
  golang:1.26 sh -c "cd /src && go build -o /build/app ." 2>/dev/null || echo "(example)"

# Test step: run tests
podman run --rm \
  -v ./src:/src:Z \
  golang:1.26 sh -c "cd /src && go test ./..." 2>/dev/null || echo "(example)"

# Lint step: check code style
podman run --rm \
  -v ./src:/src:Z \
  golangci/golangci-lint:latest golangci-lint run /src/... 2>/dev/null || echo "(example)"

# Each step cleans up after itself automatically
```

## Cleaning Up Without Auto-Remove

If you forgot to use `--rm`, clean up manually:

```bash
# Remove all stopped containers
podman container prune -f

# Remove containers older than 24 hours
podman container prune --filter "until=24h" -f

# Remove specific stopped containers
podman rm $(podman ps -aq --filter status=exited) 2>/dev/null
```

## Summary

Auto-remove with `--rm` is essential for keeping your container environment clean:

- Use `--rm` for one-off commands, testing, and CI/CD steps
- Containers are deleted immediately upon exit regardless of exit code
- Named volumes survive auto-remove; anonymous volumes do not
- Cannot be combined with `--restart` (they are mutually exclusive)
- The exit code is still available to the calling process
- Use `podman container prune` to clean up containers that were not auto-removed

Make `--rm` your default for any container that does not need to be inspected after it stops.
