# How to Fix Knative Readiness Failures Caused by the Wrong Container Listening Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Troubleshooting

Description: Align a Knative application listener, PORT environment variable, declared container port, and readiness probe to fix connection-refused startup failures.

The container stays running, but the Knative Revision never becomes ready. The application log says it is listening on port 3000 while the generated configuration expects port 8080. Increasing probe timeouts cannot fix a connection to the wrong socket.

Trace the intended request port from the Service template to the actual listener, then check any separately configured health port.

## Inspect the template and the process together

Start with the Knative Service, its latest Revision, and the generated pod:

```bash
kubectl -n applications get ksvc checkout -o yaml
kubectl -n applications get revisions -l serving.knative.dev/service=checkout
kubectl -n applications get pods -l serving.knative.dev/service=checkout
kubectl -n applications logs checkout-example-pod -c app
kubectl -n applications logs checkout-example-pod -c queue-proxy
```

Replace the pod name. Compare `containerPort`, application startup arguments, the application's listening message, and the probe port. Inspect the generated pod YAML when the template and logs disagree. Image entrypoints and framework defaults can override assumptions made in the Service manifest.

A Dockerfile's `EXPOSE` instruction does not start a server or force it to use that port. Likewise, declaring `containerPort` does not change a process that hard-codes port 3000.

## Make the application follow the runtime contract

The [Knative runtime contract](https://github.com/knative/specs/blob/main/specs/serving/runtime-contract.md) defines the request listener and the `PORT` environment variable. Knative's [default request port](https://pkg.go.dev/knative.dev/serving/pkg/apis/serving/v1#pkg-constants) is 8080 when one is not specified. Listen on the configured port and on an address reachable within the pod network, normally `0.0.0.0`, rather than a loopback-only listener.

This small Python program demonstrates the wiring. It is a local diagnostic example, not a production application server:

```python
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b"ready\n" if self.path == "/ready" else b"hello\n"
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

port = int(os.environ.get("PORT", "8080"))
ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
```

Use your framework's supported host and port settings in the real application. The key is to read the runtime-supplied value rather than defining a conflicting `PORT` value in the Service environment.

## Align traffic and readiness settings

If the application needs port 3000, declare that request port and make the application honor the injected value:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: checkout
  namespace: applications
spec:
  template:
    spec:
      containers:
        - name: app
          image: registry.example.com/apps/checkout:build-42
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
```

Replace the image with your application. A separate management port is also possible, but its readiness handler must actually listen there. [Knative's probe documentation](https://knative.dev/docs/serving/services/configure-probing/) explains that a probe can target a different port and that readiness is handled through queue-proxy. Do not replace an intentional management port merely to make the numbers match.

For multi-container Services, exactly one user container declares the request-serving port. Sidecars can have their own health listeners and probes when the relevant probing feature is enabled. See the [multi-container feature reference](https://knative.dev/docs/serving/configuration/feature-flags/#multiple-containers).

## Verify the new Revision

Apply the change to the Service template through your normal deployment workflow. Editing the generated pod or Deployment will not create a durable fix. Check the new Revision's conditions, startup log, and queue-proxy output, then call the Service URL.

Distinguish failure signatures: connection refused suggests no listener at the target address and port; a 404 suggests a reachable server with the wrong path; a timeout can involve network policy, a blocked handler, or an unavailable dependency. Fix the matching layer before increasing deadlines.

Finally test a cold start. A warm pod that happened to survive an old configuration is weaker evidence than a fresh pod that listens on the expected port, passes readiness, and serves a real request.
