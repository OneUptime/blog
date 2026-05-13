# Validation Summary: How to Decommission a Cluster from Flux Multi-Cluster Setup

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Kubernetes
- kubectl
- SOPS
- age
- Argo CD
- AWS CLI / Amazon EBS
- Terraform
- eksctl
- Google Kubernetes Engine

## Sources Consulted
- Flux uninstall documentation: https://fluxcd.io/flux/installation/uninstall/
- Flux CLI reference for `flux get all`: https://fluxcd.io/flux/cmd/flux_get_all/
- Flux CLI reference for `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI reference for `flux suspend helmrelease`: https://fluxcd.io/flux/cmd/flux_suspend_helmrelease/
- Flux Kustomization documentation for `.spec.suspend`: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation for `.spec.suspend`: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Argo CD cluster management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- SOPS documentation for `.sops.yaml` `creation_rules`, `age`, and encryption selectors: https://getsops.io/docs/
- AWS CLI `ec2 create-snapshot` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- eksctl creating and managing clusters documentation: https://docs.aws.amazon.com/eks/latest/eksctl/creating-and-managing-clusters.html

## Issues Found
- The workflow drained workloads before suspending Flux. Because Flux Kustomizations can detect and correct drift, this could cause scaled-down workloads to be restored during decommissioning. Reordered the workflow so Flux reconciliation is suspended before workload drain commands run.
- The Flux suspend examples claimed to suspend all Kustomizations and HelmReleases, but `flux suspend ... --all` only applies within the selected namespace, and the shown `flux suspend helmrelease --all -A` form is not documented as valid. Replaced these examples with `kubectl patch` commands that set `spec.suspend: true` across all namespaces for the Flux Kustomization and HelmRelease CRDs.
- The complete script repeated the same invalid or incomplete Flux suspension commands. Updated it to use the same cross-namespace `kubectl patch` approach.
- The workload scaling example used a `managed-by!=flux` label selector that does not reliably identify Flux-managed workloads and could miss or include the wrong resources. After moving the drain after Flux suspension, replaced it with a namespace filter that avoids Kubernetes and Flux system namespaces.
- The Argo CD cleanup command assumed the Kubernetes Secret metadata name matched `${CLUSTER_NAME}`. Argo CD stores cluster credentials in labeled Secrets, but the documented CLI removal flow is `argocd cluster rm`. Replaced the command with `argocd cluster rm ${CLUSTER_NAME} -y`.
- The complete script attempted to clean `.sops.yaml` with `sed -i.bak "/${CLUSTER_NAME}/d" .sops.yaml`, which could leave a malformed or incorrect `creation_rules` entry by deleting only the matching line. Replaced it with an explicit prompt to remove the entire creation rule for the cluster before staging the file.

## Review Notes
The post is technically valid after the corrections. Some operational choices, such as workload migration order, backup consistency requirements, and cloud infrastructure teardown details, remain environment-specific and should be adapted to each fleet's runbooks.
