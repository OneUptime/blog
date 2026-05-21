# Validation Summary: How to Set Up Istio with Octopus Deploy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService and DestinationRule
- Octopus Deploy Kubernetes deployment targets and deployment steps
- Kubernetes Deployments, Services, RBAC, service account tokens, and kubectl
- Prometheus queries for Istio standard metrics

## Sources Consulted
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes kubectl patch task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Octopus Deploy Kubernetes targets documentation: https://octopus.com/docs/kubernetes/targets
- Octopus Deploy Kubernetes YAML step documentation: https://octopus.com/docs/kubernetes/steps/yaml
- Octopus Deploy variable substitution documentation: https://octopus.com/docs/projects/variables/variable-substitutions
- Octopus Deploy Run a kubectl script integration page: https://octopus.com/integrations/kubernetes/run-a-kubectl-script

## Issues Found
- The Istio VirtualService and DestinationRule routed to `#{AppName}`, but the article did not show the Kubernetes Service required for that host. Added a minimal `service.yaml` manifest that selects both stable and canary pods by `app: #{AppName}` and exposes port 80 to container port 8080.
- The Prometheus query filtered `istio_requests_total` with `namespace`, which is not the Istio destination workload namespace label documented for standard metrics. Changed the query to use `destination_workload_namespace`.

## Review Notes
- The `kubectl create token --duration=8760h` command is syntactically valid, but Kubernetes documents `--duration` as a requested lifetime; the API server may issue a token with a shorter or longer lifetime depending on cluster configuration.
- The examples assume an existing `#{AppName}-stable` Deployment and an Istio-enabled namespace or injected pods.
