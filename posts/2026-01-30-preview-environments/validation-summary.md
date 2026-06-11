# Validation Summary: How to Implement Preview Environments Details

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Kubernetes (Namespace, Deployment, Service, Ingress, ResourceQuota, NetworkPolicy, Job, CronJob, ServiceAccount, ClusterRole, ClusterRoleBinding)
- GitHub Actions (workflows, `actions/checkout@v4`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`, `docker/build-push-action@v5`, `actions/github-script@v7`)
- Docker / Docker Compose v2 (`docker compose` CLI, override files, healthchecks, resource limits)
- cert-manager (ClusterIssuer, Certificate, DNS-01 with Cloudflare)
- nginx (ingress and standalone reverse proxy with TLS)
- PostgreSQL 16 (database-per-preview, schema-per-preview, pg_dump/pg_restore snapshots, `format()` with `%I`)
- Python kubernetes client (`config.load_incluster_config`, `CoreV1Api`, `list_namespace`, `delete_namespace`, `V1DeleteOptions`)
- Prometheus Operator (ServiceMonitor CRD)
- GitHub CLI (`gh pr view`)
- Bash scripting (`set -euo pipefail`, heredocs)

## Sources Consulted
- Kubernetes API reference: https://kubernetes.io/docs/reference/kubernetes-api/ (Namespace v1, Deployment apps/v1, Ingress networking.k8s.io/v1, NetworkPolicy networking.k8s.io/v1, CronJob batch/v1, ResourceQuota v1)
- GitHub Actions marketplace and official action repos (checkout v4, setup-buildx-action v3, login-action v3, build-push-action v5, github-script v7)
- cert-manager docs: https://cert-manager.io/docs/configuration/acme/dns01/ and ClusterIssuer/Certificate API at cert-manager.io/v1
- Docker Compose CLI reference: https://docs.docker.com/compose/reference/ (`--env-file`, `-f`, `-p`, `up -d --build`, `down -v --remove-orphans`)
- Docker Compose Compose Spec `deploy.resources.limits` (cpus/memory)
- nginx ingress annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/ (auth-type, auth-secret, auth-realm, proxy-read-timeout)
- PostgreSQL docs: `CREATE DATABASE`, `CREATE SCHEMA`, `ALTER ROLE ... SET search_path`, `CREATE TABLE ... LIKE ... INCLUDING ALL`, `format()` and `%I` identifier quoting (https://www.postgresql.org/docs/16/)
- pg_dump / pg_restore options: `--format=custom`, `--no-owner`, `--if-exists`, `--clean`
- Kubernetes Python client: https://github.com/kubernetes-client/python (CoreV1Api, V1DeleteOptions, propagationPolicy)
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/
- GitHub REST API for issues comments (listComments, createComment, updateComment) used via `github.rest.issues.*`
- GitHub `pull/N/head` refspec convention for fetching PR heads

## Issues Found
1. **Bash script ref handling in `deploy_preview` (existing-clone branch)** — The original code did `git fetch origin` followed by `git checkout "pull/${PR_NUMBER}/head"`. The remote ref `pull/N/head` is not a local branch and `git checkout` against the bare refspec string would fail (it is not a local branch name and `origin/pull/N/head` is not fetched into `refs/remotes/origin/` by a default `git fetch origin`). The `else` (initial clone) branch already does the correct `git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"` then `git checkout "pr-${PR_NUMBER}"`. Fixed the existing-clone branch to use the same explicit refspec (with `--force` so re-runs that update the PR head succeed) and to checkout the local `pr-${PR_NUMBER}` branch, making both branches consistent and actually functional.

## Review Notes
- The `ServiceMonitor` example uses `namespaceSelector.matchNames: [preview-system]` while previews live in `preview-${PR_NUMBER}` namespaces; readers wiring this up would need either `any: true` or to list the per-preview namespaces (or scrape via the `preview-controller` itself in `preview-system`). The post is internally consistent if the controller exposes the aggregated metrics endpoint, so left as-is.
- The GitHub Actions `deploy-preview` job omits kubeconfig setup (no cloud-provider auth step before `kubectl apply`). This is fine for an architectural example but would not run as-is in a real workflow — readers will need to add their cluster auth step (e.g. `azure/setup-kubectl`, `aws-actions/configure-aws-credentials` + `aws eks update-kubeconfig`, or `google-github-actions/get-gke-credentials`).
- The `is_pr_closed` Python helper shells out to `gh pr view <number>` without `--repo`; this only works if the container has a checked-out repo or `GH_REPO` env var. Acceptable for example code.
- `datetime.fromisoformat(created_at.replace("Z", "+00:00"))` is the correct workaround for Python <3.11; in 3.11+ `fromisoformat` accepts `Z` directly but the workaround remains backward-compatible.
- The NetworkPolicy egress `except` list correctly blocks RFC1918 ranges; readers using non-RFC1918 internal CIDRs (e.g. 100.64.0.0/10 for CGNAT or VPC peerings) will need to extend the list.
- `ResourceQuota` field names (`requests.cpu`, `requests.memory`, `limits.cpu`, `limits.memory`, `persistentvolumeclaims`) are correct per the Kubernetes ResourceQuota spec.
- All referenced GitHub Action versions are current as of the post date.
- cert-manager `apiVersion: cert-manager.io/v1` is the current stable API (since cert-manager 1.0).
- CronJob `apiVersion: batch/v1` is GA since Kubernetes 1.21 — correct.
