# Validation Summary: How to Fix cert-manager Self-Checks with a DigitalOcean Hostname

## Status

validated

## Post Type

Certificate issuance troubleshooting guide

## Technologies Covered

- cert-manager ACME Orders, Challenges and HTTP-01 self-checks
- DigitalOcean CCM v0.1.69 hostname status
- Kubernetes ingress Services, solver resources, DNS and TLS

## Sources Consulted

- [cert-manager ACME troubleshooting and self-check sequence](https://cert-manager.io/docs/troubleshooting/acme/)
- [cert-manager ChallengeSpec and ChallengeStatus API fields](https://cert-manager.io/docs/reference/api-docs/)
- [DigitalOcean v0.1.69 hostname workaround](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
- [DigitalOcean v0.1.69 hostname status construction](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [DigitalOcean hostname setup procedure](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Verified the order of presenting the solver, performing the self-check, and asking the ACME provider to validate. Challenge `.spec.dnsName`, `.spec.token`, `.spec.key` and the displayed status fields are valid.
- Checked the exact HTTP-01 URL construction and expected-response comparison. Using the actual challenge route rather than a generic health endpoint is necessary to distinguish solver routing failures.
- The annotation is correctly applied to the ingress controller LoadBalancer Service. Its hostname-only status behavior can remove the IP-based bypass addressed by DigitalOcean, while DNS creation and solver configuration remain independent requirements.
- The post correctly distinguishes observed causes such as DNS, redirects, NetworkPolicy, ingress class, and expected response body. It does not present this workaround as a remedy for all pending certificates.
- Reviewed on 2026-09-10. All 7 shell examples passed `bash -n`; the post contains no YAML examples. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
