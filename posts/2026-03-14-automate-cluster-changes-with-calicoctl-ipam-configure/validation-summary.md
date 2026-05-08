# Validation Summary: Automating IPAM Configuration with calicoctl ipam configure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- Bash
- GitHub Actions
- YAML

## Sources Consulted
- Calico `calicoctl ipam configure` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico `IPAMConfiguration` resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico `calicoctl` user reference, including `--context`: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Kubernetes API datastore configuration for `calicoctl`: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
- The multi-cluster script exported `KUBECONFIG` to the raw JSON content of the kubeconfig, but Calico documents `KUBECONFIG` as the location of a kubeconfig file. Removed that export and used `calicoctl --context="$CLUSTER"` so each loop iteration targets the intended cluster context.
- The multi-cluster script used `kubectl exec` to inspect IPAM configuration but used local `calicoctl ipam configure` without selecting the same cluster. Changed both the read and write operations to use local `calicoctl --context="$CLUSTER"`.
- The examples parsed `calicoctl ipam show --show-configuration` with `grep StrictAffinity | awk '{print $2}'`, but the documented output is a table where the second whitespace field is `StrictAffinity`, not the value. Updated parsing to split on `|` and read the value column.
- The GitHub Actions example stored both `strictAffinity` and `maxBlocksPerHost` in YAML but only applied `strictAffinity`. Added `--max-blocks-per-host` to match the stored configuration and the documented `calicoctl ipam configure` options.

## Review Notes
- The article assumes `calicoctl` is installed and configured in automation environments, which is consistent with the prerequisites. In a real CI/CD setup, kubeconfig secrets and Calico/client version alignment should be handled explicitly.
