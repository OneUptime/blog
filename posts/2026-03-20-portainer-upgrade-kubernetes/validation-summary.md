# Validation Summary: How to Upgrade Portainer CE on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Portainer CE install on Kubernetes: https://docs.portainer.io/sts/start/install-ce/server/kubernetes/baremetal
- Portainer update on Kubernetes: https://docs.portainer.io/sts/start/upgrade/kubernetes
- Portainer backup settings: https://docs.portainer.io/admin/settings/general
- Portainer rollback FAQ: https://docs.portainer.io/faqs/troubleshooting/how-can-i-roll-back-to-a-previous-version-of-portainer
- Helm `upgrade`: https://helm.sh/docs/v3/helm/helm_upgrade/
- Helm `rollback`: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm `search repo`: https://helm.sh/docs/helm/helm_search_repo/
- Helm `repo add`: https://v3.helm.sh/docs/v3/helm/helm_repo_add/
- Kubernetes `kubectl set image`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes `kubectl rollout`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used outdated Portainer examples, including the `ce2-20` manifest URL and the `portainer/portainer-ce:2.20.2` image tag. I replaced them with the current supported LTS stream URLs and tags, or placeholders where the user must intentionally pin a specific version.
- The Helm section implied that `--version 1.0.48` was the relevant Portainer upgrade target. I changed the example to distinguish chart version selection from the Portainer image tag and updated the repository setup to use the current Portainer Helm repository command.
- The image-only upgrade section was too broad for official manifest-based installs. I narrowed it to deployments managed directly with `kubectl`, which is the condition under which `kubectl set image` is an appropriate example.
- The manifest update example downloaded an outdated YAML path and did not account for the NodePort versus LoadBalancer manifest split. I updated the example to the current `ce-lts` manifest path and noted the matching LoadBalancer file.
- The backup example was not technically sound: it waited for a Pod `Complete` condition that applies to Jobs, and it attempted `kubectl cp` from a completed pod. I replaced that section with Portainer's official built-in backup workflow from the UI.
- The rollback section suggested that workload rollback alone was sufficient. I updated the Helm command to use a real revision placeholder and added the required note that an older Portainer version may also need the pre-upgrade backup restored because of database schema changes.
- The agent section treated the Portainer Agent as a DaemonSet and used the `latest` tag. I corrected it to a separately deployed Kubernetes `Deployment` and updated the examples so the agent matches the server stream or version, in line with Portainer's Kubernetes manifests and upgrade guidance.

## Review Notes
- Portainer maintains separate STS and LTS release streams. Because the post frames the process as a production-oriented upgrade guide, the corrected examples now follow the LTS stream. If the post is later expanded to cover STS explicitly, the commands should use the matching `sts` tags and `ce-sts` manifest URLs instead.
