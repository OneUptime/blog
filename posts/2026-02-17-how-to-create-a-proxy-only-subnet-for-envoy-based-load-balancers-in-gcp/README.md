# How to Create a Proxy-Only Subnet for Envoy-Based Load Balancers in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Proxy Subnet, Load Balancer, Envoy, Networking

Description: A practical guide to creating and managing proxy-only subnets required by Envoy-based load balancers in Google Cloud Platform for internal and regional traffic distribution.

---

If you have tried to set up a regional internal application load balancer or a regional external application load balancer in GCP, you have probably hit a confusing error about a missing proxy-only subnet. These Envoy-based load balancers require a dedicated subnet that provides IP addresses for the proxy fleet that handles your traffic. Without it, the load balancer simply will not work.

This post explains what proxy-only subnets are, when you need them, and how to create and manage them properly.

## What Is a Proxy-Only Subnet?

Envoy-based load balancers in GCP do not forward packets directly. Instead, they terminate the client connection at a pool of Envoy proxy instances and open a new connection to your backend. These proxy instances need IP addresses, and those addresses come from the proxy-only subnet.

Think of it this way: when a client sends a request to the load balancer, an Envoy proxy picks it up, makes a routing decision based on the URL map, and then sends the request to the appropriate backend. The backend sees the request coming from an IP in the proxy-only subnet, not from the original client.

You cannot use this subnet for VMs, GKE nodes, or anything else. It is exclusively reserved for the load balancer proxy infrastructure.

## Which Load Balancers Need a Proxy-Only Subnet?

Not every load balancer in GCP requires one. Here is the breakdown:

- **Regional internal application load balancer** - Yes, requires a proxy-only subnet
- **Regional external application load balancer** - Yes, requires a proxy-only subnet
- **Cross-region internal application load balancer** - Yes, requires a proxy-only subnet
- **Global external application load balancer** - No, does not need one
- **External passthrough network load balancer** - No, does not need one
- **Internal passthrough network load balancer** - No, does not need one
- **TCP/SSL proxy load balancer** - No, does not need one

The general rule: if it is Envoy-based and regional (or cross-region internal), it needs a proxy-only subnet.

## Step 1: Plan Your Subnet Size

The proxy-only subnet needs enough IP addresses for the Envoy proxy fleet. Google manages this fleet automatically and scales it based on traffic. A /23 (512 addresses) is a good default. For high-traffic deployments, consider a /21 or larger.

Key planning considerations:

- One proxy-only subnet per region per VPC network
- All Envoy-based load balancers in the same region share the subnet
- The CIDR range must not overlap with other subnets in your VPC
- You cannot resize a proxy-only subnet after creation (you would need to delete and recreate it)

## Step 2: Create the Proxy-Only Subnet

Here is the command to create a proxy-only subnet for regional load balancers:

```bash
# Create a proxy-only subnet for regional Envoy-based load balancers
gcloud compute networks subnets create proxy-only-subnet \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --network=my-vpc \
    --region=us-central1 \
    --range=10.129.0.0/23
```

Let me break down the flags:

- `--purpose=REGIONAL_MANAGED_PROXY`: Marks this subnet as a proxy-only subnet for regional load balancers
- `--role=ACTIVE`: Makes the subnet active and available for use immediately
- `--network`: The VPC network where the subnet will live
- `--region`: Must match the region where you plan to deploy your load balancer
- `--range`: The CIDR range for proxy IP addresses

For cross-region internal application load balancers, use a different purpose:

```bash
# Create a proxy-only subnet for cross-region internal load balancers
gcloud compute networks subnets create cross-region-proxy-subnet \
    --purpose=GLOBAL_MANAGED_PROXY \
    --role=ACTIVE \
    --network=my-vpc \
    --region=us-central1 \
    --range=10.130.0.0/23
```

## Step 3: Verify the Subnet Was Created

Confirm the subnet exists and has the correct configuration:

```bash
# List subnets and filter for proxy-only subnets
gcloud compute networks subnets list \
    --network=my-vpc \
    --filter="purpose=REGIONAL_MANAGED_PROXY"
```

You can also describe a specific subnet for full details:

```bash
# Get detailed information about the proxy-only subnet
gcloud compute networks subnets describe proxy-only-subnet \
    --region=us-central1
```

