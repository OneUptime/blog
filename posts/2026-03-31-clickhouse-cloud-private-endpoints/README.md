# How to Set Up Private Endpoints for ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Private Endpoint, VPC, Network Security, AWS PrivateLink

Description: Learn how to configure private endpoints in ClickHouse Cloud to connect securely from your VPC without traffic traversing the public internet.

---

By default, ClickHouse Cloud services are accessible over the public internet with TLS encryption. For production environments requiring stricter network isolation, private endpoints let you connect from your cloud VPC directly - keeping traffic off the public internet entirely.

## What Are Private Endpoints?

Private endpoints use cloud provider networking features:
- AWS: AWS PrivateLink
- GCP: Private Service Connect
- Azure: Azure Private Link

Traffic stays within the cloud provider's backbone network, never touching the public internet.

## Setting Up Private Endpoints on AWS

### Step 1 - Get Private Endpoint Config from ClickHouse Cloud

```bash
curl -X GET \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/privateEndpointConfig \
  --user "${KEY_ID}:${KEY_SECRET}"
```

The response includes an `endpointServiceId` (the AWS service name to connect to, e.g. `com.amazonaws.vpce.us-east-1.vpce-svc-...`).

### Step 2 - Create VPC Endpoint in AWS

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc123 \
  --service-name com.amazonaws.vpce.us-east-1.vpce-svc-0xyz \
  --vpc-endpoint-type Interface \
  --subnet-ids subnet-0abc123 \
  --security-group-ids sg-0abc123
```

### Step 3 - Add Endpoint ID to ClickHouse Cloud

```bash
curl -X PATCH \
  https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  --user "${KEY_ID}:${KEY_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "privateEndpointIds": {
      "add": ["vpce-0abc123xyz"]
    }
  }'
```

## Setting Up on GCP (Private Service Connect)

```bash
# Create forwarding rule in GCP
gcloud compute forwarding-rules create clickhouse-psc \
  --network=my-vpc \
  --region=us-central1 \
  --address=10.0.0.100 \
  --target-service-attachment=projects/clickhouse-prod/regions/us-central1/serviceAttachments/my-service \
  --load-balancing-scheme=""
```

## Connecting via Private Endpoint

After setup, use the private hostname provided by ClickHouse Cloud (not the public endpoint):

```bash
clickhouse client \
  --host privatehostname.private.clickhouse.cloud \
  --port 9440 \
  --user default \
  --password "$PASSWORD" \
  --secure
```

## Restricting to Private Endpoint Only

Once private connectivity is working, disable public access:

1. Go to service settings in ClickHouse Cloud console
2. Under "Security", disable "Allow public internet access"

## Summary

Private endpoints for ClickHouse Cloud use AWS PrivateLink, GCP Private Service Connect, or Azure Private Link to route traffic within your cloud provider's network. Configure via the ClickHouse Cloud API, create the matching endpoint on your cloud provider, and optionally disable public internet access for maximum network isolation.
