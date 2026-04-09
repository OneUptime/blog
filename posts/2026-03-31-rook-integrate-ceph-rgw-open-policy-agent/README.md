# How to Integrate Ceph RGW with Open Policy Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, OPA, Policy, Authorization

Description: Learn how to integrate Ceph RGW with Open Policy Agent (OPA) for fine-grained, policy-as-code access control on S3 object storage operations.

---

## Overview

Open Policy Agent (OPA) is a general-purpose policy engine that can enforce fine-grained access control policies. Integrating OPA with Ceph RGW allows you to define complex authorization rules as code - beyond what standard S3 bucket policies support. RGW can call OPA's REST API to evaluate policies before allowing or denying object storage requests.

## Architecture

```text
Client --> RGW (auth check) --> OPA (policy evaluation) --> Allow/Deny
```

RGW sends a JSON context to OPA, which evaluates the configured Rego policies and returns a decision. This enables dynamic policy evaluation based on user attributes, request context, time of day, and more.

## Installing OPA

```bash
# Download OPA binary
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x opa
mv opa /usr/local/bin/

# Verify installation
opa version
```

## Writing an OPA Policy for RGW

Create a Rego policy that controls bucket access:

```rego
# rgw_policy.rego
package rgw.authz

import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Allow read access to public buckets
allow if {
    input.method in {"GET", "HEAD"}
    input.bucket_info.bucket.name == "public-data"
}

# Allow full access to bucket owners
allow if {
    input.bucket_info.owner == input.user_info.user_id
}

# Allow access to finance-data only during business hours
allow if {
    time.clock(time.now_ns())[0] >= 8
    time.clock(time.now_ns())[0] < 18
    input.bucket_info.bucket.name == "finance-data"
}
```

## Starting OPA with the Policy

```bash
# Start OPA server with the policy
opa run --server \
  --addr 0.0.0.0:8181 \
  rgw_policy.rego

# Test the policy manually
curl -X POST http://localhost:8181/v1/data/rgw/authz/allow \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "method": "GET",
      "bucket_info": {
        "bucket": {"name": "public-data", "bucket_id": "public-data"},
        "owner": "admin"
      },
      "user_info": {"user_id": "reader", "display_name": "Reader User"}
    }
  }'
```

## Configuring RGW to Use OPA

```bash
# Enable OPA integration in RGW
ceph config set client.rgw rgw_use_opa_authz true
ceph config set client.rgw rgw_opa_url "http://opa-host:8181/v1/data/rgw/authz/allow"
ceph config set client.rgw rgw_opa_verify_ssl false  # Set true with HTTPS

# Restart RGW after configuration changes
systemctl restart ceph-radosgw@rgw.default
```

## Testing Authorization

```bash
# Try accessing a bucket (should be allowed based on policy)
aws --endpoint-url http://rgw-host:80 s3 ls s3://public-data

# Try accessing a restricted bucket (should be denied)
aws --endpoint-url http://rgw-host:80 s3 ls s3://private-data
```

## Advanced Policy: Attribute-Based Access Control

```rego
package rgw.authz

import future.keywords.if

default allow = false

# Allow access if user clearance meets bucket classification
allow if {
    bucket_classification := data.classifications[input.bucket_info.bucket.name]
    user_clearance := data.user_clearances[input.user_info.user_id]
    user_clearance >= bucket_classification
}
```

Load classification and user clearance data alongside the policy:

```bash
opa run --server \
  --addr 0.0.0.0:8181 \
  rgw_policy.rego \
  classifications.json \
  user_clearances.json
```

## Summary

Integrating Ceph RGW with Open Policy Agent enables sophisticated attribute-based access control beyond standard S3 policies. Write Rego policies to encode business rules, configure RGW to call OPA's REST API for authorization decisions, and test policies independently before deployment. OPA provides centralized policy management and audit logging for all access decisions across your object storage infrastructure.