Look for `purpose: REGIONAL_MANAGED_PROXY` and `role: ACTIVE` in the output.

## Step 4: Configure Firewall Rules

Your backend instances need to accept traffic from the proxy-only subnet. The Envoy proxies are the ones sending requests to your backends, so you must allow traffic from the proxy-only subnet CIDR range.

```bash
# Allow traffic from the proxy-only subnet to backend instances
gcloud compute firewall-rules create allow-proxy-to-backends \
    --network=my-vpc \
    --action=allow \
    --direction=ingress \
    --source-ranges=10.129.0.0/23 \
    --target-tags=lb-backend \
    --rules=tcp:80,tcp:443,tcp:8080
```

This is a step that people frequently forget. Without this firewall rule, the load balancer will report all backends as unhealthy because the health check probes (which also come from the proxy subnet in some configurations) cannot reach them.

Also, do not forget to allow Google's health check IP ranges:

```bash
# Allow health check probes from Google's dedicated ranges
gcloud compute firewall-rules create allow-health-check-probes \
    --network=my-vpc \
    --action=allow \
    --direction=ingress \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --target-tags=lb-backend \
    --rules=tcp:80,tcp:443,tcp:8080
```

## Creating Proxy-Only Subnets in Multiple Regions

If you have load balancers in multiple regions, you need a proxy-only subnet in each region. Here is an example of setting up subnets across three regions:

```bash
# US Central region
gcloud compute networks subnets create proxy-subnet-us-central1 \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --network=my-vpc \
    --region=us-central1 \
    --range=10.129.0.0/23

# Europe West region
gcloud compute networks subnets create proxy-subnet-europe-west1 \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --network=my-vpc \
    --region=europe-west1 \
    --range=10.131.0.0/23

# Asia East region
gcloud compute networks subnets create proxy-subnet-asia-east1 \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --network=my-vpc \
    --region=asia-east1 \
    --range=10.133.0.0/23
```

Each region gets its own non-overlapping CIDR range.

## Using Terraform

If you manage infrastructure with Terraform, here is the equivalent resource:

```hcl
# Terraform resource for a proxy-only subnet
resource "google_compute_subnetwork" "proxy_only" {
  name          = "proxy-only-subnet"
  network       = google_compute_network.my_vpc.id
  region        = "us-central1"
  ip_cidr_range = "10.129.0.0/23"
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}
```

## Switching Between Active and Backup Roles

Proxy-only subnets support ACTIVE and BACKUP roles. The BACKUP role is useful during migrations. If you need to change the CIDR range of a proxy-only subnet, you can create a new one with the BACKUP role, then swap:

```bash
# Create a new proxy-only subnet with BACKUP role
gcloud compute networks subnets create proxy-only-subnet-new \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=BACKUP \
    --network=my-vpc \
    --region=us-central1 \
    --range=10.135.0.0/23

# Swap the old one to BACKUP
gcloud compute networks subnets update proxy-only-subnet \
    --region=us-central1 \
    --role=BACKUP

# Promote the new one to ACTIVE
gcloud compute networks subnets update proxy-only-subnet-new \
    --region=us-central1 \
    --role=ACTIVE
```

## Common Mistakes

**Forgetting the firewall rule for proxy traffic**: This is the number one issue. Without a firewall rule allowing traffic from the proxy-only subnet CIDR to your backends, everything looks correctly configured but all backends show as unhealthy.

**Using the wrong purpose**: `REGIONAL_MANAGED_PROXY` is for regional load balancers, `GLOBAL_MANAGED_PROXY` is for cross-region internal load balancers. Using the wrong one will cause load balancer creation to fail.

**Overlapping CIDR ranges**: The proxy-only subnet range cannot overlap with any other subnet in the VPC. Plan your IP addressing carefully.

**Trying to launch VMs in the proxy-only subnet**: This subnet is exclusively for the load balancer proxy infrastructure. You cannot create VM instances, GKE nodes, or any other resources in it.

## Wrapping Up

Proxy-only subnets are a prerequisite for Envoy-based load balancers in GCP. While the concept might seem unusual if you are coming from other cloud providers, the setup is straightforward: create the subnet with the right purpose and role, set up your firewall rules to allow traffic from the subnet to your backends, and you are good to go. Remember that you only need one per region per VPC, and it is shared across all Envoy-based load balancers in that region.
