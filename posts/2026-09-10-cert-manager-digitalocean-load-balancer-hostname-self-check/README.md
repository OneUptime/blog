# How to Fix cert-manager Self-Checks with a DigitalOcean Hostname

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DigitalOcean, TLS, Networking, Troubleshooting

Description: Use DigitalOcean load balancer hostname status to repair cert-manager HTTP-01 self-checks that bypass a PROXY protocol or TLS-terminating load balancer.

---

A cert-manager HTTP-01 challenge can remain pending even when the challenge URL works from your laptop. On DigitalOcean, a useful explanation to investigate is that cert-manager's in-cluster self-check reaches the ingress backend through a different path than an external ACME validator.

If that path bypasses a load balancer supplying PROXY protocol or performing TLS termination, the internal request can fail while the public path succeeds. The load balancer hostname annotation can address this specific routing behavior. It does not fix every pending certificate.

## Read the actual Challenge failure

Start with the Certificate, Order, and Challenge objects in the application's namespace:

```bash
kubectl -n production get certificates,orders,challenges
kubectl -n production describe challenge CHALLENGE_NAME
kubectl -n production get challenge CHALLENGE_NAME -o json | jq '{
  dnsName: .spec.dnsName,
  token: .spec.token,
  presented: .status.presented,
  processing: .status.processing,
  reason: .status.reason,
  state: .status.state
}'
```

Use the exact hostname and token to build the HTTP-01 URL. The [cert-manager troubleshooting guide](https://cert-manager.io/docs/troubleshooting/acme/) explains that cert-manager performs a self-check before presenting the challenge to the ACME provider. A self-check failure is therefore not automatically a Let's Encrypt rate limit or account problem.

Distinguish DNS lookup failure, connection timeout, unexpected HTTP status, and unexpected response body. Each points to a different next investigation. Do not repeatedly delete Certificates or Orders while the same self-check failure remains unresolved.

## Test the challenge URL through both paths

From an external client, request the exact URL reported by the Challenge:

```bash
curl --verbose --max-time 10 \
  http://app.example.com/.well-known/acme-challenge/CHALLENGE_TOKEN
```

Run the same command from an existing diagnostic pod in the cluster:

```bash
kubectl -n diagnostics exec netcheck -- curl --verbose --max-time 10 \
  http://app.example.com/.well-known/acme-challenge/CHALLENGE_TOKEN
```

Substitute the real token without changing the path. Compare the response body with the challenge's expected key authorization, available in `.spec.key`. Testing `/` or a health endpoint cannot establish that the solver route works.

If both requests fail with 404, inspect the solver Ingress and its class, the solver Service, and its EndpointSlices. If only the internal request fails, compare DNS answers and look at ingress proxy logs. A diagnostic pod may have different network policies from cert-manager itself, so use its result to narrow the cause rather than treating it as identical to the controller's environment.

## Confirm that the load balancer is being bypassed

Inspect the public ingress Service:

```bash
kubectl -n ingress-system get service ingress-public -o json | jq '{
  annotations: .metadata.annotations,
  externalIPs: .spec.externalIPs,
  ingress: .status.loadBalancer.ingress
}'
```

Look for PROXY protocol settings or TLS termination at the DigitalOcean load balancer. The [DigitalOcean CCM annotation reference](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md) describes the hostname workaround for Kubernetes routing that bypasses external load balancer processing.

In an affected configuration, the Service status contains a literal load balancer IP. Kubernetes service routing can intercept pod traffic to that IP and send it directly to the backend. A backend expecting a PROXY header then sees ordinary HTTP, or a TLS-related path no longer receives the processing performed by the external load balancer.

Use the actual networking implementation and request logs to confirm this explanation. A wrong ingress class, an HTTP-to-HTTPS redirect, split DNS, or an egress NetworkPolicy can produce a superficially similar pending challenge and needs its own repair.

## Publish a real DNS hostname in Service status

Capture the public IP before changing the annotation, or read it from the DigitalOcean load balancer API by UUID. Create a stable DNS name such as `lb-edge.example.net` pointing to that public IP. The name must resolve correctly from cert-manager's environment and from external clients.

Apply the hostname annotation to the ingress controller's LoadBalancer Service, not to the Certificate, Challenge, or solver pod:

```bash
kubectl -n ingress-system annotate service ingress-public \
  service.beta.kubernetes.io/do-loadbalancer-hostname=lb-edge.example.net \
  --overwrite
```

Store it in the Service's managed manifest. DigitalOcean documents the sequence of creating the DNS record and then publishing the hostname through its [advanced load balancer settings](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname).

Check the reconciled status:

```bash
kubectl -n ingress-system get service ingress-public \
  -o jsonpath='{.status.loadBalancer.ingress}{"\n"}'
```

The annotation changes the Service's reported ingress address. It does not change the Certificate's requested domain, create an ACME solver rule, or create a DNS record automatically. Keep `app.example.com` as the application hostname and ensure its normal DNS still reaches the same load balancer.

## Let cert-manager retry and verify issuance

Repeat the exact challenge request from the cluster, then observe the existing Challenge and Certificate:

```bash
kubectl -n production get challenges --watch
kubectl -n production describe certificate APP_CERTIFICATE
```

A successful self-check should allow the ACME process to continue, provided public validation also succeeds. Verify the resulting Certificate readiness and the certificate actually served to clients. Do not disable self-checks to hide a broken traffic path.

If the hostname change does not repair the internal request, return to the observed failure. Inspect remaining IP-based Service routing, CNI behavior, solver endpoints, redirect rules, and cert-manager egress access instead of cycling through unrelated annotations.

## Conclusion

The DigitalOcean hostname annotation helps when cert-manager's self-check bypasses required load balancer processing. Prove that path difference, apply the annotation to the public ingress Service, and verify the existing challenge can complete through the repaired route.

## Official Documentation

- [cert-manager ACME troubleshooting](https://cert-manager.io/docs/troubleshooting/acme/)
- [DigitalOcean load balancer hostname configuration](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname)
- [DigitalOcean CCM Service annotation reference](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
