# Validation Summary: Validate Calico Networking on Google Compute Engine

## Status
validated

## Post Type
Technical validation guide

## Technologies Covered
- Calico
- Kubernetes
- Google Compute Engine
- Google Cloud VPC routes
- Google Cloud VPC firewall rules
- gcloud CLI
- kubectl
- calicoctl

## Sources Consulted
- Calico Google Compute Engine documentation: https://docs.tigera.io/calico/latest/reference/public-cloud/gce
- Calico Kubernetes system requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico BGP peering documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Google Cloud VPC routes documentation: https://cloud.google.com/vpc/docs/using-routes
- Google Cloud VPC firewall rules documentation: https://cloud.google.com/firewall/docs/using-firewalls
- Google Cloud `gcloud compute instances describe` reference: https://cloud.google.com/sdk/gcloud/reference/compute/instances/describe
- Google Cloud `gcloud compute firewall-rules list` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Google Compute Engine metadata documentation: https://cloud.google.com/compute/docs/metadata/querying-metadata

## Issues Found
- The `canIpForward` check said the value should always be `true`. Google Cloud requires VM IP forwarding when a VM forwards packets with sources outside its own addresses, which applies to native unencapsulated routing and next-hop route use cases, but not necessarily every encapsulated Calico deployment. I scoped the comment to native, unencapsulated routing.
- The firewall-rule listing format omitted the documented `.list()` transform after `allowed[].map().firewall_rule()`. I updated the `gcloud compute firewall-rules list` command to match Google Cloud's documented formatter example.
- The static-route check filtered only `destRange~192.168`, which assumes a specific pod CIDR. I changed the command to show node PodCIDRs and next-hop-instance routes so the check works with any configured pod range.
- The post said every Calico IPAM block should have a corresponding VPC route. In GCE route-based Kubernetes, routes are commonly per node PodCIDR or an aggregate covering the workload blocks, not necessarily one route per Calico allocation block. I changed the wording to require a route for each node PodCIDR or a covering aggregate route.

## Review Notes
The guide is technically relevant and validated after corrections. The Calico namespace commands assume an operator-style installation using `calico-system`; manifest-based installations may place `calico-node` in `kube-system`.
