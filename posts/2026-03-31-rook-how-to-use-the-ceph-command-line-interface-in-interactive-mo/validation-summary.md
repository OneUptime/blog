# Validation Summary: How to Use the Ceph Command Line Interface in Interactive Mode

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CLI, interactive shell mode)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph CLI reference: https://docs.ceph.com/en/latest/man/8/ceph/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

1. **`ceph> -s` listed as interactive mode command** (Cluster Health and Status section): `-s` is a CLI flag parsed by the `ceph` binary itself (equivalent to `ceph status` on the command line), not a valid subcommand in interactive mode. Typing `-s` at the `ceph>` prompt would produce an error. Removed this line since `status` was already listed above it.

2. **Piping example with echo header strings** (Using Interactive Mode in Scripts section): The example piped strings like `=== Cluster Status ===` into `ceph` via echo statements. These non-command strings would be interpreted as Ceph commands by the interactive shell and produce errors. Replaced the example with a correct `printf` one-liner that only pipes valid Ceph commands.

3. **Incorrect short flag `-W` for `--watch`** (Watching Real-Time Events section): The post stated the short flag for `--watch` is `-W` (uppercase). The correct short flag is `-w` (lowercase). Fixed to `-w`.

## Review Notes
- The `pg dump_stuck` command is still valid in recent Ceph releases (Reef, Squid) but users should be aware that placement group management commands have evolved across Ceph versions.
- The post correctly describes tab completion, but the exact completions shown in the examples are illustrative rather than exhaustive — actual completions depend on the Ceph version and cluster state.
- The heredoc approach for scripting (`ceph << 'EOF'`) is a practical pattern, though for production monitoring scripts, using individual `ceph` commands with `--format json` is generally preferred for parseability.
