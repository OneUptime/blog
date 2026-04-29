# Validation Summary: How to Set Up Jupyter Notebooks on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes
- JupyterHub
- Zero to JupyterHub Helm chart
- OAuthenticator / GenericOAuthenticator
- Helm
- Kubernetes Ingress
- Kubernetes PersistentVolumeClaims
- Kubernetes ResourceQuota
- Jupyter Docker Stacks

## Sources Consulted
- Zero to JupyterHub 4.3.2 changelog: https://z2jh.jupyter.org/en/4.3.2/changelog.html
- Zero to JupyterHub authentication docs: https://z2jh.jupyter.org/en/stable/administrator/authentication.html
- Zero to JupyterHub user environment docs: https://z2jh.jupyter.org/en/stable/jupyterhub/customizing/user-environment.html
- Zero to JupyterHub user storage docs: https://z2jh.jupyter.org/en/3.0.0/jupyterhub/customizing/user-storage.html
- Zero to JupyterHub advanced topics / ingress docs: https://z2jh.jupyter.org/en/stable/administrator/advanced.html
- OAuthenticator general setup: https://oauthenticator.readthedocs.io/en/latest/tutorials/general-setup.html
- OAuthenticator access control guide: https://oauthenticator.readthedocs.io/en/latest/topic/allowing.html
- GenericOAuthenticator API reference: https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.generic.html
- Jupyter Docker Stacks image selection docs: https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html
- Jupyter Docker Stacks published tags (Quay): https://quay.io/repository/jupyter/datascience-notebook?tab=tags
- JupyterHub monitoring docs: https://jupyterhub.readthedocs.io/en/stable/reference/monitoring.html
- JupyterHub configuration reference: https://jupyterhub.readthedocs.io/en/stable/reference/config-reference.html
- JupyterHub common log messages: https://jupyterhub.readthedocs.io/en/latest/howto/log-messages.html
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes GPU scheduling docs: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The original OAuth example configured `OAuthenticator` settings but did not set `JupyterHub.authenticator_class`, so the Hub would not actually switch to an OAuth authenticator. I added `generic-oauth` and split the settings between `OAuthenticator` and `GenericOAuthenticator`.
- The original OAuth example had no explicit allow rule. OAuthenticator 16 blocks users by default unless an allow policy is configured, so the example would only permit explicitly allowed/admin users. I added `allow_all: true` so the guide matches its team-oriented deployment goal.
- The original PostgreSQL DSN used `postgresql://...`. I updated it to the documented `postgresql+psycopg2://...` form used for the external PostgreSQL backend.
- The original guide mixed JupyterHub’s built-in Let’s Encrypt `proxy.https` flow with a separate Kubernetes Ingress. Zero to JupyterHub documents that the default automatic HTTPS flow does not work when using an Ingress. I removed the chart-managed HTTPS block and kept the Ingress-based exposure path, with an explicit TLS-secret prerequisite.
- The original single-user image example used an outdated Docker Stacks image reference and omitted `singleuser.cmd: null`, which is required when relying on the Docker Stacks image CMD for startup customization. I updated the image to `quay.io/jupyter/datascience-notebook:2026-03-23` and added `cmd: null`.
- The notebook image also needed to stay on the same JupyterHub major version as the Hub. I updated the Helm chart pin from `3.2.1` to `4.3.2` and selected a Docker Stacks tag published with JupyterHub `5.4.3` to keep the hub/single-user versions aligned.
- The original GPU profile used a cluster-specific `node_selector` label that is not a Kubernetes-standard requirement for GPU scheduling. I removed it and kept the GPU resource request plus toleration.
- The original install verification used `kubectl wait pods --all --for=condition=Ready`, which is unreliable for this Helm chart because hook pods and jobs are not normal long-running ready pods. I replaced it with `kubectl rollout status` checks for the main deployments.
- The original “Resource Quotas per Team” wording was inaccurate because `ResourceQuota` is namespace-scoped. I corrected the heading and added a scope note.
- The original monitoring example used `jupyterhub --debug list-users`, but `list-users` is not a valid JupyterHub CLI subcommand. I replaced it with working Kubernetes inspection and logging commands.

## Review Notes
- `kubectl top pods` requires Metrics Server to be installed in the cluster.
- The Ingress example now assumes an ingress controller is already installed and that the `jupyter-tls` secret is created separately or managed by cert-manager.
- The post remains Rancher-relevant, but it is primarily a Kubernetes/JupyterHub deployment guide rather than a Rancher UI walkthrough.
