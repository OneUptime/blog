# How to Avoid Common Mistakes with the Calico REST API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, Troubleshooting, Best Practices, Automation

Description: Common mistakes when using Calico's REST API for automation — from missing resourceVersion on updates to overpermissioned service accounts — and how to prevent them.

---

## Introduction

REST API mistakes in Calico automation range from resource conflicts caused by missing `resourceVersion` fields to security risks from overpermissioned service accounts. These mistakes tend to be discovered in production when the automation runs against real data, not in testing.

## Prerequisites

- Experience using the Calico REST API for automation
- Access to cluster logs and API server audit logs
- Understanding of Kubernetes resource versioning

## Mistake 1: Missing resourceVersion on Updates

Kubernetes uses optimistic locking — when you update a resource, you must include the current `resourceVersion` in the metadata. Without it, the update is rejected with a 409 Conflict error.

**Symptom**: Update calls return `409 Conflict` even though you just read the resource.

**Wrong approach**:
```bash
# Missing resourceVersion - will fail with 409
curl -s -X PUT -d '{"metadata":{"name":"my-policy"},"spec":{...}}' \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/my-policy
```

**Correct approach**:
```bash
# Always include resourceVersion from the current resource
CURRENT=$(curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/my-policy)
RESOURCE_VERSION=$(echo $CURRENT | jq -r '.metadata.resourceVersion')

curl -s -X PUT \
  -d "{\"metadata\":{\"name\":\"my-policy\",\"resourceVersion\":\"$RESOURCE_VERSION\"},\"spec\":{...}}" \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/my-policy
```

## Mistake 2: Not Handling 409 Conflicts on Create

When automation tries to create a resource that already exists, the API returns 409. Many automation scripts fail on this instead of handling it gracefully.

**Fix**: Use create-or-update pattern:
```bash
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" -X POST \
  -d @policy.json \
  $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies)

if [ "$HTTP_CODE" = "409" ]; then
  echo "Resource exists, updating instead..."
  RESOURCE_VERSION=$(curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies/my-policy | \
    jq -r '.metadata.resourceVersion')
  # Add resourceVersion and PUT instead
fi
```

## Mistake 3: Using Admin Credentials in Automation

Using the cluster admin kubeconfig or a service account with cluster-admin permissions in automation pipelines is a significant security risk. If the credentials are exposed, an attacker has full cluster access.

**Fix**: Create dedicated service accounts with minimal RBAC:
```bash
# Minimal permissions — only what the automation needs
kubectl create clusterrole calico-policy-automation \
  --verb=get,list,watch,create,update,patch,delete \
  --resource=networkpolicies.projectcalico.org \
  --resource=globalnetworkpolicies.projectcalico.org

# Bind to a dedicated service account (not cluster-admin)
kubectl create clusterrolebinding calico-policy-automation \
  --clusterrole=calico-policy-automation \
  --serviceaccount=ci-system:calico-pipeline
```

## Mistake 4: Not Implementing Retry Logic for 429 and 503

API servers enforce rate limits. Automation that doesn't handle 429 (Too Many Requests) responses will fail silently or crash during high-load periods.

**Fix**: Implement exponential backoff:
```python
import time
import requests

def calico_api_call_with_retry(url, method="GET", data=None, max_retries=5):
    for attempt in range(max_retries):
        response = requests.request(method, url, json=data, headers=auth_headers, verify=False)
        if response.status_code == 429:
            wait = 2 ** attempt  # Exponential backoff: 1, 2, 4, 8, 16 seconds
            time.sleep(wait)
            continue
        return response
    raise Exception(f"API call failed after {max_retries} retries")
```

## Mistake 5: Polling Instead of Watching

Automation that polls for resource changes with periodic GET requests creates unnecessary API load and has inherent latency.

**Wrong approach**:
```bash
# Don't do this - polling creates unnecessary API load
while true; do
  curl -s $APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies
  sleep 10
done
```

**Correct approach** — use watch:
```bash
# Use watch for real-time change notification
curl -s "$APIBASE/apis/projectcalico.org/v3/globalnetworkpolicies?watch=true" | \
  while read -r event; do
    echo "Policy change detected: $(echo $event | jq -r '.type')"
  done
```

## Mistake 6: Using Raw curl in Production Instead of Client Libraries

Shell scripts with `curl` don't handle TLS verification, connection pooling, or automatic retries properly. Production automation should use proper Kubernetes client libraries.

**Fix**: Use `kubernetes-client` for Python, `controller-runtime` for Go, or `@kubernetes/client-node` for Node.js. These libraries handle authentication, retries, watches, and TLS correctly.

## Best Practices

- Always include `resourceVersion` in PUT requests
- Implement create-or-update logic to handle 409 Conflict responses
- Use dedicated service accounts with minimal RBAC for automation
- Implement exponential backoff for 429 and 503 responses
- Use watch instead of polling for real-time change detection
- Use Kubernetes client libraries instead of raw curl in production

## Conclusion

REST API mistakes in Calico automation are typically preventable through proper error handling, minimal RBAC service accounts, watch-based change detection, and Kubernetes client library usage. Building these patterns correctly from the start avoids debugging sessions caused by missing resourceVersion, credential exposure, or rate limiting failures in production.
