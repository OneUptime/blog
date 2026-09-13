# Fix Cloud Run Direct VPC Egress to Unreachable Private IPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloud Run, Google Cloud, Networking, Security, Troubleshooting

Description: Trace private connectivity from a Cloud Run revision through its subnet, route, firewall policy, and destination listener.

---

An application can call a public API successfully while every connection to a private database times out. That does not prove Direct VPC egress is working. With private-ranges-only routing, public and private destinations can take different paths.

Start with one failing connection: its destination IP, destination port, revision, timestamp, and exact error. Keep DNS resolution, TCP establishment, TLS negotiation, and application authentication separate throughout the investigation.

## Confirm the revision that made the call

Export the service configuration, then describe the revision named in the failed request's logs:

```bash
gcloud run services describe invoice-api \
  --project=example-project \
  --region=us-central1 \
  --format=export

gcloud run revisions describe REVISION_NAME \
  --project=example-project \
  --region=us-central1 \
  --format=yaml
```

Inspect the network interface configuration, subnet, network tags, and egress setting. Traffic can still reach an older revision after an update, so checking only the newest revision can produce a false diagnosis.

Direct VPC network tags belong to revisions. The setting `private-ranges-only` routes supported internal destinations into the VPC, while `all-traffic` routes all outbound traffic through it. [Direct VPC configuration](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc).

For Shared VPC, verify the host-project network and fully qualified subnet. A subnet with the right short name in the wrong project is not the same network attachment.

## Resolve the destination from the workload

Log the destination hostname and resolved addresses in a controlled diagnostic path. Do not infer what the container resolves from your laptop's DNS result. Split-horizon DNS, search domains, and IPv4 versus IPv6 selection can change the destination.

For example, this Python diagnostic reports DNS and a TCP connection attempt with a five-second timeout per resolved address separately:

```python
import socket
import time

host = "database.internal.example"
port = 5432

addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
print({"resolved_addresses": sorted({item[4][0] for item in addresses})})

start = time.monotonic()
try:
    with socket.create_connection((host, port), timeout=5) as connection:
        print({
            "connected": True,
            "local_address": connection.getsockname(),
            "remote_address": connection.getpeername(),
            "elapsed_seconds": time.monotonic() - start,
        })
except OSError as error:
    print({"connected": False, "error": str(error)})
```

Run it in the same revision or in a diagnostic workload with matching settings. It opens a TCP connection and closes it; it does not test database credentials. Restrict diagnostic output and remove the temporary path after investigation.

A connection refusal usually means an endpoint or intermediary actively rejected the connection. A timeout can indicate dropped traffic, routing failure, or an unavailable destination. Neither response alone identifies the precise firewall rule.

## Check routes and both sides of filtering

Inspect the subnet and routes in the network project:

```bash
gcloud compute networks subnets describe run-subnet \
  --project=network-project \
  --region=us-central1

gcloud compute routes list \
  --project=network-project \
  --filter='network:application-vpc'

gcloud compute firewall-rules list \
  --project=network-project \
  --filter='network:application-vpc'
```

The last command lists classic VPC firewall rules. Also inspect applicable hierarchical and network firewall policies; a short list of VPC rules is not the whole effective policy.

For a private destination, verify the path toward its subnet or connected network and the return path. On-premises routes, peering boundaries, and overlapping address space deserve explicit checks. Adding Cloud NAT is not a general remedy for traffic to a private IP.

Firewall rules are stateful, but the initial connection still needs an allowed path. An egress allow on the Cloud Run side does not override an ingress deny at the destination. [VPC firewall behavior](https://docs.cloud.google.com/firewall/docs/firewalls).

## Use network tags for the supported direction

A frequent mistake is treating a Cloud Run revision tag exactly like a Compute Engine VM source tag. Current Direct VPC documentation says network tags and service identity are not supported in ingress firewall rules for these workloads. Use the Cloud Run subnet range when defining the source of an ingress rule on a destination VM. Do not pin the rule to one ephemeral Cloud Run IP. [Direct VPC limitations and address allocation](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc#limitations).

For an existing dedicated subnet and destination VM tag, an illustrative rule is:

```bash
gcloud compute firewall-rules create allow-run-subnet-to-postgres \
  --project=network-project \
  --network=application-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:5432 \
  --source-ranges=10.40.0.0/26 \
  --target-tags=postgres-server
```

Here, `postgres-server` is a tag on the destination Compute Engine VM. The source range must match the actual Cloud Run subnet. Review effective rule priority and scope before applying the example. A managed database can have different network controls from a VM, so do not assume this rule applies to every Cloud SQL topology.

## Test the destination itself

On a VM destination, verify that the process listens on the private interface and intended port. A listener bound only to `127.0.0.1` cannot accept the remote connection. Check the host firewall and application logs alongside VPC policy.

If TCP connects but TLS fails, investigate certificate names, trust, and protocol expectations. If authentication fails after connection, investigate credentials and database authorization. Keep a successful lower-layer test as evidence instead of repeatedly changing networking.

Test startup separately from steady state. An application that connects after a delay may need bounded startup retries and a readiness condition. A permanent failure after many minutes requires a different explanation than a transient first connection.

## Conclusion

A public request proves only its own path worked. Diagnose private access using the actual revision, resolved destination, routes, effective firewall policy, and listener. Correct source-subnet rules and a verified return path are more useful than broad changes made without locating the failed layer.

## Official Documentation

- [Direct VPC configuration and limitations](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [VPC firewall rules](https://docs.cloud.google.com/firewall/docs/firewalls)
- [Describe a Cloud Run revision](https://docs.cloud.google.com/sdk/gcloud/reference/run/revisions/describe)
- [Cloud Run networking troubleshooting](https://docs.cloud.google.com/run/docs/troubleshooting)
