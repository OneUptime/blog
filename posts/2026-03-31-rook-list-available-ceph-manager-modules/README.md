# How to List Available Ceph Manager Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Ceph Manager, Administration, Discovery

Description: Learn how to list, inspect, and discover available Ceph Manager modules to understand what capabilities are installed and active in your cluster.

---

Ceph Manager ships with dozens of built-in modules and can load custom ones from the filesystem. Knowing how to list and inspect available modules is the first step when planning monitoring integrations, enabling new features, or auditing your cluster configuration.

## Basic Module Listing

Get the complete list of all manager modules and their states:

```bash
ceph mgr module ls
```

For a more readable format, use the built-in JSON pretty-print option:

```bash
ceph mgr module ls --format json-pretty
```

## Understanding the Output Structure

The command returns three categories:

```json
{
  "always_on_modules": [
    "balancer",
    "crash",
    "devicehealth",
    "diskprediction_local",
    "insights",
    "orchestrator",
    "pg_autoscaler",
    "progress",
    "rbd_support",
    "status",
    "telemetry",
    "volumes"
  ],
  "enabled_modules": [
    "dashboard",
    "prometheus",
    "restful"
  ],
  "disabled_modules": [
    {
      "name": "influx",
      "can_run": true,
      "error_string": "",
      "module_options": {}
    }
  ]
}
```

`disabled_modules` includes a `can_run` field showing whether the module's dependencies are satisfied.

## Filtering Module Lists

Extract just the names of enabled modules:

```bash
ceph mgr module ls --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Always on:', data['always_on_modules'])
print('Enabled:', data['enabled_modules'])
"
```

## Viewing Module Options

List the configuration options available for a specific module:

```bash
ceph config-key ls | grep "mgr/prometheus"
```

Or use the config help:

```bash
ceph config help mgr/prometheus/server_port
```

## Discovering Module Files on Disk

Find where modules are installed on manager nodes:

```bash
ls /usr/share/ceph/mgr/
```

```text
balancer/    crash/       dashboard/   influx/
iostat/      nfs/         prometheus/  rbd_support/
rgw/         telegraf/    telemetry/   volumes/
```

Each directory contains a `module.py` and optional supporting files.

## Checking Module Version

Inspect a module's version or metadata:

```bash
python3 -c "
import sys
sys.path.insert(0, '/usr/share/ceph/mgr')
import prometheus.module as m
print(dir(m.Module))
"
```

## In Rook Environments

In a Rook-managed cluster, exec into the manager pod to inspect modules:

```bash
kubectl -n rook-ceph exec -it \
  $(kubectl -n rook-ceph get pod -l app=rook-ceph-mgr -o name | head -1) \
  -- ceph mgr module ls --format json-pretty
```

## Summary

`ceph mgr module ls` is the primary tool for discovering available and active Ceph Manager modules, returning three groups: always-on built-ins, currently enabled optional modules, and disabled modules with dependency status. Module configuration options are accessible via `ceph config help`, and module files on disk reside under `/usr/share/ceph/mgr/`.
