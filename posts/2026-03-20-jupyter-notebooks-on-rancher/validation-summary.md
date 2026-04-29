# Validation Summary: How to Set Up Jupyter Notebooks on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- JupyterHub
- Jupyter Docker Stacks
- Helm
- Kubernetes Ingress
- Kubernetes ResourceQuota
- GitHub OAuth via OAuthenticator
- NVIDIA GPU scheduling on Kubernetes

## Sources Consulted
- JupyterHub Helm chart repository: https://hub.jupyter.org/helm-chart/
- Zero to JupyterHub configuration reference: https://z2jh.jupyter.org/en/4.3.0/resources/reference.html
- Zero to JupyterHub authentication docs: https://z2jh.jupyter.org/en/stable/administrator/authentication.html
- OAuthenticator GitHub provider setup: https://oauthenticator.readthedocs.io/en/latest/tutorials/provider-specific-setup/providers/github.html
- OAuthenticator GitHub API reference: https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.github.html
- Jupyter Docker Stacks image selection docs: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html
- Jupyter Docker Stacks recipes: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/recipes.html
- Jupyter Docker Stacks common features: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/common.html
- Jupyter Docker Stacks changelog: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/changelog.html
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- TensorFlow install docs: https://www.tensorflow.org/install/gpu
- PyTorch install docs: https://docs.pytorch.org/get-started/locally/

## Issues Found
- The post set `proxy.secretToken` inside a single-quoted heredoc using `$(openssl rand -hex 32)`, which would write the literal string instead of a generated token. I removed that block because current JupyterHub Helm chart versions auto-generate `proxy.secretToken`.
- The GitHub auth example used a non-current `authenticator_class` form and omitted the `read:org` scope required for reliable organization-based access checks. I changed it to `authenticator_class: "github"` and added `scope: - read:org`.
- The post used `singleuser.storage.storageClassName`, which is not the current Helm values path. I corrected it to `singleuser.storage.dynamic.storageClass`.
- The post used Jupyter Docker Stacks images without `singleuser.cmd: null`. I added that so the chart uses the Docker Stacks startup command as documented.
- The profile images pointed to Docker Hub-style names and an outdated TensorFlow CUDA tag. I updated them to `quay.io/jupyter/datascience-notebook:latest` and `quay.io/jupyter/tensorflow-notebook:cuda-latest`, which matches current Docker Stacks guidance.
- The custom Dockerfile pinned older `tensorflow` and `torch` versions that were stale relative to the current Docker Stacks base images and current framework install guidance. I removed those pins, kept the example focused on generic package preinstallation, and added the recommended `fix-permissions` calls.
- The GPU quota example used `nvidia.com/gpu` directly in `ResourceQuota.hard`, but Kubernetes requires extended resource quotas to use the `requests.` prefix. I corrected it to `requests.nvidia.com/gpu`.
- The GPU profile implied GPU scheduling would work without prerequisites. I added an inline note that it requires GPU worker nodes and the NVIDIA device plugin.

## Review Notes
- The post is technically relevant and salvageable; it required targeted fixes rather than removal.
- The ingress example is valid as written and correctly targets the chart-created `proxy-public` service.
- Docker Stacks still publish a `latest` tag, but their docs recommend date-based or commit-based tags for reproducibility. The post remains valid, but pinned tags would be safer in a future revision.
- `helm` and `kubectl` were not installed in the local review environment, so command validation relied on official documentation rather than local `--help` output.
