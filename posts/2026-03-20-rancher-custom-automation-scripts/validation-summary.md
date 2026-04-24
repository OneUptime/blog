# Validation Summary: How to Create Custom Automation Scripts for Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager API
- Rancher automation workflows
- Bash
- Python
- `curl`
- `requests`
- `kubectl`
- Helm
- Kubernetes CronJobs

## Sources Consulted
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API keys reference: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API tokens reference: https://ranchermanager.docs.rancher.com/api/api-tokens
- Rancher kubeconfig workflow: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/api/workflows/kubeconfigs.html
- Rancher RK-API quick start: https://ranchermanager.docs.rancher.com/api/quickstart
- Requests authentication docs: https://requests.readthedocs.io/en/stable/user/authentication/
- Requests advanced usage docs: https://requests.readthedocs.io/en/stable/user/advanced/
- Kubernetes `kubectl create namespace` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Helm upgrade docs: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The v3 API authentication examples used `Authorization: Bearer ...` even though Rancher’s v3 API guide documents API-key authentication via HTTP basic auth. I updated both the Bash helper and the Python client to use API keys correctly.
- The Python client only fetched the first page of `/v3/clusters`, which would miss clusters after the default page size. I added pagination support so the health-check and deployment examples can actually operate across all clusters.
- The bulk namespace example called the `generateKubeconfig` action with `GET`, did not source the shared auth helper, and only passed the generated kubeconfig to the first `kubectl` command in the pipeline. I corrected the action call to `POST`, sourced the helper, and reused the same kubeconfig for both `kubectl` invocations.
- The app deployment example used the legacy `/v3/apps` flow and an outdated catalog-style payload. I replaced it with a current Helm-based deployment flow using `helm upgrade --install` against a per-cluster kubeconfig.
- The cluster labeling example only read the first page of clusters and overwrote the full `labels` map, which could remove unrelated labels. I changed it to follow pagination and merge the new labels with existing ones.
- The CronJob example said “Daily at 8 AM” without defining a timezone, which is ambiguous because Kubernetes otherwise uses the kube-controller-manager’s local timezone. I added `timeZone: "Etc/UTC"` and clarified the schedule comment.

## Review Notes
- The post is now technically correct, but it still relies on Rancher’s previous v3 API for several examples. Rancher introduced the RK-API in v2.8, and Rancher’s legacy v3 API tokens are being phased out starting in v2.14, so a future refresh could migrate the remaining examples to RK-API and the newer `ext.cattle.io` token and kubeconfig resources.
