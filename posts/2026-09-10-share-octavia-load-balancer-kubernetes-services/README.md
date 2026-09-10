# How to Share an Octavia Load Balancer Across Kubernetes Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Cloud

Description: Attach Kubernetes Services to one Octavia load balancer with the OCCM load-balancer-id annotation while avoiding listener conflicts and cleanup surprises.

---

Two Kubernetes Services can share one Octavia load balancer when OpenStack Cloud Controller Manager supports the required Octavia tagging features. Sharing reduces the number of load balancers and public addresses, but also couples the Services to one cloud resource and one frontend address.

The key is to create or identify the load balancer first, then reference its UUID from the additional Service. Giving two Services the same Kubernetes name in different namespaces does not enable sharing, and requesting the same floating IP twice does not create shared listeners.

## Check the sharing constraints

The [OCCM v1.36.0 guide](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#sharing-load-balancer-with-multiple-services) requires Octavia's tag feature, available from API version 2.5. It also documents a default maximum of two attached Services, controlled by `[LoadBalancer] max-shared-lb`.

Use different frontend ports for the two Services in this example: 80 for a web application and 9000 for a separate TCP application. Their pod ports can differ independently. Listener port collisions are not resolved by Kubernetes namespaces.

Internal Services cannot share an Octavia load balancer with another Service under this mechanism. The floating IP attaches to the shared load balancer VIP, so mixing an internal Service into a public load balancer could expose it unexpectedly. Keep Services with different exposure requirements on separate load balancers.

Sharing also means sharing capacity and a failure domain. Agree on ownership, permitted frontend ports, configuration changes, and incident response before attaching Services from different teams or clusters.

## Create the first Service

Assume the `web` application already has ready pods listening on port 8080. Create its public Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: shared-web
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 8080
```

Apply the file and wait for normal provisioning. The controller's existing external network configuration determines the floating IP allocation. Inspect both Service events and Octavia state before adding a second Service:

```bash
kubectl -n production describe service shared-web
kubectl -n production get service shared-web \
  -o jsonpath='{.metadata.annotations.loadbalancer\.openstack\.org/load-balancer-id}{"\n"}'
```

Record the returned UUID. It is the Octavia load balancer ID, not the floating IP UUID or the Kubernetes Service UID. Verify that resource reaches `ACTIVE` and that its initial listener works.

## Attach a second Service by load balancer ID

Create an additional Service using the recorded UUID. This example assumes a different application labeled `app: events` listens on port 9000:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: shared-events
  namespace: production
  annotations:
    loadbalancer.openstack.org/load-balancer-id: "EXISTING_OCTAVIA_LB_ID"
spec:
  type: LoadBalancer
  selector:
    app: events
  ports:
    - name: events
      protocol: TCP
      port: 9000
      targetPort: 9000
```

Replace the UUID before applying. The documented `load-balancer-id` behavior prioritizes the existing load balancer; other annotations defining load balancer features should not be treated as an independent configuration for a second physical resource. Establish compatible shared settings before adoption. After a Service is created successfully, keep its `load-balancer-id` annotation unchanged: the upstream guide warns that changing it breaks the Service's relationship with the load balancer.

If you need more than two Services, review the cloud limits and increase the controller's managed configuration deliberately:

```ini
[LoadBalancer]
max-shared-lb=3
```

This fragment belongs alongside existing settings, not in a replacement configuration that drops authentication or networking. Roll out the updated controller configuration before attaching an additional Service.

## Verify listeners and ownership

Inspect both Kubernetes Services and the cloud load balancer:

```bash
kubectl -n production get services shared-web shared-events -o wide
openstack loadbalancer show EXISTING_OCTAVIA_LB_ID -f yaml
openstack loadbalancer listener list --loadbalancer EXISTING_OCTAVIA_LB_ID
openstack loadbalancer pool list --loadbalancer EXISTING_OCTAVIA_LB_ID
```

Both Services should report the same external address. Octavia should show the intended distinct listeners and pools. Inspect members in each pool and confirm that their ports correspond to the appropriate Service NodePorts, not simply the pods' `targetPort` values.

Test each frontend independently. A working HTTP listener on port 80 does not prove that the listener on 9000 is reachable or that the second application's protocol is healthy. Use an application-aware client for that second port.

An error about a listener conflict calls for checking the existing listener inventory. An error about unsupported sharing calls for checking Octavia feature support. A third Service rejected by the configured sharing maximum is an intentional controller limit, not evidence that the UUID was malformed.

## Test removal without deleting the shared resource manually

The documented lifecycle retains a controller-created shared load balancer while other attached Services remain. After the final attached Service is deleted, the controller can delete that load balancer. In v1.36.0, deletion ownership is inferred from the `kube_service_` name prefix and Service attachment tags. An externally created load balancer without that prefix is retained; one manually given that prefix can be treated as controller-owned. Check the actual name and tags before relying on external creation as a retention guarantee.

Test the lifecycle in a nonproduction environment: remove one attached Service, confirm its listener disappears, and verify traffic to the remaining Service. Then test final removal and any separate floating IP retention policy. Do not manually delete the shared load balancer to clean up one application.

## Conclusion

Octavia sharing is explicit reuse by UUID with distinct frontend listeners and coordinated lifecycle ownership. Verify both Services' pools and deletion behavior before treating a shared public address as production infrastructure.

## Official Documentation

- [OCCM shared load balancer support](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#sharing-load-balancer-with-multiple-services)
- [OCCM load balancer reconciliation and ownership](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [Octavia API v2](https://docs.openstack.org/api-ref/load-balancer/v2/)
