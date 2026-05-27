# How to Set Up Secure Web Proxy for Egress Traffic Inspection on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secure Web Proxy, Egress Control, Network Security, Proxy

Description: Learn how to deploy Google Cloud Secure Web Proxy to inspect, filter, and control egress HTTP and HTTPS traffic from your GCP workloads.

---

Controlling what your workloads can access on the internet is a fundamental security requirement. A compromised VM that can freely communicate with the internet can exfiltrate data, download malware, or connect to command-and-control servers. Google Cloud Secure Web Proxy (SWP) gives you a managed proxy that sits in the egress path, inspecting outbound HTTP/HTTPS traffic, enforcing URL-based policies, and logging all access for auditing.

In this post, I will show you how to deploy Secure Web Proxy, configure URL-based access policies, and route egress traffic through it.

## How Secure Web Proxy Works

Secure Web Proxy is a managed forward proxy. Your workloads send outbound HTTP/HTTPS requests through the proxy, and it evaluates them against your policy rules. Allowed requests are forwarded to the internet, while blocked requests are rejected.

```mermaid
flowchart LR
    A[VM in VPC] -->|HTTP/HTTPS| B[Secure Web Proxy]
    B --> C{Policy Check}
    C -->|Allowed| D[Internet Destination]
    C -->|Blocked| E[Return 403 Forbidden]
    B --> F[Cloud Logging]
```

Unlike a network firewall that operates at the IP/port level, Secure Web Proxy understands URLs and domains. You can create rules like "allow access to pypi.org but block everything else" or "allow access to *.googleapis.com but deny *.social-media.com."

## Prerequisites

```bash
# Enable required APIs

gcloud services enable networksecurity.googleapis.com
gcloud services enable networkservices.googleapis.com
gcloud services enable certificatemanager.googleapis.com
gcloud services enable compute.googleapis.com

# You need a VPC with a subnet for the proxy
# The subnet needs a dedicated IP range for the proxy endpoints
```

## Step 1 - Create a Gateway Security Policy

The gateway security policy defines the rules for what traffic is allowed and what is blocked.

```bash
# Create a gateway security policy
gcloud network-security gateway-security-policies import egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy
description: Egress filtering policy for production workloads
EOF
```

## Step 2 - Add Policy Rules

Rules are evaluated in priority order. Lower priority numbers are evaluated first.

```bash
# Rule 1: Allow access to Google APIs
gcloud network-security gateway-security-policies rules import allow-google-apis \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-google-apis
description: Allow access to Google APIs
enabled: true
priority: 100
basicProfile: ALLOW
sessionMatcher: host() == "googleapis.com" || host().endsWith(".googleapis.com")
EOF

# Rule 2: Allow access to package repositories
gcloud network-security gateway-security-policies rules import allow-package-repos \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-package-repos
description: Allow access to package repositories
enabled: true
priority: 200
basicProfile: ALLOW
sessionMatcher: host() == "pypi.org" || host() == "files.pythonhosted.org" || host() == "registry.npmjs.org" || host() == "debian.org" || host().endsWith(".debian.org")
EOF

# Rule 3: Allow access to monitoring and logging services
gcloud network-security gateway-security-policies rules import allow-monitoring \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-monitoring
description: Allow access to monitoring services
enabled: true
priority: 300
basicProfile: ALLOW
sessionMatcher: host() == "datadoghq.com" || host().endsWith(".datadoghq.com") || host() == "pagerduty.com" || host().endsWith(".pagerduty.com") || host() == "oneuptime.com" || host().endsWith(".oneuptime.com")
EOF

# Rule 4: Allow access to container registries
gcloud network-security gateway-security-policies rules import allow-container-registries \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-container-registries
description: Allow access to container registries
enabled: true
priority: 400
basicProfile: ALLOW
sessionMatcher: host() == "gcr.io" || host().endsWith(".gcr.io") || host() == "docker.io" || host().endsWith(".docker.io") || host() == "registry-1.docker.io" || host() == "ghcr.io" || host().endsWith(".ghcr.io")
EOF

# Rule 5: Block everything else
gcloud network-security gateway-security-policies rules import deny-all \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/deny-all
description: Deny all other egress traffic
enabled: true
priority: 65534
basicProfile: DENY
sessionMatcher: "true"
EOF
```

