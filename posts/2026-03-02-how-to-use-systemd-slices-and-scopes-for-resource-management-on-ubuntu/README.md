# How to Use systemd Slices and Scopes for Resource Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Resource Management, Cgroups

Description: Learn how systemd slices and scopes work for organizing processes into resource-controlled groups on Ubuntu using the cgroup hierarchy.

---

systemd uses the Linux kernel's cgroup mechanism to control how processes share CPU, memory, and other system resources. Two unit types central to this are slices and scopes. Understanding them helps you organize processes hierarchically and apply resource limits to groups of services rather than individual ones.

## The cgroup Hierarchy

Every process on a systemd-managed system belongs to a cgroup. systemd organizes these into a tree:

```text
-.slice (root slice)
  ├── system.slice
  │   ├── nginx.service
  │   ├── postgresql.service
  │   └── ...
  ├── user.slice
  │   ├── user-1000.slice
  │   │   ├── session-1.scope
  │   │   └── user@1000.service
  │   └── ...
  └── machine.slice
      ├── systemd-nspawn@container1.service
      └── ...
```

You can view the current hierarchy with:

```bash
# Show the systemd cgroup hierarchy
systemd-cgls

# Show with resource usage
systemd-cgtop
```

## Slices: Organizing Services into Groups

A slice is a unit that represents a portion of the cgroup hierarchy. Slices form the organizational structure, while services and scopes are the leaf nodes that actually contain processes.

The three default slices on Ubuntu:
- `system.slice` - all system services
- `user.slice` - all user sessions
- `machine.slice` - virtual machines and containers

### Creating a Custom Slice

To group a set of services together for resource management, create a custom slice:

```bash
sudo tee /etc/systemd/system/myapp.slice << 'EOF'
[Unit]
Description=My Application Slice
Before=slices.target

[Slice]
# Limit total memory for all services in this slice to 2GB
MemoryMax=2G

# Limit total CPU to 200% (2 cores)
CPUQuota=200%

# Limit total number of tasks across the slice
TasksMax=500
EOF
```

```bash
sudo systemctl daemon-reload
sudo systemctl start myapp.slice
```

### Assigning Services to a Slice

Tell a service to run within your custom slice using the `Slice=` directive:

```ini
# /etc/systemd/system/mywebapp.service
[Unit]
Description=My Web Application
After=network.target

[Service]
Slice=myapp.slice
ExecStart=/usr/local/bin/mywebapp
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/myworker.service
[Unit]
Description=My Background Worker
After=network.target

[Service]
# This service also goes into the same slice
Slice=myapp.slice
ExecStart=/usr/local/bin/myworker
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Now `mywebapp` and `myworker` share the 2GB memory limit defined in `myapp.slice`. Each service can use up to 2GB individually, but together they cannot exceed 2GB (the slice limit applies to the combined total).

## Nested Slices

Slices can be nested by using a hyphen-separated naming convention. A service named `parent-child.slice` is automatically a child of `parent.slice`:

```bash
# Create a parent slice
sudo tee /etc/systemd/system/production.slice << 'EOF'
[Unit]
Description=Production Services Slice

[Slice]
MemoryMax=8G
CPUQuota=400%
EOF

# Create a child slice for web services
sudo tee /etc/systemd/system/production-web.slice << 'EOF'
[Unit]
Description=Production Web Services

[Slice]
# Child slice limits are further bounded by the parent
MemoryMax=4G
CPUQuota=200%
EOF

# Create a child slice for worker services
sudo tee /etc/systemd/system/production-workers.slice << 'EOF'
[Unit]
Description=Production Worker Services

[Slice]
MemoryMax=4G
CPUQuota=200%
EOF
```

Services in `production-web.slice` and `production-workers.slice` are each bounded by their respective child limits AND the parent `production.slice` limits.

## Scopes: Managing External Processes

While slices are the organizational containers and services are for daemon-managed processes, scopes handle processes that systemd did not start directly. A scope unit represents a group of processes that some other process (like a session manager or container runtime) created.

Scopes are transient - they are created at runtime rather than defined in unit files.

You can create a scope to put an existing process under systemd resource control:

```bash
# Run a process inside a new scope with resource limits
sudo systemd-run \
    --scope \
    --slice=myapp.slice \
    --unit=myapp-batch \
    -p MemoryMax=512M \
    -p CPUQuota=50% \
    /usr/local/bin/batch-processor

