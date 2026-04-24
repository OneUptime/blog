# Validation Summary: How to Download Kubeconfig from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- kubeconfig
- curl
- jq
- cron

## Sources Consulted
- Portainer kubeconfig documentation: https://docs.portainer.io/sts/user/kubernetes/kubeconfig
- Portainer admin settings documentation: https://docs.portainer.io/sts/admin/settings/general
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API spec (`GET /kubernetes/config`): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Kubernetes kubeconfig documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes `kubectl config view` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes `kubectl config get-contexts` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- Kubernetes `kubectl config use-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- Kubernetes `kubectl config current-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_current-context

## Issues Found
- The original post described kubeconfig download as a Portainer BE-only workflow. I removed the BE-specific requirement and wording because current Portainer docs and API specs document kubeconfig generation without a BE-only restriction.
- The admin setup steps pointed to the per-environment `kubectl shell` setting. I corrected this to the global **Settings** -> **Kubernetes settings** -> **Kubeconfig** controls, which is where Portainer documents kubeconfig expiry and non-admin download settings.
- The UI download steps were inaccurate. I changed them to the documented flow from the Portainer home page using the dedicated **kubeconfig** button, and added the HTTPS requirement because Portainer hides this button over HTTP.
- The API example used the wrong endpoint. I updated it from `/api/endpoints/1/kubernetes/config` to the documented `/api/kubernetes/config?ids=1` endpoint and added `Accept: application/yaml` to make the intended response explicit.
- The shell examples mixed a local filename with `~/portainer-kubeconfig.yaml`. I standardized the path to `~/.kube/portainer-kubeconfig.yaml` across the UI, API, merge, verification, and refresh examples.
- The expiry section only mentioned token expiry. I updated it to note that Portainer restart can also invalidate kubeconfig tokens, which current Portainer settings docs explicitly call out.
- The prerequisites omitted `jq` even though the API examples use it. I added it as a prerequisite for the API workflow.

## Review Notes
- Portainer's current docs also recommend API access tokens via `X-API-Key` for API use, while separate official examples still document `/api/auth` JWT authentication. The post now uses a currently documented JWT flow, but an API key would also be valid and may be preferable for long-lived automation.
- `kubectl` was not installed in the local review environment, so command validation for the `kubectl config ...` examples was done against the official Kubernetes command reference rather than local `--help` output.
