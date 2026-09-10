# How to Attach an Existing OpenStack Floating IP to a Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Cloud

Description: Use a reserved OpenStack floating IP with a Kubernetes LoadBalancer Service, verify VIP port ownership, and preserve the address during cleanup.

---

A reserved floating IP is useful when DNS, external allowlists, or partner integrations already depend on an address. OpenStack Cloud Controller Manager can associate that existing address with the VIP port of a new Octavia load balancer, provided the address is available to the controller's project and is not attached to another port.

For OCCM v1.36.0, the documented request mechanism is `spec.loadBalancerIP`. Kubernetes has deprecated that field because its meaning varies between providers, but this OpenStack implementation still handles it. Treat the following as provider-specific behavior and verify it when upgrading.

## Check the reservation before creating the Service

Authenticate the OpenStack CLI to the same project and region used by OCCM. Locate the floating IP resource, then inspect it by UUID:

```bash
openstack floating ip list --floating-ip-address 203.0.113.40
openstack floating ip show FLOATING_IP_ID -f yaml
```

Replace the documentation address with your reserved public address. Check `floating_ip_address`, `floating_network_id`, `project_id`, and `port_id`. The desired starting state is an existing reservation whose `port_id` is empty.

An address attached to a virtual machine, another load balancer, or an old cluster cannot be simultaneously attached to this new VIP port. Plan that migration explicitly. Deleting an unrelated port to make the error disappear can disconnect the application that currently owns the address.

Check that the selected external network is reachable through the router serving the load balancer VIP subnet. A valid floating IP reservation does not establish routing between every external network and every tenant subnet.

## Declare the reserved address and retention intent

Create a Service selecting an existing application with ready pods. This example assumes those pods listen on port 8080:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-public
  namespace: production
  annotations:
    service.beta.kubernetes.io/openstack-internal-load-balancer: "false"
    loadbalancer.openstack.org/floating-network-id: "EXTERNAL_NETWORK_ID"
    loadbalancer.openstack.org/keep-floatingip: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 203.0.113.40
  selector:
    app: web
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

Replace `EXTERNAL_NETWORK_ID` and the address, save the file as `web-public.yaml`, and apply it:

```bash
kubectl apply -f web-public.yaml
kubectl -n production describe service web-public
kubectl -n production get service web-public --watch
```

The [OCCM Service guide](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#creating-service-by-specifying-a-floating-ip) describes using an available floating IP. The `keep-floatingip` annotation expresses that the address should survive Service cleanup. It does not preserve the Octavia load balancer itself.

Do not substitute the floating IP UUID for `loadBalancerIP`; that field contains the address. Likewise, `loadbalancer.openstack.org/load-balancer-id` identifies an Octavia load balancer and is used for load balancer reuse or sharing. These are three different identifiers with different purposes.

## Understand what happens when the address is unavailable

The [v1.36.0 implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go) first checks for an existing floating IP on the load balancer's port, then searches for the requested address. If it finds the requested floating IP on another port, it returns an availability error rather than stealing it.

If the requested reservation is absent, OCCM can attempt to create a floating IP through the configured external network. In this release, the requested address is passed into that creation path. Cloud policy and address availability determine whether that request succeeds. Do not rely on a missing reservation silently producing some other usable address, especially when preserving the original IP is the requirement.

Preallocating and verifying the floating IP avoids that ambiguity. It also separates an allocation failure or quota issue from a later association failure.

## Verify the cloud association and the application

Once the Service reconciles, capture its load balancer UUID:

```bash
kubectl -n production get service web-public \
  -o jsonpath='{.metadata.annotations.loadbalancer\.openstack\.org/load-balancer-id}{"\n"}'

openstack loadbalancer show LOAD_BALANCER_ID -f yaml
openstack floating ip show FLOATING_IP_ID -f yaml
```

The floating IP's `port_id` should match the load balancer's `vip_port_id`. Its external address should match `status.loadBalancer.ingress[].ip` unless you deliberately configured a hostname status annotation.

Then test from a client outside the cluster:

```bash
curl --fail --show-error --max-time 10 http://203.0.113.40/
kubectl -n production get endpointslices \
  -l kubernetes.io/service-name=web-public
```

If the address association is correct but requests fail, inspect Octavia members, their NodePorts, health checks, and security groups. Reassigning the floating IP repeatedly will not repair an unhealthy backend.

## Preserve ownership during later changes

Keep the Service manifest and the separate floating IP reservation under clear ownership. Deleting the Service still removes controller-managed load balancer resources. With retention configured, the floating IP should remain available for a subsequent association; verify its existence and empty port after cleanup before using it elsewhere.

Exercise that lifecycle first with a disposable reserved address. A successful creation test does not prove a deletion policy, and a production IP is a poor place to discover differences in an older CCM release.

## Conclusion

Attach an existing floating IP by requesting its address on the Service and verifying that it is free before reconciliation. Confirm the resulting VIP port association and retention behavior so the public address stays stable across the intended lifecycle.

## Official Documentation

- [OCCM floating IP and Service annotations](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md)
- [OCCM floating IP reconciliation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [Kubernetes LoadBalancer Service fields](https://kubernetes.io/docs/concepts/services-networking/service/#type-loadbalancer)
