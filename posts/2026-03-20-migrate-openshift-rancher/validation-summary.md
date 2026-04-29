# Validation Summary: How to Migrate from OpenShift to Rancher

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Rancher (Kubernetes management platform)
- OpenShift (referenced in title/conclusion)
- Kubernetes (Deployments, PVCs, Pods, Services)
- Docker Compose / Docker Swarm / AWS ECS (referenced in inventory examples)
- kompose (Docker Compose to Kubernetes converter)
- Longhorn (Rancher distributed storage)
- AWS CLI (S3, Route53)
- kubectl
- Python (PyYAML)
- Bash

## Sources Consulted
- kompose GitHub releases: https://github.com/kubernetes/kompose/releases (latest stable v1.38.0 confirmed)
- Kubernetes `kubectl wait` documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait
- Kubernetes Pod lifecycle / phases vs conditions: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Longhorn docs (default storageClassName): https://longhorn.io/docs/
- AWS Route53 CLI reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Kubernetes PVC API: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Deployment API (apps/v1): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#deployment-v1-apps

## Issues Found
1. **Incorrect `kubectl wait` condition** (Step 4): The original used `--for=condition=Succeeded`, but `Succeeded` is a Pod **phase** (`.status.phase`), not a Pod condition. Valid Pod conditions are `PodScheduled`, `Initialized`, `ContainersReady`, and `Ready`. Using `--for=condition=Succeeded` would never resolve and would block until timeout. Replaced with `--for=jsonpath='{.status.phase}'=Succeeded`, which is the supported syntax for waiting on a Pod phase (kubectl 1.23+).
2. **Outdated kompose release** (Step 3): Updated the install URL from `v1.31.0` (Sept 2023) to `v1.38.0` (Jan 2026), the current stable release at the time of review. The old URL still resolves on GitHub but pulls a significantly outdated binary.
3. **Improper proper-noun capitalization** (Conclusion): Capitalized `openshift` to `OpenShift` to match the product's official spelling.

## Review Notes
- **Significant title/content mismatch (not fixed — would require restructuring beyond the scope of a technical-correctness review):** The post is titled "How to Migrate from OpenShift to Rancher", but Steps 1–3 describe inventorying and converting Docker Swarm / Docker Compose / AWS ECS workloads — not OpenShift workloads. A genuine OpenShift→Rancher migration would inventory `oc get projects/dc/routes/imagestreams/...`, convert OpenShift `DeploymentConfig`/`Route`/`BuildConfig` resources to Kubernetes-native `Deployment`/`Ingress`, and handle SCC (SecurityContextConstraints) differences. The kompose tool is irrelevant to OpenShift migration. Future revisions should either re-theme the content to truly cover OpenShift→Rancher (using `oc` CLI, `oadm`, MTC — Migration Toolkit for Containers, etc.) or rename the post to reflect what it actually covers (e.g., "Migrating Docker Compose Workloads to Rancher").
- **Python script minor caveats** (Step 2, not fixed — example code, not a hard error): The unused `import subprocess`; the port-parsing `int(p.split(":")[1] if ":" in str(p) else p)` does not handle Compose port forms like `"8080:80/tcp"` or long-form port dicts; the `environment` handler assumes the dict form and silently breaks on Compose's list form (`["KEY=VALUE"]`). These are demonstration-quality issues, not incorrect API usage.
- **Bash heredocs / multi-space line continuations:** The post uses runs of multiple spaces in commands (e.g., `kubectl run test-client   --image=...   --rm -it ...`) instead of `\` line continuations. Shells tolerate this — the commands run correctly — but it's stylistically unusual. Left as-is.
- **`kubectl run --rm -it --restart=Never`** is correct for an interactive ephemeral test pod.
- **Longhorn `storageClassName: longhorn`** is correct (Longhorn ships a StorageClass named `longhorn` and typically marks it as default).
- **Route53 `UPSERT` action and `--change-batch` JSON shape** are correct.
