# Diagnose Unhealthy Google Cloud Load Balancer Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Load Balancing, Health Check, VPC Firewall, Networking, Troubleshooting

Description: Trace Google Cloud load-balancer health checks from backend-service state through firewall targeting, probe traffic, ports, protocols, and application responses.

---

A firewall rule named `allow-health-checks` can exist while every load-balancer backend remains unhealthy. The rule's name is irrelevant to packet processing. It must apply to the backend, allow the correct protocol and health-check port, use the source ranges required by that load-balancer type, and result in an allow decision under the effective firewall evaluation order. The application must then return the health check's required response.

Work from the backend service toward the process. Do not begin by opening all ingress traffic.

## Establish the Exact Load Balancer and Health Check

Google Cloud has several load-balancer families. Some are Google Front End based, some are Envoy proxy based, and some are passthrough. Their health-check and data-plane firewall requirements are not interchangeable.

Inspect backend health first. For a global backend service:

```bash
gcloud compute backend-services get-health BACKEND_SERVICE \
  --project=PROJECT_ID \
  --global
```

For a regional backend service:

```bash
gcloud compute backend-services get-health BACKEND_SERVICE \
  --project=PROJECT_ID \
  --region=REGION
```

Then describe the service and the referenced health check:

```bash
gcloud compute backend-services describe BACKEND_SERVICE \
  --project=PROJECT_ID \
  --global \
  --format='yaml(loadBalancingScheme,protocol,portName,healthChecks,backends)'

gcloud compute health-checks describe HEALTH_CHECK \
  --project=PROJECT_ID \
  --global
```

Use `--region=REGION` instead of `--global` for regional resources. If the referenced URL contains `/httpHealthChecks/` or `/httpsHealthChecks/`, it identifies a legacy global health check. Describe it with `gcloud compute http-health-checks describe HEALTH_CHECK` or `gcloud compute https-health-checks describe HEALTH_CHECK`; those legacy commands do not take `--global`.

Record the health-check protocol, port specification, request path, host header, proxy-header setting, configured request and expected response strings, gRPC service name, interval, timeout, and thresholds as applicable. Also record the backend type: instance group, zonal network endpoint group, hybrid NEG, serverless NEG, or another supported backend. Serverless and Private Service Connect NEGs do not support health checks. For hybrid and regional internet NEGs that use distributed Envoy health checks, the console, API, and `gcloud compute backend-services get-health` do not report endpoint health. The relevant diagnostics differ.

## Prove the Firewall Rule Applies

For backend VMs, an ingress allow rule needs all of these to be true:

1. It is in the backend VM's VPC network.
2. Its target includes the VM, through matching network tags, target service accounts, or an applicable all-instances target.
3. Its source covers every documented health-check prober range for this load-balancer type.
4. Its allowed protocol and destination port match the health check.
5. The VM interface's effective firewall evaluation permits the traffic, accounting for hierarchical, regional system, network firewall policy, and VPC firewall rules.

Inspect the actual VM identity and tags:

```bash
gcloud compute instances describe VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --format='yaml(networkInterfaces[].name,networkInterfaces[].network,networkInterfaces[].networkIP,networkInterfaces[].ipv6Address,tags.items,serviceAccounts[].email)'
```

Then list potentially relevant VPC rules in the project that owns the VPC network. For Shared VPC, this is the host project, not the VM's service project:

```bash
gcloud compute firewall-rules list \
  --project=VPC_PROJECT_ID \
  --filter='direction=INGRESS' \
  --format='table(name,network,priority,sourceRanges.list():label=SOURCE_RANGES,allowed[].map().firewall_rule().list():label=ALLOW,denied[].map().firewall_rule().list():label=DENY,targetTags.list():label=TARGET_TAGS,targetServiceAccounts.list():label=TARGET_SERVICE_ACCOUNTS,disabled)'
```

That command shows VPC firewall rules only. Inspect the rules effective on the relevant VM interface to include inherited and associated policies:

