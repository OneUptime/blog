# How to Configure HTTP Header Size Limits in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HTTP, Header, Configuration, Sidecar

Description: Learn how to configure Dapr sidecar HTTP header size limits to handle large headers in JWTs, tracing contexts, and custom metadata.

---

## Overview

By default, Dapr's HTTP server enforces limits on header sizes to prevent resource exhaustion attacks. Services that pass large JWTs, distributed tracing contexts, or custom metadata headers may need to increase these limits.

## Default Header Limits

Dapr uses the fasthttp library (not Go's standard `net/http`), which has:
- Default read buffer size: 4 KB
- Maximum number of headers: no hard limit by default
- Header size limit: configurable via `--dapr-http-read-buffer-size`

Note: The `--dapr-http-max-request-size` flag controls the maximum **request body** size (default 4 MB), not header size.

## Configuring the Maximum Header Size

Set the maximum HTTP header size via the `dapr-http-read-buffer-size` annotation (in KB):

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "api-gateway"
  dapr.io/http-read-buffer-size: "64"
```

This sets the read buffer to 64 KB, accommodating large headers.

For local development:

```bash
dapr run --app-id api-gateway \
  --dapr-http-read-buffer-size 64 \
  --app-port 8080 \
  -- python app.py
```

## Diagnosing Header Size Issues

If a client receives a `431 Request Header Fields Too Large` response or a "Too big request header" error from the Dapr sidecar, check the sidecar logs:

```bash
kubectl logs -l app=api-gateway -c daprd | grep "header"
```

To measure actual header sizes in your requests:

```bash
curl -v -H "Authorization: Bearer $(cat large-token.txt)" \
  http://localhost:3500/v1.0/invoke/api-gateway/method/endpoint 2>&1 | \
  grep -i "authorization" | wc -c
```

## Large JWT Tokens

JWTs carrying many claims can exceed 8 KB. Verify your token size:

```python
import base64, json

token = "eyJ..."
# Decode the payload (second segment)
payload_b64 = token.split('.')[1]
payload = json.loads(base64.b64decode(payload_b64 + '=='))
print(f"Claims count: {len(payload)}")
print(f"Token length: {len(token)} chars")
```

If the token is large, increase the read buffer:

```yaml
annotations:
  dapr.io/http-read-buffer-size: "128"
```

## Tracing Header Considerations

Distributed tracing headers (W3C Trace Context, B3) are typically small, but baggage headers can grow large. Configure Dapr tracing to use minimal baggage:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: traceconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

## Summary

Dapr's `http-read-buffer-size` annotation controls how large HTTP headers the sidecar accepts. Increase this value in KB when your services use large JWTs or extensive trace baggage. Always balance the limit increase with security considerations to avoid enabling header-based denial-of-service attacks.
