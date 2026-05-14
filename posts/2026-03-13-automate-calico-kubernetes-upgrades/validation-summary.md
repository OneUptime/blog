# Validation Summary: How to Automate Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Renovate
- GitHub Actions
- Flux CD
- Bash
- kubectl
- GitOps

## Sources Consulted
- Calico Open Source Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Open Source v3.27 Kubernetes system requirements archive: https://docs.tigera.io/calico/3.27/getting-started/kubernetes/requirements
- Calico Open Source v3.28 Kubernetes system requirements archive: https://docs.tigera.io/calico/3.28/getting-started/kubernetes/requirements
- Calico Open Source ImageSet documentation: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico Open Source installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Renovate configuration options: https://docs.renovatebot.com/configuration-options/
- Renovate custom datasource documentation: https://docs.renovatebot.com/modules/datasource/custom/
- Renovate regex custom manager documentation: https://docs.renovatebot.com/modules/manager/regex/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The Renovate example was not valid JSON because it included a JavaScript-style comment in a `json` code fence. I removed the comment.
- The Renovate example configured a custom datasource but did not configure a manager to extract the Calico dependency from ImageSet files. I replaced it with a regex custom manager using the official `github-releases` datasource for `projectcalico/calico`.
- The Renovate package rule used `matchDepTypes: ["calico"]`, but `calico` is not a Renovate dependency type for this case. I changed the rule to match the GitHub releases datasource and `projectcalico/calico` package name.
- The compatibility matrix listed Calico v3.27 as tested against Kubernetes v1.26, but the archived Calico v3.27 requirements list v1.27, v1.28, and v1.29. I removed v1.26.
- The post-upgrade validation checked only `status.calicoVersion`. Calico ImageSet documentation says the Installation `status.imageSet` field shows the ImageSet in use, so I added an ImageSet check for `calico-${TARGET_VERSION}`.
- The TigeraStatus validation checked only `Available=True`. Calico ImageSet documentation says full deployment for this purpose is `Available=True` with `Progressing=False` and `Degraded=False`, so I updated the script to check all three conditions.

## Review Notes
The CI workflow remains an illustrative pipeline. A production implementation would also need cluster credentials, installed `kubectl`, `jq`, and `flux` tooling in the runner, and appropriate permissions for the staging cluster.
