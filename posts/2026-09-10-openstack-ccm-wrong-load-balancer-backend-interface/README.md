# How to Diagnose the Wrong OpenStack Load Balancer Backend Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Troubleshooting

Description: Trace Octavia member addresses back to Kubernetes Node addresses and configure OCCM network selection for nodes with multiple interfaces.

---

A Kubernetes node with management, application, and storage interfaces can be perfectly healthy while Octavia registers the wrong address as a load balancer member. The resulting health-check failure often looks like a security group problem, but opening more ports will not help if the load balancer cannot route to the selected interface.

Trace the member address from Octavia back to the Kubernetes Node object before changing cloud networking. This establishes whether the problem is address selection, subnet configuration, or connectivity to an otherwise correct address.

## Capture the member that is failing

Find the load balancer UUID recorded on the Service and inspect its pools:

```bash
kubectl -n production get service web \
  -o jsonpath='{.metadata.annotations.loadbalancer\.openstack\.org/load-balancer-id}{"\n"}'
openstack loadbalancer pool list --loadbalancer LOAD_BALANCER_ID
openstack loadbalancer member list POOL_ID
openstack loadbalancer member show POOL_ID MEMBER_ID -f yaml
```

Record the member's address, `protocol_port`, `subnet_id`, and health state. Compare its port with the Service's allocated NodePort:

```bash
kubectl -n production get service web \
  -o jsonpath='{.spec.ports}{"\n"}'
kubectl get nodes -o wide
```

For the conventional OCCM node-based load balancer path, the backend is a node address and Service NodePort. It is not generally the pod's IP and `targetPort`. A correct IP with the wrong interpretation of the port can lead to an unnecessary network redesign.

## Inspect every address on the Node

The wide node table shows a convenient summary but does not fully describe address ordering. Read the complete address list and provider identity:

```bash
kubectl get node worker-1 -o json | jq '{
  name: .metadata.name,
  providerID: .spec.providerID,
  addresses: .status.addresses
}'
openstack server show SERVER_ID -f yaml
openstack port list --server SERVER_ID
```

Match `SERVER_ID` to the node's OpenStack provider identity, then compare the attached Neutron ports and networks. Do not assume that Linux interface names such as `ens3` have the same network role across all instances.

In [OCCM v1.36.0's address selection](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go), the controller prefers an `InternalIP` matching the requested IP family, then falls back to `ExternalIP`. Within a type and family, the reported ordering matters. Merely configuring a member subnet does not make this selection function search every interface for an address inside that subnet.

That gives a useful decision point: if the member matches the first eligible but undesired Node address, fix the Node address input or ordering. If the member already matches the desired address, continue with routes, security groups, and health-check reachability.

## Configure the intended internal network

OCCM exposes networking settings specifically for multi-interface nodes. A configuration fragment might be:

```ini
[Networking]
internal-network-name=application-network
address-sort-order=10.42.0.0/16,10.10.0.0/16

[LoadBalancer]
subnet-id=VIP_SUBNET_ID
member-subnet-id=APPLICATION_SUBNET_ID
```

Replace the network name, CIDRs, and UUIDs. `internal-network-name` influences which cloud network addresses OCCM reports as internal. `address-sort-order` prioritizes addresses by matching CIDRs. The [networking reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#networking) documents these options and supports multiple network-name entries where needed.

The VIP subnet and member subnet have separate roles. An Octavia provider may need network attachment or routing to the member subnet. Configure the appropriate topology for your cloud rather than assuming that the VIP and backend nodes must always use identical subnets.

Also inspect Service annotations such as `loadbalancer.openstack.org/member-subnet-id` and any selected OCCM class. An override can make the effective per-Service configuration differ from the global configuration you just edited.

## Roll out without confusing cached state with failure

Update the managed controller configuration and roll out OCCM. Watch Node addresses as the node controller refreshes them; changing a configuration file does not prove the API object's addresses already changed.

```bash
kubectl get node worker-1 -w \
  -o custom-columns=NAME:.metadata.name,ADDRESSES:.status.addresses
```

Only after the Node address list is correct should you assess the Service's next reconciliation. If the Service needs a deliberate refresh, a harmless metadata annotation change can trigger the standard service controller to re-evaluate it:

```bash
kubectl -n production annotate service web \
  operations.example.com/reconcile-reason=backend-address-fix-1 --overwrite
```

Use your organization's annotation domain. A change must actually differ from the previous value to generate a new update. Inspect fresh controller logs and the Octavia member list instead of assuming the refresh succeeded.

## Validate connectivity in both directions

Confirm the resulting member address belongs to the intended application network and that the NodePort is reachable from the load balancer's network. Review Neutron security groups and host firewall rules for the health-check and data paths. For `externalTrafficPolicy: Local`, ensure eligible nodes have local ready endpoints and the controller's health monitor configuration matches that policy.

Test a real request from an external client after member health recovers. Then check another node with the same multi-interface layout. A configuration that fixes one address accidentally can fail on the next replacement node unless the network selection rule is consistent.

## Conclusion

The durable fix is to align Kubernetes Node addresses, their ordering, and the load balancer's member subnet with the intended backend network. Verify that chain before changing firewalls or manually editing controller-managed Octavia members.

## Official Documentation

- [OCCM node address selection](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [OCCM networking and load balancer configuration](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md)
- [Kubernetes service controller reconciliation](https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go)
