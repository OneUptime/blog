# How to Debug Services with kubectl Port-Forward and Inspect Ingress Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Networking, DevOps

Description: Quickly tunnel into Pods/Services with `kubectl port-forward`, verify Ingress routing/TLS, and capture the signals you need when traffic misbehaves.

---

Two core skills keep engineers fast on Kubernetes:

1. **`kubectl port-forward`** to hit a Pod/Service as if it were local.
2. **Ingress debugging** to confirm hosts, paths, and certificates are wired correctly.

## 1. Port-Forward to a Pod

Port-forwarding creates a direct tunnel from your local machine to a specific Pod, bypassing Services and Ingress entirely. This is ideal for debugging a single container without any load balancing.

```bash
# Find the exact Pod name using label selectors
kubectl get pods -n dev -l app=payments-api
# Forward local port 8080 to container port 8080
kubectl port-forward pod/payments-api-7f8c 8080:8080 -n dev
```

Now `http://localhost:8080/healthz` hits the container directly. Perfect for stepping through API calls or comparing behavior before the Service mesh.

### Tips

- Use `--address 0.0.0.0` sparingly if teammates need access; default is localhost for safety.
- Combine with `kubectl exec` for live code changes.

## 2. Port-Forward to a Service

When forwarding to a Service, Kubernetes routes your traffic through the Service's load balancing logic. This lets you test what clients see when they connect via the Service DNS name.

```bash
# Forward local port 9000 to Service port 80 (which routes to backend Pods)
kubectl port-forward svc/payments-api 9000:80 -n dev
```

Here Kubernetes load-balances across Pods, matching what clients see. Test sticky sessions, TLS termination, or HTTP headers locally without exposing the Service to the internet.

## 3. Port-Forward to Databases/Queues

You can forward to StatefulSets the same way, which is perfect for database access. This avoids exposing database ports publicly while still allowing local development tools to connect.

```bash
# Forward local port 5433 to PostgreSQL port 5432 inside the cluster
kubectl port-forward statefulset/postgres 5433:5432 -n dev
# Connect using any PostgreSQL client pointing to localhost
psql postgres://user:pass@localhost:5433/app
```

No need to open public database ports; everything rides over the Kubernetes API tunnel.

Stop forwarding with CTRL+C.

## 4. Inspect Ingress Definitions

`ingress/payments.yaml`

This Ingress resource tells the NGINX Ingress Controller to route external HTTPS traffic for `pay.example.com` to the `payments-api` Service. The TLS block references a Secret containing the certificate and private key.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments
  namespace: prod
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"  # Allow larger request bodies
spec:
  ingressClassName: nginx           # Which Ingress controller handles this
  tls:
    - hosts: ["pay.example.com"]    # Hostnames covered by the certificate
      secretName: payments-tls       # Secret containing tls.crt and tls.key
  rules:
    - host: pay.example.com         # Match requests to this hostname
      http:
        paths:
          - path: /                  # Route all paths under /
            pathType: Prefix
            backend:
              service:
                name: payments-api   # Target Service name
                port:
                  number: 80         # Service port to forward to
```

Apply and then inspect the Ingress status:

```bash
# Show the external IP/hostname assigned to the Ingress
kubectl get ingress payments -n prod
# Display detailed events, TLS info, and backend status
kubectl describe ingress payments -n prod
```

`describe` shows the resolved address, TLS secret, and recent events (e.g., misconfigurations, cert issues).

## 5. Debug Ingress Controllers

When Ingress routing fails, the problem is often inside the controller itself. These commands help you check controller health, read logs for 4xx/5xx errors, and dump the generated NGINX config.

```bash
# Verify the controller Pods are running
kubectl get pods -n ingress-nginx
# Stream logs to spot config reload errors or upstream failures
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
# Dump the active NGINX config to verify your Ingress was processed
kubectl exec -n ingress-nginx deploy/ingress-nginx-controller -- nginx -T | head
```

Look for 4xx/5xx spikes or config reload errors. For Traefik/HAProxy/AWS ALB controllers, check their respective namespaces/log commands.

## 6. Validate End-to-End Traffic

1. Resolve DNS: `dig pay.example.com` should match the ingress IP/hostname.
2. Curl with host headers to test routing even before DNS propagates:

```bash
# Send a request directly to the Ingress IP with the expected Host header
# -k ignores certificate warnings (useful for self-signed certs)
curl -H "Host: pay.example.com" https://<ingress-ip>/healthz -k
```

3. Check TLS certificate details to verify the correct cert is being served:

```bash
# Connect and extract certificate info (issuer, dates, subject)
openssl s_client -connect pay.example.com:443 -servername pay.example.com | openssl x509 -noout -dates -subject
```

4. Trace headers hitting the Pod by enabling request logging or using `kubectl sniff`/`tcpdump` when necessary.

## 7. Common Failure Patterns

- **404 from Ingress:** Path mismatch or Service port mis-specified. Confirm `pathType` and `service.port.number`.
- **TLS handshake failure:** Wrong secret name or certificate missing host SAN entries.
- **Port-forward works, ingress fails:** Usually network policies, Ingress controller issues, or external load balancer health checks failing.

## 8. Automate Smoke Tests

- After deploying an Ingress, run `kubectl wait --for=condition=available deployment/ingress-nginx-controller` to ensure the controller is ready.
- Use CI to `curl` each host/path combo via port-forwarded Services or Ingress endpoints.
- Log probe outputs so you can diff responses after changes.

---

With port-forwarding and solid Ingress debugging habits, you can reproduce almost any customer issue locally and confirm the fix before rolling it out again.
