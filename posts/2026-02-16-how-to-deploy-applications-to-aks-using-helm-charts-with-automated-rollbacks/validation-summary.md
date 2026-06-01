# Validation Summary: How to Deploy Applications to AKS Using Helm Charts with Automated Rollbacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Helm 3
- Kubernetes Deployments, Services, probes, rollout status, and events
- GitHub Actions
- Azure CLI
- Azure Container Registry (ACR)

## Sources Consulted
- Helm `helm create` documentation: https://helm.sh/docs/helm/helm_create/
- Helm `helm install` documentation: https://helm.sh/docs/helm/helm_install/
- Helm `helm upgrade` documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm `helm rollback` documentation: https://helm.sh/docs/helm/helm_rollback/
- Helm chart dependencies documentation: https://helm.sh/docs/topics/charts/
- Helm chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Azure CLI `az aks get-credentials` documentation: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Azure Login GitHub Action documentation: https://github.com/Azure/login
- Azure Setup Helm GitHub Action documentation: https://github.com/Azure/setup-helm

## Issues Found
- The Deployment template replaced Helm's generated container port with an unnamed `containerPort: 80`. Since the generated Service template commonly targets the named port `http`, this could break Service routing. Added `name: http` and `protocol: TCP` to the container port.
- The `helm upgrade` example said `--install` creates the release if it does not exist, but the command omitted `--install`. Added the flag to match the explanation and documented Helm behavior.
- The best-practice note said to pin chart dependencies in `Chart.lock`. Helm dependency versions are declared in `Chart.yaml`, while `Chart.lock` records the resolved dependency set. Updated the wording to recommend pinning versions in `Chart.yaml` and committing `Chart.lock`.

## Review Notes
- Helm and kubectl were not installed in the local workspace, so CLI behavior was verified against official documentation rather than local `--help` output.
- Helm 4 documentation is now current on helm.sh, but the post specifically recommends Helm 3. The reviewed flags and behavior used in the post are still valid for Helm 3 according to the Helm documentation.