## Step 3 - Create the Secure Web Proxy Instance

Create the proxy instance in your VPC.

```bash
# First, create a subnet for the proxy (if not already existing)
gcloud compute networks subnets create swp-subnet \
    --network=my-vpc \
    --region=us-central1 \
    --range=10.0.50.0/24 \
    --purpose=PRIVATE

# Create the Secure Web Proxy instance
gcloud network-services gateways import egress-proxy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gateways/egress-proxy
type: SECURE_WEB_GATEWAY
addresses: ["10.0.50.10"]
ports: [80, 443]
gatewaySecurityPolicy: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy
network: projects/my-project/global/networks/my-vpc
subnetwork: projects/my-project/regions/us-central1/subnetworks/swp-subnet
routingMode: EXPLICIT_ROUTING_MODE
EOF

# Verify the proxy is running
gcloud network-services gateways describe egress-proxy \
    --location=us-central1
```

## Step 4 - Configure Workloads to Use the Proxy

Your VMs need to route HTTP/HTTPS traffic through the proxy. There are two approaches: explicit proxy configuration or next hop proxy routing.

### Explicit Proxy Configuration

Set the proxy environment variables on your VMs:

```bash
# Set proxy environment variables (add to /etc/environment or startup script)
export HTTP_PROXY=http://10.0.50.10:80
export HTTPS_PROXY=http://10.0.50.10:443
export NO_PROXY=metadata.google.internal,169.254.169.254,10.0.0.0/8

# For systemd services, add to the service unit file
# [Service]
# Environment="HTTP_PROXY=http://10.0.50.10:80"
# Environment="HTTPS_PROXY=http://10.0.50.10:443"
# Environment="NO_PROXY=metadata.google.internal,169.254.169.254,10.0.0.0/8"
```

For GKE pods, set the environment variables in your deployment:

```yaml
# deployment.yaml - Configure proxy for Kubernetes pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            - name: HTTP_PROXY
              value: "http://10.0.50.10:80"
            - name: HTTPS_PROXY
              value: "http://10.0.50.10:443"
            - name: NO_PROXY
              value: "metadata.google.internal,169.254.169.254,10.0.0.0/8"
```

### Next Hop Proxy with Routes

For route-based proxying, create the gateway with `routingMode: NEXT_HOP_ROUTING_MODE`, and then create routes that direct internet-bound traffic through the proxy.

```bash
# Create a route that sends internet traffic through the proxy
gcloud compute routes create egress-via-proxy \
    --network=my-vpc \
    --destination-range=0.0.0.0/0 \
    --next-hop-ilb=10.0.50.10 \
    --priority=800 \
    --tags=use-egress-proxy
```

Tag VMs that should use the proxy:

```bash
# Tag VMs to use the proxy route
gcloud compute instances add-tags my-vm \
    --zone=us-central1-a \
    --tags=use-egress-proxy
```

## Step 5 - Advanced Policy Rules

Secure Web Proxy supports sophisticated matching with CEL (Common Expression Language) expressions.

