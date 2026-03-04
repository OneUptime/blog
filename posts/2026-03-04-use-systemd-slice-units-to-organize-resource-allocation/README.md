# How to Use systemd Slice Units to Organize Resource Allocation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Resource Management, Linux

Description: Learn how to use systemd Slice Units to Organize Resource Allocation on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd slice units organize services into a hierarchy for resource allocation. Slices let you set CPU, memory, and I/O limits on groups of services, ensuring fair resource sharing across different workloads.

## Prerequisites

- RHEL with systemd and cgroup v2
- Root or sudo access

## Understanding Slices

systemd creates a default slice hierarchy:

```
-.slice (root slice)
  |-- system.slice    (system services)
  |-- user.slice      (user sessions)
  |-- machine.slice   (VMs and containers)
```

You can create custom slices to group your application services and control their combined resource usage.

## Step 1: Create a Custom Slice

```bash
sudo vi /etc/systemd/system/webapps.slice
```

```ini
[Unit]
Description=Web Application Services

[Slice]
CPUWeight=200
MemoryMax=4G
MemoryHigh=3G
IOWeight=200
```

## Step 2: Create a Nested Slice

Slices can be nested using dash notation:

```bash
sudo vi /etc/systemd/system/webapps-frontend.slice
```

```ini
[Unit]
Description=Frontend Web Apps

[Slice]
CPUWeight=150
MemoryMax=2G
```

This creates a `webapps-frontend.slice` inside `webapps.slice`.

## Step 3: Assign Services to a Slice

Edit your service unit:

```ini
[Service]
Slice=webapps.slice
```

Or for the nested slice:

```ini
[Service]
Slice=webapps-frontend.slice
```

## Step 4: Apply and Verify

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service

systemd-cgtop
systemctl show webapps.slice | grep -E 'CPU|Memory'
```

## Step 5: View the Slice Hierarchy

```bash
systemd-cgls
```

This shows the full cgroup tree, including which services belong to which slices.

## Step 6: Modify Default Slice Weights

To give user sessions less priority than system services:

```bash
sudo systemctl edit user.slice
```

```ini
[Slice]
CPUWeight=50
MemoryMax=8G
```

## Resource Inheritance

Child slices inherit limits from their parents. A child cannot exceed its parent's limits. If `webapps.slice` has `MemoryMax=4G`, all services within it combined cannot use more than 4 GB.

## Conclusion

systemd slice units provide hierarchical resource management on RHEL. By organizing services into slices and setting resource limits at each level, you can ensure predictable resource allocation and prevent any group of services from starving others.
