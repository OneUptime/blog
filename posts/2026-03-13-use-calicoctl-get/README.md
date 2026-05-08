# calicoctl Command Guide - Use Get

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Calicoctl

Description: Practical guide for using calicoctl commands safely and effectively in production Kubernetes clusters.

---

## Introduction

calicoctl is a CLI for managing Calico resources and running Calico-specific administrative commands. In clusters with the Calico API server installed, Calico recommends using `kubectl` for most resource operations and reserving calicoctl for commands such as `node`, `ipam`, `convert`, and `version`. This guide covers safe usage patterns for calicoctl commands in production environments.

## Key Commands

```bash
# List Calico resources

calicoctl get felixconfiguration
calicoctl get globalnetworkpolicy
calicoctl get bgppeer
calicoctl get ippool -o wide

# Apply a resource
calicoctl apply -f resource.yaml

# Create a resource (fails if exists)
calicoctl create -f resource.yaml

# Delete a resource
calicoctl delete globalnetworkpolicy my-policy

# Patch a resource
calicoctl patch felixconfiguration default \
  -p '{"spec":{"logSeverityScreen":"Info"}}'

# Validate a file without applying
calicoctl validate -f resource.yaml
```

## Safe Workflow Pattern

```bash
# Step 1: Backup current state
calicoctl get <resource> -o yaml > backup-$(date +%Y%m%d).yaml

# Step 2: Make the change
calicoctl apply -f new-config.yaml

# Step 3: Verify
calicoctl get <resource> -o yaml

# Step 4: Test connectivity
# Run your standard connectivity validation test

# Step 5: Rollback if needed
calicoctl apply -f backup-$(date +%Y%m%d).yaml
```

## calicoctl Command Reference

```mermaid
mindmap
  root((calicoctl))
    Read
      get
      get -o yaml
      get networkpolicy --all-namespaces
    Write
      apply (create or replace)
      create (new only)
      replace (update only)
      patch (partial update)
      delete
    Validate
      validate -f file.yaml
    Diagnostics
      node status
      node diags
      ipam show
      ipam check
      cluster diags
```

## Conclusion

calicoctl commands are useful for Calico resource management and Calico-specific administration. Follow the backup-change-verify-rollback pattern for all write operations. Use `calicoctl apply` for declarative management when calicoctl is the right tool for your cluster, `calicoctl get` for diagnostics, and `calicoctl delete` only with explicit intent and a verified backup. In production clusters, require change tickets for all write operations and integrate Calico changes with GitOps workflows for audit trails.
