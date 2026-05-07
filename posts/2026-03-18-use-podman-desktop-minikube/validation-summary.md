# Validation Summary: How to Use Podman Desktop with Minikube

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Minikube
- Podman
- Podman Desktop
- Kubernetes
- kubectl

## Sources Consulted
- Minikube Podman driver docs: https://minikube.sigs.k8s.io/docs/drivers/podman/
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Minikube image command reference: https://minikube.sigs.k8s.io/docs/commands/image/
- Minikube profile command reference: https://minikube.sigs.k8s.io/docs/commands/profile/
- Minikube dashboard docs: https://minikube.sigs.k8s.io/docs/commands/dashboard/
- Minikube service/accessing docs: https://minikube.sigs.k8s.io/docs/commands/service/ and https://minikube.sigs.k8s.io/docs/handbook/accessing/
- Podman Desktop Minikube docs: https://podman-desktop.io/docs/minikube
- Podman Desktop Kubernetes context docs: https://podman-desktop.io/docs/kubernetes/viewing-and-selecting-current-kubernetes-context
- Kubernetes Hello Minikube tutorial: https://kubernetes.io/docs/tutorials/stateless-application/hello-minikube/
- `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Podman `save` reference: https://docs.podman.io/en/v4.4/markdown/podman-save.1.html
- Podman `info` reference: https://docs.podman.io/en/latest/markdown/podman-info.1.html

## Issues Found
- The metadata description incorrectly described Podman Desktop as the container runtime. I corrected it to identify Podman as the Minikube driver/container engine and Podman Desktop as the management UI, which matches the Minikube and Podman Desktop documentation.
- The post omitted `kubectl` from the prerequisites even though later sections depend on it. I added a `kubectl version --client` verification step so the prerequisites match the commands used in the post.
- The Linux Minikube install example used an older download URL. I updated it to the current official release download URL from the Minikube installation docs.
- The example `--kubernetes-version=v1.29.0` was outdated for a post validated on 2026-05-07. I replaced it with `--kubernetes-version=stable`, which is the current Minikube-documented way to explicitly select the latest stable supported Kubernetes release.
- The Podman Desktop section claimed the Minikube context would automatically become the active context. Podman Desktop docs support automatic discovery of the context, but context selection in the UI is an explicit action. I updated the instructions accordingly.
- The deployment example used a non-official sample image. I replaced it with the Kubernetes tutorial image `registry.k8s.io/echoserver:1.10`, which is documented in the official Hello Minikube guide.
- The local-image deployment example ran `/bin/sh -c "echo running"`, which exits immediately and would make a Deployment unstable. I removed the short-lived command and explicitly set `imagePullPolicy: IfNotPresent` so the example better reflects how locally loaded images are used in Minikube.
- The troubleshooting comment said `podman system info` checks the Podman socket. I corrected the wording to describe it as checking Podman connection and runtime details, which is what the Podman docs say the command reports.

## Review Notes
- Minikube documents the Podman driver as experimental. The post now mentions that caveat.
- Minikube recommends `--container-runtime=cri-o` with the Podman driver for non-rootless setups. The current `minikube start --driver=podman` examples remain valid, so I left them intact.
- Podman Desktop documents an extra Windows/WSL caveat: Minikube requires a rootful Podman machine there.