```bash
gcloud compute instances network-interfaces get-effective-firewalls VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --network-interface=NETWORK_INTERFACE \
  --format=json
```

Priorities are compared within each policy or rule tier, not globally across all firewall policy types. The evaluation order also depends on the VPC network's firewall-policy enforcement order, and a VPC deny rule wins over an allow rule at the same priority.

Do not copy a source-range list from an unrelated tutorial. Google's load-balancing firewall table is the source of truth and varies by product, IP family, backend type, and purpose. For example, the documented IPv4 health-check source for a global external Application Load Balancer is `35.191.0.0/16`; GFE proxy traffic to several backend types additionally uses `130.211.0.0/22`. For instance-group and `GCE_VM_IP_PORT` zonal NEG backends of managed Envoy load balancers, centralized health-check traffic uses Google's prober ranges while proxied user traffic comes from the allocated proxy-only subnet. Hybrid and regional internet NEGs instead use distributed Envoy health checks that originate from the proxy-only subnet; traffic to regional internet NEG endpoints is NAT-translated before leaving the VPC.

Limit an allow rule to the documented sources, TCP or the required protocol, the probe port, and the real backend targets. A temporary `0.0.0.0/0` rule proves little and creates unnecessary exposure.

## Check the Port Mapping End to End

The health check might not probe the port you expect. Regular health checks have two port specification methods: a fixed `--port`, or `--use-serving-port` where supported. For a zonal `GCE_VM_IP_PORT` NEG, the serving port is each endpoint's port. For an instance group, it resolves through the backend service's `portName` and the instance group's named-port mapping. Passthrough load balancers require a fixed health-check port. Verify the applicable mapping:

```text
fixed health-check port
        -> process listen address and port

health check using the serving port
        -> NEG endpoint port
        or backend service portName -> instance-group named port
        -> process listen address and port
```

On a backend VM, confirm that a process is listening on a non-loopback address:

```bash
sudo ss -lntp
```

A process bound only to `127.0.0.1` cannot accept probes sent to a VM or endpoint IP. For a passthrough Network Load Balancer, probes instead target the forwarding-rule IP, so the application must bind to that IP or to `0.0.0.0`; binding only another non-loopback address is insufficient. A container-published port, Kubernetes NodePort, or sidecar listener can add another translation layer. For an HTTP-family health check, test the documented probe destination and port from an allowed VPC source. For a passthrough load balancer, a normal request to the forwarding-rule IP can be sent to any eligible backend, so confirm the selected backend in packet or access logs:

```bash
curl --verbose --max-time 5 http://TEST_IP:PORT/HEALTH_PATH
```

Match the health check's `Host` header in the manual request; if no host is configured, Google uses the load balancer's forwarding-rule IP. For an HTTPS check, use `https://`; for an HTTP/2 check, also pass `--http2`. Google health-check probers do not validate backend certificates, while `curl` does by default; a certificate validation error from `curl` therefore does not reproduce probe behavior. Use `--insecure` only when intentionally emulating the prober's lack of certificate validation. A successful local `curl localhost` proves only the process, while a remote VPC test also exercises the guest firewall, routing, and listen address. Neither test alone proves that Google health-check probers are admitted by VPC policy.

## Validate the Application-Level Success Condition

For HTTP, HTTPS, and HTTP/2 health checks, Google always expects an HTTP `200 OK` response before the timeout. If the health check configures an expected response string, the prober must also find it within the first 1,024 bytes of the response body. Common application failures include:

- the configured request path returns `301`, `302`, `401`, `403`, `404`, or `500`;
- the endpoint returns `200`, but its body does not contain the configured expected response string;
- authentication middleware protects the health endpoint;
- a virtual host requires a `Host` value different from the health check configuration;
- the handler depends on a slow or failed downstream service and exceeds the timeout;
- the application accepts user traffic on one port but the health check uses another;
- TLS negotiation or HTTP/2 support does not match the configured health-check protocol.

