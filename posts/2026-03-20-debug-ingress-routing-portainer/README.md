# How to Debug Ingress Routing Problems in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Ingress, Networking, Troubleshooting

Description: Diagnose Kubernetes Ingress routing failures including misconfigured rules, TLS errors, and backend service issues via Portainer.

---

Kubernetes Ingress routing failures leave users unable to reach your application through the configured hostname or path. Portainer's Ingress view and terminal access help you trace the routing chain from the Ingress rule to the backend service.

## Ingress Routing Chain

```mermaid
graph LR
    Client[Browser] --> DNS[DNS: api.example.com]
    DNS --> LB[LoadBalancer/NodePort]
    LB --> Ingress[Ingress Controller]
    Ingress --> Service[Kubernetes Service]
    Service --> Pod[Application Pod]
```

## Step 1: Check Ingress Resource Status

In Portainer, navigate to **Kubernetes > Ingresses** (if visible) or use the terminal:

```bash
kubectl get ingress -n production
kubectl describe ingress api-ingress -n production
```

Check the Address field - if empty, the Ingress Controller has not assigned an IP, which means the controller may not be running.

## Step 2: Verify Ingress Controller is Running

```bash
## Check nginx-ingress controller pods
kubectl get pods -n ingress-nginx

## Check controller logs for routing errors
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50
```

## Step 3: Validate the Ingress Spec

```yaml
# Common mistakes to check:
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
spec:
  ingressClassName: nginx   # Must match an installed IngressClass
  rules:
    - host: api.example.com   # Must match DNS/request hostname
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service   # Must match exact service name
                port:
                  number: 8080      # Must match service port
```

## Step 4: Test Backend Service Directly

Bypass the Ingress and test the service directly:

```bash
## Port-forward to test the service without Ingress
kubectl port-forward svc/api-service 8080:8080 -n production
curl http://localhost:8080/health
```

If the service responds, the issue is in the Ingress or controller configuration.

## Step 5: Check TLS Certificate Issues

For HTTPS Ingress:

```bash
## Check certificate status
kubectl get certificate -n production
kubectl describe certificate api-tls -n production

## Check the TLS secret exists
kubectl get secret api-tls-secret -n production
```

## Summary

Ingress debugging follows the routing chain: verify the controller is running, confirm the Ingress spec matches the service name and port, test the backend service directly, and check TLS certificate status for HTTPS issues. Portainer's terminal makes each kubectl command accessible without local cluster configuration.
