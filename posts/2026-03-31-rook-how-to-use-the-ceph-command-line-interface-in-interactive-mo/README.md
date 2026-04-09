# How to Use the Ceph Command Line Interface in Interactive Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CLI, Interactive Shell, Administration

Description: Use the Ceph CLI interactive shell to run multiple commands efficiently, explore cluster state, and avoid the overhead of launching a new process per command.

---

## What Is the Ceph Interactive Mode

The `ceph` command-line tool supports an interactive shell mode where you can run multiple Ceph commands without the overhead of re-establishing the admin socket connection for each command. This is faster for exploratory work and debugging sessions.

## Starting the Interactive Shell

Simply run `ceph` with no arguments:

```bash
ceph
```

You will see a prompt:

```text
ceph>
```

Now you can type Ceph commands directly:

```text
ceph> status
ceph> osd stat
ceph> pg stat
ceph> health detail
ceph> quit
```

## Advantages of Interactive Mode

1. **Faster execution**: No process startup overhead for each command
2. **History**: Use arrow keys to recall previous commands
3. **Tab completion**: Complete command names and pool/OSD names
4. **Persistent connection**: The connection to the cluster is maintained

## Common Interactive Mode Commands

### Cluster Health and Status

```text
ceph> status
ceph> health
ceph> health detail
```

### OSD Operations

```text
ceph> osd stat
ceph> osd tree
ceph> osd df
ceph> osd dump
ceph> osd perf
```

### Pool Operations

```text
ceph> osd pool ls
ceph> osd pool ls detail
ceph> osd pool stats
ceph> df
ceph> df detail
```

### Placement Group Operations

```text
ceph> pg stat
ceph> pg dump
ceph> pg dump_stuck
ceph> pg dump_stuck inactive
ceph> pg dump_stuck unclean
```

### Monitor Operations

```text
ceph> mon stat
ceph> mon dump
ceph> quorum_status
```

## Tab Completion in Interactive Mode

The interactive mode supports tab completion for command names:

```text
ceph> osd <TAB>
# Shows: stat, tree, df, dump, perf, pool, crush, ...

ceph> osd pool <TAB>
# Shows: ls, stats, set, get, create, delete, ...

ceph> osd pool get <TAB>
# Shows available pool names
```

## Using Interactive Mode in Scripts

You can pipe commands into the interactive shell:

```bash
# Run multiple commands in one session
ceph << 'EOF'
status
osd stat
pg stat
health detail
EOF
```

Or pipe a list of commands:

```bash
# Run multiple commands in one session
printf 'status\nosd stat\npg stat\n' | ceph
```

## Running in Rook/Kubernetes

In Rook environments, access the interactive Ceph shell via the toolbox pod:

```bash
# Start an interactive session
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph

# Or run a single command
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

In the toolbox pod's interactive shell:

```text
ceph> status
ceph> osd tree
ceph> pg stat
ceph> quit
```

## Watching Real-Time Events

Use the `--watch` flag (or `-w`) with `ceph -w` outside interactive mode, or use `log last` inside:

```text
ceph> log last 20
ceph> log last 50 cluster
```

For real-time watching, use the non-interactive command:

```bash
# Watch cluster events in real time
ceph -w

# Watch with specific log channel
ceph -w --watch-channel=cluster
```

## Useful Interactive Mode Tips

```text
Command              | Description
help                 | List available commands
quit or exit         | Exit interactive mode
Ctrl+D               | Exit interactive mode
Ctrl+C               | Cancel current command
Up/Down arrows       | Navigate command history
Tab                  | Complete command or argument
```

## Logging Output to File

In non-interactive mode, pipe output to a file for logging:

```bash
# Log all commands to a file
ceph -s >> /var/log/ceph-status.log
ceph pg stat >> /var/log/ceph-status.log
ceph osd df >> /var/log/ceph-status.log
```

Or in interactive mode, use shell redirection before entering:

```bash
ceph << 'EOF' | tee /tmp/cluster-state.txt
status
osd stat
pg stat
df
EOF
```

## Summary

The Ceph interactive shell mode (`ceph` with no arguments) provides a persistent connection to the cluster for running multiple commands efficiently with tab completion and command history. It is particularly useful for exploratory debugging sessions and avoids the overhead of re-connecting for each command. In Rook/Kubernetes environments, access it via `kubectl exec` into the rook-ceph-tools pod. For scripting, pipe multiple commands via heredoc into `ceph` for efficient batch execution.
