# Validation Summary: Verify Pod Networking with Calico on Self-Managed GCE Kubernetes

## Status
validated

## Post Type
Tutorial / verification guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Google Compute Engine
- Google Cloud VPC firewall rules
- Google Cloud VPC routes
- IP-in-IP and VXLAN encapsulation
- kubectl, calicoctl, and gcloud CLI commands

## Sources Consulted
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Google Cloud VPC firewall rules documentation: https://cloud.google.com/firewall/docs/firewalls
- Google Cloud gcloud compute firewall-rules create reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Google Cloud VPC subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud VPC routes documentation: https://cloud.google.com/vpc/docs/using-routes
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/

## Issues Found
- The post described Calico `CrossSubnet` mode as encapsulating across zones. Calico bases `CrossSubnet` behavior on node subnet boundaries, and Google Cloud VPC subnets are regional. I updated the cross-zone test and best-practice wording to distinguish zone boundaries from subnet boundaries.
- The native routing description omitted the Google Cloud requirement to enable IP forwarding on VM instances used as packet-forwarding next hops. I added that requirement.
- The firewall examples used `<node-cidr>/16`, which could produce an invalid CIDR placeholder if the user supplied a CIDR. I changed it to `<node-subnet-cidr>`.
- The external connectivity test used HTTPS against `www.googleapis.com`, which can fail in minimal BusyBox images because of TLS or certificate availability rather than pod networking. I changed it to an HTTP `generate_204` request.

## Review Notes
The post is technically relevant and the Calico IPPool fields, `calicoctl get` usage, `kubectl run --overrides`, and Google Cloud firewall protocol examples are current. The `kubectl` examples assume nodes carry the standard `topology.kubernetes.io/zone` label and that the target VM instances have the `k8s-node` network tag used by the firewall rules.
