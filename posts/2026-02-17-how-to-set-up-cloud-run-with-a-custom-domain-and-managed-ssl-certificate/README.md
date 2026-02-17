# How to Set Up Cloud Run with a Custom Domain and Managed SSL Certificate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Custom Domain, SSL, DNS

Description: A complete walkthrough for mapping a custom domain to a Cloud Run service with automatic SSL certificate provisioning, including DNS configuration and troubleshooting tips.

---

Every Cloud Run service gets a URL like `https://my-service-abc123-uc.a.run.app`. It works, but it is not exactly what you want for a customer-facing application. Setting up a custom domain with SSL is one of the first things to do after deploying a Cloud Run service, and Google makes it relatively painless by handling certificate provisioning automatically.

Let me walk through the process, including the DNS configuration that trips people up.

## Option 1: Cloud Run Domain Mapping (Simplest)

Cloud Run has a built-in domain mapping feature that handles everything for you - DNS verification, SSL certificate provisioning, and routing.

### Step 1: Verify Domain Ownership

Before you can map a domain, Google needs to verify you own it. If you have not already verified the domain:

```bash
# Initiate domain verification (opens a browser for verification)
gcloud domains verify api.example.com
```

This opens the Search Console where you can verify ownership through DNS TXT records, HTML file upload, or other methods.

If the domain is already managed in Cloud DNS within the same project, it may already be verified.

### Step 2: Create the Domain Mapping

Map your custom domain to the Cloud Run service:

```bash
# Create a domain mapping for the Cloud Run service
gcloud run domain-mappings create \
  --service=my-service \
  --domain=api.example.com \
  --region=us-central1
```

After creating the mapping, get the DNS records you need to configure:

```bash
# Get the required DNS records for the domain mapping
gcloud run domain-mappings describe \
  --domain=api.example.com \
  --region=us-central1 \
  --format="yaml(status.resourceRecords)"
```

This will output something like:

```
status:
  resourceRecords:
  - name: api
    rrdata: ghs.googlehosted.com.
    type: CNAME
```

### Step 3: Configure DNS

Add the DNS record at your DNS provider. For a subdomain like `api.example.com`, you need a CNAME record:

If you are using Cloud DNS:

```bash
# Create a CNAME record pointing to Google's hosting
gcloud dns record-sets create api.example.com \
  --zone=my-dns-zone \
  --type=CNAME \
  --ttl=300 \
  --rrdatas="ghs.googlehosted.com."
```

For an apex domain (like `example.com` without a subdomain), you need A and AAAA records instead of CNAME:

```bash
# For apex domains, use A records pointing to Google's IPs
gcloud dns record-sets create example.com \
  --zone=my-dns-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="216.239.32.21,216.239.34.21,216.239.36.21,216.239.38.21"

# Also add AAAA records for IPv6
gcloud dns record-sets create example.com \
  --zone=my-dns-zone \
  --type=AAAA \
  --ttl=300 \
  --rrdatas="2001:4860:4802:32::15,2001:4860:4802:34::15,2001:4860:4802:36::15,2001:4860:4802:38::15"
```

### Step 4: Wait for SSL Certificate Provisioning

Google automatically provisions a managed SSL certificate for your domain. This process can take anywhere from a few minutes to 24 hours, depending on DNS propagation.

Check the certificate status:

```bash
# Check the status of the domain mapping and SSL certificate
gcloud run domain-mappings describe \
  --domain=api.example.com \
  --region=us-central1 \
  --format="yaml(status)"
```

The status will progress through several states:
- `CertificatePending` - Waiting for DNS to propagate
- `CertificateProvisioning` - DNS verified, certificate being issued
- `Ready` - Certificate issued, domain is live

## Option 2: Global External Application Load Balancer (More Control)

For production services that need CDN, advanced traffic management, or WAF capabilities, use a Global External Application Load Balancer in front of Cloud Run.

### Step 1: Reserve a Global Static IP

```bash
# Reserve a global static IP for the load balancer
gcloud compute addresses create cloud-run-lb-ip \
  --global
```

Get the IP:

