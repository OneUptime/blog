# How to Run Multiple Podman Machines Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to create, start, and manage multiple Podman machines running at the same time for isolated development environments.

---

> Managing multiple Podman machines lets you maintain isolated environments for different projects, testing scenarios, or team configurations.

There are many reasons to create more than one Podman machine. You might need separate environments for different projects, want to test across different configurations, or need isolated machines for CI/CD pipelines. Podman supports multiple configured machines, but only one Podman-managed VM can be active at a time. This guide shows you how to create and switch between multiple Podman machines.

---

## Creating Multiple Machines

Start by initializing several machines with different configurations.

```bash
# Create a machine for web development

podman machine init web-dev --cpus 2 --memory 4096 --disk-size 50

# Create a machine for database work
podman machine init db-dev --cpus 4 --memory 8192 --disk-size 200

# Create a lightweight machine for testing
podman machine init test-env --cpus 1 --memory 2048 --disk-size 30
```

## Starting a Machine

Start the machine you want to use. If another Podman-managed machine is already running, stop it first.

```bash
# Start the web development machine
podman machine start web-dev
```

You can verify the current machine states:

```bash
# Check status of all machines
podman machine ls
```

The output shows each machine and its state:

```text
NAME        VM TYPE     CREATED        LAST UP            CPUS    MEMORY      DISK SIZE
web-dev*    qemu        1 minute ago   Currently running  2       4.295GB     53.69GB
db-dev      qemu        1 minute ago   Never              4       8.59GB      214.7GB
test-env    qemu        1 minute ago   Never              1       2.147GB     32.21GB
```

## Switching Machines with a Script

Automate switching to a specific machine:

```bash
# Switch to db-dev
target_machine="db-dev"

podman machine ls --format json | jq -r '.[] | select(.Running == true) | .Name' | while read -r machine; do
    echo "Stopping $machine..."
    podman machine stop "$machine"
done

echo "Starting $target_machine..."
podman machine start "$target_machine"
```

## Running Containers on Specific Machines

Use the `--connection` flag to target the active machine when running containers. Switch to the target machine before running the command.

```bash
switch_machine() {
    target_machine="$1"

    podman machine ls --format json | jq -r '.[] | select(.Running == true) | .Name' | while read -r machine; do
        podman machine stop "$machine"
    done

    podman machine start "$target_machine"
}

# Run nginx on the web-dev machine
switch_machine web-dev
podman --connection web-dev run -d --name web-server -p 8080:80 nginx

# Run PostgreSQL on the db-dev machine
switch_machine db-dev
podman --connection db-dev run -d --name postgres -p 5432:5432 \
    -e POSTGRES_PASSWORD=mysecret postgres:16

# Run a test container on the test-env machine
switch_machine test-env
podman --connection test-env run -d --name test-app alpine sleep 3600
```

## Listing Connections

Podman system connections map to machines. List them to see available connections.

```bash
# List all system connections
podman system connection ls
```

Output:

```text
Name        URI                                                         Identity                    Default
web-dev     ssh://core@localhost:54321/run/podman/podman.sock          /home/user/.ssh/podman-rsa  true
db-dev      ssh://core@localhost:54322/run/podman/podman.sock          /home/user/.ssh/podman-rsa  false
test-env    ssh://core@localhost:54323/run/podman/podman.sock          /home/user/.ssh/podman-rsa  false
```

## Managing Resources Across Machines

Keep track of planned resource allocation across all configured machines:

```bash
# Show combined resource allocation
echo "=== Resource Allocation ==="

podman machine ls --format "{{.Name}}" | while read -r machine; do
    podman machine inspect "$machine" | jq -r '.[0] |
        "\(.Name): \(.Resources.CPUs) CPUs, \(.Resources.Memory) MiB RAM"'
done

# Total resources
podman machine ls --format json | jq '[.[]] | {
    total_cpus: (map(.CPUs) | add),
    total_memory_mib: (map(.Memory | tonumber / 1048576) | add)
}'
```

## Stopping Specific Machines

Stop individual machines when you no longer need them:

```bash
# Stop just the test environment
podman machine stop test-env

# Stop any running machines
podman machine ls --format "{{.Name}}" | while read -r machine; do
    podman machine stop "$machine" 2>/dev/null
done
```

## Platform Considerations

Be aware of resource constraints when running multiple machines:

```bash
# Check your system resources before creating machines (macOS)
sysctl -n hw.ncpu          # Total CPU cores
sysctl -n hw.memsize       # Total memory in bytes

# Recommended: Do not allocate more than 70-80% of host resources
# to the machine you plan to run
```

Podman machine is required on macOS and Windows, and it can also be used on Linux. On Windows with WSL, resource sharing works differently from a traditional VM provider.

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine init <name>` | Create a new machine |
| `podman machine start <name>` | Start a specific machine when no other Podman-managed machine is running |
| `podman --connection <name> run ...` | Run a container on the active machine connection |
| `podman system connection ls` | List all machine connections |
| `podman machine stop <name>` | Stop a specific machine |

## Summary

Managing multiple Podman machines gives you isolated environments for different workloads. Create machines with appropriate resource allocations, start the machine you need, use `--connection` to target the active machine, and monitor each machine's resource settings to avoid overcommitting your host system. This approach is excellent for maintaining separate development, testing, and staging environments on a single workstation.
