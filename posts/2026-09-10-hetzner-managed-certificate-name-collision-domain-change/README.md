# How to Diagnose Hetzner Certificate Name Collisions After Domain Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Hetzner, TLS, Load Balancing, Troubleshooting

Description: Diagnose stale or conflicting Hetzner CCM managed certificates after domain changes and move to an explicitly referenced replacement certificate without guessing ownership.

---

Changing `load-balancer.hetzner.cloud/http-managed-certificate-domains` does not necessarily replace the certificate already attached to a Hetzner load balancer. With HCCM v1.36.0, the controller attempts to create a managed certificate, treats an existing-name error as an already-created result, and later locates the certificate through a Service UID label.

That behavior can leave the old certificate in place after a domain change. Simply choosing a new certificate name on the same Service can introduce another problem: two certificates with the same ownership label. Diagnose the resource identity and domain set before changing names repeatedly.

## Capture desired and actual certificate state

Read the Service configuration and immutable Kubernetes UID:

```bash
kubectl -n production get service web-public -o json | jq '{
  uid: .metadata.uid,
  annotations: .metadata.annotations,
  ports: .spec.ports
}'
kubectl -n production describe service web-public
hcloud certificate list
hcloud load-balancer describe LOAD_BALANCER_ID
```

Inspect the certificate referenced by the load balancer's HTTPS service:

```bash
hcloud certificate describe CERTIFICATE_ID
```

Record its name, domain names, issuance status, and labels. Compare those domains with the Service's desired domain list. A healthy load balancer with a certificate missing the new hostname is still an incorrect result.

The relevant annotations are `certificate-type`, `http-managed-certificate-name`, and `http-managed-certificate-domains`, all under `load-balancer.hetzner.cloud/`. The [HCCM annotation reference](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md) documents the exact keys. The default certificate name, when none is set, includes the Service UID.

## Understand the collision behavior in this release

The [managed certificate reconciliation code](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go) submits a create operation using the requested name and domains. It does not perform an in-place update of an existing certificate's domain set when creation reports a uniqueness conflict.

The [certificate helper](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/certificates.go) maps that conflict to `ErrAlreadyExists`. Reconciliation accepts that outcome, then certificate selection searches for the label `hcloud-ccm/service-uid` matching the current Service UID.

This produces three distinguishable cases:

| Observed state | Likely consequence |
| --- | --- |
| Existing name and one certificate for this Service UID | The old certificate can remain selected despite changed desired domains |
| Existing name owned by another Service | The controller may find no certificate belonging to the current Service |
| Two certificate names with the same Service UID label | Certificate lookup fails because the result is not unique |

A Service recreated under the same Kubernetes name has a new UID, so its ownership relationship differs from the original Service. Compare UIDs before treating an old certificate as reusable controller-owned state.

## Verify issuance prerequisites separately

A name collision is different from a certificate creation request that cannot complete domain validation. Hetzner's [certificate FAQ](https://docs.hetzner.com/networking/certificates/faq/) documents its DNS requirements, including using a Hetzner DNS zone or delegating the ACME challenge as described there.

Check the relevant project, domain ownership, and DNS validation state. A unique name cannot repair missing DNS authority. Likewise, changing DNS repeatedly will not make an old certificate's subject alternative names update through a create-only collision path.

## Use an explicit replacement when domain ownership changes

One controlled recovery is to manage the replacement certificate separately and make the Service reference its ID. This avoids relying on ambiguous Service-label selection during the transition.

Create a replacement with a unique name after meeting Hetzner's DNS requirements:

```bash
hcloud certificate create \
  --name web-public-20260910 \
  --type managed \
  --domain app.example.com \
  --domain www.example.com
```

Replace the domains and inspect the resulting certificate until issuance succeeds. Do not copy the old certificate's `hcloud-ccm/service-uid` label onto this separately managed resource.

Then update the Service's managed manifest to select the explicit-reference path:

```yaml
metadata:
  annotations:
    load-balancer.hetzner.cloud/protocol: "https"
    load-balancer.hetzner.cloud/certificate-type: "uploaded"
    load-balancer.hetzner.cloud/http-certificates: "NEW_CERTIFICATE_ID"
```

Remove the old `http-managed-certificate-name` and `http-managed-certificate-domains` annotations from that manifest. In this HCCM release, the `uploaded` setting selects the certificate-reference code path; it does not convert the cloud certificate's actual type. A separately created Hetzner-managed certificate remains managed by Hetzner, while the Service references its ID. The tagged source above resolves those references without requiring an uploaded certificate type.

This changes lifecycle ownership: your certificate-management process now owns that resource and its eventual cleanup. Test this transition on a canary Service with the same controller version before applying it to a production HTTPS listener.

## Verify the served certificate before cleanup

Check the load balancer's attached certificate ID and test every intended hostname:

```bash
openssl s_client -connect app.example.com:443 \
  -servername app.example.com \
  -verify_hostname app.example.com -verify_return_error </dev/null
```

Confirm the new subject alternative names, valid chain, and successful application traffic. Only then consider deleting old certificates after inventorying every load balancer that references them. Never delete a similarly named certificate solely because the Kubernetes annotation changed.

## Conclusion

Hetzner CCM certificate naming and Service UID ownership can preserve stale domains or create ambiguous matches. Inspect the actual certificate set, then use a deliberate replacement and verified reference when changing domains requires a new certificate.

## Official Documentation

- [HCCM managed certificate reconciliation](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/load_balancer.go)
- [HCCM certificate collision and label lookup](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/internal/hcops/certificates.go)
- [Hetzner certificate DNS requirements](https://docs.hetzner.com/networking/certificates/faq/)
- [hcloud certificate create](https://github.com/hetznercloud/cli/blob/main/docs/reference/manual/hcloud_certificate_create.md)
