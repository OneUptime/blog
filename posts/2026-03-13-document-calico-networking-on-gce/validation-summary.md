# Validation Summary: Document Calico Networking on GCE for Operators

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- Kubernetes
- Google Compute Engine
- Google Cloud VPC routes and firewall rules
- Google Kubernetes Engine routes-based networking
- gcloud CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Google Compute Engine public cloud configuration, https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico documentation: calicoctl ipam show reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: Kubernetes system and network requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Google Cloud SDK reference: gcloud compute instances create, https://cloud.google.com/sdk/gcloud/reference/compute/instances/create
- Google Cloud SDK reference: gcloud compute routes create, https://cloud.google.com/sdk/gcloud/reference/compute/routes/create
- Google Cloud documentation: Creating a routes-based GKE cluster, https://cloud.google.com/kubernetes-engine/docs/how-to/routes-based-cluster
- Google Cloud documentation: VPC-native GKE clusters, https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Kubernetes documentation: kubectl get reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kubectl drain reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post described GCE static routes as being synchronized with Calico IPAM blocks. Calico's GCE documentation describes GCE cloud routes with Calico policy-only mode and Kubernetes GCE cloud provider route handling, while GKE routes-based clusters use node Pod CIDR routes. Updated the explanation to refer to node Pod CIDR assignments and to note the GCE cloud provider route lifecycle.
- The diagram labeled the environment as a GKE cluster while the node provisioning procedure uses raw GCE VM creation. Changed the diagram label to "Kubernetes Cluster on GCE" to match the procedure.
- The firewall dependency table listed the kubelet source as the worker node tag. API server-to-kubelet traffic should come from the control-plane nodes or API server CIDR, so the source was corrected.
- The VPC route section said "one route per Calico IPAM block" and assumed a Calico-assigned /24. Updated it to "one route per node Pod CIDR," noting that /24 applies to GKE routes-based clusters and that self-managed sizes can vary.
- The node-addition commands used `calicoctl ipam show --show-blocks | grep worker-new | awk '{print $2}'`. Current documented `calicoctl ipam show --show-blocks` output does not reliably expose a node name or a second-field CIDR suitable for this pipeline. Replaced it with `kubectl get node worker-new -o jsonpath='{.spec.podCIDR}'`.
- The Calico log command omitted the namespace. Updated it to `kubectl -n kube-system logs ds/calico-node`.
- The conclusion implied that operators must always manually add routes. Calico and GKE documentation show that Kubernetes GCE cloud provider integration can manage routes automatically, so the conclusion now limits the manual-route warning to clusters where those routes are not managed automatically.

## Review Notes
The post is now technically consistent as a GCE/self-managed or routes-based operational documentation guide. Future improvements could distinguish more explicitly between GKE VPC-native clusters, GKE routes-based clusters, and self-managed Kubernetes on GCE, because their route lifecycles differ.
