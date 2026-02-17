# How to Use Connectivity Tests to Diagnose Network Path Issues in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Connectivity Tests, Network Intelligence, Troubleshooting, Networking

Description: Learn how to use GCP Connectivity Tests to diagnose network path issues, trace packet routing, identify firewall blocks, and verify end-to-end connectivity between resources.

---

When a VM cannot reach another VM, a database, or an external service, the debugging process can be painful. Is it a firewall rule? A missing route? A misconfigured subnet? GCP Connectivity Tests is a diagnostic tool that analyzes the network path between two endpoints and tells you exactly where and why traffic is being dropped - without actually sending any packets.

In this post, I will show you how to create and interpret connectivity tests, cover common scenarios, and share patterns for using them as part of your troubleshooting workflow.

## What Connectivity Tests Do

Connectivity Tests perform a configuration-based analysis of the network path between a source and destination. The tool examines:

- VPC routes
- Firewall rules (ingress and egress)
- VPC peering connections
- Load balancer configurations
- NAT configurations
- Network interfaces

It traces the path a packet would take and identifies any step where the packet would be dropped. Importantly, it does not send actual traffic - it analyzes your network configuration to determine what would happen.

## Creating a Basic Connectivity Test

The most common scenario is testing connectivity between two VMs:

```bash
# Test TCP connectivity between two VMs on port 443
gcloud network-management connectivity-tests create test-vm-to-vm \
  --source-instance=projects/my-project/zones/us-central1-a/instances/vm-source \
  --destination-instance=projects/my-project/zones/us-central1-a/instances/vm-dest \
  --protocol=TCP \
  --destination-port=443
```

The test runs and returns a result showing each hop in the network path and whether the overall test passed or failed.

## Interpreting Results

View the test results:

```bash
# Get the test result
gcloud network-management connectivity-tests describe test-vm-to-vm \
  --format=yaml
```

The result contains a `reachabilityDetails` section with one of these states:

- **REACHABLE**: Traffic can flow from source to destination
- **UNREACHABLE**: Traffic is blocked somewhere along the path
- **AMBIGUOUS**: The analysis could not determine reachability (complex configurations)

For unreachable results, the `traces` section shows where the packet gets dropped:

```bash
# Get a detailed view of the trace showing each hop
gcloud network-management connectivity-tests describe test-vm-to-vm \
  --format="yaml(reachabilityDetails.result, reachabilityDetails.traces)"
```

Each trace step includes:
- The resource type (instance, firewall, route, etc.)
- The action taken (APPLY, DROP, FORWARD)
- Details about why a packet was dropped (if applicable)

## Common Test Scenarios

### VM to External IP

Test whether a VM can reach an external service:

```bash
# Test if a VM can reach an external HTTPS endpoint
gcloud network-management connectivity-tests create test-vm-to-external \
  --source-instance=projects/my-project/zones/us-central1-a/instances/my-vm \
  --destination-ip-address=203.0.113.10 \
  --protocol=TCP \
  --destination-port=443
```

### VM to Internal Load Balancer

```bash
# Test connectivity from a VM to an internal load balancer
gcloud network-management connectivity-tests create test-vm-to-ilb \
  --source-instance=projects/my-project/zones/us-central1-a/instances/my-vm \
  --destination-ip-address=10.10.0.100 \
  --protocol=TCP \
  --destination-port=80
```

### Cross-Project VM to VM (VPC Peering)

```bash
# Test connectivity between VMs in peered networks
gcloud network-management connectivity-tests create test-cross-project \
  --source-instance=projects/project-a/zones/us-central1-a/instances/vm-a \
  --destination-instance=projects/project-b/zones/us-central1-a/instances/vm-b \
  --protocol=TCP \
  --destination-port=5432
```

### VM to Google API

```bash
# Test if a VM can reach Cloud Storage API
gcloud network-management connectivity-tests create test-vm-to-gcs \
  --source-instance=projects/my-project/zones/us-central1-a/instances/private-vm \
  --destination-ip-address=142.250.80.128 \
  --protocol=TCP \
  --destination-port=443
```

### External IP to VM (Inbound)

```bash
# Test if external traffic can reach a VM
gcloud network-management connectivity-tests create test-external-to-vm \
  --source-ip-address=203.0.113.50 \
  --source-network-type=NON_GCP_NETWORK \
  --destination-instance=projects/my-project/zones/us-central1-a/instances/web-server \
  --protocol=TCP \
  --destination-port=80
```

## Diagnosing Common Failures