```bash
# Allow specific URL paths (requires TLS inspection for HTTPS)
gcloud network-security gateway-security-policies rules import allow-specific-paths \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-specific-paths
description: Allow GitHub API access only to our org repos
enabled: true
priority: 150
basicProfile: ALLOW
sessionMatcher: host() == "api.github.com"
tlsInspectionEnabled: true
applicationMatcher: request.path().startsWith("/repos/my-org/")
EOF

# Allow based on source service account
gcloud network-security gateway-security-policies rules import allow-from-build-servers \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-from-build-servers
description: Allow build servers broader internet access
enabled: true
priority: 50
basicProfile: ALLOW
sessionMatcher: source.matchServiceAccount("build-sa@my-project.iam.gserviceaccount.com")
EOF

# Allow OS package update destinations
gcloud network-security gateway-security-policies rules import allow-updates-window \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-updates-window
description: Allow OS package updates
enabled: true
priority: 250
basicProfile: ALLOW
sessionMatcher: host() == "ubuntu.com" || host().endsWith(".ubuntu.com") || host() == "debian.org" || host().endsWith(".debian.org")
EOF
```

## Step 6 - Monitor Proxy Traffic

All proxy decisions are logged to Cloud Logging.

```bash
# View recent proxy decisions
gcloud logging read \
    'logName="projects/my-project/logs/networkservices.googleapis.com%2Fgateway_requests" AND resource.type="networkservices.googleapis.com/Gateway"' \
    --format="table(timestamp, httpRequest.requestUrl, jsonPayload.enforcedGatewaySecurityPolicy.matchedRules.action)" \
    --limit=50

# Find blocked requests
gcloud logging read \
    'logName="projects/my-project/logs/networkservices.googleapis.com%2Fgateway_requests" AND resource.type="networkservices.googleapis.com/Gateway" AND jsonPayload.enforcedGatewaySecurityPolicy.matchedRules.action="DENIED"' \
    --format="table(timestamp, httpRequest.remoteIp, httpRequest.requestUrl, jsonPayload.enforcedGatewaySecurityPolicy.hostname)" \
    --limit=50
```

Export to BigQuery for analysis:

```sql
-- Find the most commonly blocked destinations
SELECT
    COALESCE(
        REGEXP_EXTRACT(httpRequest.requestUrl, r'https?://([^/]+)'),
        jsonPayload.enforcedGatewaySecurityPolicy.hostname
    ) AS domain,
    COUNT(*) AS block_count,
    COUNT(DISTINCT httpRequest.remoteIp) AS unique_sources
FROM
    `my_project.swp_logs.networkservices_*`
WHERE
    EXISTS (
        SELECT 1
        FROM UNNEST(jsonPayload.enforcedGatewaySecurityPolicy.matchedRules) AS rule
        WHERE rule.action = "DENIED"
    )
    AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
GROUP BY domain
ORDER BY block_count DESC
LIMIT 20;
```

## Step 7 - Handling Exceptions

When a legitimate request is blocked, you need a process for adding exceptions.

```bash
# Check what rule blocked a specific request
gcloud logging read \
    'resource.type="networkservices.googleapis.com/Gateway" AND (httpRequest.requestUrl:"blocked-domain.com" OR jsonPayload.enforcedGatewaySecurityPolicy.hostname:"blocked-domain.com")' \
    --format=json \
    --limit=5

# Add an exception rule with higher priority
gcloud network-security gateway-security-policies rules import allow-exception-domain \
    --gateway-security-policy=egress-policy \
    --location=us-central1 <<'EOF'
name: projects/my-project/locations/us-central1/gatewaySecurityPolicies/egress-policy/rules/allow-exception-domain
description: "Exception: Allow access to blocked-domain.com per ticket JIRA-1234"
enabled: true
priority: 175
basicProfile: ALLOW
sessionMatcher: host() == "blocked-domain.com"
EOF
```

Always document exceptions with a ticket reference. This creates an audit trail for why each domain was allowed.

## Wrapping Up

Secure Web Proxy gives you URL-level control over what your workloads can access on the internet. Unlike IP-based firewalls, it understands domains and URLs, which means you can write policies in terms of "allow pypi.org" rather than trying to maintain a list of IP addresses that pypi.org resolves to. Deploy it with a default-deny policy, add allow rules for the specific services your workloads need, and monitor the blocked requests to identify missing rules. The proxy logs every request, giving your security team full visibility into what your workloads are communicating with externally.
