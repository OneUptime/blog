# Validation Summary: How to Use External Secrets with Flux for Database Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- Flux CD Kustomization
- Kubernetes Secrets and Deployments
- Stakater Reloader
- AWS Secrets Manager
- PostgreSQL, MySQL, and Redis credentials

## Sources Consulted
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator advanced templating v2: https://external-secrets.io/v1.0.0/guides/templating/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Stakater Reloader documentation: https://github.com/stakater/Reloader
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The `ExternalSecret` examples used `apiVersion: external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses `external-secrets.io/v1` for `ExternalSecret`, so the PostgreSQL, Redis, MySQL, and Flux health check snippets were updated to `external-secrets.io/v1`.
- The Kubernetes Deployment example had a selector but no matching `spec.template.metadata.labels`, which would make the Deployment invalid. Added `app: myapp` labels to the pod template.
- The `envFrom` comment referred only to the PostgreSQL secret while the snippet mounted both PostgreSQL and Redis secrets. Updated the comment to refer to database secrets.
- The volume-mounted Secret best practice did not mention Kubernetes' `subPath` limitation or application reload behavior. Clarified that automatic file updates require the application to re-read files and not mount the Secret with `subPath`.
- The `PGPASSWORD_PREVIOUS` guidance described "dual-write" and in-flight transactions. Updated it to describe rotation overlap windows and new connections, which more accurately reflects password rotation behavior.

## Review Notes
The examples assume the referenced `SecretStore`, Flux `Kustomization` dependencies, Reloader installation, and external provider secrets already exist as stated in the prerequisites. Connection-string templates are valid ESO templates, but production systems should ensure usernames and passwords are safe for the target connection string format or construct DSNs in application code from separate fields.
