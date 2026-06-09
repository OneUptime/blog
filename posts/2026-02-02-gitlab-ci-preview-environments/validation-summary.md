# Validation Summary: How to Implement Preview Environments in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (pipeline configuration, predefined variables, environments, rules)
- Docker / Docker-in-Docker (dind)
- Kubernetes (Deployments, Services, Ingress, Namespaces, Jobs)
- Helm (chart templates, hooks, upgrade/install/uninstall)
- cert-manager (ClusterIssuer, Certificate)
- External Secrets Operator (ExternalSecret)
- AWS RDS CLI (snapshot restore)
- PostgreSQL (containerized + schema isolation)
- Prometheus / Loki / Grafana (monitoring)
- NGINX Ingress Controller
- GitLab REST API (notes endpoint)

## Sources Consulted
- GitLab CI/CD predefined variables: https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab CI environments and `auto_stop_in` / `on_stop` / `action: stop`: https://docs.gitlab.com/ee/ci/environments/
- GitLab CI `rules` syntax: https://docs.gitlab.com/ee/ci/yaml/#rules
- GitLab Notes API (merge request notes): https://docs.gitlab.com/ee/api/notes.html
- Kubernetes Ingress v1 API: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#ingress-v1-networking-k8s-io
- Kubernetes Deployment / Job API references
- Helm built-in objects and template functions: https://helm.sh/docs/chart_template_guide/builtin_objects/
- Helm chart hooks (`helm.sh/hook`, hook-weight, hook-delete-policy): https://helm.sh/docs/topics/charts_hooks/
- cert-manager ClusterIssuer / Certificate (v1): https://cert-manager.io/docs/configuration/acme/
- External Secrets Operator API (v1beta1 still supported): https://external-secrets.io/v0.9.x/api/externalsecret/
- AWS CLI `aws rds restore-db-instance-from-db-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- AWS CLI `aws rds wait db-instance-available`: https://docs.aws.amazon.com/cli/latest/reference/rds/wait/db-instance-available.html
- Docker Hub: `docker:24-dind`, `alpine/helm:3.12`, `curlimages/curl:8.1.2`, `bitnami/kubectl:1.27`, `amazon/aws-cli:2.13`, `postgres:15`

## Issues Found
1. **Missing markdown heading prefix on "Resource Limits and Cleanup"** — Line 618 in the original file had `Resource Limits and Cleanup` rendered as plain text instead of a `##` section heading, which broke the document's TOC structure. Fixed by adding the `## ` prefix.
2. **Missing markdown heading prefix on "Resource Usage Dashboard"** — Same issue: the line was rendered as a plain paragraph instead of a `###` subsection under "Monitoring Preview Environments". Fixed by adding the `### ` prefix.

No other technical issues found. GitLab CI variables, YAML syntax, Kubernetes API versions, Helm templates, cert-manager / External Secrets / AWS CLI commands, and Docker image tags all verified as correct.

## Review Notes
- `external-secrets.io/v1beta1` is still supported by External Secrets Operator, but `external-secrets.io/v1` (GA in 2024) is the recommended version going forward. Readers on newer ESO versions may wish to migrate.
- The cert-manager ACME HTTP-01 solver uses `class: nginx`, which is the legacy field still supported in cert-manager v1.x. Newer setups can use `ingressClassName` instead.
- The Docker Compose port calculation `PREVIEW_PORT: ${CI_MERGE_REQUEST_IID}080` concatenates the MR IID with `080` (e.g., MR #5 → 5080, MR #50 → 50080). This breaks for MR IIDs >= 656 because the resulting port would exceed the TCP max of 65535. The post is presented as a basic example, so this design limitation is acceptable but worth noting.
- The Docker Compose `deploy_preview` job references `$PREVIEW_HOST` in the environment URL but does not define it in that example — users must set it via GitLab CI variables for the URL to resolve.
- `alpine/helm:3.12` is still available on Docker Hub at the time of review; users wanting a maintained image with both `helm` and `kubectl` may prefer `alpine/k8s` or `dtzar/helm-kubectl`.
- The `psql -c "CREATE SCHEMA IF NOT EXISTS {{ .Release.Name | replace "-" "_" }};"` line in the shared-database template uses nested double quotes inside a YAML literal block. This renders correctly because the literal block treats the content as plain text, but readers may find the nested quoting visually confusing.
