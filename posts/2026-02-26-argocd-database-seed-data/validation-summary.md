# Validation Summary: How to Handle Database Seed Data with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks and sync waves
- Kubernetes Jobs, ConfigMaps, init containers, and volumes
- Kustomize overlays and ConfigMap generators
- PostgreSQL `psql` and `INSERT ... ON CONFLICT`
- GitOps deployment workflows

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- PostgreSQL `INSERT` documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The Kustomize overlay example generated only `seed.sql`, while the development SQL used `\i /seed/common.sql`. I added `common.sql=seed-data/common.sql` to the base ConfigMap generator so the included file exists when the ConfigMap is mounted.
- The PreSync initial seed Job referenced `DB_PASSWORD` and `/seed/seed.sql` without defining the environment variable or mounting the seed ConfigMap. I added the `DB_PASSWORD` Secret reference and the `seed-data` ConfigMap volume mount.
- The seed verification Job referenced `DB_PASSWORD` without defining it. I added the `DB_PASSWORD` Secret reference.

## Review Notes
- The Argo CD hook annotations, hook delete policies, and sync wave usage match the official Argo CD behavior. Negative sync waves are valid.
- The Kubernetes Job examples use supported `batch/v1` fields and valid `restartPolicy: Never` semantics.
- The PostgreSQL `ON CONFLICT` examples are valid, assuming the target columns have suitable unique or exclusion constraints.
- ConfigMaps are appropriate for small seed files; Kubernetes limits ConfigMap data to 1 MiB, so the article's recommendation to use external storage for large datasets is technically sound.
