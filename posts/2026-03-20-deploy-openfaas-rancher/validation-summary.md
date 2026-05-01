# Validation Summary: How to Deploy OpenFaaS on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- OpenFaaS
- Helm
- Kubernetes
- `faas-cli`
- Python
- NGINX Ingress

## Sources Consulted
- OpenFaaS Kubernetes deployment guide: https://docs.openfaas.com/deployment/kubernetes/
- OpenFaaS Helm chart README: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/README.md
- OpenFaaS YAML reference: https://docs.openfaas.com/reference/yaml/
- OpenFaaS CLI install docs: https://docs.openfaas.com/cli/install/
- OpenFaaS CLI template docs: https://docs.openfaas.com/cli/templates/
- OpenFaaS CLI logs docs: https://docs.openfaas.com/cli/logs/
- OpenFaaS Python template docs: https://docs.openfaas.com/languages/python/
- OpenFaaS Python HTTP template repository: https://github.com/openfaas/python-flask-template
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Current `faas-cli` help output verified from the official installer: https://cli.openfaas.com

## Issues Found
- The Helm install command enabled `autoscaler.enabled=true`, but that setting is tied to the Pro autoscaler rather than a generic Community Edition-style install. I removed it so the tutorial matches the documented Helm workflow.
- The login example used `faas-cli login --password`, which still works, but the current official guidance favors `--password-stdin`. I updated the command to the current supported pattern.
- The function creation example used `--lang python3`, which is not available in the current template store. I changed it to `python3-http`, which is the current official Python 3 template.
- The Python handler example used the classic `def handle(req)` signature, which does not match the current `python3-http` template. I updated it to `def handle(event, context)` and used `event.body` to preserve the input-echo behavior.
- The tutorial set `OPENFAAS_PREFIX` only before `build`/`push`/`deploy`, but that variable affects `faas-cli new`, not an already-generated stack file. I moved it before `faas-cli new` so the generated image reference is correct.
- The generated stack file name and build/deploy commands were inconsistent with the current CLI behavior. I updated the walkthrough to use `stack.yaml`, which is what the current template flow produces.
- The stack YAML used `lang: python3`, which no longer matches the current Python template name. I updated it to `lang: python3-http`.
- The memory settings used `128m` and `64m`, which are incorrect for Kubernetes memory quantities. I changed them to `128Mi` and `64Mi` per Kubernetes and OpenFaaS documentation.
- The function labels included `com.openfaas.scale.zero: "true"` even though the post did not install the Pro autoscaler flow needed for that scale-to-zero setup. I removed the label.
- The Ingress example omitted `ingressClassName`, which can prevent routing on clusters without a default ingress class. I added `ingressClassName: nginx` to match current Kubernetes guidance.
- The monitoring section used `faas-cli logs hello-python --follow`, but the current CLI uses `--tail` and tails by default. I corrected the example to `faas-cli logs hello-python`.
- The conclusion claimed scale-to-zero as a general outcome of this install path. I changed that to a more accurate autoscaling statement.

## Review Notes
- The tutorial now aligns with a current Helm-based OpenFaaS-on-Kubernetes workflow and current `faas-cli` behavior.
- Scale-to-zero on Kubernetes should not be assumed for a generic Community Edition-style install; OpenFaaS documentation separates that behavior from the basic Helm deployment flow.
