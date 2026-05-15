# Validation Summary: How to Generate Kubernetes YAML from Podman Pods on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Kubernetes YAML manifests
- Kubernetes Pods, Deployments, Services, volumes, resource limits, and liveness probes
- kubectl
- YAML validation with Python/PyYAML

## Sources Consulted
- Podman `podman-kube-generate` official documentation: https://docs.podman.io/en/stable/markdown/podman-kube-generate.1.html
- Podman `podman-kube-play` official documentation: https://docs.podman.io/en/stable/markdown/podman-kube-play.1.html
- Podman `podman-kube-down` official documentation: https://docs.podman.io/en/stable/markdown/podman-kube-down.1.html
- Red Hat Enterprise Linux 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The post said generated YAML for a named Podman volume would include a PersistentVolumeClaim. Podman documents that named volumes are emitted as `persistentVolumeClaim` volume references with the Podman volume name as `claimName`; it does not necessarily create a full Kubernetes `PersistentVolumeClaim` object in that generated pod manifest. Updated the wording to say the YAML references the named volume as a `persistentVolumeClaim` volume.
- The Deployment example used `web` as the generated Deployment and selector label name. Podman's documented examples generate Deployment names and app labels from the pod-style name, such as `<container>-pod-deployment` and `<container>-pod`. Updated the example to use `web-pod-deployment` and `web-pod`.
- The post described resource limits as "runtime-only." That was unnecessarily specific and could be misleading. Updated the wording to "resource requests and limits," which matches Kubernetes terminology.

## Review Notes
The local environment did not have `podman` or `kubectl` installed, so CLI behavior was verified against official Podman, Red Hat, and Kubernetes documentation rather than local command output.
