# Validation Summary: How to Replicate Workloads Across Rancher Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Fleet
- Kubernetes
- Kustomize
- GitHub Actions
- GitOps
- Multi-cluster workload deployment

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet namespaces and workspace behavior: https://fleet.rancher.io/0.14/namespaces
- Fleet GitRepo usage docs: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Kubernetes Kustomize docs: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes field selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- GitHub Actions workflow_dispatch syntax: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- GitHub-hosted runner software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2204-Readme.md
- `actions/checkout` reference: https://github.com/actions/checkout

## Issues Found
- `base/kustomization.yaml` listed only `deployment.yaml` and `service.yaml`, even though the repository structure included `hpa.yaml`. I added `hpa.yaml` so the example Kustomization matches the stated layout and would include the HPA in rendered output.
- The `clusters/us-east-1/fleet.yaml` example used a top-level `targets` field, which is not part of Fleet’s `fleet.yaml` schema. I removed that block because targeting belongs on the `GitRepo` resource in this post’s setup.
- The GitHub Actions example updated the image using `myapp=...`, but the manifest image is `ghcr.io/my-org/myapp`. I changed the command to update the full image name so the Kustomize image transformation matches the workload definition.
- The active-passive section incorrectly used `GitRepo.spec.paused` as a standby mechanism. Fleet documents `paused` as stopping updates and marking resources `OutOfSync`, not as a way to keep a passive workload pre-deployed for promotion. I rewrote the section so both clusters stay deployed and synced, with failover happening at the DNS/load-balancer layer.
- The active-passive `GitRepo` examples omitted `paths`, which would cause Fleet to default to the repository root instead of the intended regional overlay directories. I added explicit regional `paths`.
- The verification section used invalid Fleet fields. `BundleDeployment` does not expose `spec.clusterName`, and the display state is under `status.display.state`, not `status.state`. The follow-up `--field-selector spec.clusterName=...` pattern was also not valid for this CRD. I replaced the section with documented `GitRepo` status fields plus a direct per-cluster `Deployment` image check.
- The conclusion repeated the incorrect claim that Fleet pause can be used to pre-deploy standby workloads for failover. I updated it to reflect the corrected active-passive model.

## Review Notes
- Fleet also has an experimental `imageScans` feature that can automate image-tag updates directly from `fleet.yaml`, but the corrected GitHub Actions workflow remains technically valid for the post’s CI-driven approach.
