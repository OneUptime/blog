# Validation Summary: How to Deploy OpenFaaS on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher-managed Kubernetes
- OpenFaaS Community Edition
- Helm
- arkade
- faas-cli
- Docker
- Python (`python3-http` template)

## Sources Consulted
- OpenFaaS CLI installation docs: https://docs.openfaas.com/cli/install/
- OpenFaaS Community Edition Kubernetes deployment docs: https://docs.openfaas.com/deployment/kubernetes/
- OpenFaaS autoscaling docs: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS YAML reference: https://docs.openfaas.com/reference/yaml/
- OpenFaaS Helm chart README: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/README.md
- OpenFaaS Helm chart values: https://github.com/openfaas/faas-netes/blob/master/chart/openfaas/values.yaml
- OpenFaaS Python HTTP template README: https://github.com/openfaas/python-flask-template/blob/master/README.md

## Issues Found
- The post used `arkade install faas-cli`, but current OpenFaaS documentation uses `arkade get faas-cli`. This was updated to the current command.
- The Helm install example mixed a Community Edition install with `--set autoscaler.enabled=true`, which only applies when `openfaasPro=true` and is not part of the documented CE flow. That flag was removed.
- The gateway access step used `kubectl port-forward` in the foreground, which blocks the shell and prevents the subsequent login command from running in the same session. The command was updated to run in the background.
- The login example used the older inline password form. It was updated to `--password-stdin`, and the gateway URLs were standardized on `http://127.0.0.1:8080` so the stored CLI credentials match the later `faas-cli` commands.
- The custom function example assumed `faas-cli new` creates `my-function.yml`, but the current CLI writes `stack.yaml` by default. The build, push, deploy, and autoscaling examples were updated accordingly.
- The custom function flow did not include an image prefix for the generated function image, so `faas-cli push` would not work in a normal Docker Hub workflow. A `--prefix your-dockerhub-username` example and `docker login` step were added.
- The autoscaling section used a `Function` CRD manifest with `annotations` and Pro-only scaling settings such as `com.openfaas.scale.type` and `com.openfaas.scale.target`. The post deploys Community Edition, where the current documented approach is request-rate-based legacy scaling with per-function `labels` such as `com.openfaas.scale.min`, `com.openfaas.scale.max`, and `com.openfaas.scale.factor`. The snippet was replaced with a CE-compatible `stack.yaml` example.
- The conclusion claimed queue-depth-based autoscaling, which is an OpenFaaS Pro capability rather than the CE flow described in the post. The conclusion was corrected to describe CE's Prometheus request-rate-based scaling behavior.

## Review Notes
- The tutorial is technically valid after correction, but it assumes `kubectl` is already configured to talk to a Rancher-managed Kubernetes cluster.
- The content remains largely Kubernetes-generic; it does not describe Rancher UI-specific installation steps.
