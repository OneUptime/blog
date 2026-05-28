# How to Configure IP-Based Access Levels for VPC Service Controls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Context Manager, IP-Based Access, VPC Service Controls, Network Security

Description: A detailed guide to configuring IP-based access levels in Access Context Manager for VPC Service Controls, including corporate networks, VPNs, and cloud NAT ranges.

---

IP-based access levels are the most straightforward way to control who can reach resources inside a VPC Service Controls perimeter. The concept is simple: if a request comes from a known public IP range (like your corporate office or VPN egress), it can be allowed through the perimeter. If it comes from an unknown IP, it is blocked.

This is the first access level most organizations create, and for good reason - it helps protect against credential theft by ensuring that even if someone steals credentials, they cannot use them to access protected resources unless they are on your network.

In this post, I will cover how to set up IP-based access levels for various network configurations.

## Prerequisites

- An access policy in Access Context Manager
- VPC Service Controls perimeter configured
- Knowledge of your organization's IP ranges

```bash
# Get your access policy ID

ACCESS_POLICY_ID=$(gcloud access-context-manager policies list \
  --organization=ORGANIZATION_ID \
  --format="value(name)")
```

## Step 1: Gather Your IP Ranges

Before creating access levels, inventory all the IP ranges your organization uses:

- **Office networks**: Public IPs of your office internet connections
- **VPN gateways**: Public IPs of your VPN concentrators
- **Cloud NAT / GCE workloads**: Source projects, VPC networks, or service accounts for workloads that access Google APIs through Private Google Access
- **Cloud Workstations**: A supported developer environment for accessing resources inside perimeters
- **CI/CD runners**: IPs of your build infrastructure

## Step 2: Create an Access Level for Office Networks

Create a YAML spec file and use it to create the access level.

```yaml
# office-networks.yaml
- ipSubnetworks:
  - 203.0.113.0/24       # San Francisco office
  - 198.51.100.0/24      # New York office
  - 192.0.2.0/24         # London office
```

```bash
# Create the access level
gcloud access-context-manager levels create office_networks \
  --title="Corporate Office Networks" \
  --basic-level-spec=office-networks.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 3: Create an Access Level for VPN Users

If your organization uses a VPN for remote access:

```yaml
# vpn-access.yaml
- ipSubnetworks:
  - 10.200.0.0/16        # VPN client pool
```

Wait - that will not work. VPC Service Controls evaluates the source IP at the Google API edge, which means it sees the public IP of the NAT gateway, not the private VPN IP.

Instead, use the public IP of your VPN's NAT gateway:

```yaml
# vpn-access.yaml (corrected)
- ipSubnetworks:
  - 34.120.50.0/24       # VPN NAT gateway public IP
```

```bash
# Create the access level
gcloud access-context-manager levels create vpn_access \
  --title="VPN Remote Access" \
  --basic-level-spec=vpn-access.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 4: Create an Ingress Rule for Cloud NAT Workloads

If your GCE instances access Google APIs through Cloud NAT and Private Google Access, do not use the Cloud NAT external IPs in an IP-based access level. For this path, Google keeps the traffic internal instead of routing it to Google APIs through the Cloud NAT external IP. Use an ingress rule based on the source project, VPC network, or service account instead.

```bash
# Inspect your Cloud NAT external IPs
gcloud compute routers get-nat-ip-info my-router \
  --region=us-central1 \
  --project=my-project-id
```

```yaml
# ingress-from-cloud-nat-workloads.yaml
- ingressFrom:
    identities:
      - serviceAccount:workload-sa@source-project.iam.gserviceaccount.com
    sources:
      - resource: projects/123456789012
  ingressTo:
    operations:
      - serviceName: "*"
    resources:
      - "*"
```

```bash
# Apply the ingress rule to the perimeter
gcloud access-context-manager perimeters update my-perimeter \
  --set-ingress-policies=ingress-from-cloud-nat-workloads.yaml \
  --policy=$ACCESS_POLICY_ID
```

If you use Cloud NAT for outbound traffic to non-Google services that require IP allowlists, static NAT IPs are still useful for those external services. They are not the right control for VPC Service Controls access to Google APIs over Private Google Access.

## Step 5: Create a Combined Access Level

Combine all your network ranges into a single access level, or keep them separate and reference them individually.

Option 1 - Single combined level:

```yaml
# all-networks.yaml
- ipSubnetworks:
  # Office networks
  - 203.0.113.0/24
  - 198.51.100.0/24
  - 192.0.2.0/24
  # VPN
  - 34.120.50.0/24
```

Option 2 - Separate levels referenced in a combined level:

