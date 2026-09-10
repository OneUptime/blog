# How to Transfer a DigitalOcean Load Balancer Without Changing Its IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, Load Balancing, Networking, Cloud

Description: Move a DigitalOcean load balancer between Kubernetes clusters using a controlled disown-and-adopt handoff that preserves its public IP and avoids competing owners.

---

Moving an application to a new DigitalOcean Kubernetes cluster does not require moving its DNS record to a new IP. DigitalOcean supports transferring an existing load balancer by disowning it from the old Service and referencing its UUID in a Service in the new cluster.

The public address stays with the existing cloud resource. The backend targets and controller ownership change. This preserves the IP, but it is not a guarantee that active TCP connections survive the cutover or that applications need no migration planning.

## Establish the migration boundary

DigitalOcean's [migration documentation](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/) requires the target cluster to reside in the same VPC as the original cluster. Prepare the new application's data, secrets, configuration, and dependencies independently before handing over the load balancer.

Use explicit contexts for every Kubernetes operation. The following examples use `old-prod` and `new-prod`, a namespace named `production`, and a Service named `web`.

Record the current owner and cloud identity:

```bash
kubectl --context old-prod -n production describe service web
kubectl --context old-prod -n production get service web -o yaml
kubectl --context old-prod -n production get service web \
  -o jsonpath='{.metadata.annotations.kubernetes\.digitalocean\.com/load-balancer-id}{"\n"}'
doctl compute load-balancer get LOAD_BALANCER_ID --output json
```

Resolve existing load balancer errors first. A failing original Service can make it difficult to tell whether new errors came from migration or preexisting configuration.

## Prepare a clean target manifest

Create the target Service manifest before applying it. Carry over the required Service ports, traffic policy, source ranges, and DigitalOcean annotations for certificates, protocols, health checks, and PROXY protocol.

Do not blindly apply exported YAML containing old `uid`, `resourceVersion`, `managedFields`, `status`, `clusterIP`, or allocated NodePorts. The new cluster owns its own Service allocation. The load balancer controller will configure the new cluster's backend ports during reconciliation.

A minimal target manifest looks like this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
  annotations:
    kubernetes.digitalocean.com/load-balancer-id: "PRESERVED_LOAD_BALANCER_UUID"
    service.beta.kubernetes.io/do-loadbalancer-protocol: "tcp"
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

Expand it to match the actual frontend. The target Service should not carry `service.kubernetes.io/do-loadbalancer-disown: "true"`, because it must become the active owner.

Verify target pods and their application endpoint before the cutover. For `externalTrafficPolicy: Local`, check that ready pods are placed on the nodes expected to pass the load balancer's local health checks.

## Disown the old Service first

Apply the ownership change to the old cluster:

```bash
kubectl --context old-prod -n production annotate service web \
  service.kubernetes.io/do-loadbalancer-disown="true" --overwrite
kubectl --context old-prod -n production describe service web
```

Persist this in the source of truth so GitOps does not remove the annotation mid-migration. The [DigitalOcean settings reference](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#disown) documents that disowning stops creation, updates, and deletion driven through that Service. Annotation values must be strings.

Wait for the old controller to observe the change, inspect events, and examine its logs where accessible. Avoid overlapping this handoff with a known in-flight load balancer change. The old Service may still display the former address, but while disowned its status and target membership can become stale.

Keep this interval short. Autoscaling or node replacement in the old cluster will no longer update the disowned load balancer's targets.

## Activate the new owner

Once the old owner has relinquished control, apply the prepared target manifest:

```bash
kubectl --context new-prod apply -f web-target.yaml
kubectl --context new-prod -n production describe service web
kubectl --context new-prod -n production get service web --watch
```

Inspect the cloud resource and its targets again:

```bash
doctl compute load-balancer get PRESERVED_LOAD_BALANCER_UUID --output json
kubectl --context new-prod get nodes \
  -o custom-columns=NAME:.metadata.name,PROVIDER:.spec.providerID
```

The load balancer UUID and public address should remain unchanged. Its target Droplets should now correspond to the new cluster. Confirm healthy backends, every required frontend port, certificate presentation, and an application response that identifies the new deployment.

Use a client outside both clusters. Tests from a pod can take a different Kubernetes Service routing path and are not a substitute for checking the actual public load balancer.

## Finish or reverse the handoff deliberately

After traffic and application state are confirmed, delete the old disowned Service or change it to the intended non-load-balancer type. Keep the disown annotation effective until the old ownership relationship is gone.

For rollback, reverse ownership in the same order: disown the new Service, verify it stops managing the load balancer, then remove the disown annotation from the original Service to let it reconcile targets back. Do not simply enable both owners and hope they converge on the same configuration.

Rollback also depends on application data compatibility. Moving network traffic back does not reverse writes or schema migrations performed in the new cluster. Establish that recovery plan before the network cutover.

## Conclusion

A DigitalOcean load balancer transfer preserves the resource and its public IP through a single-owner handoff. Prepare the new application, disown the old Service, adopt by UUID, and verify target membership and traffic before retiring the old owner.

## Official Documentation

- [DigitalOcean load balancer migration workflow](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/)
- [DigitalOcean disown annotation](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#disown)
- [DigitalOcean CCM ownership behavior](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
