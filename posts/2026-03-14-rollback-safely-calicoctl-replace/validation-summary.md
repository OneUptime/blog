# Validation Summary: How to Roll Back Safely After Using calicoctl replace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Bash
- Python / PyYAML
- Git

## Sources Consulted
- Tigera Calico documentation: calicoctl replace, https://docs.tigera.io/calico/latest/reference/calicoctl/replace
- Tigera Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Tigera Calico documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Tigera Calico documentation: calicoctl user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Tigera Calico documentation: Resource definitions, https://docs.tigera.io/calico/latest/reference/resources/overview
- Tigera Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The helper scripts used Python's `yaml` module but the prerequisites did not mention PyYAML. Added Python 3 with PyYAML to the prerequisites so readers know the scripts require it.
- The backup commands used `calicoctl get ... -o yaml` without `--export`. Tigera documents `--export` as the way to strip cluster-specific information, and its user reference recommends exported YAML before using `replace` for configuration edits. Updated backup commands and verification comparison to use `--export`.
- The backup scripts did not pass a namespace when backing up namespaced Calico resources. Added optional `metadata.namespace` extraction and `-n "$NAMESPACE"` handling so NetworkPolicy, NetworkSet, and WorkloadEndpoint backups can target the intended namespace.
- The rollback script's default backup lookup could exit early under `set -euo pipefail` when `/tmp/last-replace-backup` did not exist. Reworked it to initialize `BACKUP_FILE` first and tolerate a missing state file before showing available backups.
- The verification `diff` command used a glob that could expand to multiple backup files. Changed it to select the latest matching backup file before comparing.

## Review Notes
The main `calicoctl replace`, `get`, `validate`, and `apply` command forms are current in the Calico 3.32 documentation. Calico's current documentation also notes that newer clusters can use the Calico API server with `kubectl` for many resource operations, but `calicoctl` remains valid for the workflow described here.
