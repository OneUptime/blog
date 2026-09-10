# How to Diagnose DigitalOcean PROXY Protocol Requests Inside a Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, Load Balancing, Networking, Troubleshooting

Description: Diagnose requests that bypass a DigitalOcean PROXY protocol load balancer from inside Kubernetes, then use hostname status where the documented workaround applies.

---

An application can work from the internet but fail when a pod calls the same public hostname. With a DigitalOcean load balancer using PROXY protocol, one possible cause is that Kubernetes routes the connection directly to the Service backend, bypassing the external load balancer that normally adds the PROXY header.

The receiving proxy expects that header and instead sees ordinary HTTP or a TLS handshake. It may close the connection, report an invalid PROXY header, or return a confusing protocol error. Diagnose the actual path before changing application TLS settings.

## Check both sides of PROXY protocol

The DigitalOcean Service annotation is:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol: "true"
```

The backend ingress proxy must also be configured to accept PROXY protocol on the corresponding listener. Enabling only one side breaks requests regardless of where clients run. Use the configuration reference for your installed ingress controller and its exact version.

Read the Service's complete relevant state:

```bash
kubectl -n ingress-system get service ingress-public -o json | jq '{
  annotations: .metadata.annotations,
  ports: .spec.ports,
  trafficPolicy: .spec.externalTrafficPolicy,
  ingress: .status.loadBalancer.ingress
}'
```

The [DigitalOcean annotation reference](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md) documents both the PROXY protocol switch and a hostname workaround for connections that bypass the load balancer. This diagnosis applies to a connection-terminating load balancer configured to add the header; do not assume every DigitalOcean load balancer type has identical behavior.

## Compare external and internal requests

From a machine outside the cluster, request the normal application hostname:

```bash
curl --verbose --max-time 10 https://app.example.com/health
```

Then run the same request from an existing diagnostic pod with `curl` installed:

```bash
kubectl -n diagnostics exec netcheck -- \
  curl --verbose --max-time 10 https://app.example.com/health
```

Compare DNS answers and IPv4 versus IPv6 selection. If the external client and pod resolve different addresses, investigate split DNS or stale records before concluding that kube-proxy is responsible.

Inspect the ingress proxy logs during both requests. A valid external request followed by an internal connection with a missing or malformed PROXY header strongly supports a path difference. It does not alone prove which component redirected the connection; verify your kube-proxy or CNI implementation where necessary.

A direct ClusterIP request to a listener that requires PROXY protocol may also fail by design, because that internal client did not send a PROXY header. Use a separate internal listener or application Service when callers do not need the external ingress path.

## Understand the status-address interaction

Kubernetes network implementations can use `status.loadBalancer.ingress[].ip` when programming Service routing. Traffic to that IP from inside the cluster may therefore be delivered directly to backend endpoints instead of traversing the cloud load balancer.

DigitalOcean's [hostname documentation](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname) describes publishing a hostname in Service status instead of a literal IP as a workaround. This changes the information the service proxy consumes; it is not merely adding another DNS alias while leaving the same status IP in place.

Newer Kubernetes APIs include load balancer `ipMode`, and different CNIs handle external IPs differently. Check the actual Service status and installed controller behavior. Do not manually patch status to force an `ipMode` that your controller does not manage, because a later reconciliation can overwrite it.

## Apply the hostname workaround in the right order

First capture the real load balancer address and UUID:

```bash
kubectl -n ingress-system get service ingress-public \
  -o jsonpath='{.status.loadBalancer.ingress}{"\n"}'
kubectl -n ingress-system get service ingress-public \
  -o jsonpath='{.metadata.annotations.kubernetes\.digitalocean\.com/load-balancer-id}{"\n"}'
```

Create a DNS name you control, such as `lb-edge.example.net`, pointing directly to the load balancer's public address. Verify it from inside and outside the cluster before changing Service status. Avoid a circular DNS setup in which the hostname depends on the same Service status that will soon contain that hostname.

Then add the documented annotation:

```bash
kubectl -n ingress-system annotate service ingress-public \
  service.beta.kubernetes.io/do-loadbalancer-hostname=lb-edge.example.net \
  --overwrite
```

Persist the annotation in the source manifest. Wait for controller reconciliation and inspect the actual status:

```bash
kubectl -n ingress-system get service ingress-public \
  -o jsonpath='{.status.loadBalancer.ingress}{"\n"}'
```

It should now report the configured hostname through the provider's status behavior. The annotation does not create the DNS record for you or alter the application's TLS certificate. Clients still use `app.example.com`, with its existing certificate and routing rules.

## Verify the repaired path

Repeat the external and pod-originated requests and inspect ingress logs. Confirm that the load balancer now supplies the expected PROXY header for the internal call. Check all address families actually published by DNS and remove unsupported records rather than allowing clients to fail intermittently.

If the request still bypasses the cloud load balancer, inspect CNI-specific external-service handling, any remaining `externalIPs`, and the installed controller's status behavior. If it reaches the load balancer but fails, continue with health checks and ingress protocol configuration.

## Conclusion

PROXY protocol failures inside a cluster can result from bypassing the component that supplies the header. Compare traffic paths, verify both protocol endpoints, and use DigitalOcean's hostname status workaround only when that routing behavior matches the evidence.

## Official Documentation

- [DigitalOcean hostname and PROXY protocol annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
- [DigitalOcean accessing a load balancer by hostname](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname)
- [Kubernetes load balancer IP mode](https://kubernetes.io/docs/concepts/services-networking/service/#load-balancer-ip-mode)
