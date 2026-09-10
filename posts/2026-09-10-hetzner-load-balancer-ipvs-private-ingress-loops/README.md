# How to Fix Hetzner Load Balancer IPVS Loops with Private Ingress Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hetzner, Load Balancing, Networking, Troubleshooting

Description: Separate private backend traffic from advertised private ingress addresses to fix Hetzner load balancer health-check loops with IPVS-based Kubernetes networking.

---

A Hetzner load balancer can use private node addresses for backend traffic while still accepting public client connections. With IPVS-based Kubernetes networking, advertising the load balancer's private IP in the Service status can create an additional routing problem: the service proxy may install that IP on a node's dummy interface and route traffic in a loop.

HCCM documents a specific mitigation, `load-balancer.hetzner.cloud/disable-private-ingress: "true"`. It can be used together with `use-private-ip: "true"` because these settings control different parts of the connection.

## Separate the relevant settings

The [HCCM annotation reference](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md) describes three similarly named controls:

| Setting | Purpose |
| --- | --- |
| `use-private-ip` | Use private IP addresses for load balancer server targets |
| `disable-private-ingress` | Exclude private ingress addressing from the Service's advertised load balancer ingress behavior |
| `disable-public-network` | Disable public network traffic on the cloud load balancer |

For a public-facing load balancer with private backends, the first two can both be true while the third remains false. Disabling private ingress does not mean that backend traffic must move to public node IPs.

The precise status construction is visible in the [v1.36.0 load balancer implementation](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/hcloud/load_balancers.go). Do not treat the annotation as a general firewall rule blocking every private connection to the cloud resource.

## Confirm the IPVS failure pattern

Inspect the Service status, annotations, and cloud resource:

```bash
kubectl -n ingress-system get service ingress-public -o json | jq '{
  annotations: .metadata.annotations,
  ingress: .status.loadBalancer.ingress,
  ports: .spec.ports,
  policy: .spec.externalTrafficPolicy
}'
hcloud load-balancer describe LOAD_BALANCER_ID
```

Record the load balancer's private address, private network, target addresses, and failed health checks. Then determine which component implements Kubernetes Service routing. A cluster might use kube-proxy in IPVS mode, kube-router, or a CNI that replaces kube-proxy entirely.

For kube-proxy, inspect its configured mode and pod arguments. On an affected Linux node, read the relevant interfaces and rules through your normal node administration method:

```bash
ip address show dev kube-ipvs0
ip route get LOAD_BALANCER_PRIVATE_IP
sudo ipvsadm --list --numeric
```

Replace the IP placeholder. The dummy interface name shown is the common kube-proxy name; other implementations can differ. The significant observation is the cloud load balancer's private IP appearing as a local Service address on nodes, together with the documented health-check failure.

Hetzner's [private-network guide](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/private-networks.md) explicitly warns about this IPVS loop. Do not assume that all unhealthy private targets have this cause. Wrong target ports, host firewalls, missing network attachment, and absent local endpoints remain separate possibilities.

## Apply the two settings together

For a public ingress Service whose backends should use the private network, set:

```yaml
metadata:
  annotations:
    load-balancer.hetzner.cloud/use-private-ip: "true"
    load-balancer.hetzner.cloud/disable-private-ingress: "true"
```

The controller must already be configured for the correct Hetzner private network, and the target servers must be attached to it. Keep the existing location, type, protocol, and health-check settings.

Apply the targeted change to the actual Service:

```bash
kubectl -n ingress-system annotate service ingress-public \
  load-balancer.hetzner.cloud/use-private-ip="true" \
  load-balancer.hetzner.cloud/disable-private-ingress="true" \
  --overwrite
```

Persist the annotations in the source manifest. Once HCCM reconciles status, allow the Kubernetes service proxy to consume the update and remove obsolete local Service addressing. Avoid manually flushing IPVS tables as the first repair; doing so affects unrelated Services and the controller may immediately reinstall the same bad desired state.

For a consistent cluster-wide policy, the corresponding HCCM defaults are `HCLOUD_LOAD_BALANCERS_USE_PRIVATE_IP` and `HCLOUD_LOAD_BALANCERS_DISABLE_PRIVATE_INGRESS`. Review every affected Service before using a global override, because a private-only endpoint can have different discovery requirements.

## Verify status, routing, and target health

Read the Service again:

```bash
kubectl -n ingress-system get service ingress-public \
  -o jsonpath='{.status.loadBalancer.ingress}{"\n"}'
hcloud load-balancer describe LOAD_BALANCER_ID
```

Confirm that the private IP is no longer advertised through the problematic status path, while the cloud targets continue using private addresses. Reinspect the affected node's IPVS and interface state and verify the stale local address is gone.

Wait for health checks to turn healthy, then test public application traffic and a request originating inside the cluster. A successful public response alone can miss the original node-local routing problem.

If targets remain unhealthy after routing converges, inspect the exact health-check destination port. With `externalTrafficPolicy: Local`, a node without a local ready endpoint should not be expected to serve application traffic simply because it is a target. Confirm node placement, EndpointSlices, network access, and provider health-check behavior.

For a deliberately private-only load balancer, review how clients discover its address before suppressing private ingress status. Combining public-network disablement and private-status suppression can remove the endpoint information consumers rely on. That configuration needs a considered discovery plan rather than copying public-ingress annotations blindly.

## Conclusion

Use private node addresses for backend traffic while suppressing the private Service ingress address when HCCM's documented IPVS loop applies. Verify the resulting node routing and health checks, keeping private-only endpoint discovery requirements in view.

## Official Documentation

- [HCCM private-network IPVS warning](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/private-networks.md)
- [HCCM load balancer annotations](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [HCCM Service ingress status construction](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/hcloud/load_balancers.go)
