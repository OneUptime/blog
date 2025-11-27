# How to Debug Services with kubectl Port-Forward and Inspect Ingress Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Networking, DevOps

Description: Quickly tunnel into Pods/Services with `kubectl port-forward`, verify Ingress routing/TLS, and capture the signals you need when traffic misbehaves.

---

Two core skills keep engineers fast on Kubernetes:

1. **`kubectl port-forward`** to hit a Pod/Service as if it were local.
2. **Ingress debugging** to confirm hosts, paths, and certificates are wired correctly.

## 1. Port-Forward to a Pod

```bash
kubectl get pods -n dev -l app=payments-api
kubectl port-forward pod/payments-api-7f8c 8080:8080 -n dev
```

Now `http://localhost:8080/healthz` hits the container directly. Perfect for stepping through API calls or comparing behavior before the Service mesh.

### Tips

- Use `--address 0.0.0.0` sparingly if teammates need access; default is localhost for safety.
- Combine with `kubectl exec` for live code changes.

## 2. Port-Forward to a Service

```bash
kubectl port-forward svc/payments-api 9000:80 -n dev
```

Here Kubernetes load-balances across Pods, matching what clients see. Test sticky sessions, TLS termination, or HTTP headers locally without exposing the Service to the internet.

## 3. Port-Forward to Databases/Queues

```bash
kubectl port-forward statefulset/postgres 5433:5432 -n dev
psql postgres://user:pass@localhost:5433/app
```

No need to open public database ports; everything rides over the Kubernetes API tunnel.

Stop forwarding with CTRL+C.

## 4. Inspect Ingress Definitions

`ingress/payments.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: payments
  namespace: prod
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  tls:
    - hosts: ["pay.example.com"]
      secretName: payments-tls
  rules:
    - host: pay.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: payments-api
                port:
                  number: 80
```

Apply and then run:

```bash
kubectl get ingress payments -n prod
kubectl describe ingress payments -n prod
```

`describe` shows the resolved address, TLS secret, and recent events (e.g., misconfigurations, cert issues).

## 5. Debug Ingress Controllers

Common commands:

```bash
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller
kubectl exec -n ingress-nginx deploy/ingress-nginx-controller -- nginx -T | head
```

Look for 4xx/5xx spikes or config reload errors. For Traefik/HAProxy/AWS ALB controllers, check their respective namespaces/log commands.

## 6. Validate End-to-End Traffic

1. Resolve DNS: `dig pay.example.com` should match the ingress IP/hostname.
2. Curl with host headers:

```bash
curl -H "Host: pay.example.com" https://<ingress-ip>/healthz -k
```

3. Check TLS certificate details:

```bash
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
