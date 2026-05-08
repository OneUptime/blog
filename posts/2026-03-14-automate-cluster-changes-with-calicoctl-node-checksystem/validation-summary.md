# Validation Summary: Automating System Checks with calicoctl node checksystem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes DaemonSets
- cloud-init
- Ansible
- GitHub Actions
- Linux kernel modules and sysctl settings

## Sources Consulted
- Calico `calicoctl node checksystem` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico `calicoctl` installation reference: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico v3.27.0 `checksystem` source: https://github.com/projectcalico/calico/blob/v3.27.0/calicoctl/calicoctl/commands/node/checksystem.go
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- GitHub Actions workflow syntax and secrets documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions and https://docs.github.com/actions/security-guides/using-secrets-in-github-actions

## Issues Found
- The introduction claimed examples included Kubernetes admission controllers, but the post actually uses a DaemonSet. Changed the wording to Kubernetes DaemonSets.
- The kernel module examples did not match the module set checked by Calico v3.27.0 `calicoctl node checksystem`. Updated the cloud-init and Ansible module lists to include the relevant `checksystem` modules while retaining overlay modules used by Calico networking modes.
- The Ansible role checked for the string `ERROR` in stdout, but `checksystem` reports module failures with `WARNING` and returns a nonzero exit code. Updated the task to capture the command result and fail on `checksystem_result.rc != 0`.
- The DaemonSet used `calico/ctl:v3.27.0` with `/bin/sh`, but that image has `calicoctl` as its entrypoint and no `/bin/sh`. Replaced it with an Alpine-based container that downloads the v3.27.0 binary, runs it from a shell loop, and mounts `/lib/modules` from the host so module checks can inspect host module metadata.
- The CI/CD example installed `calicoctl` on the GitHub Actions runner while executing `calicoctl` on the remote target node. Replaced that with SSH key setup and a remote `sudo calicoctl node checksystem` invocation against the target node.

## Review Notes
- The examples remain pinned to Calico v3.27.0. Calico documentation recommends using a `calicoctl` version that matches the deployed Calico version, so future updates should adjust the pinned binary and image versions together.
- The DaemonSet example assumes AMD64 nodes because it downloads `calicoctl-linux-amd64`.
