# Validation Summary: How to Run Bookinfo Application with VM Workloads in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio service mesh
- Istio virtual machine workloads
- Istio WorkloadGroup and WorkloadEntry
- Kubernetes Services, Deployments, Namespaces, and ServiceAccounts
- Istio Bookinfo sample application
- Docker

## Sources Consulted
- Istio Virtual Machine Installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio Bookinfo with a Virtual Machine: https://istio.io/latest/docs/examples/virtual-machines/
- Istio Bookinfo Application: https://istio.io/latest/docs/examples/bookinfo/
- Istio Bookinfo Kubernetes manifests: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/bookinfo/platform/kube/bookinfo.yaml

## Issues Found
- The Istio install command enabled VM auto-registration but did not configure the mesh ID, cluster name, or cluster network required by the multi-network VM flow shown in the post. Updated the command to include `values.global.meshID`, `values.global.multiCluster.clusterName`, and `values.global.network`.
- The Kubernetes examples used older Bookinfo image paths and tags from `docker.io/istio/...:1.18.0`. Updated them to the current official sample images from `registry.istio.io/release/...:1.20.3`.
- The WorkloadGroup snippets used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API used in Istio documentation.
- The tutorial defined WorkloadGroups but did not apply them before generating VM configuration from the Kubernetes API server. Added a `kubectl apply -f workloadgroups.yaml` command.
- The east-west gateway section only applied expose manifests and did not install the east-west gateway. Replaced it with the documented `gen-eastwest-gateway.sh --network kube-network | istioctl install -y -f -` command and added the namespace network label.
- The VM configuration generation used auto-registration in the text but omitted the `--autoregister` flag. Added `--autoregister` to both `istioctl x workload entry configure` commands.
- The generated file list omitted the `hosts` file needed for istiod name resolution on the VM. Added `hosts` to the described output and added the `/etc/hosts` copy command.
- The VM sidecar package URL used Istio 1.20.0 while the current official VM installation docs reference 1.30.0. Updated the URL to 1.30.0 and aligned the file ownership commands with the official VM setup.
- The Docker examples combined `--network host` with `-p`, which Docker ignores in host networking mode. Removed the redundant `-p` flags.
- The VirtualService snippet used the older `networking.istio.io/v1beta1` API. Updated it to `networking.istio.io/v1`.

## Review Notes
The post is now technically aligned with the current Istio 1.30 VM installation flow. The tutorial still assumes the reader saves each YAML block to an appropriate file before running `kubectl apply`; that is workable, but future revisions could make the file naming more explicit.