```bash
# Get the reserved IP address for DNS configuration
gcloud compute addresses describe cloud-run-lb-ip \
  --global \
  --format="value(address)"
```

### Step 2: Create a Serverless NEG

A Network Endpoint Group (NEG) connects the load balancer to the Cloud Run service:

```bash
# Create a serverless NEG pointing to the Cloud Run service
gcloud compute network-endpoint-groups create my-service-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=my-service
```

### Step 3: Create the Backend Service

```bash
# Create a backend service using the serverless NEG
gcloud compute backend-services create my-service-backend \
  --global

# Add the NEG as a backend
gcloud compute backend-services add-backend my-service-backend \
  --global \
  --network-endpoint-group=my-service-neg \
  --network-endpoint-group-region=us-central1
```

### Step 4: Create URL Map and SSL Certificate

```bash
# Create a URL map
gcloud compute url-maps create my-service-url-map \
  --default-service=my-service-backend

# Create a managed SSL certificate
gcloud compute ssl-certificates create my-service-cert \
  --domains=api.example.com \
  --global
```

### Step 5: Create the HTTPS Proxy and Forwarding Rule

```bash
# Create an HTTPS target proxy with the SSL certificate
gcloud compute target-https-proxies create my-service-https-proxy \
  --url-map=my-service-url-map \
  --ssl-certificates=my-service-cert

# Create a forwarding rule for HTTPS traffic
gcloud compute forwarding-rules create my-service-https-rule \
  --global \
  --target-https-proxy=my-service-https-proxy \
  --address=cloud-run-lb-ip \
  --ports=443
```

### Step 6: Add HTTP to HTTPS Redirect

Always redirect HTTP traffic to HTTPS:

```bash
# Create a URL map that redirects HTTP to HTTPS
gcloud compute url-maps import my-service-http-redirect << 'EOF'
name: my-service-http-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF

# Create an HTTP target proxy
gcloud compute target-http-proxies create my-service-http-proxy \
  --url-map=my-service-http-redirect

# Create a forwarding rule for HTTP traffic
gcloud compute forwarding-rules create my-service-http-rule \
  --global \
  --target-http-proxy=my-service-http-proxy \
  --address=cloud-run-lb-ip \
  --ports=80
```

### Step 7: Configure DNS

Point your domain to the load balancer IP:

```bash
# Create an A record pointing to the load balancer IP
LB_IP=$(gcloud compute addresses describe cloud-run-lb-ip --global --format="value(address)")

gcloud dns record-sets create api.example.com \
  --zone=my-dns-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="${LB_IP}"
```

## Troubleshooting SSL Certificate Issues

If the SSL certificate is stuck in provisioning:

```bash
# Check certificate status in detail
gcloud compute ssl-certificates describe my-service-cert \
  --global \
  --format="yaml(managed)"
```

Common issues and fixes:

1. **DNS not propagated** - Check with dig:
```bash
# Verify DNS resolution
dig api.example.com +short
```

2. **CAA records blocking** - If your domain has CAA records, make sure they allow Google to issue certificates:
```bash
# Check for CAA records that might block certificate issuance
dig api.example.com CAA
```

Add a CAA record allowing Google if needed:
```bash
# Allow Google to issue certificates for your domain
gcloud dns record-sets create example.com \
  --zone=my-dns-zone \
  --type=CAA \
  --ttl=300 \
  --rrdatas='0 issue "pki.goog"'
```

3. **Domain not verified** - Re-run domain verification:
```bash
gcloud domains verify api.example.com
```

## Choosing Between the Two Options

The domain mapping approach (Option 1) is simpler and works well for most use cases. Choose the load balancer approach (Option 2) when you need:

- Cloud CDN for global edge caching
- Cloud Armor for WAF and DDoS protection
- Multiple backend services behind one domain
- Header-based or path-based routing
- Custom health checks

Both options give you automatic SSL certificate renewal. Google handles certificate lifecycle management, so you never have to worry about certificates expiring.

Setting up a custom domain is one of those tasks that feels like it should take five minutes but often takes longer due to DNS propagation. Be patient, double-check your DNS records, and the certificates will come through.
