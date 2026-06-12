# Validation Summary: How to Implement Review Apps in GitLab CI

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitLab CI/CD
- GitLab Review Apps and dynamic environments
- GitLab CI/CD rules and predefined variables
- Kubernetes namespaces, Deployments, Services, and Ingress
- Docker
- Nginx reverse proxy configuration
- PostgreSQL database creation and deletion
- Cypress end-to-end testing
- GitLab Notes API
- jq

## Sources Consulted
- GitLab Review Apps documentation: https://docs.gitlab.com/ci/review_apps/
- GitLab Environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab job rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab predefined CI/CD variables reference: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Notes API documentation: https://docs.gitlab.com/api/notes/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes object names documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Cypress configuration documentation: https://docs.cypress.io/app/references/configuration
- PostgreSQL CREATE DATABASE documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- PostgreSQL DROP DATABASE documentation: https://www.postgresql.org/docs/current/sql-dropdatabase.html
- PostgreSQL limits documentation: https://www.postgresql.org/docs/current/limits.html

## Issues Found
- The post stated that review apps are destroyed when a merge request is closed. GitLab's current review app documentation describes automatic stopping when the merge request is merged or the branch is deleted, and the post also uses `auto_stop_in`. Updated the wording and lifecycle diagram to say merge, source branch deletion, or auto-stop timer.
- The Kubernetes examples used `review-${CI_COMMIT_REF_SLUG}` directly for Kubernetes object and namespace names. `CI_COMMIT_REF_SLUG` can be 63 bytes by itself, and adding the `review-` prefix can exceed Kubernetes RFC 1123 label limits for names that require at most 63 characters. Updated generated `REVIEW_NAME` values to truncate the slug portion to 56 characters and trim a trailing hyphen.
- The PostgreSQL database example used the same prefixed slug as a database identifier. PostgreSQL identifiers are limited to 63 bytes by default. Updated the generated database name to use the same bounded `REVIEW_NAME`.
- The resource-limit and stale-cleanup examples selected namespaces with `type=review-app`, but the Kubernetes deployment example did not add that label. Added `kubectl label namespace ${REVIEW_NAME} type=review-app --overwrite`.
- The "Docker Compose Review Apps" section did not use Docker Compose; it used `docker run` directly. Renamed the section and related prose to "Docker Review Apps" / "Docker".
- The seeding example used `REVIEW_NAME` without defining it in the snippet. Added the same bounded `REVIEW_NAME` export before deployment.

## Review Notes
The examples remain infrastructure templates rather than complete drop-in pipelines. Real deployments still need registry authentication, Kubernetes credentials, DNS/wildcard routing, TLS issuer setup, database credentials, and appropriate GitLab token scopes.
