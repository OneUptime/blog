# How to Adopt a DigitalOcean Load Balancer into a Kubernetes Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, Load Balancing, Networking, Cloud

Description: Adopt an existing DigitalOcean load balancer by UUID, prepare compatible Service settings, and verify controller ownership without replacing its public IP.

---

DigitalOcean's cloud controller can reconcile a Kubernetes Service against an existing load balancer when the Service includes `kubernetes.digitalocean.com/load-balancer-id`. This lets the Service take over a known cloud resource instead of creating a new public endpoint.

Adoption is an ownership change. The controller can update forwarding rules, health checks, and target nodes to match the Service. Before applying the annotation, establish that the existing load balancer is available for this takeover and that another controller will not keep changing it.

## Inventory the existing resource

Use `doctl` authenticated to the DigitalOcean account containing the load balancer:

```bash
doctl compute load-balancer list
doctl compute load-balancer get LOAD_BALANCER_ID --output json
```

Record the UUID, public address, region, VPC UUID, forwarding rules, health checks, certificates, and target Droplets. Preserve a copy of the JSON in your change record. The [doctl get reference](https://docs.digitalocean.com/reference/doctl/reference/compute/load-balancer/get/) documents this read-only inspection.

The intended Kubernetes cluster must be compatible with the resource's VPC and region. A public IP does not make backend Droplets in an unrelated VPC valid targets. Do not use adoption as an implicit network migration.

Search the Kubernetes clusters and infrastructure repositories that could already own the UUID. An existing active Service must relinquish control before a new Service adopts it. DigitalOcean's [ownership migration procedure](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/) uses the `service.kubernetes.io/do-loadbalancer-disown` annotation for that handoff.

A load balancer created by Terraform or OpenTofu also needs an explicit ownership decision. Leaving infrastructure code configured to restore old forwarding rules creates the same competing-writer problem as leaving an old Service active.

## Prepare the application before adopting

Deploy the application and confirm it has ready endpoints. Create a temporary ClusterIP Service or use port-forwarding to verify the application independently of the external load balancer:

```bash
kubectl -n production get pods -l app=web -o wide
kubectl -n production get endpointslices
kubectl -n production port-forward deployment/web 18080:8080
```

Test `http://127.0.0.1:18080/` in a separate terminal if that is the application's HTTP endpoint. This verifies pod behavior, not the NodePort path, but it avoids starting adoption with a known-broken application.

Translate the existing frontend settings into supported DigitalOcean Service annotations. In particular, review TLS termination or passthrough, certificate references, PROXY protocol, health checks, and access restrictions. Defaults may differ from the manually configured resource.

## Create a Service referencing the UUID

For a simple TCP-forwarded HTTP application adopting an existing `REGIONAL` load balancer, use:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-public
  namespace: production
  annotations:
    kubernetes.digitalocean.com/load-balancer-id: "EXISTING_LOAD_BALANCER_UUID"
    service.beta.kubernetes.io/do-loadbalancer-type: "REGIONAL"
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

Replace the UUID and confirm that the existing resource is type `REGIONAL`. This example intentionally describes only an HTTP frontend on port 80. DOKS 1.33.1-do.0 and later default to `REGIONAL_NETWORK`, so explicitly retain the existing type; for a network load balancer, use its matching type and supported port configuration instead. Add every required listener and provider setting before using it to adopt a production load balancer with a richer configuration.

The adoption annotation is `kubernetes.digitalocean.com/load-balancer-id`. A custom load balancer name is not the same as an existing resource ID. Likewise, `spec.loadBalancerIP` is not the documented mechanism for claiming a specific DigitalOcean load balancer.

Apply the manifest and inspect the controller's response:

```bash
kubectl apply -f web-public.yaml
kubectl -n production describe service web-public
kubectl -n production get service web-public --watch
```

The [DigitalOcean CCM implementation](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go) uses the saved ID to locate the cloud resource. An HTTP 404 when looking up that UUID is treated as a missing load balancer and can trigger creation of a replacement with a new IP. Other API failures can stop reconciliation. Verify the UUID is accessible before applying the Service and compare the resulting identity immediately afterward; the annotation is not an adopt-only safeguard.

## Verify identity, targets, and traffic

Read the load balancer again with `doctl`. Confirm that its UUID and public IP match the pre-adoption record. Inspect its target Droplets and compare them with the cluster's node provider IDs:

```bash
kubectl get nodes \
  -o custom-columns=NAME:.metadata.name,PROVIDER:.spec.providerID
kubectl -n production get service web-public \
  -o jsonpath='{.spec.ports}{"\n"}{.status.loadBalancer.ingress}{"\n"}'
doctl compute load-balancer get EXISTING_LOAD_BALANCER_UUID --output json
```

Test the application through the public address and through its normal DNS hostname. A populated Service address alone is insufficient: the adopted resource can still have unhealthy targets or a protocol mismatch.

After takeover, manage the controller-owned configuration through the Service. DigitalOcean's [advanced settings guide](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/) warns that direct control-panel changes to cluster-managed resources can break reconciliation or cause replacement behavior.

## Plan the next ownership transition

Deleting the adopting Service can delete its managed load balancer. If the resource must survive a later move, use the documented disown procedure before deleting that owner, and promptly assign a new owner. A disowned load balancer stops receiving necessary target and configuration updates.

## Conclusion

Successful adoption preserves the load balancer's identity while moving configuration ownership to a prepared Kubernetes Service. Verify the UUID, IP, target nodes, and application protocol before considering the takeover complete.

## Official Documentation

- [DigitalOcean load balancer ownership migration](https://docs.digitalocean.com/products/kubernetes/how-to/migrate-load-balancers/)
- [DigitalOcean CCM load balancer implementation](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [Advanced DOKS load balancer settings](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/)