Build a lightweight health endpoint that returns `200` and any configured expected response only when this backend should receive new traffic. Do not require an authorization header that health check probes do not send. Also avoid a health response that always returns `200` while the serving process is unusable.

## Use Health-Check Logs and Packet Evidence

Enable health-check logging on a supported non-legacy health-check resource; legacy health checks and target pools do not support it. Google writes logs when an endpoint changes health state, not for every probe. Entries can include a detailed state, latency fields, and `probeResultText`, but that text can be empty. A `TIMEOUT` state can mean that a connection could not be established or that the server did not respond before the timeout, while `UNHEALTHY` means the endpoint was reachable but did not conform to the health check. Distributed Envoy health checks for hybrid and regional internet NEGs omit detailed states and several probe-detail fields.

Query the health-check log in Cloud Logging with:

```text
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fhealthchecks"
```

Correlate the timestamp with application access logs. The evidence separates cases cleanly:

| Evidence | Likely boundary |
| --- | --- |
| No probe packets and no application log | VPC policy, target mismatch, hybrid route, or wrong probe destination |
| TCP SYN arrives, no SYN-ACK | Process not listening, guest firewall, or wrong port |
| Connection succeeds, no timely response | Slow or stuck handler |
| Application returns non-200, or `200` without the configured body match | Path, host, authentication, response matcher, or application state |
| Successful probes but user requests fail | Data-plane firewall, proxy-only subnet, routing, backend protocol, or application behavior outside the health path |

On a VM, a short, tightly filtered capture can confirm whether probes reach the interface:

```bash
sudo tcpdump -ni any 'tcp port PORT'
```

Google advises allowing the complete documented prober ranges, even if a capture shows only a subset. Prober addresses can vary.

## Distinguish Backend Health from User-Traffic Failures

Healthy backends can still produce load-balancer 5xx responses. For global external and classic Application Load Balancers, inspect the request log's `statusDetails` field. Regional external and regional or cross-region internal Application Load Balancers use `proxyStatus`; its optional details portion includes values such as `failed_to_pick_backend` and `failed_to_connect_to_backend`. `failed_to_pick_backend` can indicate that no eligible healthy backend was available. `failed_to_connect_to_backend` points to a connection failure after backend selection. Other values identify timeouts or backend-closed connections.

For instance-group and `GCE_VM_IP_PORT` zonal NEG backends of managed Envoy load balancers, make sure the firewall also permits connections from the proxy-only subnet to serving ports. A rule that permits only the centralized health-check ranges does not admit proxied user traffic; conversely, a rule that permits only the proxy-only subnet does not admit centralized health checks. For hybrid and regional internet NEGs, distributed health checks also originate from the proxy-only subnet; traffic to regional internet NEG endpoints is NAT-translated before leaving the VPC.

After a change, allow enough time for the configured healthy threshold to be met and for state to propagate. For centralized health checks, confirm health with `backend-services get-health`; do not infer it only from a successful manual request. For distributed Envoy health checks, use health-check and load-balancer logs because `get-health` does not report endpoint health.

## Official Documentation

- [Cloud Load Balancing firewall rules](https://cloud.google.com/load-balancing/docs/firewall-rules)
- [Health checks overview](https://cloud.google.com/load-balancing/docs/health-check-concepts)
- [Create and use health checks](https://cloud.google.com/load-balancing/docs/health-checks)
- [Health-check logging](https://cloud.google.com/load-balancing/docs/health-check-logging)
- [Troubleshoot external Application Load Balancers](https://cloud.google.com/load-balancing/docs/https/troubleshooting-ext-https-lbs)
- [Backend service health command reference](https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health)

## Conclusion

An allow rule's presence is only one checkpoint. Identify the load-balancer family, inspect the exact health check, prove that firewall targeting and source ranges apply to the backend, trace every port mapping, and verify the response that the prober actually receives. Health-check logs and backend packet or access logs reveal whether the failure is policy, transport, protocol, or application behavior.
