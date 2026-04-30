# Validation Summary: How to Set Up Fleet with Canary Releases

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- Helm
- kubectl

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet rollout strategy: https://fleet.rancher.io/0.14/rollout
- Fleet create GitRepo resource: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet troubleshooting: https://fleet.rancher.io/troubleshooting
- Rancher continuous delivery / Fleet in Rancher: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/enable-experimental-features/continuous-delivery
- Kubernetes `kubectl create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The description and introduction incorrectly framed Fleet canary releases as gradual traffic shifting. I changed this to cluster-based rollout partitions, which is how Fleet actually implements canary-style rollouts.
- The original post did not configure a canary rollout at all. I updated the `fleet.yaml` example to use `rolloutStrategy.partitions` with staged `staging`, `canary`, and `production` partitions, matching Fleet’s documented rollout model.
- The repository structure example mixed Helm, raw manifests, and Kustomize overlays in a way that did not match the provided `fleet.yaml`. I corrected it to a consistent Helm-based layout with `chart/` and `values.yaml`.
- The `helm.version` example was removed from the local-chart example because the post was using a local chart path, not selecting a chart version from a Helm repository or OCI registry.
- The monitoring section hard-coded `kubectl describe bundle my-app-gitops`, but Fleet generates Bundle names from the GitRepo name and path unless overridden. I replaced it with a placeholder and added the naming note.
- The private Git authentication commands omitted the documented Secret types. I added `--type=kubernetes.io/basic-auth` and `--type=kubernetes.io/ssh-auth`, and updated the SSH example to use `ssh-keyscan -H`.
- The force re-sync example used an annotation that is not documented for GitRepos. I replaced it with a documented merge patch that increments `spec.forceSyncGeneration`.
- The troubleshooting custom-columns example labeled `.metadata.namespace` as `CLUSTER`, even though that field is the BundleDeployment namespace. I renamed the column to `TARGET_NS`.
- The Step 1 pod expectations overstated `fleet-agent` as a management-cluster requirement. I clarified that `fleet-controller` and `gitjob` are the key management-cluster components, and that `fleet-agent` appears when the local cluster is also registered as a downstream target.

## Review Notes
- Fleet’s canary behavior is a phased rollout across clusters, not request-level traffic splitting. Service-mesh or ingress-based traffic shifting would require additional tooling outside Fleet.
- `kubectl` was not installed in this review environment, so commands were validated against official Fleet and Kubernetes documentation rather than executed locally.
