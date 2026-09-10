# Validation Summary: How to Set the Hetzner CCM Load Balancer Type Explicitly

## Status

validated

## Post Type

Load balancer configuration guide

## Technologies Covered

- Hetzner HCCM v1.36.0 type selection and change-type actions
- Kubernetes Service annotations and controller environment defaults
- hcloud CLI and load balancer capacity

## Sources Consulted

- [HCCM v1.36.0 type annotation and location lifecycle](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [HCCM v1.36.0 cluster-wide setting precedence](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/configuration.md)
- [HCCM v1.36.0 getType and changeType implementation](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go)
- [hcloud load-balancer-type list](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_load-balancer-type_list.md)
- [hcloud load-balancer-type describe](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_load-balancer-type_describe.md)
- [hcloud load-balancer describe](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_load-balancer_describe.md)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- Verified `lb11` fallback, the LoadBalancerTypeUnconfigured warning, service-annotation precedence over `HCLOUD_LOAD_BALANCERS_TYPE`, and errors for unavailable or nonexistent types.
- Read the changeType branch: entirely unset type returns without resizing; an explicit differing type invokes ChangeType and waits for its action. Removing a Service override can still expose a configured cluster default.
- Confirmed the documented difference between resizing type and relocating a load balancer: changing location after creation does not move it; recreation assigns new public addresses.
- Checked the Service YAML, hel1 location example, lb21 illustrative type, hcloud inspection commands, and annotate syntax. No current price or capacity number is asserted; the post directs readers to inspect the actual provider catalog before selecting a size.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 2 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
