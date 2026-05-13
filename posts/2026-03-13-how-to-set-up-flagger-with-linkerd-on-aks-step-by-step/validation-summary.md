# Validation Summary: How to Set Up Flagger with Linkerd on AKS Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Kubernetes
- kubectl
- Helm
- Linkerd
- Linkerd Viz
- Linkerd SMI extension
- Flagger
- SMI TrafficSplit
- Prometheus

## Sources Consulted
- Microsoft Learn Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Linkerd installation guide: https://linkerd.io/2-edge/tasks/install/
- Linkerd Viz CLI reference: https://linkerd.io/2.19/reference/cli/viz/
- Linkerd SMI extension guide: https://linkerd.io/2.10/tasks/linkerd-smi/
- Linkerd progressive delivery guide: https://linkerd.io/2.19/tasks/flagger/
- Flagger install on Kubernetes: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger Linkerd canary deployments tutorial: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Helm chart metadata on Artifact Hub: https://artifacthub.io/packages/helm/flagger/flagger
- Flagger loadtester Helm chart metadata on Artifact Hub: https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- The post used Linkerd TrafficSplit resources but did not install the Linkerd SMI extension. Current Flagger/Linkerd documentation states that Linkerd 2.12 and later require the SMI extension for TrafficSplit support. Added the `curl -sL https://linkerd.github.io/linkerd-smi/install | sh`, `linkerd smi install | kubectl apply -f -`, and `linkerd smi check` commands.
- The Flagger Helm installation omitted the explicit Canary CRD installation. Current Flagger Helm documentation installs the CRD with `kubectl apply -f https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml` and sets `crd.create=false`. Added both commands/settings.
- The prerequisites did not state the version baseline documented by Flagger for Linkerd deployments. Added Kubernetes v1.21 or newer and Linkerd 2.14 or newer.

## Review Notes
Linkerd TrafficSplit support depends on the SMI extension and is deprecated in Linkerd's current documentation in favor of newer routing options such as Gateway API. The tutorial is still technically valid for a TrafficSplit-based Flagger setup after the added SMI installation step.