### Firewall Rule Blocking Traffic

When the test shows a firewall DROP, the result includes the specific rule:

```bash
# The output will show something like:
# step: FIREWALL
# state: DROP
# firewall:
#   displayName: deny-all-egress
#   direction: EGRESS
#   action: DENY
```

Fix by creating a more specific allow rule with a higher priority (lower number):

```bash
# Create an allow rule with higher priority than the blocking rule
gcloud compute firewall-rules create allow-specific-egress \
  --network=production-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:443 \
  --destination-ranges=203.0.113.10/32 \
  --priority=900
```

### Missing Route

When there is no route to the destination:

```bash
# The output shows:
# step: ROUTE
# state: ABORT
# abortInfo:
#   cause: NO_ROUTE
```

Add the missing route:

```bash
# Create a route to the destination
gcloud compute routes create route-to-destination \
  --network=production-vpc \
  --destination-range=203.0.113.0/24 \
  --next-hop-gateway=default-internet-gateway \
  --priority=1000
```

### VPC Peering Not Exchanging Routes

If traffic between peered networks fails:

```bash
# The output might show peering route not found
# Check if peering is exchanging subnet routes
gcloud compute networks peerings list \
  --network=network-a \
  --format="yaml(name, state, exportSubnetRoutesWithPublicIp, importSubnetRoutesWithPublicIp)"
```

## Automating Connectivity Tests

Create a suite of tests that verify your critical network paths:

```bash
# Script to create and run a suite of connectivity tests
TESTS=(
  "web-to-api:vm-web:vm-api:TCP:8080"
  "api-to-db:vm-api:vm-database:TCP:5432"
  "web-to-internet:vm-web:203.0.113.10:TCP:443"
)

for test_def in "${TESTS[@]}"; do
  IFS=':' read -r name source dest protocol port <<< "$test_def"

  # Create the test
  gcloud network-management connectivity-tests create "$name" \
    --source-instance="projects/my-project/zones/us-central1-a/instances/$source" \
    --destination-instance="projects/my-project/zones/us-central1-a/instances/$dest" \
    --protocol="$protocol" \
    --destination-port="$port" 2>/dev/null

  # Check the result
  result=$(gcloud network-management connectivity-tests describe "$name" \
    --format="value(reachabilityDetails.result)")

  echo "Test: $name - Result: $result"
done
```

## Re-Running Tests After Changes

After making network changes, rerun existing tests to verify they still pass:

```bash
# Rerun an existing connectivity test with current network configuration
gcloud network-management connectivity-tests rerun test-vm-to-vm
```

This is useful after firewall rule changes, route updates, or VPC peering modifications.

## Listing and Cleaning Up Tests

```bash
# List all connectivity tests
gcloud network-management connectivity-tests list \
  --format="table(name, source.instance, destination.instance, reachabilityDetails.result)"

# Delete old tests
gcloud network-management connectivity-tests delete old-test --quiet
```

## Integration with Cloud Monitoring

You can set up monitoring alerts based on connectivity test results:

```bash
# Create an uptime check that runs a connectivity test
# Note: Connectivity tests don't have native uptime checks,
# but you can run them on a schedule via Cloud Scheduler
gcloud scheduler jobs create http run-connectivity-tests \
  --schedule="*/30 * * * *" \
  --uri="https://us-central1-my-project.cloudfunctions.net/run-network-tests" \
  --http-method=POST \
  --time-zone="UTC" \
  --description="Run connectivity tests every 30 minutes"
```

## Best Practices

1. **Create tests for every critical path**: Web to API, API to database, VMs to Google APIs, cross-project connections. If it matters, test it.

2. **Run tests before and after changes**: Before modifying firewall rules or routes, run your test suite. After changes, run it again. This catches unintended side effects.

3. **Use descriptive test names**: Names like `prod-web-to-payments-db-5432` are much more useful than `test-1` when reviewing results.

4. **Rerun tests periodically**: Network configurations can drift. Schedule regular reruns of critical connectivity tests.

5. **Test both directions**: Network connectivity is not always symmetric. A firewall might allow traffic from A to B but not B to A.

## Wrapping Up

Connectivity Tests remove the guesswork from network troubleshooting in GCP. Instead of manually checking routes, firewall rules, and peering connections, you can point the tool at two endpoints and get a clear answer about whether traffic can flow and why it cannot. Build a library of tests covering your critical network paths and run them regularly. When something breaks, your first step should be running a connectivity test - it will often point you directly to the problem in seconds, saving you hours of manual investigation.
