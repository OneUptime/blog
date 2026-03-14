# How to Validate the Calico REST API in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, Lab, Testing, Validation, curl, Automation

Description: Step-by-step REST API validation tests for the Calico API in a lab cluster, confirming endpoint availability, CRUD operations, authentication, and error handling.

---

## Introduction

Validating the Calico REST API means confirming that the API server is accessible, resources can be managed via HTTP calls, authentication works correctly, and validation errors are returned for invalid input. This validation is essential before building automation that depends on the REST API.

## Prerequisites

- A Calico lab cluster with the API server deployed
- `curl` and `jq` available
- `kubectl` configured for proxy mode
- A test service account with appropriate RBAC

## Setup: Start kubectl Proxy

For lab validation, use `kubectl proxy` to avoid manual token management:

```bash
kubectl proxy --port=8080 &
APIBASE="http://localhost:8080"
```

## Validation 1: API Endpoint Discovery

```bash
# Discover the Calico API group
curl -s $APIBASE/apis/projectcalico.org/v3 | jq '.resources[].name'
# Expected: List of Calico resource types

# Verify API version
curl -s $APIBASE/apis/projectcalico.org | jq '.versions[].version'
# Expected: v3
```

## Validation 2: List Resources

```bash
# List GlobalNetworkPolicies
curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies | \
  jq '.items | length'
# Expected: Number (0 or more)

# List IPPools
curl -s $APIBASE/apis/projectcalico.org/v3/ippools | \
  jq '.items[].metadata.name'
# Expected: Name of configured IP pool(s)
```

## Validation 3: Create a Resource

```bash
# Create a GlobalNetworkPolicy via REST API
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "projectcalico.org/v3",
    "kind": "GlobalNetworkPolicy",
    "metadata": {"name": "rest-api-test-policy"},
    "spec": {
      "order": 999,
      "selector": "rest-api-test == true",
      "ingress": [{"action": "Pass"}],
      "egress": [{"action": "Pass"}]
    }
  }' \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies | jq '.metadata.name'
# Expected: "rest-api-test-policy"
```

## Validation 4: Read the Created Resource

```bash
curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/rest-api-test-policy | \
  jq '.spec.order'
# Expected: 999
```

## Validation 5: Update the Resource

```bash
# Get current resource version (required for updates)
RESOURCE_VERSION=$(curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/rest-api-test-policy | \
  jq -r '.metadata.resourceVersion')

# Update the policy order
curl -s -X PUT \
  -H "Content-Type: application/json" \
  -d "{
    \"apiVersion\": \"projectcalico.org/v3\",
    \"kind\": \"GlobalNetworkPolicy\",
    \"metadata\": {
      \"name\": \"rest-api-test-policy\",
      \"resourceVersion\": \"$RESOURCE_VERSION\"
    },
    \"spec\": {
      \"order\": 888,
      \"selector\": \"rest-api-test == true\",
      \"ingress\": [{\"action\": \"Pass\"}],
      \"egress\": [{\"action\": \"Pass\"}]
    }
  }" \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/rest-api-test-policy | \
  jq '.spec.order'
# Expected: 888
```

## Validation 6: Validation Error Handling

```bash
# Test invalid selector syntax (should return 422)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "projectcalico.org/v3",
    "kind": "GlobalNetworkPolicy",
    "metadata": {"name": "invalid-selector-test"},
    "spec": {
      "selector": "this is NOT valid syntax!!",
      "ingress": [{"action": "Pass"}]
    }
  }' \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies)
echo "HTTP response code: $HTTP_CODE"
# Expected: 422 (Unprocessable Entity)
```

## Validation 7: Delete the Resource

```bash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/rest-api-test-policy)
echo "Delete HTTP code: $HTTP_CODE"
# Expected: 200

# Verify deletion
curl -s -o /dev/null -w "%{http_code}" \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/rest-api-test-policy
# Expected: 404
```

## Validation 8: Service Account Authentication

Test that proper service account authentication works (without kubectl proxy):

```bash
# Create service account and RBAC
kubectl create serviceaccount rest-api-tester
kubectl create clusterrolebinding rest-api-tester \
  --clusterrole=view \
  --serviceaccount=default:rest-api-tester

# Get token and API server address
TOKEN=$(kubectl create token rest-api-tester)
APISERVER=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.server}')

# Call API with service account token
curl -s -k -H "Authorization: Bearer $TOKEN" \
  $APISERVER/apis/projectcalico.org/v3/globalnetworkpolicies | \
  jq '.items | length'
# Expected: number (authentication works)

# Clean up
kubectl delete clusterrolebinding rest-api-tester
kubectl delete serviceaccount rest-api-tester
kubectl proxy --stop 2>/dev/null
```

## Validation Checklist

| Test | Expected HTTP Code | Expected Behavior |
|---|---|---|
| API discovery | 200 | Resource list returned |
| List resources | 200 | Items array returned |
| Create resource | 201 | Resource created |
| Read resource | 200 | Resource returned |
| Update resource | 200 | Resource updated |
| Invalid selector | 422 | Validation error returned |
| Delete resource | 200 | Resource deleted |
| Get deleted resource | 404 | Not found |
| SA authentication | 200 | Resources returned |

## Best Practices

- Always clean up test resources after validation to avoid accumulating test artifacts
- Test error handling explicitly — knowing how the API signals failures is as important as knowing how it signals success
- Use `jq` output for all validations — raw JSON is hard to read and error-prone to parse manually

## Conclusion

REST API validation confirms that the Calico API server is accessible, correctly validates input, returns appropriate HTTP status codes for success and error cases, and properly enforces authentication. Running these tests in a lab cluster before building automation ensures your tools behave correctly when they encounter real API responses.
