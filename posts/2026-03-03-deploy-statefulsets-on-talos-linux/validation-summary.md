# Validation Summary: How to Deploy StatefulSets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, disks, kubelet.extraMounts)
- Kubernetes StatefulSet (apps/v1)
- Kubernetes Service (headless, clusterIP: None)
- Kubernetes PodDisruptionBudget (policy/v1)
- PostgreSQL 16 (container image, pg_isready readiness probe, PGDATA env)
- Rancher local-path-provisioner (v0.0.26)
- Longhorn (distributed block storage via Helm chart)
- kubectl (apply, scale, patch, run, delete --cascade=orphan)
- talosctl (apply-config --patch)
- Helm (repo add, install)

## Sources Consulted
- Kubernetes StatefulSet documentation — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet update strategies (RollingUpdate / OnDelete / partition) — https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/#updating-statefulsets
- Kubernetes Headless Services — https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes DNS for Services and Pods — https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes PodDisruptionBudget — https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Talos Linux machine configuration reference (machine.disks, machine.kubelet.extraMounts) — https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Talos talosctl apply-config command reference — https://www.talos.dev/v1.7/reference/cli/
- Rancher local-path-provisioner GitHub releases — https://github.com/rancher/local-path-provisioner/releases
- Longhorn install via Helm — https://longhorn.io/docs/latest/deploy/install/install-with-helm/
- PostgreSQL Docker image and pg_isready usage — https://hub.docker.com/_/postgres
- Cross-reference: extraMounts and machine.disks structure usage in other validated blog posts in this repository.

## Issues Found
No technical issues found.

## Review Notes
- The Rancher local-path-provisioner does not, by default, work cleanly on Talos because its default node path (`/opt/local-path-provisioner`) is not writable on Talos's immutable root. The post notes Talos's `/var` constraint elsewhere and offers Longhorn as the recommended production option, which is reasonable. Future revisions could explicitly call out overriding the local-path-provisioner `paths` to use a `/var/...` directory when using it on Talos.
- The `volumeClaimTemplates` storageClassName is hardcoded to `longhorn` in the PostgreSQL example. Readers using local-path or another provisioner will need to change this field; the post implies this via the "Setting Up Storage" section but does not call it out directly at the YAML.
- The PostgreSQL StatefulSet is presented with 3 replicas using `ReadWriteOnce` PVCs, which gives each pod independent storage — it does not by itself produce a replicated PostgreSQL cluster. The post correctly frames this as "deploying a PostgreSQL StatefulSet with persistent storage" rather than as a replication setup, so this is accurate but worth noting for readers expecting HA Postgres out of the box.
- The local-path-provisioner version (v0.0.26) is pinned; this version exists and is downloadable, but readers may want to check for newer patch releases over time.
- The `partition` behavior, RollingUpdate ordering (highest ordinal first), OnDelete strategy, and headless service DNS format all match the upstream Kubernetes documentation.
