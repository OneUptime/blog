# How to Set the Hetzner CCM Load Balancer Type Explicitly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hetzner, Load Balancing, Cloud, DevOps

Description: Choose a Hetzner load balancer type through Service annotations or controller defaults and verify the actual cloud type and resize behavior.

---

A load balancer type determines the cloud resource's capacity and limits. Leaving that choice implicit makes an application depend on the cloud controller's default, even when the deployment has a clear capacity requirement.

Hetzner Cloud Controller Manager supports both a per-Service type annotation and a cluster-wide default. In v1.36.0, its fallback is `lb11`, and the implementation emits a warning when the type is unconfigured. An explicit setting makes the intent visible and protects the deployment from relying on that fallback indefinitely.

## Inspect the running resource and available types

First identify the existing Service, controller version, and cloud load balancer:

```bash
kubectl -n production get service web-public -o yaml
kubectl -n kube-system get deployment hcloud-cloud-controller-manager \
  -o jsonpath='{.spec.template.spec.containers[*].image}{"\n"}'
hcloud load-balancer list
hcloud load-balancer describe LOAD_BALANCER_ID
```

Use the real controller workload name. Record the current cloud type and public addresses before changing anything. A Kubernetes annotation is desired state; the resource returned by the Hetzner API is observed state.

List the types available through the API:

```bash
hcloud load-balancer-type list
hcloud load-balancer-type describe lb21
```

The [hcloud type commands](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_load-balancer-type_list.md) expose the current catalog. Check limits, availability, and the current price for the chosen type in Hetzner's control plane before selecting it. A larger type is not a substitute for fixing unhealthy application targets or an incorrect health-check path.

## Set the type on the Service

The provider annotation is `load-balancer.hetzner.cloud/type`. For an application whose approved type is `lb21`, the relevant manifest is:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-public
  namespace: production
  annotations:
    load-balancer.hetzner.cloud/type: "lb21"
    load-balancer.hetzner.cloud/location: "hel1"
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

Use a location compatible with your targets, or retain the location/network-zone settings already established by your cluster. The example type is illustrative, not a sizing recommendation.

For an existing Service, a focused change is:

```bash
kubectl -n production annotate service web-public \
  load-balancer.hetzner.cloud/type=lb21 --overwrite
kubectl -n production describe service web-public
```

Persist the annotation in the Helm values or manifests owning that Service. Directly changing the type in the cloud console while the Service declares another type allows the controller to restore its desired configuration later.

The [HCCM annotation reference](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md) lists the type key. A nonexistent or unavailable type should produce a reconciliation error; do not assume the controller will choose an equivalent substitute.

## Choose a cluster-wide default when appropriate

If all Services should start from the same platform-approved type, set the controller environment variable:

```yaml
env:
  - name: HCLOUD_LOAD_BALANCERS_TYPE
    value: "lb21"
```

Merge this into the controller's existing environment configuration and roll out the managed Deployment. A per-Service annotation overrides the cluster-wide value. This precedence is documented in the [HCCM configuration guide](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/configuration.md).

Changing a cluster-wide default deserves a broader review than editing one Service. During later reconciliations, Services without their own type annotation can inherit that new configured value. Inventory those Services first and estimate the resulting capacity and cost changes.

Use per-Service annotations for exceptions instead of deploying multiple competing controllers merely to choose different load balancer sizes.

## Understand resize and annotation removal behavior

In [v1.36.0's implementation](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go), the controller compares the desired type with the existing resource and uses Hetzner's change-type action when a configured type differs. It waits for that action and surfaces errors through reconciliation.

That is different from changing the load balancer's location, which the provider documents as requiring recreation. Do not infer identical lifecycle behavior from two annotations simply because they appear in the same Service manifest.

There is another useful detail: if the type is entirely unset, this release avoids automatically downgrading an existing load balancer to the fallback. Removing the annotation is therefore not a reliable request to resize back to `lb11`. To request a rollback, explicitly set the previous approved type, and verify that the cloud can satisfy its limits with the current configuration.

A configured cluster default also means removing an override can expose the Service to that default. Review the effective precedence before deleting the annotation.

## Verify the outcome

Watch Service events and read the cloud resource again:

```bash
kubectl -n production describe service web-public
hcloud load-balancer describe LOAD_BALANCER_ID
```

Confirm the actual type, resource ID, addresses, healthy targets, and application traffic. For a capacity change, compare relevant connection and throughput measurements during representative load. An API action that succeeds does not prove the chosen type meets the workload's needs.

If resizing fails, preserve the error and inspect current service, target, and certificate limits before retrying. Avoid deleting the Service as a shortcut, because replacing the load balancer can change its public IP.

## Conclusion

Declare the Hetzner load balancer type where its ownership is clearest: on the Service for an application-specific choice or in the controller for a platform default. Verify the actual cloud type and use explicit values for both resizing and rollback.

## Official Documentation

- [HCCM load balancer type annotation](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [HCCM cluster-wide configuration](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/configuration.md)
- [HCCM type selection and change-type behavior](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go)
