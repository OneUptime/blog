# Validation Summary: Standardizing Team Workflows Around calicoctl node run

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- calico/node
- etcd datastore configuration
- Docker
- Bash scripting

## Sources Consulted
- Calico `calicoctl node run` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/run
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico calicoctl etcd datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico image registry documentation: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Local verification with `calicoctl-linux-amd64` v3.27.0 from the official Project Calico GitHub release.

## Issues Found
- The example Calico node image used `calico/node:v3.27.0`. Updated it to `quay.io/calico/node:v3.27.0` to match the official Calico image registry used in current documentation and the v3.27.0 `calicoctl node run` default registry.
- The `defaults.env` snippet included `FELIX_LOGSEVERITYSCREEN=Info`, but the deployment script did not pass Felix configuration with `--felix-config`, and local `calicoctl node run --dryrun` verification showed this arbitrary Felix environment variable was not propagated into the generated `docker run` command. Removed the unused line from the example defaults.
- The `CALICO_NETWORKING_BACKEND` default was defined but not passed to `calicoctl node run`, so host-specific overrides would not affect the deployment. Added `--backend=${CALICO_NETWORKING_BACKEND}` to the command.

## Review Notes
The guide is technically relevant and the remaining `calicoctl node run`, IP autodetection, etcd environment variable, certificate, Docker inspection, and `calicoctl node status` examples align with the consulted documentation. The example is version-specific to Calico v3.27.0, which is no longer the latest Calico release as of this review date; teams should intentionally choose and test their approved version before adopting the workflow.
