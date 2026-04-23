# How to Troubleshoot Ingress Not Working in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Ingress, Networking

Description: Step-by-step troubleshooting guide for Ingress failures in Rancher-managed clusters, covering nginx-ingress, cert-manager, DNS, and backend connectivity.

## Introduction

Ingress resources in Rancher-managed clusters can fail to route traffic for several reasons: the Ingress controller may not be running, the backend service may be unreachable, TLS termination may be misconfigured, or DNS may not resolve correctly. This guide provides a systematic approach to isolating and fixing Ingress issues.

## Step 1: Verify the Ingress Resource

```bash
# Check the Ingress resource definition

kubectl get ingress -n <namespace> <ingress-name> -o yaml

# Look for the ADDRESS field and Events
kubectl get ingress -n <namespace>
kubectl describe ingress -n <namespace> <ingress-name>
# NAME    CLASS   HOSTS                  ADDRESS         PORTS   AGE
# myapp   nginx   myapp.example.com      10.0.0.100      80,443  5m
# If ADDRESS is empty, the controller may not have published status yet.
# On NodePort or hostNetwork setups, ADDRESS can stay empty even when routing works.
```

## Step 2: Check the Ingress Controller

```bash
# List Ingress controller pods
kubectl get pods -n ingress-nginx                             # nginx-ingress
kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik  # traefik

# Check for controller errors
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller --tail=100

# Verify the IngressClass
kubectl get ingressclass
# NAME    CONTROLLER             PARAMETERS   AGE
# nginx   k8s.io/ingress-nginx   <none>       2d

# If your Ingress omits ingressClassName and this should be the cluster-wide default
# make this IngressClass the default. Only one default IngressClass should exist.
kubectl annotate ingressclass nginx \
  ingressclass.kubernetes.io/is-default-class="true"
```

## Step 3: Verify Backend Service and Endpoints

```bash
# Check that the backend service exists
kubectl get service -n <namespace> <backend-service>

# Check that the service has EndpointSlices / ready backends
kubectl get endpointslice -n <namespace> -l kubernetes.io/service-name=<backend-service>
# If no EndpointSlices are listed, no Pods match the service selector

# Verify Pod selector matches
kubectl get pods -n <namespace> -l <selector-labels>
kubectl describe service -n <namespace> <backend-service> | grep Selector
```

## Step 4: Test Traffic Flow

```bash
# Test the backend service directly (port-forward)
kubectl port-forward -n <namespace> service/<backend-service> 8080:80
curl http://localhost:8080/

# Test via the Ingress controller service's external address (LoadBalancer setups)
INGRESS_ADDR=$(kubectl get service -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}')
curl -H "Host: myapp.example.com" http://${INGRESS_ADDR}/

# Test via the node's IP with the NodePort
NODE_PORT=$(kubectl get service -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')
curl -H "Host: myapp.example.com" http://<node-ip>:${NODE_PORT}/
```

## Step 5: Troubleshoot TLS/HTTPS

```bash
# Check TLS secret referenced in the Ingress
kubectl get ingress -n <namespace> <ingress-name> -o jsonpath='{.spec.tls}'

# Verify the secret exists and contains valid certificate data
kubectl get secret -n <namespace> <tls-secret-name>
kubectl get secret -n <namespace> <tls-secret-name> -o json \
  | jq -r '.data["tls.crt"]' | base64 -d | openssl x509 -noout -dates

# Check if the certificate's CN/SAN matches the Ingress hostname
kubectl get secret -n <namespace> <tls-secret-name> -o json \
  | jq -r '.data["tls.crt"]' | base64 -d \
  | openssl x509 -noout -text | grep -A2 "Subject Alternative Name"
```

## Step 6: Check Ingress Controller Configuration

```bash
# View the nginx configuration generated for your Ingress
NGINX_POD=$(kubectl get pods -n ingress-nginx \
  -l app.kubernetes.io/component=controller -o jsonpath='{.items[0].metadata.name}')

# Exec into the nginx pod and check configuration
kubectl exec -n ingress-nginx ${NGINX_POD} -- nginx -T 2>/dev/null \
  | grep -A 20 "server_name myapp.example.com"

# Check for Ingress admission webhook issues (name varies by release)
kubectl get validatingwebhookconfiguration | grep ingress-nginx
kubectl describe validatingwebhookconfiguration <matching-webhook-name>
```

## Step 7: Check LoadBalancer Service

```bash
# Check how the Ingress controller service is exposed
kubectl get service -n ingress-nginx ingress-nginx-controller

# If the service type is LoadBalancer and EXTERNAL-IP is <pending>, provisioning is incomplete
# For bare-metal clusters using a LoadBalancer service, MetalLB or similar is commonly required
kubectl get pods -n metallb-system

# Check events on the Service for provider-specific provisioning errors
kubectl describe service -n ingress-nginx ingress-nginx-controller
```

## Common Ingress Annotations

```yaml
# Example well-annotated Ingress for nginx
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    # TLS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Increase proxy timeout for slow backends
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    # Custom error page
    nginx.ingress.kubernetes.io/custom-http-errors: "404,503"
spec:
  # Specify the IngressClass
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls
  rules:
    - host: myapp.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-service
                port:
                  number: 80
```

## Conclusion

Ingress troubleshooting in Rancher follows a clear path: verify the resource is recognized by the controller, confirm the Ingress controller is healthy, validate that backend services have ready backends, test the traffic path layer by layer, and finally check TLS configuration. The most common issues are missing EndpointSlices or pod selector mismatches, missing IngressClass, and TLS certificates that do not match the hostname.
