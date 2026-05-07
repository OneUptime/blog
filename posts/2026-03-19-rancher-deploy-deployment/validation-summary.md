# Validation Summary: How to Deploy a Deployment Workload in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes Deployments
- kubectl
- Kubernetes Services
- YAML

## Sources Consulted
- Rancher Docs: Deploying Workloads: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Rancher Docs: Access a Cluster with Kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher Docs: Services: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services
- Kubernetes Docs: Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Docs: Images: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Docs: Service: https://kubernetes.io/docs/concepts/services-networking/service/index.html
- Kubernetes Docs: kubectl apply: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Docs: kubectl scale: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The Rancher UI action was labeled as `kubectl`, but Rancher documents this as the `Kubectl Shell` button. I updated the wording to match the official UI guidance.
- The service step implied that a Service must always be created manually. Rancher documents that adding a port to a workload automatically creates a corresponding Service Discovery entry, so I corrected the step to make manual Service creation conditional.

## Review Notes
- The post uses `nginx:latest`, which is technically valid, and Kubernetes defaults `imagePullPolicy` to `Always` for `:latest`. For production-oriented guidance, a pinned image tag or digest would be more reproducible.
- `kubectl` was not installed in the local workspace, so command verification was done against the official Kubernetes reference documentation rather than local `--help` output.