# The batch processor now runs under systemd's control
systemctl status myapp-batch.scope
```

### Using systemd-run for Transient Units

`systemd-run` is the primary tool for creating transient services and scopes:

```bash
# Run a command as a transient service (not a scope)
sudo systemd-run \
    --unit=my-backup \
    -p MemoryMax=1G \
    -p Nice=10 \
    /usr/local/bin/backup.sh

# Run in the background
sudo systemd-run \
    --unit=my-job \
    --slice=batch.slice \
    -p MemoryMax=512M \
    --remain-after-exit \
    /usr/local/bin/myjob.sh

# Check on the transient service
systemctl status my-job.service
journalctl -u my-job.service
```

## Setting Resource Limits on Existing Slices

You can adjust resource limits on running slices without editing files:

```bash
# Set a memory limit on the system slice temporarily
sudo systemctl set-property system.slice MemoryMax=4G

# Make it persistent (survives reboots)
sudo systemctl set-property --runtime system.slice MemoryMax=4G
# Without --runtime it writes to /etc/systemd/system.control/

# Set CPU limits on a custom slice
sudo systemctl set-property myapp.slice CPUQuota=150%

# Remove a property
sudo systemctl set-property myapp.slice MemoryMax=infinity
```

## Viewing Resource Usage by Slice

```bash
# Real-time view of cgroup resource usage
systemd-cgtop

# Show detailed resource usage for a specific slice
systemctl status myapp.slice

# Show properties including resource usage
systemctl show myapp.slice | grep -i "memory\|cpu\|tasks"

# Raw cgroup data
cat /sys/fs/cgroup/myapp.slice/memory.current
cat /sys/fs/cgroup/myapp.slice/cpu.stat
```

## Practical Examples

### Limiting Development Services

If you run development services on a production machine, isolate them:

```ini
# /etc/systemd/system/dev.slice
[Unit]
Description=Development Services (Lower Priority)

[Slice]
# Total memory cap for all dev services
MemoryMax=2G

# Lower CPU priority weight (default is 100)
CPUWeight=50

# Hard CPU cap at 100% of one core
CPUQuota=100%
```

### Protecting Critical Services

Give priority to critical services by placing them in a high-priority slice:

```ini
# /etc/systemd/system/critical.slice
[Unit]
Description=Critical Production Services

[Slice]
# Higher CPU weight (default is 100)
CPUWeight=500

# Reserve memory so the OOM killer avoids these processes
MemoryLow=1G
```

Services in `critical.slice` will get more CPU time than those in `dev.slice` when the system is under load.

### Interactive Scope for Resource Testing

```bash
# Start a shell in a resource-limited scope for testing
sudo systemd-run \
    --scope \
    --unit=test-env \
    -p MemoryMax=256M \
    -p CPUQuota=25% \
    -t \
    /bin/bash

# You now have a shell where the total process memory is capped at 256MB
```

## Checking the Hierarchy

```bash
# Show the complete slice and unit hierarchy
systemd-cgls

# Show only a subtree
systemd-cgls /myapp.slice

# Show all units and their slice membership
systemctl list-units --type=service -o json | \
    python3 -c "import json,sys; [print(u['unit'], u.get('description','')) for u in json.load(sys.stdin)]"
```

## Summary

systemd slices provide a hierarchical way to group services and apply shared resource limits. A slice like `myapp.slice` can cap the combined memory and CPU of all the services it contains. Scopes extend this to processes that systemd did not start. The `systemd-run` command makes it easy to run commands inside transient scopes or services with resource limits. For production environments, organizing services into slices gives you fine-grained control over how different workloads compete for system resources, using the same cgroup infrastructure that containers rely on.
