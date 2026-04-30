# Validation Summary: How to Debug Fleet Git Repository Sync Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Git
- GitOps
- Helm
- Kustomize

## Sources Consulted
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet GitRepo Resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet Create a GitRepo Resource: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet Troubleshooting: https://fleet.rancher.io/troubleshooting
- Fleet Installation Details: https://fleet.rancher.io/how-tos-for-operators/installation
- Fleet source `pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go`: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source `pkg/git/netutils.go`: https://raw.githubusercontent.com/rancher/fleet/main/pkg/git/netutils.go
- Fleet source `internal/cmd/controller/gitops/reconciler/gitjob.go`: https://raw.githubusercontent.com/rancher/fleet/main/internal/cmd/controller/gitops/reconciler/gitjob.go
- Fleet source `internal/cmd/controller/gitops/reconciler/gitjob_controller.go`: https://raw.githubusercontent.com/rancher/fleet/main/internal/cmd/controller/gitops/reconciler/gitjob_controller.go
- Fleet Helm chart `deployment_gitjob.yaml`: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet/templates/deployment_gitjob.yaml
- Kubernetes `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Kubernetes `kubectl describe`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- Kubernetes `kubectl top pod`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Git `git ls-remote`: https://git-scm.com/docs/git-ls-remote

## Issues Found
- The post piped `kubectl -o jsonpath` output into `python3 -m json.tool`, but Kubernetes JSONPath output is stringified rather than guaranteed JSON. I changed both commands to `-o jsonpath-as-json=...` so the piped output is valid JSON.
- The status conditions section listed a non-existent `Synced` condition and omitted official GitRepo conditions. I replaced the list with the documented `Ready`, `GitPolling`, `Reconciling`, `Stalled`, and `Accepted` conditions.
- The secret troubleshooting guidance and update command treated the auth secret as a generic key/value object. Fleet expects `clientSecretName` secrets of type `kubernetes.io/basic-auth` or `kubernetes.io/ssh-auth`, so I corrected the guidance and added `--type=kubernetes.io/basic-auth` to the update example.
- The HTTP and SSH auth tests validated GitHub API access or a generic SSH handshake instead of the Git transport Fleet actually uses. I replaced them with `git ls-remote` checks against the repository over HTTPS and SSH.
- The manual resync example used the `fleet.cattle.io/commit` annotation on the GitRepo. Fleet’s supported force-sync mechanism is `spec.forceSyncGeneration`, so I changed the example to a merge patch against that field.
- The network troubleshooting section used `Syncing` as the GitRepo state and assumed `curl` inside the gitjob pod. I updated the state to `GitUpdating` and switched the connectivity probe to `wget`, which matches Fleet’s busybox-based gitjob image.
- The fresh-clone section targeted the wrong resources: deleting `app=gitjob` deployment pods in `cattle-fleet-system` does not recreate a specific GitRepo sync job, and Jobs are not labeled with `fleet.cattle.io/repo-name`. I changed the commands to inspect and delete the generated GitJob in the GitRepo namespace.
- The branch/tag and resource-usage examples were tightened for correctness by using `.git` remote URLs, `git ls-remote --exit-code`, and a label-filtered `kubectl top pod`.

## Review Notes
- `kubeval` remains a third-party validator and is less authoritative than `kubectl apply --dry-run=server`; the post already includes the server-side validation command, which is the strongest validation step.
- Several examples use GitHub-hosted repositories, but the corrected workflows are equally applicable to other Git providers by substituting the remote URL.
