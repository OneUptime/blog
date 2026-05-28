# How to Fix SSL Certificate FAILED_NOT_VISIBLE Error in GCP Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, SSL Certificate, HTTPS, Troubleshooting

Description: Fix the FAILED_NOT_VISIBLE error for Google-managed SSL certificates in GCP load balancers by resolving DNS configuration, domain verification, and certificate propagation issues.

---

You set up an HTTPS load balancer in GCP with a Google-managed SSL certificate, and the certificate status shows `FAILED_NOT_VISIBLE`. Your site is not serving over HTTPS, and the certificate refuses to provision. This error means Google tried to verify your domain ownership but could not see DNS records that resolve to the load balancer's IP address.

Let me walk through how to diagnose and fix this.

## Understanding the Error

When you create a Google-managed SSL certificate and attach it to a load balancer, Google's certificate authority needs to verify that you control the domain. It does this by checking that the domain's DNS records resolve to the load balancer's IP address.

`FAILED_NOT_VISIBLE` means the verification check has not completed. Google looked up your domain's DNS records and did not find them resolving to the right place.

```bash
# Check the certificate status

gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="yaml(managed)"
```

The output will show something like:

```yaml
managed:
  domainStatus:
    example.com: FAILED_NOT_VISIBLE
  domains:
  - example.com
  status: PROVISIONING
```

## Step 1: Get the Load Balancer's IP Address

First, find the IP address that your domain needs to point to:

```bash
# Get the external IP of the forwarding rule
gcloud compute forwarding-rules list \
    --global \
    --format="table(name, IPAddress, target)"

# Or get the reserved static IP address
gcloud compute addresses list --global \
    --format="table(name, address, status)"
```

Note the IP address. This is what your DNS records must point to.

## Step 2: Fix DNS Records

For subdomains, create an A record. A CNAME can work if it eventually resolves to an A or AAAA record for the load balancer IP, but pointing directly to the load balancer IP is the simplest and most reliable setup:

```bash
# Check current DNS records for your domain
dig example.com A +short
dig www.example.com A +short

# The A record should point to the load balancer IP
# If using Cloud DNS:
gcloud dns record-sets create example.com. \
    --zone=my-dns-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="34.120.xxx.xxx"  # Your load balancer IP

# For www subdomain
gcloud dns record-sets create www.example.com. \
    --zone=my-dns-zone \
    --type=A \
    --ttl=300 \
    --rrdatas="34.120.xxx.xxx"
```

If the certificate covers multiple domains, all of them must resolve only to the load balancer IP. If you publish both A and AAAA records, both must point to the load balancer:

```bash
# Check all domains on the certificate
gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="value(managed.domains)"

# Verify each domain resolves to the LB IP
for domain in example.com www.example.com api.example.com; do
    echo "$domain: $(dig +short $domain A)"
done
```

## Step 3: Verify DNS Propagation

After updating DNS, it takes time to propagate. Check from multiple angles:

```bash
# Check from Google's public DNS
dig @8.8.8.8 example.com A +short

# Check from Cloudflare DNS
dig @1.1.1.1 example.com A +short

# Check the authoritative nameserver
dig example.com NS +short
dig @ns1.your-registrar.com example.com A +short
```

If the records are correct from Google's DNS servers, the certificate should start provisioning within 15-60 minutes.

## Step 4: Check for CAA Record Issues

Certificate Authority Authorization (CAA) records can prevent Google from issuing certificates:

```bash
# Check for CAA records
dig example.com CAA +short
```

If CAA records exist, they must allow a CA that Google Cloud can use. For best reliability, allow both `pki.goog` and `letsencrypt.org`:

```bash
gcloud dns record-sets transaction start --zone=my-dns-zone

gcloud dns record-sets transaction add \
    --zone=my-dns-zone \
    --name=example.com. \
    --type=CAA \
    --ttl=300 \
    '0 issue "pki.goog"' '0 issue "letsencrypt.org"'

gcloud dns record-sets transaction execute --zone=my-dns-zone
```

If you want to force Google Trust Services only, use just `0 issue "pki.goog"`, but that is less flexible than allowing both supported CAs.

## Step 5: Check for Proxy Interference

If you are using a DNS proxy like Cloudflare with the orange cloud (proxy) enabled, the DNS resolves to Cloudflare's IPs instead of your load balancer's IP. Google cannot see its own IP and the certificate fails.

Solution: Set the DNS record to "DNS only" (grey cloud) in Cloudflare until the certificate provisions. After provisioning, you can decide whether to keep Cloudflare's proxy disabled (recommended when using GCP load balancer) or re-enable it.

