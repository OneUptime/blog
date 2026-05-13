# Validation Summary: How to Migrate Workloads to Calico on GCE Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera operator
- Google Compute Engine
- Google Cloud VPC routes
- Google Cloud CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Self-managed Kubernetes in Google Compute Engine (GCE): https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-public-cloud/gce
- Calico Open Source documentation: Google Compute Engine public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Open Source documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Google Cloud documentation: Use routes: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud documentation: VPC quotas and limits: https://cloud.google.com/vpc/docs/quota
- Google Cloud documentation: Creating a routes-based cluster: https://cloud.google.com/kubernetes-engine/docs/how-to/routes-based-cluster
- Kubernetes documentation: Cloud Controller Manager route controller: https://kubernetes.io/docs/concepts/architecture/cloud-controller/
- Kubernetes documentation: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post incorrectly said Calico could advertise BGP routes directly into the GCE VPC. Updated the wording to say Calico provides BGP-based routing between cluster nodes, while Google Cloud VPC routes must cover the pod network separately.
- The post incorrectly said Calico automatically creates GCE VPC routes from the Installation resource when using native routing. Updated Step 4 to clarify that routes must be created by the Kubernetes GCE cloud provider route controller or equivalent automation.
- The post described the relevant Google Cloud quota as a default limit of 250 dynamic routes per VPC. Updated this to refer to the current static routes per network quota, which is the relevant quota for route-based pod networking and should be checked in the project.
- Added the missing prerequisite that GCE instances need IP forwarding enabled and that the cluster needs a route controller or equivalent static route automation for non-encapsulated pod traffic.
- Corrected the Kubernetes test pod command to include `--command`, matching the current `kubectl run` syntax for overriding the container command.
- Replaced "GCE VNet" with "GCE VPC subnet" to match Google Cloud terminology.

## Review Notes
The Calico Installation resource fields in the post, including `apiVersion: operator.tigera.io/v1`, `bgp: Enabled`, `encapsulation: None`, `natOutgoing: Enabled`, `nodeSelector: all()`, and `blockSize: 26`, are valid according to the Calico Installation API. The post still uses Calico v3.27.0 in the install URL; this is pinned and plausible, but future updates should consider refreshing the example to the current Calico release and matching the current operator install sequence.
