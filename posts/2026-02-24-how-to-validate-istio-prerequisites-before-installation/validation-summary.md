# Validation Summary: How to Validate Istio Prerequisites Before Installation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- istioctl
- Helm
- Kubernetes admission webhooks
- Kubernetes service account tokens
- Kubernetes CNI plugins
- GKE
- EKS
- AKS

## Sources Consulted
- Istio supported releases and Kubernetes version matrix: https://istio.io/latest/docs/releases/supported-releases/
- Istio application requirements and reserved ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes admission controller documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/

## Issues Found
- The Kubernetes version example said Istio 1.24 supports Kubernetes 1.27 through 1.31. Official Istio docs list Istio 1.24 support as Kubernetes 1.28 through 1.31, and Istio 1.24 is now out of support. Updated the section to use the current Istio 1.30 support range and note the correct Istio 1.24 range.
- The post used `kubectl version --short`, which is not present in the current generated kubectl reference. Replaced it with `kubectl version`.
- The pod-capacity section said each sidecar adds a pod. Sidecar injection adds a container to an existing workload pod, not a separate pod. Updated the explanation so pod capacity is discussed for Istio control plane and gateway pods, while sidecars are discussed as added resource usage.
- The port table omitted current Istio sidecar ports and described some protocols imprecisely. Updated it to match the official Istio application requirements and control plane port documentation.
- The port-conflict command checked Kubernetes Services for ports 15012 and 15017, which does not accurately validate sidecar-reserved application container ports. Replaced it with a pod-spec check for explicitly declared reserved sidecar container ports.
- The admission webhook check implied that `kubectl api-versions` proves the API server admission plugins are enabled. Tightened the wording to say it checks API availability and to separately confirm webhook admission plugins on self-managed clusters.
- The TokenRequest validation used `kubectl get --raw` with curl-style `-X`, `-H`, and `-d` flags. Replaced it with the supported `kubectl create token` command using audience and duration flags.
- The Helm dry-run section implied a plain `--dry-run` checks cluster-side issues. Current Helm documentation distinguishes client and server dry runs, so the examples now use `--dry-run=server`.
- The storage-class section implied Istio has persistent core features such as Envoy access logs stored to disk. Clarified that Istio core does not require a storage class and that storage checks apply to add-ons or custom components requiring PersistentVolumes.
- The RBAC and automated validation examples used less precise resource names for cluster-scoped resources. Updated them to use fully qualified Kubernetes resource names where helpful.
- The automated validation script used `kubectl version --short`. Updated it to `kubectl version`.

## Review Notes
Some environment-specific checks, especially for CNI behavior and cloud provider IAM or identity configuration, are valid as practical prompts but should still be checked against the provider documentation for the exact managed Kubernetes version and cluster mode in use.
