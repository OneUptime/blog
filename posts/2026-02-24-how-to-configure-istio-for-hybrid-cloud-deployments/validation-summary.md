# Validation Summary: How to Configure Istio for Hybrid Cloud Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio service mesh
- Istio multicluster primary-remote deployments
- Istio east-west gateways
- Istio WorkloadGroup and WorkloadEntry APIs
- Kubernetes Services
- AWS Site-to-Site VPN
- Google Cloud VPN and Cloud Interconnect
- Azure VPN Gateway and ExpressRoute
- Prometheus and Kiali

## Sources Consulted
- Istio primary-remote multicluster installation: https://istio.io/latest/docs/setup/install/multicluster/primary-remote/
- Istio primary-remote multicluster installation on different networks: https://istio.io/latest/docs/setup/install/multicluster/primary-remote_multi-network/
- Istio multi-primary multicluster installation on different networks: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio virtual machine installation: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio virtual machine architecture: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- AWS CLI create-vpn-gateway command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-gateway.html
- AWS CLI create-customer-gateway command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html

## Issues Found
- The networking section incorrectly implied that pod CIDRs and service CIDRs always need to be routable across the hybrid connection. Current Istio multicluster documentation distinguishes direct pod-to-pod connectivity from multi-network deployments that communicate through east-west gateways. Reworded this requirement to emphasize non-overlapping networks and reachable endpoints or gateways.
- The primary control plane example was missing `values.global.externalIstiod: true`, which Istio requires for a primary cluster to manage attached remote clusters. Added the setting.
- The shared trust setup only created `cacerts` on the on-premises cluster and used different on-prem file names, which would not establish a common root CA for both clusters. Added the `cacerts` secret creation on the cloud cluster before installation and changed the on-prem example to use the same CA file names.
- The primary-remote flow was missing the primary east-west gateway and `expose-istiod.yaml` step required before a remote cluster can reach the primary control plane. Added the gateway and control-plane exposure commands.
- The remote cluster example was missing the `topology.istio.io/controlPlaneClusters` annotation, the network label, and `global.remotePilotAddress`. Added those steps and generated `istio-remote.yaml` with a shell heredoc so `${DISCOVERY_ADDRESS}` is actually substituted.
- The remote secret section created secrets in both directions, which matches a multi-primary pattern rather than primary-remote. Removed the cloud-to-on-prem secret and kept only the remote-cluster secret applied to the primary cluster.
- The east-west gateway commands used older `--mesh` and `--cluster` flags in a place where current Istio documentation shows `gen-eastwest-gateway.sh --network`. Updated the commands.
- The remote-cluster service exposure command was removed because Istio documents that, for a primary-remote deployment on different networks, exposing services on the primary cluster exposes them on the east-west gateways of both clusters.
- The VM sidecar package URL used Istio 1.20.0, while the current official virtual machine documentation uses the current Istio release package. Updated the example to 1.30.0 and described it as the user's Istio release.
- The VM configuration copy command placed all generated files under `/etc/istio/`, but Istio documents specific paths for `root-cert.pem`, `istio-token`, `cluster.env`, `mesh.yaml`, and `hosts`. Updated the copy and ownership commands.
- The VM workload configuration used `--autoregister` and then manually created a WorkloadEntry, mixing two different registration modes. Removed `--autoregister` so the later manual WorkloadEntry is consistent.
- The Kubernetes Service intended to select the VM WorkloadEntry had no selector. Added `spec.selector.app: legacy-payment` so Istio can associate the Service with matching WorkloadEntry labels.

## Review Notes
The remaining examples are conceptual and still require environment-specific values such as real gateway addresses, VPN connection setup, routing tables, firewall rules, service accounts, namespaces, and cloud provider networking details. The AWS VPN commands are valid building blocks but are not a complete Site-to-Site VPN setup by themselves.
