# How to Prevent OpenStack Load Balancer Name Collisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Cloud, Troubleshooting

Description: Assign unique stable OCCM cluster names and audit load balancer IDs so Kubernetes clusters sharing an OpenStack project do not collide during reconciliation.

---

Two Kubernetes clusters can deploy a Service named `production/web` into the same OpenStack project. That is a normal application layout, but it becomes dangerous if both cloud controllers also use the same cluster name.

OCCM's generated load balancer name incorporates the cluster name, namespace, and Service name. When the cluster component is duplicated, identical application names can produce identical cloud resource names. Prevention starts with a stable, unique controller cluster name and careful handling of existing load balancer IDs.

## Understand the naming input

In [OCCM v1.36.0](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go), `GetLoadBalancerName` constructs a name in this shape:

```text
kube_service_<cluster-name>_<namespace>_<service-name>
```

For example, two clusters both using `kubernetes` as their controller cluster name can both derive `kube_service_kubernetes_production_web`. Kubernetes itself still considers the two Services unrelated because they live in separate API servers. The collision occurs in the shared cloud project.

The implementation also supports discovery through a saved `loadbalancer.openstack.org/load-balancer-id` annotation and legacy names. Therefore the generated name is one part of resource identity, not a reason to ignore the saved UUID or cloud ownership tags during an incident.

OpenStack may permit duplicate human-readable names. That does not make duplicate names safe for software performing lookup by name. Multiple matching resources can produce ambiguity, while a single preexisting match can be mistaken for the resource a new Service is trying to ensure.

## Audit every controller sharing the project

Read the actual controller arguments in each cluster. Use explicit contexts to avoid inspecting the same cluster twice:

```bash
kubectl --context production-a -n kube-system get deployments,daemonsets
kubectl --context production-b -n kube-system get deployments,daemonsets

kubectl --context production-a -n kube-system get daemonset OCCM_NAME \
  -o jsonpath='{.spec.template.spec.containers[*].args}{"\n"}'
kubectl --context production-b -n kube-system get daemonset OCCM_NAME \
  -o jsonpath='{.spec.template.spec.containers[*].args}{"\n"}'
```

Use `deployment` instead of `daemonset` where applicable. Check the complete command field too if your installation places flags there. Compare `--cluster-name` and verify which OpenStack project, region, and endpoint each controller uses without printing credential values.

Inventory corresponding Services:

```bash
kubectl --context production-a get services --all-namespaces -o json | jq '
  .items[] | select(.spec.type == "LoadBalancer") |
  {namespace: .metadata.namespace, name: .metadata.name,
   uid: .metadata.uid,
   loadBalancerID: .metadata.annotations["loadbalancer.openstack.org/load-balancer-id"]}'
```

Run the same read against the second context. Duplicate load balancer UUIDs across clusters can be deliberate sharing, so compare them with the intended architecture before declaring a collision.

## Set a unique name before creating load balancers

For a new cluster, configure a compact name that captures environment and a durable cluster identifier:

```yaml
args:
  - --cloud-provider=openstack
  - --cloud-config=/etc/config/cloud.conf
  - --cluster-name=payments-prod-eu-a7c2
```

This is an argument fragment. Retain the existing controller flags and the correct mounted configuration path. Render your Helm chart or manifests and verify that the resulting pod command includes the chosen value. A name recorded only in an inventory system or kubeconfig context does not automatically configure OCCM.

Keep the value stable for the cluster's lifetime. Do not derive it from a release number, current timestamp, or pod name. Keep it short enough that generated names remain meaningful within the implementation's 255-character formatting limit. Very long shared prefixes can remove useful distinguishing text through truncation.

A separate OpenStack project can provide stronger lifecycle and permission isolation where appropriate, but even then a clear cluster name improves diagnostics and resource inventory.

## Handle existing collisions as an ownership repair

Changing `--cluster-name` on an established controller can affect the names it expects and the resources it discovers. The implementation contains compatibility and rename handling, but that is not a guarantee that any arbitrary collision can be fixed by restarting both controllers with new flags.

Before a change, record for every affected Service its context, namespace, name, UID, saved load balancer UUID, cloud name, VIP, floating IP, listeners, and tags. Query the cloud by UUID whenever possible:

```bash
openstack loadbalancer list
openstack loadbalancer show LOAD_BALANCER_ID -f yaml
openstack loadbalancer listener list --loadbalancer LOAD_BALANCER_ID
```

If two controllers currently mutate the same unintended load balancer, coordinate their reconciliation before repairing ownership. Preserve traffic and configuration evidence, assign each intended owner a resource, and test the change on one affected Service. Do not delete a similarly named resource until its listeners and current consumers have been identified.

Likewise, avoid directly renaming a managed Octavia load balancer while leaving Kubernetes and controller configuration inconsistent. A later reconciliation can reverse the rename or act on different lookup results.

## Verify the preventive control

Create equivalent canary Services in the two clusters and verify they receive different load balancer UUIDs and names containing the intended cluster components. Confirm each canary routes only to its own cluster's nodes. Remove the canaries and verify that deleting one does not affect the other.

Add the cluster-name check to cluster bootstrap review. That is easier to maintain than discovering a duplicated default after several application namespaces have been deployed.

## Conclusion

Unique, stable OCCM cluster names prevent identical Service names in separate clusters from collapsing into the same cloud lookup name. For existing resources, repair ownership using UUIDs and observed listeners before changing names or deleting anything.

## Official Documentation

- [OCCM load balancer name and lookup implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/openstack/loadbalancer.go)
- [OCCM manifest and cluster-name argument](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/manifests/controller-manager/openstack-cloud-controller-manager-ds.yaml)
- [OCCM shared load balancer ownership](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#sharing-load-balancer-with-multiple-services)
