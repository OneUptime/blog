# Validation Summary: How to Handle Database Migrations with ArgoCD Sync Hooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes Jobs
- Kustomize image transformations
- Rails migrations
- Django migrations and static collection
- Flyway migrations
- Liquibase migrations
- PostgreSQL advisory locks
- kubectl logs

## Sources Consulted
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- PostgreSQL advisory lock function documentation: https://www.postgresql.org/docs/current/functions-admin.html
- Redgate Flyway migrate command documentation: https://documentation.red-gate.com/flyway/reference/commands/migrate
- Liquibase Docker image documentation: https://support.liquibase.com/hc/en-us/articles/29383061110171-How-to-use-the-Liquibase-Docker-image
- Django django-admin and manage.py documentation: https://docs.djangoproject.com/en/stable/ref/django-admin/
- Ruby on Rails Active Record migrations guide: https://guides.rubyonrails.org/active_record_migrations.html
- Kubernetes kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The migration failure section said ArgoCD will retry the sync after pushing a fix. This is only automatic when automated sync is enabled; otherwise a user must start a new sync manually. Updated the wording to reflect both cases.
- The PostgreSQL advisory lock example acquired the lock with one `psql -c` session, then ran the migration in a separate process after that session had ended. PostgreSQL session-level advisory locks are released at session end, so the lock would not protect the migration. Replaced the snippet with a Python wrapper that keeps the database connection open while running the migration and releases the lock afterward.

## Review Notes
- The Argo CD PreSync, PostSync, hook delete policy, and sync-wave examples align with the official hook and wave behavior.
- The Kubernetes Job fields `backoffLimit`, `activeDeadlineSeconds`, and `restartPolicy: Never` are valid for the shown Job manifests.
- The Flyway and Liquibase examples are valid command patterns, but production manifests should normally pin image tags instead of using `latest`.