```yaml
# combined-spec.yaml - Require any of the sub-levels
- requiredAccessLevels:
  - accessPolicies/POLICY_ID/accessLevels/office_networks
- requiredAccessLevels:
  - accessPolicies/POLICY_ID/accessLevels/vpn_access
```

Note: Multiple top-level conditions use the access level's combine function. Use `--combine-function=OR` when you create or update this combined access level so the request only needs to match one of the referenced levels.

## Step 6: Apply to VPC Service Perimeter

Add the access level to your perimeter.

```bash
# Add the access level to the perimeter
gcloud access-context-manager perimeters update my-perimeter \
  --add-access-levels="accessPolicies/$ACCESS_POLICY_ID/accessLevels/all_networks" \
  --policy=$ACCESS_POLICY_ID
```

Or use it in an ingress rule for more granular control:

```yaml
# ingress-with-ip.yaml
- ingressFrom:
    identityType: ANY_USER_ACCOUNT
    sources:
      - accessLevel: accessPolicies/POLICY_ID/accessLevels/office_networks
  ingressTo:
    operations:
      - serviceName: "*"
    resources:
      - "*"
```

## Step 7: Handle Dynamic IPs

Some organizations do not have static IP addresses. Here are strategies for handling this:

**Use a VPN with a static egress IP:**

Route all developer traffic through a VPN that uses a static public IP. This is the most reliable approach.

**Use a cloud-based proxy:**

Set up a proxy in GCE with a static external IP. Developers connect through the proxy, and the access level includes the proxy's IP.

```bash
# Reserve a static IP for the proxy
gcloud compute addresses create dev-proxy-ip \
  --region=us-central1 \
  --project=my-project-id
```

**Use device-based access levels instead:**

If static IPs are not feasible, combine IP-based levels with device policies for a more flexible approach.

## Step 8: Testing IP-Based Access Levels

Verify your access level works by checking from different networks.

```bash
# Check your current public IP
curl -s ifconfig.me

# Try accessing a resource inside the perimeter
gsutil ls gs://protected-bucket/

# If blocked, check the audit logs for the violation
gcloud logging read \
  'protoPayload.metadata."@type"="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata"' \
  --limit=5 \
  --format="table(timestamp, protoPayload.metadata.violationReason, protoPayload.metadata.accessLevels)" \
  --project=my-project-id
```

The `accessLevels` field in the log shows which access levels the request matched (empty if none matched).

## Step 9: Automate IP Range Updates

If your IPs change periodically, automate the updates.

```python
import subprocess
import yaml

def update_access_level(access_level_name, ip_ranges, policy_id):
    """Update an IP-based access level with new IP ranges."""

    # Build the spec
    spec = [{
        'ipSubnetworks': ip_ranges
    }]

    # Write the spec file
    spec_file = f'/tmp/{access_level_name}-spec.yaml'
    with open(spec_file, 'w') as f:
        yaml.dump(spec, f)

    # Update the access level
    cmd = [
        'gcloud', 'access-context-manager', 'levels', 'update',
        access_level_name,
        f'--basic-level-spec={spec_file}',
        f'--policy={policy_id}'
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"Error updating access level: {result.stderr}")
    else:
        print(f"Updated {access_level_name} with {len(ip_ranges)} IP ranges")

# Example usage: update from a list of IPs
current_ips = [
    '203.0.113.0/24',
    '198.51.100.0/24',
    '34.120.50.0/24',
]
update_access_level('office_networks', current_ips, 'POLICY_ID')
```

## Common Pitfalls

1. **Using private IP ranges in `ipSubnetworks`**: IP-based allowlists for perimeter access use public IP CIDR ranges. For internal IP-based access from VPC networks, use `vpcNetworkSources` in a basic access level with ingress or egress rules.

2. **Using Cloud NAT external IPs for Google API access**: When Cloud NAT integrates with Private Google Access, traffic to Google APIs stays internal and does not use the Cloud NAT external IP. Use ingress rules based on project, VPC network, or service account instead.

3. **CIDR notation mistakes**: Use proper CIDR notation. A single IP needs a /32 suffix (e.g., `35.220.10.1/32`).

4. **IP range changes**: If your ISP changes your IP allocation, your access levels break. Use static IPs or monitor for changes.

5. **IPv6**: Access Context Manager supports IPv6 ranges. If your network uses IPv6 for Google API access, include those ranges too.

## Conclusion

IP-based access levels are the foundation of VPC Service Controls access management. They provide a simple, effective way to ensure that only requests from trusted networks can reach your protected resources. Start by cataloging all your organization's public IP ranges, create access levels for each network segment, and apply them to your perimeters. Keep the IP ranges updated as your network evolves, and consider combining IP-based levels with device policies for stronger security.
