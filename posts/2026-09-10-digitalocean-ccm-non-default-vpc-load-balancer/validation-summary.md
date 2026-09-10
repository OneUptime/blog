# Validation Summary: How to Fix DigitalOcean CCM Load Balancers in a Nondefault VPC

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Self-managed DigitalOcean CCM v0.1.69
- DigitalOcean VPCs, Droplets, load balancers and preview subnet selection
- Kubernetes Deployments, environment variables and kubectl rollout

## Sources Consulted

- [DigitalOcean v0.1.69 cloud initialization](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/cloud.go)
- [DigitalOcean v0.1.69 load balancer request construction](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [DigitalOcean v0.1.69 subnet and network annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
- [doctl droplet get](https://docs.digitalocean.com/reference/doctl/reference/compute/droplet/get/)
- [doctl VPC get](https://docs.digitalocean.com/reference/doctl/reference/vpcs/get/)
- [doctl VPC list](https://docs.digitalocean.com/reference/doctl/reference/vpcs/list/)
- [kubectl set env](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_env/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Traced `DO_CLUSTER_VPC_ID` from `os.Getenv` in cloud initialization through the resources object to `req.VPCUUID` in load balancer request construction. The environment setting and UUID format described in the post are correct.
- Confirmed the tagged annotation reference requires the selected subnet to belong to the cluster VPC and describes the subnet UUID feature as private preview. That release-specific caveat remains appropriate.
- Checked doctl inspection commands, providerID output, pod-template environment fragments, and rollout syntax. The article correctly requires startup of replacement pods and separately verifies the resulting cloud resource.
- A configuration change is not evidence that an existing Droplet or load balancer moved networks. The post correctly limits its proven result to verified creation and separates self-managed remediation from DOKS support.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
