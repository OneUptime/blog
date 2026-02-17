# How to Run Connectivity Tests Between VM Instances Using Network Intelligence Center

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Network Intelligence Center, Connectivity Tests, VPC, Google Cloud Networking

Description: Learn how to use GCP Network Intelligence Center connectivity tests to diagnose and verify network paths between VM instances across VPCs, regions, and projects.

---

When something goes wrong with network connectivity between two VMs in GCP, figuring out where the traffic is being dropped can be painful. Is it a firewall rule? A missing route? A VPC peering issue? Instead of checking each component manually, you can use Network Intelligence Center's connectivity tests to trace the entire path and pinpoint exactly where things break.

In this post, I will show you how to set up and run connectivity tests between VM instances, interpret the results, and use them to troubleshoot common networking problems.

## What Are Connectivity Tests?

Connectivity tests are a diagnostic tool within Network Intelligence Center that performs reachability analysis between a source and destination in your GCP network. They analyze your network configuration - firewall rules, routes, VPC peering, NAT, and load balancers - to determine whether traffic can flow from point A to point B.

The important thing to understand is that connectivity tests do not send actual packets. They perform a configuration analysis. This means they can tell you about misconfigurations even before you try to send traffic.

## Prerequisites

Before running connectivity tests, make sure the Network Management API is enabled:

```bash
# Enable the Network Management API for connectivity tests
gcloud services enable networkmanagement.googleapis.com --project=my-project
```

You also need the right IAM permissions. The `networkmanagement.connectivitytests.create` permission is required, which is included in the `roles/networkmanagement.admin` role.

```bash
# Grant the network management admin role to a user
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@example.com" \
  --role="roles/networkmanagement.admin"
```

## Running a Connectivity Test via gcloud

Let us say you have two VM instances - `web-server` in `us-central1-a` and `db-server` in `us-east1-b` - and you want to verify that the web server can reach the database on port 5432.

Here is how to create and run that test:

```bash
# Create a connectivity test from web-server to db-server on port 5432
gcloud network-management connectivity-tests create web-to-db-test \
  --source-instance=projects/my-project/zones/us-central1-a/instances/web-server \
  --source-network=projects/my-project/global/networks/my-vpc \
  --destination-instance=projects/my-project/zones/us-east1-b/instances/db-server \
  --destination-port=5432 \
  --protocol=TCP \
  --project=my-project
```

The test runs asynchronously. You can check the results with:

```bash
# Retrieve the results of the connectivity test
gcloud network-management connectivity-tests describe web-to-db-test \
  --project=my-project \
  --format="yaml(reachabilityDetails)"
```

## Understanding Test Results

The test returns one of three overall results:

- **Reachable** - Traffic can flow from source to destination based on the current configuration.
- **Unreachable** - Traffic is blocked somewhere along the path.
- **Ambiguous** - The analysis could not determine reachability with certainty (often due to dynamic routing or complex configurations).

For an unreachable result, the output includes a trace showing exactly where traffic gets dropped. Here is what a blocked-by-firewall result looks like:

```yaml
reachabilityDetails:
  result: UNREACHABLE
  traces:
    - endpointInfo:
        sourceIp: 10.128.0.2
        destinationIp: 10.142.0.3
        protocol: TCP
        destinationPort: 5432
      steps:
        - state: START_FROM_INSTANCE
          instance:
            uri: projects/my-project/zones/us-central1-a/instances/web-server
        - state: APPLY_EGRESS_FIREWALL_RULE
          firewall:
            uri: projects/my-project/global/firewalls/allow-all-egress
            action: ALLOW
        - state: APPLY_INGRESS_FIREWALL_RULE
          firewall:
            uri: projects/my-project/global/firewalls/default-deny-ingress
            action: DENY
          causesDrop: true
```

This tells you exactly which firewall rule is blocking the traffic. In this case, the default deny ingress rule is preventing the connection.

## Fixing the Issue

Based on the test results above, you need to create a firewall rule that allows TCP traffic on port 5432 from the web server's subnet:

```bash
# Create a firewall rule to allow PostgreSQL traffic from web subnet to db subnet
gcloud compute firewall-rules create allow-postgres-from-web \
  --network=my-vpc \
  --allow=tcp:5432 \
  --source-ranges=10.128.0.0/20 \
  --target-tags=database \
  --direction=INGRESS \
  --priority=1000 \
  --project=my-project
```

After creating the rule, rerun the connectivity test to confirm it now shows as reachable:

```bash
# Rerun the connectivity test after the firewall change
gcloud network-management connectivity-tests rerun web-to-db-test \
  --project=my-project
```

## Testing Across VPC Peering

Connectivity tests are especially useful for cross-VPC scenarios. If you have VPC peering set up and traffic is not flowing, the test will show you whether the peering configuration is the problem.

```bash
# Test connectivity between VMs in peered VPCs
gcloud network-management connectivity-tests create cross-vpc-test \
  --source-instance=projects/my-project/zones/us-central1-a/instances/app-server \
  --source-network=projects/my-project/global/networks/vpc-a \
  --destination-instance=projects/my-project/zones/us-central1-b/instances/backend-server \
  --destination-network=projects/my-project/global/networks/vpc-b \
  --destination-port=8080 \
  --protocol=TCP \
  --project=my-project
```

If peering is not configured correctly, the trace will show a step like:

```
- state: APPLY_ROUTE
  route:
    routeType: PEERING_SUBNET
  causesDrop: true
  dropCause: NO_ROUTE_FOUND
```

## Testing External Connectivity

You can also test whether a VM can reach an external IP address or vice versa. This is useful for debugging NAT and Cloud Interconnect issues.

```bash
# Test whether a VM can reach an external endpoint
gcloud network-management connectivity-tests create external-test \
  --source-instance=projects/my-project/zones/us-central1-a/instances/web-server \
  --source-network=projects/my-project/global/networks/my-vpc \
  --destination-ip-address=8.8.8.8 \
  --destination-port=443 \
  --protocol=TCP \
  --project=my-project
```

## Using the Console

The GCP Console provides a visual representation of connectivity test results that can be easier to interpret than the CLI output. Navigate to Network Intelligence Center, then Connectivity Tests in the sidebar.

The visual trace shows each hop as a node in a diagram, with green checkmarks for passing steps and red X marks for blocked steps. You can click on each step to see the specific resource (firewall rule, route, etc.) involved.

## Automating Connectivity Tests

For ongoing monitoring, you can create connectivity tests programmatically and check results on a schedule. Here is a simple script that runs a batch of tests:

```bash
#!/bin/bash
# Script to run a batch of connectivity tests and report failures

TESTS=("web-to-db" "web-to-cache" "app-to-queue" "app-to-storage")

for test_name in "${TESTS[@]}"; do
  # Rerun each existing connectivity test
  gcloud network-management connectivity-tests rerun "$test_name" \
    --project=my-project --quiet

  # Check the result
  result=$(gcloud network-management connectivity-tests describe "$test_name" \
    --project=my-project \
    --format="value(reachabilityDetails.result)")

  if [ "$result" != "REACHABLE" ]; then
    echo "ALERT: Connectivity test $test_name is $result"
    # Send alert to monitoring system
  fi
done
```

## Limits and Considerations

There are a few things to keep in mind. Connectivity tests analyze configuration, not live traffic. If there is a transient network issue or a performance bottleneck, the test might still show reachable. For live traffic analysis, you would pair this with VPC Flow Logs.

Each project can have up to 50 connectivity tests by default. You can request a quota increase if you need more.

Tests involving third-party appliances or custom routing through VM instances may return ambiguous results, since the tool cannot analyze the routing logic inside those VMs.

## Summary

Network Intelligence Center connectivity tests are one of the most useful debugging tools in GCP networking. They trace the path between any two endpoints and tell you exactly which configuration is blocking traffic. Instead of manually checking firewall rules, routes, and peering configs, you run a single test and get a clear answer. Use them proactively after network changes to catch misconfigurations before they cause outages.
