# Why a VM Cannot Open a TCP Callback to a Cloud Run Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Networking, Serverless, Troubleshooting

Description: Distinguish response traffic from a new inbound connection, then use authenticated HTTPS callbacks or a suitable private TCP workload.

---

A Cloud Run service connects to a private VM. The VM sees the connection's source IP and tries to call back to that address on port 9000. The callback times out, even though the original connection worked.

The source address of an outbound connection is not a published service endpoint. Returning bytes on the established connection and opening a new connection to the source are different operations.

This article concerns Cloud Run services. Current Cloud Run worker pools have a different Direct VPC ingress capability, discussed below.

## Draw the connection direction

Suppose the service opens a connection to the VM:

```text
Cloud Run instance:ephemeral-port -> VM:7000
```

The VM can respond over that connection according to the protocol. That response is part of the existing flow. A later attempt to open this connection is new ingress:

```text
VM:ephemeral-port -> observed-Cloud-Run-address:9000
```

Stateful firewall handling for return traffic does not turn the second flow into the first. [VPC firewall connection tracking](https://docs.cloud.google.com/firewall/docs/firewalls).

Cloud Run services and jobs support Direct VPC egress but do not support Direct VPC ingress. Assigning network tags or opening a port in the container does not change that product behavior. [Direct VPC networking](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc).

Therefore, a successful service-to-VM connection proves the outbound path and the response path worked. It does not establish a supported VM-to-instance endpoint.

## Check whether the callback needs a specific instance

Many applications do not truly need the same process. They need to report that operation `export-123` completed. In that case, use an HTTPS callback to the Cloud Run service URL and include the operation ID.

Persist the pending operation before requesting work from the VM. The callback handler should find the operation in durable storage, validate the sender, and transition its state idempotently. Any instance can then receive the callback.

Do not store the only pending-operation map in memory. Even a callback to the correct service URL may reach a different instance, and the original instance may have been replaced.

If the protocol requires a response to the same live stream, keep the service-initiated connection open and send the response there. Apply application deadlines and reconnect logic. A long-lived connection is still subject to interruption; use acknowledgments and durable progress where losing a message would matter.

## Invoke the Cloud Run service URL from the VM

Read the actual endpoint:

```bash
gcloud run services describe callback-api \
  --project=example-project \
  --region=us-central1 \
  --format='value(status.url)'
```

Grant the VM's attached service account invocation access on the target service. The VM's identity is different from the Cloud Run runtime identity.

```bash
gcloud run services add-iam-policy-binding callback-api \
  --project=example-project \
  --region=us-central1 \
  --member=serviceAccount:vm-worker@example-project.iam.gserviceaccount.com \
  --role=roles/run.invoker
```

On the VM, an illustrative Python call can use the attached identity through the metadata server:

```python
import json
import os
import urllib.request

from google.auth.transport.requests import Request
from google.oauth2.id_token import fetch_id_token

audience = os.environ["CALLBACK_SERVICE_URL"]
token = fetch_id_token(Request(), audience)
payload = json.dumps({
    "operation_id": "export-123",
    "state": "complete",
}).encode("utf-8")

request = urllib.request.Request(
    audience + "/callbacks/export",
    data=payload,
    method="POST",
    headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
    },
)
with urllib.request.urlopen(request, timeout=20) as response:
    print(response.status)
```

Set `CALLBACK_SERVICE_URL` to the base URL returned by the describe command. The audience identifies the service; the HTTP URL includes the application route. Install the Google authentication dependencies in the VM environment. [Cloud Run authenticated calls](https://docs.cloud.google.com/run/docs/authenticating/service-to-service).

This example illustrates transport and identity, not complete callback validation or retry handling. A failed response can leave the sender uncertain whether the state change committed, so retry the same operation ID.

## Apply ingress policy to the HTTPS path

An internal-only ingress setting restricts which sources can reach the managed endpoint. It does not give the service's container a directly addressable VPC listener.

For a VM, verify that the network path meets the documented internal-source requirements. A VM without an external IP may need Private Google Access or another supported access path. Shared VPC and cross-project arrangements have additional conditions. [Cloud Run ingress access](https://docs.cloud.google.com/run/docs/securing/ingress).

Authenticate even when the network path is internal. Network reachability and caller authorization solve different problems. A public hostname can still participate in an allowed internal path; the hostname's appearance alone does not tell you how traffic is routed.

## Choose a TCP-capable workload when necessary

A legacy agent may require an unsolicited TCP connection to a private listener and cannot speak HTTPS. A Cloud Run service's managed ingress is not a general-purpose TCP port publisher.

Current documentation states that Cloud Run worker pools can receive Direct VPC ingress on their instance private IPs. This differs from services and requires a worker-pool design, including address discovery, lifecycle handling, firewall configuration, and scaling considerations. [Worker pool Direct VPC support](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc#direct-vpc-workerpool).

Evaluate that capability against the protocol's needs. Compute Engine or GKE may also fit workloads that require stable discovery and arbitrary inbound TCP. The relevant question is the protocol contract, not whether a Dockerfile contains an `EXPOSE` line.

## Validate both normal and replacement behavior

Test a callback after the original service request finishes and after a new revision is deployed. The durable operation should still be updated. Repeat the callback and confirm it does not apply the result twice.

For stream-based designs, interrupt the connection and verify recovery from the last acknowledged state. A successful happy-path callback does not demonstrate recovery after instance replacement.

## Conclusion

A return packet belongs to an existing connection; a TCP callback creates a new ingress requirement. For Cloud Run services, send callbacks to the authenticated HTTPS endpoint and keep operation state durable. If the protocol requires direct private TCP ingress, choose a workload that explicitly supports that requirement.

## Official Documentation

- [Direct VPC networking for Cloud Run](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [Cloud Run ingress restrictions](https://docs.cloud.google.com/run/docs/securing/ingress)
- [Authenticated service calls](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)
- [VPC firewall behavior](https://docs.cloud.google.com/firewall/docs/firewalls)
