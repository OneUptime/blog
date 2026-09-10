# How to Select OpenStack Floating IP Pools with CCM Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Cloud

Description: Configure named OCCM classes that select external floating IP networks and subnets, then verify each Service receives an address from its intended pool.

---

Platform teams often want application owners to request an internet-facing or office-facing load balancer without copying OpenStack network UUIDs into every application repository. OpenStack Cloud Controller Manager supports named configuration sections for that purpose.

An OCCM class maps a logical name to external floating IP network and subnet choices, along with supported VIP and member network settings. A Service selects it with the `loadbalancer.openstack.org/class` annotation. The names resemble Kubernetes load balancer classes, but this mechanism is configured inside OCCM's `cloud.conf`.

## Keep the two class mechanisms distinct

The [OCCM class documentation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#switching-between-floating-subnets-by-using-preconfigured-classes) uses `[LoadBalancerClass "NAME"]` sections and an annotation. Kubernetes `spec.loadBalancerClass` instead selects a load balancer implementation responsible for a Service.

Do not put `internet` into `spec.loadBalancerClass` merely because your OCCM configuration contains a class with that name. The default Kubernetes service controller ignores Services assigned to a nondefault implementation through that field. Use the provider annotation unless your particular controller deployment explicitly documents additional support.

The class is also a configuration convenience, not an authorization boundary. If application owners must be prevented from selecting certain networks or bypassing a class, enforce that requirement with admission policy and cloud permissions.

## Inventory the networks and subnets

Using the same OpenStack project as OCCM, collect the external network and subnet identifiers:

```bash
openstack network list --external
openstack subnet list --network PUBLIC_NETWORK_ID
openstack subnet list --network OFFICE_NETWORK_ID
openstack subnet show VIP_SUBNET_ID -f yaml
```

Substitute UUIDs from your cloud. Verify the floating subnets belong to the intended external networks and have allocatable addresses. Separately identify the private VIP subnet where Octavia creates its VIP port. A floating IP pool and a VIP subnet are different parts of the traffic path.

Write down an expected mapping before editing configuration:

| Class | Floating network | Floating subnet | Intended consumers |
| --- | --- | --- | --- |
| internet | Public external network | Public allocation pool | Public application endpoints |
| office | Office-routed external network | Office allocation pool | Clients on the office network |

An office-facing floating network still uses an external Service from OCCM's perspective. A genuinely internal load balancer has no floating IP, so it is a different configuration choice.

## Define explicit classes

Merge the following into the existing cloud configuration. Keep its authentication section unchanged, and replace every placeholder:

```ini
[LoadBalancer]
subnet-id=VIP_SUBNET_ID
floating-network-id=PUBLIC_NETWORK_ID

[LoadBalancerClass "internet"]
floating-network-id=PUBLIC_NETWORK_ID
floating-subnet-id=PUBLIC_FLOATING_SUBNET_ID

[LoadBalancerClass "office"]
floating-network-id=OFFICE_NETWORK_ID
floating-subnet-id=OFFICE_FLOATING_SUBNET_ID
```

In the documented v1.36.0 class syntax, provide one of `floating-subnet-id`, `floating-subnet`, or `floating-subnet-tags`. Using subnet IDs makes the initial rollout deterministic. Names and tag selectors are useful when the platform intentionally manages multiple eligible allocation pools, but they add another selection rule to troubleshoot.

The configured class values take precedence over corresponding Service annotations. For example, setting a floating network annotation on a Service does not override a floating network explicitly defined by its selected class. The [OCCM configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#load-balancer) lists the fields supported inside each class.

Store the edited configuration through the Secret or Helm release that owns OCCM. Roll out new controller pods so the process reads it. A class name written only in a local file has no effect until the running controller uses that file.

## Select a class from a Service

For an existing application listening on 8080, the internet Service can be declared as follows:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-internet
  namespace: production
  annotations:
    loadbalancer.openstack.org/class: "internet"
    service.beta.kubernetes.io/openstack-internal-load-balancer: "false"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
```

Apply it and inspect events. Create a separate canary Service selecting `office` to test the second class before asking application teams to adopt it. A misspelled or unconfigured class should be diagnosed from the controller's configuration and Service events, not worked around by guessing new annotation keys.

## Check the actual allocation

Capture the external address from the Service, then find its floating IP object:

```bash
kubectl -n production get service web-internet -o wide
openstack floating ip list --floating-ip-address SERVICE_EXTERNAL_IP
openstack floating ip show FLOATING_IP_ID -f yaml
```

Check its external network and the allocated address's subnet against the expected mapping. Inspect the load balancer VIP subnet separately. Test reachability from the intended client network; an address from the correct pool can still be blocked by routing or access rules.

Treat changing the class of an existing production Service as a migration requiring investigation. Editing allocation policy does not guarantee an already attached floating IP moves into the new pool. Test with a new Service, observe your controller's behavior, and plan any address or DNS change explicitly.

## Conclusion

OCCM classes let the platform publish meaningful pool choices while keeping network identifiers in controller configuration. Select them through the provider annotation, verify the allocated address against the class, and manage later pool changes as deliberate migrations.

## Official Documentation

- [OCCM preconfigured load balancer classes](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#switching-between-floating-subnets-by-using-preconfigured-classes)
- [OCCM class configuration fields](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#load-balancer)
- [Kubernetes load balancer implementation classes](https://kubernetes.io/docs/concepts/services-networking/service/#load-balancer-class)
