# Validation Summary: How to Automate Calico Operator Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- calicoctl
- Bash
- jq

## Sources Consulted
- Calico documentation: Migrate Calico to an operator-managed installation, https://docs.tigera.io/calico/latest/operations/operator-migration
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl get reference, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: IP pool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Kubernetes documentation: JSONPath support, https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: kubectl rollout status, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The prerequisites said Calico v3.15+ was sufficient. Current Calico operator migration documentation states migration to an operator-managed installation is supported from a same-version manifest-based installation and requires the Kubernetes datastore. Updated the prerequisites accordingly.
- The script defaulted to Calico v3.27.0. Updated the default to v3.32.0 to match the current Calico Open Source documentation reviewed on 2026-05-14.
- The script generated an explicit `Installation.spec.calicoNetwork.ipPools` from one default IP pool. The documented migration flow creates an `Installation` with `spec: {}` so the operator auto-detects supported existing Calico settings. Replaced the generated spec with `spec: {}`.
- The script installed only `tigera-operator.yaml`. Current migration docs install the Calico v1 CRD bundle before the operator using server-side apply with force conflicts. Added the documented CRD apply step and changed operator installation to the same apply mode.
- The script used `calicoctl get ... -o jsonpath`, but the official `calicoctl get` output formats do not include `jsonpath`. Removed those commands by relying on operator auto-detection.
- The script used `calicoctl get ippools --no-headers`, but `--no-headers` is not listed for `calicoctl get`. Changed IP pool counting to use `calicoctl get ippools -o json | jq`.
- The post implied automatic rollback, but the script only fails and exits. Updated the wording and diagram to describe alert/manual rollback handoff instead of automatic rollback.
- The pod validation pipeline used `grep -v Running` under `set -euo pipefail`, which exits the script when all pods are Running because `grep` returns 1 for no matches. Replaced it with an `awk` counter.

## Review Notes
The Bash snippet was extracted from the Markdown and checked with `bash -n`. The migration was not executed because it requires a live Kubernetes cluster with a manifest-based Calico installation.