## Step 6: Wait and Monitor

Google-managed certificates can take up to 60 minutes to provision after DNS and load balancer configuration changes have propagated. DNS propagation itself can sometimes take up to 72 hours worldwide. Monitor the status:

```bash
# Check certificate status periodically
watch -n 60 'gcloud compute ssl-certificates describe my-cert --global --format="yaml(managed.domainStatus)"'

# Or check via CLI without watch
gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="table(managed.domainStatus,managed.status)"
```

The status progression is:
1. `PROVISIONING` - Initial state
2. `FAILED_NOT_VISIBLE` - DNS verification failed
3. `PROVISIONING` - After DNS fix, retries automatically
4. `ACTIVE` - Certificate issued and ready

## Step 7: Delete and Recreate If Stuck

If the certificate has been in `FAILED_NOT_VISIBLE` long after fixing DNS and the load balancer configuration, create a replacement certificate and attach it to the same target proxy so Google can validate it. Keep the old certificate attached until the replacement is `ACTIVE`, then remove and delete the old certificate:

```bash
# Create a new certificate
gcloud compute ssl-certificates create my-cert-v2 \
    --domains=example.com,www.example.com \
    --global

# Attach both certificates while the replacement provisions
gcloud compute target-https-proxies update my-https-proxy \
    --ssl-certificates=my-cert,my-cert-v2 \
    --global-ssl-certificates \
    --global

# After my-cert-v2 is ACTIVE and has had time to propagate, remove the old certificate
gcloud compute target-https-proxies update my-https-proxy \
    --ssl-certificates=my-cert-v2 \
    --global-ssl-certificates \
    --global

# Delete the old certificate after it is no longer referenced
gcloud compute ssl-certificates delete my-cert --global
```

## Using Certificate Map for Multiple Certificates

For more control, use Certificate Manager with a certificate map:

```bash
# Create a DNS authorization for your domain
gcloud certificate-manager dns-authorizations create example-com-auth \
    --domain=example.com

gcloud certificate-manager dns-authorizations create www-example-com-auth \
    --domain=www.example.com

# Get the DNS record to create for verification
gcloud certificate-manager dns-authorizations describe example-com-auth \
    --format="value(dnsResourceRecord.name, dnsResourceRecord.type, dnsResourceRecord.data)"

gcloud certificate-manager dns-authorizations describe www-example-com-auth \
    --format="value(dnsResourceRecord.name, dnsResourceRecord.type, dnsResourceRecord.data)"

# Create each CNAME record as specified in the output
# Then create the certificate
gcloud certificate-manager certificates create my-cert \
    --domains=example.com,www.example.com \
    --dns-authorizations=example-com-auth,www-example-com-auth

# Create a certificate map and attach it to the load balancer
gcloud certificate-manager maps create my-map
gcloud certificate-manager maps entries create example-com-entry \
    --map=my-map \
    --certificates=my-cert \
    --hostname=example.com

gcloud certificate-manager maps entries create www-example-com-entry \
    --map=my-map \
    --certificates=my-cert \
    --hostname=www.example.com

gcloud compute target-https-proxies update my-https-proxy \
    --certificate-map=my-map \
    --global
```

Certificate Manager provides DNS authorization, which can be more predictable than load balancer authorization used by Compute Engine Google-managed certificates.

## Debugging Flowchart

```mermaid
graph TD
    A[FAILED_NOT_VISIBLE] --> B[Get load balancer IP]
    B --> C[Check DNS records with dig]
    C --> D{DNS resolves only to LB IP?}
    D -->|No| E[Fix DNS A records]
    D -->|Yes| F{CAA records blocking?}
    F -->|Yes| G[Allow pki.goog and letsencrypt.org in CAA]
    F -->|No| H{Using DNS proxy?}
    H -->|Yes| I[Disable proxy - use DNS only]
    H -->|No| J{Multiple domains on cert?}
    J -->|Yes| K[Verify ALL domains resolve to LB IP]
    J -->|No| L{Been 72+ hours?}
    L -->|No| M[Wait for propagation]
    L -->|Yes| N[Create replacement certificate]
```

The `FAILED_NOT_VISIBLE` error usually comes back to DNS or load balancer attachment. Make sure every domain on your certificate resolves only to the load balancer's IP address, the certificate is attached to the target proxy, port 443 is configured, no proxy is in the way, and no CAA records block the certificate authorities Google Cloud can use. Once DNS and load balancer configuration are right, the certificate provisions automatically.
