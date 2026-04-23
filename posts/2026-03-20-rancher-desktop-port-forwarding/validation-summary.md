# Validation Summary: How to Configure Rancher Desktop Port Forwarding

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes
- `kubectl`
- Helm
- `nerdctl`
- Docker / Moby

## Sources Consulted
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` Command Reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Port Forwarding: https://docs.rancherdesktop.io/ui/port-forwarding/
- Rancher Desktop Working with Containers: https://docs.rancherdesktop.io/tutorials/working-with-containers/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting
- Rancher Desktop Using Testcontainers with Rancher Desktop: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Helm `helm repo add` reference: https://v3.helm.sh/docs/v3/helm/helm_repo_add/
- Bitnami Charts README: https://github.com/bitnami/charts

## Issues Found
- The prerequisites treated 8 GB RAM and 4 CPU as hard minimums and claimed 16 GB RAM was the recommendation. I updated this to match Rancher Desktop's current installation docs, which list 8 GB RAM and 4 CPU as recommendations and make some install requirements OS-specific.
- The `rdctl set` examples used older flag names. I updated them to the current dotted flag syntax used by the latest `rdctl` command reference: `--kubernetes.version` and `--container-engine.name`.
- The container example mixed `nerdctl` and `docker` commands in one workflow. I split it into separate `containerd`/`nerdctl` and `moby`/`docker` flows because Rancher Desktop uses one container engine at a time.
- The post used `rdctl status`, which is not a current command in the latest `rdctl` reference. I replaced it with `rdctl info`.
- The post labeled `rdctl factory-reset` as if it only reset Kubernetes, which was inaccurate. I corrected that description to a full Rancher Desktop factory reset.
- The `grep` examples for `rdctl list-settings` did not match the current JSON structure returned by Rancher Desktop. I replaced them with field-specific `jq` examples for the Kubernetes version and virtual machine settings.
- The troubleshooting log-path comment had a formatting error and used path guidance that is better represented by the documented UI workflow. I replaced it with the Rancher Desktop `Troubleshooting > Show Logs` instruction.

## Review Notes
- `rdctl` remains version-sensitive. Older Rancher Desktop 1.x documentation shows different command names and flag styles than the current reference, so CLI examples in this post should be rechecked if the post is revised later.
- The Helm example is syntactically valid. However, Bitnami's current chart repository README emphasizes OCI-based install commands as its primary quick-start path.
