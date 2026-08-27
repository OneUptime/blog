# How to Diagnose an Unhealthy Google Cloud Load Balancer Backend When the Firewall Rule Looks Correct

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Cloud Load Balancing, Health Checks, VPC Firewall, Networking, Troubleshooting

Description: Trace Google Cloud load-balancer health checks from backend-service state through firewall targeting, probe traffic, ports, protocols, and application responses.

---

A firewall rule named `allow-health-checks` can exist while every load-balancer backend remains unhealthy. The rule's name is irrelevant to packet processing. It must apply to the backend, allow the correct protocol and health-check port, use the source ranges required by that load-balancer type, and not be superseded by another applicable policy. The application must then return the health check's required response.

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
  --format='yaml(protocol,portName,healthChecks,backends)'

gcloud compute health-checks describe HEALTH_CHECK \
  --project=PROJECT_ID \
  --global
```

Use `--region=REGION` instead of `--global` for regional resources. Record the health-check protocol, port specification, request path, host header if configured, interval, timeout, and thresholds. Also record the backend type: instance group, zonal network endpoint group, hybrid NEG, serverless NEG, or another supported backend. The relevant diagnostics differ.

## Prove the Firewall Rule Applies

For backend VMs, an ingress allow rule needs all of these to be true:

1. It is in the backend VM's VPC network.
2. Its target includes the VM, through matching network tags, target service accounts, or an applicable all-instances target.
3. Its source covers every documented health-check prober range for this load-balancer type.
4. Its allowed protocol and destination port match the health check.
5. No higher-priority hierarchical or network firewall policy produces a different result.

Inspect the actual VM identity and tags:

```bash
gcloud compute instances describe VM_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --format='yaml(networkInterfaces.network,networkInterfaces.networkIP,tags.items,serviceAccounts.email)'
```

Then list potentially relevant VPC rules:

```bash
gcloud compute firewall-rules list \
  --project=PROJECT_ID \
  --filter='direction=INGRESS' \
  --format='table(name,network,priority,sourceRanges.list():label=SOURCE_RANGES,allowed:label=ALLOW,targetTags.list():label=TARGET_TAGS,targetServiceAccounts.list():label=TARGET_SERVICE_ACCOUNTS,disabled)'
```

Do not copy a source-range list from an unrelated tutorial. Google's load-balancing firewall table is the source of truth and varies by product, IP family, backend type, and purpose. For example, the documented IPv4 health-check source for a global external Application Load Balancer is `35.191.0.0/16`; GFE proxy traffic to several backend types additionally uses `130.211.0.0/22`. Envoy-based load balancers also require data-plane ingress from the allocated proxy-only subnet. Health-check traffic and proxied user traffic are separate requirements.

Limit an allow rule to the documented sources, TCP or the required protocol, the probe port, and the real backend targets. A temporary `0.0.0.0/0` rule proves little and creates unnecessary exposure.

## Check the Port Mapping End to End

The health check might not probe the port you expect. Depending on its port specification, it can use a fixed port, the backend service's serving port, or a named port. Verify every mapping:

```text
health-check port setting
        -> backend service port or portName
        -> instance-group named port, when applicable
        -> process listen address and port
```

On a backend VM, confirm that a process is listening on a non-loopback address:

```bash
sudo ss -lntp
```

A process bound only to `127.0.0.1` cannot accept probes sent to the VM or endpoint IP. A container-published port, Kubernetes NodePort, or sidecar listener can add another translation layer. Test the exact backend address and port from an allowed VPC source:

```bash
curl --verbose --max-time 5 http://BACKEND_IP:PORT/HEALTH_PATH
```

For an HTTPS check, use `https://`. A successful local `curl localhost` proves only the process, while a remote VPC test also exercises the guest firewall, routing, and listen address. Neither test alone proves that Google health-check probers are admitted by VPC policy.

## Validate the Application-Level Success Condition

For HTTP, HTTPS, and HTTP/2 health checks, Google expects an HTTP `200 OK` response before the timeout. Common application failures include:

- the configured request path returns `301`, `302`, `401`, `403`, `404`, or `500`;
- authentication middleware protects the health endpoint;
- a virtual host requires a `Host` value different from the health check configuration;
- the handler depends on a slow or failed downstream service and exceeds the timeout;
- the application accepts user traffic on one port but the health check uses another;
- TLS negotiation or HTTP/2 support does not match the configured health-check protocol.

Build a lightweight health endpoint that returns `200` only when this backend should receive new traffic. Do not require an authorization header that health check probes do not send. Also avoid a health response that always returns `200` while the serving process is unusable.

## Use Health-Check Logs and Packet Evidence

Enable health-check logging on the health-check resource. Google writes logs when an endpoint changes health state, including probe-result details that distinguish timeouts, connection failures, and response mismatches.

Query the health-check log in Cloud Logging with:

```text
logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fhealthchecks"
```

Correlate the timestamp with application access logs. The evidence separates cases cleanly:

| Evidence | Likely boundary |
| --- | --- |
| No probe packets and no application log | VPC policy, target mismatch, route, or wrong backend address |
| TCP SYN arrives, no SYN-ACK | Process not listening, guest firewall, or wrong port |
| Connection succeeds, no timely response | Slow or stuck handler |
| Application logs a non-200 response | Path, host, authentication, or application state |
| Successful probes but user requests fail | Data-plane firewall, proxy-only subnet, routing, backend protocol, or application behavior outside the health path |

On a VM, a short, tightly filtered capture can confirm whether probes reach the interface:

```bash
sudo tcpdump -ni any 'tcp port PORT'
```

Google advises allowing the complete documented prober ranges, even if a capture shows only a subset. Prober addresses can vary.

## Distinguish Backend Health from User-Traffic Failures

Healthy backends can still produce load-balancer 5xx responses. For Application Load Balancers, inspect the request log's `statusDetails` field. `failed_to_pick_backend` can indicate that no eligible healthy backend was available. `failed_to_connect_to_backend` points to a connection failure after backend selection. Other values identify timeouts or backend-closed connections.

For Envoy-based regional load balancers, make sure the firewall also permits connections from the proxy-only subnet to serving ports. A correct health-check rule does not automatically admit proxied user traffic. Conversely, a data-plane rule does not replace the health-check rule.

After a change, allow enough time for the configured healthy threshold to be met and for state to propagate. Confirm health with `backend-services get-health`; do not infer it only from a successful manual request.

## Official Documentation

- [Cloud Load Balancing firewall rules](https://cloud.google.com/load-balancing/docs/firewall-rules)
- [Health checks overview](https://cloud.google.com/load-balancing/docs/health-check-concepts)
- [Create and use health checks](https://cloud.google.com/load-balancing/docs/health-checks)
- [Health-check logging](https://cloud.google.com/load-balancing/docs/health-check-logging)
- [Troubleshoot external Application Load Balancers](https://cloud.google.com/load-balancing/docs/https/troubleshooting-ext-https-lbs)
- [Backend service health command reference](https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health)

## Conclusion

An allow rule's presence is only one checkpoint. Identify the load-balancer family, inspect the exact health check, prove that firewall targeting and source ranges apply to the backend, trace every port mapping, and verify the response that the prober actually receives. Health-check logs and backend packet or access logs reveal whether the failure is policy, transport, protocol, or application behavior.
