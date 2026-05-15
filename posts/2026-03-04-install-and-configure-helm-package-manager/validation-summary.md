# Validation Summary: How to Install and Configure Helm Package Manager on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Helm
- Kubernetes
- ingress-nginx Helm chart
- YAML

## Sources Consulted
- Helm installation documentation: https://helm.sh/docs/intro/install/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm using Helm documentation: https://helm.sh/docs/intro/using_helm/
- ingress-nginx chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml

## Issues Found
- The Helm installation command used the Helm 3 installer script. The current official Helm installation documentation now shows the Helm 4 installer script, so the command was updated from `get-helm-3` to `get-helm-4`.
- Step 5 attempted to run `helm install` again with the same release name and namespace used in Step 4. Helm does not allow reusing an active release name, so the command was changed to `helm upgrade` to apply the values file to the existing release.

## Review Notes
- Helm was not installed in the local review environment, so local `helm --help` verification was not available. Commands and flags were verified against the official Helm documentation instead.
- The ingress-nginx values shown in the post use valid chart keys, including `controller.replicaCount`, `controller.resources`, and `controller.service.type`.
