# How to Use Init Containers for ClickHouse on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Init Container, Configuration, StatefulSet

Description: Use Kubernetes init containers to prepare ClickHouse configuration, set OS parameters, and verify dependencies before the main container starts.

---

Init containers run to completion before the main ClickHouse container starts. They are ideal for setting kernel parameters, downloading configuration files, waiting for dependencies, or preparing storage volumes.

## Common Use Cases

The most frequent use cases for ClickHouse init containers are:

- Setting `vm.max_map_count` and other kernel parameters
- Downloading config files from a secret store
- Waiting for ClickHouse Keeper or ZooKeeper to become available
- Pre-formatting or validating persistent volumes

## Setting Kernel Parameters

ClickHouse performs best with specific OS-level settings. Use a privileged init container to apply them:

```yaml
initContainers:
  - name: sysctl
    image: busybox:1.36
    securityContext:
      privileged: true
    command:
      - sh
      - -c
      - |
        sysctl -w vm.max_map_count=262144
        sysctl -w net.core.somaxconn=65535
        sysctl -w vm.overcommit_memory=1
```

This runs once before ClickHouse starts and the settings persist for the lifetime of the pod.

## Waiting for ClickHouse Keeper

If ClickHouse Keeper runs as a separate StatefulSet, use an init container to wait for it to become ready:

```yaml
initContainers:
  - name: wait-for-keeper
    image: busybox:1.36
    command:
      - sh
      - -c
      - |
        until nc -z clickhouse-keeper 9181; do
          echo "Waiting for ClickHouse Keeper..."
          sleep 2
        done
        echo "Keeper is ready"
```

This prevents ClickHouse from starting in a state where it cannot connect to its coordination service.

## Downloading Config from Vault

For secrets management, pull configuration before startup:

```yaml
initContainers:
  - name: fetch-config
    image: vault:1.15
    env:
      - name: VAULT_ADDR
        value: "https://vault.internal:8200"
      - name: VAULT_TOKEN
        valueFrom:
          secretKeyRef:
            name: vault-token
            key: token
    command:
      - sh
      - -c
      - |
        vault kv get -field=users.xml secret/clickhouse > /config/users.xml
    volumeMounts:
      - name: clickhouse-config
        mountPath: /config
```

Mount the same volume in the main ClickHouse container to make the config available.

## Volume Initialization

Prepare data directories with correct ownership:

```yaml
initContainers:
  - name: fix-permissions
    image: busybox:1.36
    command:
      - sh
      - -c
      - |
        chown -R 101:101 /var/lib/clickhouse
        chmod 750 /var/lib/clickhouse
    volumeMounts:
      - name: clickhouse-data
        mountPath: /var/lib/clickhouse
```

ClickHouse runs as UID 101 by default, and the mounted PVC may not have the correct permissions.

## Full Init Container Spec

Combine multiple init containers in sequence:

```yaml
initContainers:
  - name: sysctl
    image: busybox:1.36
    securityContext:
      privileged: true
    command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
  - name: wait-for-keeper
    image: busybox:1.36
    command: ["sh", "-c", "until nc -z clickhouse-keeper 9181; do sleep 2; done"]
  - name: fix-permissions
    image: busybox:1.36
    command: ["sh", "-c", "chown -R 101:101 /var/lib/clickhouse"]
    volumeMounts:
      - name: clickhouse-data
        mountPath: /var/lib/clickhouse
```

## Summary

Init containers are a clean, Kubernetes-native way to handle ClickHouse pre-start requirements. Use them to apply kernel tuning parameters, wait for dependencies like ClickHouse Keeper, fetch secrets, and fix volume permissions - keeping these concerns separate from the main application container.
