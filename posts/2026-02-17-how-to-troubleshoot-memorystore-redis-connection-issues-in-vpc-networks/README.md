# How to Troubleshoot Memorystore Redis Connection Issues in VPC Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Memorystore, Redis, VPC, Networking, Troubleshooting

Description: A troubleshooting guide for resolving common Memorystore for Redis connection problems related to VPC networking, firewall rules, and service connectivity.

---

You have provisioned a Memorystore for Redis instance, your application is deployed, and you are getting connection timeouts. It is one of the most common issues I see people run into with Memorystore, and it almost always comes down to networking. Memorystore instances live inside a VPC and are only accessible over private IP addresses. There is no public endpoint. This means your client must be in the right network, with the right routes, and with no firewall rules blocking the traffic.

Let me walk through the most common connection issues and how to fix each one.

## The Basics - Verify Instance Status and IP

Before diving into networking, make sure the instance itself is healthy:

```bash
# Check instance status and get the connection details
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format="yaml(host,port,currentLocationId,state,authorizedNetwork)"
```

The `state` field should say `READY`. If it says `CREATING` or `UPDATING`, wait for the operation to finish. The `host` field gives you the private IP address, and `authorizedNetwork` tells you which VPC the instance is attached to.

## Problem 1 - Client Is in a Different VPC

This is the number one cause of connection failures. Memorystore instances are bound to a specific VPC network. If your application VM, GKE cluster, or Cloud Run service is in a different VPC, the connection will time out.

Check which network your Memorystore instance is using:

```bash
# Get the authorized network for the Memorystore instance
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format="value(authorizedNetwork)"
```

Then verify your client is in the same network. For a Compute Engine VM:

```bash
# Check which network interface a VM uses
gcloud compute instances describe my-vm \
  --zone=us-central1-a \
  --format="yaml(networkInterfaces[].network)"
```

If the networks do not match, you have a few options:

1. Recreate the Memorystore instance in the correct VPC
2. Move your application to the correct VPC
3. Set up VPC Network Peering between the two networks

Option 3 works but adds complexity. If you are early in your setup, just make sure everything is in the same VPC from the start.

## Problem 2 - Firewall Rules Blocking Port 6379

Memorystore uses port 6379 by default. While Memorystore itself does not use VPC firewall rules (the connection is managed through private services access), other firewall rules in your network might interfere.

Check if there are any deny rules that could block the traffic:

```bash
# List firewall rules that might affect Redis traffic
gcloud compute firewall-rules list \
  --filter="network=default AND direction=EGRESS" \
  --format="table(name,direction,action,targetTags,destinationRanges)"
```

If you have a default-deny egress rule (which is common in locked-down environments), you need to add an allow rule:

```bash
# Allow egress traffic to the Memorystore IP range on port 6379
gcloud compute firewall-rules create allow-redis-egress \
  --network=default \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:6379 \
  --destination-ranges=10.0.0.0/24 \
  --priority=1000
```

Replace the destination range with the actual IP range of your Memorystore instance.

## Problem 3 - Private Services Access Not Configured

Memorystore uses Private Services Access to allocate IP addresses in your VPC. If this is not set up, instance creation might succeed but connectivity will fail.

Verify that private services access is configured:

```bash
# Check private services access connections
gcloud services vpc-peerings list \
  --network=default \
  --service=servicenetworking.googleapis.com
```

If no peering connection exists, set one up:

```bash
# Allocate an IP range for Google-managed services
gcloud compute addresses create google-managed-services-range \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create the private connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-range \
  --network=default
```

## Problem 4 - Connecting from GKE

GKE adds another layer of networking complexity. Your pods need to be able to reach the Memorystore IP. If you are using a VPC-native cluster (which is the default for new clusters), pods get IP addresses from the VPC and can reach Memorystore directly.

However, if you are using a routes-based cluster, you need to verify that the pod IP ranges can reach the Memorystore IP through the VPC peering.

Test connectivity from inside a pod:

```bash
# Deploy a temporary debug pod and test the connection
kubectl run redis-test --image=redis:7 --rm -it --restart=Never -- \
  redis-cli -h MEMORYSTORE_IP -p 6379 PING
```

If this times out, check your cluster's network configuration:

```bash
# Verify the cluster is VPC-native
gcloud container clusters describe my-cluster \
  --zone=us-central1-a \
  --format="yaml(ipAllocationPolicy)"
```

For VPC-native clusters, make sure the pod and service CIDR ranges are included in the VPC peering routes.

## Problem 5 - Connecting from Cloud Run or Cloud Functions

Serverless services like Cloud Run and Cloud Functions require a Serverless VPC Access connector to reach resources in a VPC. Without this connector, they cannot reach Memorystore.

Create a VPC connector if you do not have one:

```bash
# Create a Serverless VPC Access connector
gcloud compute networks vpc-access connectors create my-connector \
  --region=us-central1 \
  --network=default \
  --range=10.8.0.0/28
```

Then configure your Cloud Run service to use it:

```bash
# Deploy a Cloud Run service with VPC connector
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-app \
  --vpc-connector=my-connector \
  --region=us-central1
```

## Problem 6 - AUTH Password Mismatch

If you enabled AUTH on your Memorystore instance, clients need to provide the correct password. A wrong password results in a connection that appears to succeed (TCP handshake completes) but then immediately gets a `NOAUTH` error.

Check if AUTH is enabled:

```bash
# Check if AUTH is required
gcloud redis instances describe my-redis-instance \
  --region=us-central1 \
  --format="value(authEnabled)"
```

If AUTH is enabled, retrieve the auth string:

```bash
# Get the AUTH string for the instance
gcloud redis instances get-auth-string my-redis-instance \
  --region=us-central1
```

Use this string in your client connection configuration.

## Problem 7 - Shared VPC Complications

In a Shared VPC setup, the Memorystore instance is typically created in the host project's network, but applications run in service projects. The service project needs proper IAM permissions and the network must be correctly referenced.

When creating a Memorystore instance in a Shared VPC:

```bash
# Reference the shared VPC network using the full resource path
gcloud redis instances create my-redis-instance \
  --size=5 \
  --region=us-central1 \
  --tier=STANDARD \
  --network=projects/HOST_PROJECT_ID/global/networks/shared-vpc
```

## Diagnostic Checklist

When you hit a connection issue, run through this checklist:

1. Is the instance in READY state?
2. Is your client in the same VPC as the Memorystore instance?
3. Are there any deny egress firewall rules?
4. Is Private Services Access configured?
5. For GKE: Is the cluster VPC-native?
6. For Cloud Run/Functions: Is a VPC connector attached?
7. Is AUTH enabled and configured correctly in the client?
8. For Shared VPC: Is the network path correct?

Most connection issues fall into one of these categories. Start from the top and work your way down. Nine times out of ten, it is a VPC mismatch or a missing VPC connector for serverless workloads.

If you have gone through all of these and still cannot connect, check the Cloud Audit Logs for any permission denied errors and review the VPC Flow Logs for dropped packets. These logs will point you to exactly where the traffic is being blocked.
