# Validation Summary: How to Adopt a DigitalOcean Load Balancer into a Kubernetes Service

## Status

validated

## Post Type

Operational migration guide

## Technologies Covered

- Kubernetes Services, EndpointSlices, NodePorts, kubectl
- DigitalOcean CCM v0.1.69 and DOKS load balancers
- doctl, TCP forwarding, VPCs, controller resource ownership

## Sources Consulted

- [DigitalOcean load balancer migration workflow](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/)
- [DigitalOcean current load balancer configuration and type defaults](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/)
- [DigitalOcean v0.1.69 load balancer retrieval, creation, forwarding and disown implementation](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [doctl load-balancer get](https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/get/)
- [kubectl deployment port-forward behavior](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

- The example omitted the resource type despite using port 80 with targetPort 8080. Added `do-loadbalancer-type: "REGIONAL"` and scoped the example to an existing REGIONAL resource. Current DOKS and the reviewed CCM default to REGIONAL_NETWORK, which has different forwarding semantics; adopting an existing resource must preserve its actual type.
- The description implied that a nonexistent UUID only yields an error. Corrected it: `findLoadBalancerByID` maps HTTP 404 to `errLBNotFound`, and `EnsureLoadBalancer` can create a replacement. The README now explicitly requires prechecking access and verifying identity after adoption.

## Review Notes

- Confirmed ID-based retrieval precedes name lookup when the annotation is present; disown guards cloud creation, updates and deletion. Deleting an active owner invokes cloud load balancer deletion.
- Checked manifest API fields, string annotations, TCP Service ports, endpoint inspection, providerID output, and the distinction between port-forwarding to a Pod and validating the NodePort path.
- The existing-resource and single-owner conditions are essential to IP preservation. An ID annotation does not enforce an adopt-only transaction.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
