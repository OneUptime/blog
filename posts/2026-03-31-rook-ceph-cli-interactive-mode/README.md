# How to Use the Ceph CLI in Interactive Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Toolbox, Kubernetes

Description: Use the Ceph CLI in interactive mode via the Rook toolbox pod to efficiently run multiple cluster management commands without repeated kubectl exec calls.

---

The Ceph CLI is the primary tool for managing and monitoring a Ceph cluster. In a Rook environment, the CLI runs inside the toolbox pod. Using the interactive shell instead of one-off `kubectl exec` calls speeds up workflows and enables multi-step diagnostics.

## Deploy the Rook Toolbox

If the toolbox is not already running, deploy it:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
```

Wait for the pod to be ready:

```bash
kubectl -n rook-ceph rollout status deploy/rook-ceph-tools
```

## Open an Interactive Shell

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash
```

You are now inside the toolbox container with full Ceph CLI access.

## Launch the Ceph Interactive Shell

Inside the toolbox, start the interactive Ceph shell:

```bash
ceph
```

This drops you into the Ceph interactive prompt:

```text
ceph>
```

From here you can run any Ceph command without typing `ceph` as a prefix:

```text
ceph> status
ceph> health detail
ceph> osd pool ls
ceph> osd tree
ceph> pg stat
ceph> df
```

## Tab Completion in Interactive Mode

The Ceph interactive shell supports tab completion:

```text
ceph> osd <TAB>
crush  df  dump  erasure-code-profile  find  getcrushmap ...
```

This makes it easy to explore available subcommands and parameters.

## Useful Interactive Session Workflow

A typical diagnostic session:

```text
ceph> status
ceph> health detail
ceph> osd stat
ceph> osd tree
ceph> osd pool ls detail
ceph> pg stat
ceph> df detail
ceph> mon stat
```

## Run Commands Without Interactive Mode

For scripting, pass commands directly:

```bash
# Single command
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status

# Multiple commands in one exec
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- bash -c "
  ceph status
  ceph osd stat
  ceph df
"
```

## Use JSON Output for Scripting

The interactive shell and direct commands both support `--format json`:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status --format json-pretty
```

Parse with Python:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status --format json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Health:', data['health']['status'])
print('OSDs:', data['osdmap']['num_up_osds'], 'up,', data['osdmap']['num_osds'], 'total')
"
```

## Exit the Interactive Shell

```text
ceph> quit
```

Or press `Ctrl+D`.

## Summary

The Ceph interactive shell (`ceph` command with no arguments) provides a REPL environment with tab completion, making it efficient for multi-step cluster diagnostics. Access it through the Rook toolbox pod with `kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash`, then run `ceph` to enter interactive mode. For automation and scripts, use direct commands with `--format json` for machine-readable output.
