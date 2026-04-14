# How to Configure Dapr with Oracle OCI Object Storage State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Oracle Cloud, OCI, Object Storage, State Store

Description: Learn how to configure Dapr with Oracle OCI Object Storage as a state store for microservices running on Oracle Cloud Infrastructure.

---

## Overview

Oracle Cloud Infrastructure (OCI) Object Storage is a highly scalable, durable, and secure object storage service. Dapr's OCI Object Storage state store component stores each state value as an individual object in an OCI bucket, making it suitable for large state payloads and scenarios where state inspection through the OCI console is valuable. It is the recommended Dapr state store for microservices deployed on OCI.

## Prerequisites

- An Oracle Cloud Infrastructure account
- Dapr CLI and runtime installed
- OCI CLI configured with valid credentials

## Setting Up OCI Object Storage

Create a bucket for Dapr state:

```bash
# Get your compartment OCID first
oci iam compartment list --query "data[?\"lifecycle-state\"=='ACTIVE'].id | [0]" --raw-output

# Create a bucket
oci os bucket create \
  --name dapr-state-bucket \
  --compartment-id YOUR_COMPARTMENT_OCID \
  --storage-tier Standard \
  --versioning Enabled
```

Create an API key and gather the required credentials from the OCI console:
- Tenancy OCID
- User OCID
- Region
- Fingerprint
- Private key

## Configuring the Dapr Component

Store your OCI private key as a Kubernetes secret:

```bash
kubectl create secret generic oci-secret \
  --from-file=privateKey=~/.oci/oci_api_key.pem
```

Create the Dapr state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oci-statestore
  namespace: default
spec:
  type: state.oci.objectstorage
  version: v1
  metadata:
  - name: instancePrincipalAuthentication
    value: "false"
  - name: configFilePath
    value: ""
  - name: configFileProfile
    value: "DEFAULT"
  - name: tenancyOCID
    value: "ocid1.tenancy.oc1..your-tenancy"
  - name: userOCID
    value: "ocid1.user.oc1..your-user"
  - name: fingerPrint
    value: "xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"
  - name: privateKey
    secretKeyRef:
      name: oci-secret
      key: privateKey
  - name: region
    value: "us-ashburn-1"
  - name: compartmentOCID
    value: "ocid1.compartment.oc1..your-compartment"
  - name: bucketName
    value: "dapr-state-bucket"
```

For OCI compute instances with Instance Principal authentication:

```yaml
  - name: instancePrincipalAuthentication
    value: "true"
```

Apply the component:

```bash
kubectl apply -f oci-statestore.yaml
```

## Using the OCI Object Storage State Store

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Store large configuration document
await client.state.save("oci-statestore", [
  {
    key: "db-migration-plan-v5",
    value: {
      version: 5,
      steps: [
        { step: 1, sql: "ALTER TABLE orders ADD COLUMN region VARCHAR(50)" },
        { step: 2, sql: "CREATE INDEX idx_orders_region ON orders(region)" }
      ],
      approvedBy: "dba@company.com",
      scheduledFor: "2026-04-01T02:00:00Z"
    }
  }
]);

const plan = await client.state.get("oci-statestore", "db-migration-plan-v5");
console.log("Migration plan:", plan);
```

## Verifying State in OCI

```bash
# List objects in the Dapr state bucket
oci os object list \
  --bucket-name dapr-state-bucket \
  --all

# Download and inspect a specific state object
oci os object get \
  --bucket-name dapr-state-bucket \
  --name "db-migration-plan-v5" \
  --file state-object.json

cat state-object.json
```

## Summary

Oracle OCI Object Storage as a Dapr state store is the right choice for microservices running on OCI, providing durable, scalable object storage with native OCI IAM integration. Using Instance Principal authentication eliminates the need to manage API keys, making it the most secure and operationally simple approach for OCI-deployed Dapr applications.
