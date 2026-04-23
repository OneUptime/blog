# Validation Summary: How to Use docker CLI with Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Docker CLI
- nerdctl
- Kubernetes
- kubectl
- Helm
- Bitnami Helm charts

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Container Engine settings: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop Using Testcontainers with Rancher Desktop: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Docker CLI `docker version`: https://docs.docker.com/reference/cli/docker/version/
- Docker CLI `docker run`: https://docs.docker.com/reference/cli/docker/container/run/
- Kubernetes tutorial for `kubectl create deployment`: https://kubernetes.io/docs/tutorials/kubernetes-basics/deploy-app/deploy-intro/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm documentation: https://helm.sh/docs/
- Bitnami Helm chart repository: https://charts.bitnami.com/

## Issues Found
- The post did not clearly state that Rancher Desktop must use the `moby (dockerd)` container engine for Docker CLI workflows. I added that requirement in the introduction, overview, setup, and troubleshooting sections because Rancher Desktop only exposes the Docker API when Moby is selected.
- The `rdctl` configuration examples were outdated or incorrect for current Rancher Desktop documentation. I replaced `rdctl set --kubernetes-version v1.28.0` and `rdctl set --container-engine containerd` with the documented Moby-focused configuration example `rdctl set --container-engine.name=moby`, and used `rdctl list-settings` for inspecting active settings.
- The container examples mixed `docker` and `nerdctl` commands in a way that implied they were interchangeable without regard to the selected runtime. I made Docker the primary example for this Docker CLI post and labeled `nerdctl` as the alternative when Rancher Desktop is using `containerd`.
- The Kubernetes example used `kubectl port-forward ... &`, which assumes POSIX-style backgrounding and is not portable across shells on all supported platforms. I changed the instructions to run `kubectl port-forward` in a separate terminal and test from another terminal.
- The Common Configuration Tasks section contained invalid or stale commands, including `rdctl factory-reset`, `rdctl status`, `rdctl list-settings | grep kubernetesVersion`, and version-pinned `rdctl set --kubernetes-version v1.29.0`. I replaced them with current, documented `rdctl` examples that reflect the current settings model.
- The Troubleshooting section had a broken log-path line and relied on invalid CLI examples. I replaced it with the documented `Troubleshooting > Show Logs` UI path plus valid `rdctl` commands.
- The prerequisites overstated hardware and privilege requirements as hard requirements. I corrected them to match the current Rancher Desktop installation docs, which describe 8 GB RAM and 4 CPU as recommended resources and note that elevated privileges may be required depending on platform and features.

## Review Notes
- Rancher Desktop documents `rdctl` as experimental and subject to change, so CLI examples may need periodic re-validation even when the overall workflow remains correct.
- Rancher Desktop supports both `containerd`/`nerdctl` and `moby`/`docker`, but only one container engine is active at a time.
