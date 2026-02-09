# How to Configure API Server CORS and Allowed Origins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Server, Security, CORS

Description: Learn how to configure CORS and allowed origins for the Kubernetes API server to enable secure browser-based access while preventing unauthorized cross-origin requests.

---

Cross-Origin Resource Sharing (CORS) controls whether browsers allow web applications from one domain to access resources from another domain. By default, the Kubernetes API server does not allow CORS requests. If you need browser-based tools, dashboards, or applications to access the API, you must explicitly configure allowed origins.

## Understanding CORS in Kubernetes Context

When a browser makes a request from one origin (domain, protocol, and port combination) to another, it follows CORS rules. The browser sends a preflight OPTIONS request to check if the cross-origin request is allowed. The server responds with CORS headers indicating whether the request is permitted.

The Kubernetes API server supports CORS configuration through the `--cors-allowed-origins` flag. This controls which web applications can make requests to the API server from browsers.

Configure allowed origins carefully. Overly permissive settings create security vulnerabilities where malicious sites could access your cluster.

## Configuring CORS for kubeadm Clusters

For clusters created with kubeadm, edit the API server manifest:

```bash
# Edit the API server static pod manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add the CORS configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Add CORS allowed origins
    - --cors-allowed-origins=https://dashboard.example.com,https://monitoring.example.com
    # Existing flags
    - --etcd-servers=https://127.0.0.1:2379
    - --tls-cert-file=/etc/kubernetes/pki/apiserver.crt
    # ... other flags
```

The API server will automatically restart when you save the file. Verify the change:

```bash
# Wait for API server to restart
sleep 30

# Check API server is running
kubectl get pods -n kube-system | grep apiserver

# Verify CORS headers
curl -H "Origin: https://dashboard.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization" \
  -X OPTIONS \
  -k https://kubernetes-api:6443/api/v1/namespaces \
  -v
```

Expected response headers:

```
< HTTP/1.1 200 OK
< Access-Control-Allow-Origin: https://dashboard.example.com
< Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
< Access-Control-Allow-Headers: Authorization, Content-Type
```

## Wildcard and Pattern-Based Origins

Use wildcards for development environments only:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Allow all origins (development only!)
    - --cors-allowed-origins=.*
```

For production, explicitly list each allowed origin:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Production: explicit origins only
    - --cors-allowed-origins=https://dashboard.prod.example.com,https://grafana.prod.example.com,https://lens.prod.example.com
```

Use regex patterns for multiple subdomains:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Allow all subdomains of example.com
    - --cors-allowed-origins=https://.*\.example\.com
```

## Configuring for Kubernetes Dashboard

The Kubernetes Dashboard requires CORS configuration if accessed through a browser:

```bash
# Deploy Kubernetes Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Get the dashboard service URL
kubectl get svc -n kubernetes-dashboard
```

Update API server CORS settings:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --cors-allowed-origins=https://dashboard.example.com
```

Create an Ingress for the dashboard:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: kubernetes-dashboard
  namespace: kubernetes-dashboard
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - dashboard.example.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kubernetes-dashboard
            port:
              number: 443
```

## Setting Up CORS for Custom Web Applications

If you build custom web applications that interact with Kubernetes:

```javascript
// frontend/app.js
const kubernetesApiUrl = 'https://api.kubernetes.example.com';

async function listPods(namespace) {
  try {
    const response = await fetch(`${kubernetesApiUrl}/api/v1/namespaces/${namespace}/pods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('k8s-token')}`,
        'Content-Type': 'application/json'
      },
      mode: 'cors',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Failed to fetch pods:', error);
    throw error;
  }
}

// Usage
listPods('default').then(pods => {
  console.log('Pods:', pods);
});
```

Configure CORS for your application domain:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --cors-allowed-origins=https://app.example.com
```

## Implementing Reverse Proxy for CORS

Instead of enabling CORS directly on the API server, use a reverse proxy:

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.kubernetes.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://app.example.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    location / {
        proxy_pass https://kubernetes-api-server:6443;
        proxy_ssl_verify off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Deploy as a Kubernetes service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-cors-proxy
  namespace: kube-system
data:
  nginx.conf: |
    # nginx configuration from above
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-cors-proxy
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-cors-proxy
  template:
    metadata:
      labels:
        app: api-cors-proxy
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 443
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/conf.d
        - name: certs
          mountPath: /etc/nginx/ssl
      volumes:
      - name: config
        configMap:
          name: nginx-cors-proxy
      - name: certs
        secret:
          secretName: api-cors-tls
---
apiVersion: v1
kind: Service
metadata:
  name: api-cors-proxy
  namespace: kube-system
spec:
  type: LoadBalancer
  selector:
    app: api-cors-proxy
  ports:
  - port: 443
    targetPort: 443
```

## Restricting CORS by HTTP Methods

Limit which HTTP methods are allowed from specific origins:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    # Only allow specific origins
    - --cors-allowed-origins=https://readonly-dashboard.example.com
    # In your reverse proxy, restrict to GET only
```

In your reverse proxy configuration:

```nginx
location / {
    # Only allow GET requests from this origin
    if ($request_method !~ ^(GET|OPTIONS)$) {
        return 405;
    }

    proxy_pass https://kubernetes-api-server:6443;
}
```

## Monitoring CORS Requests

Track CORS requests and potential security issues:

```bash
# Check API server logs for CORS-related activity
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep -i "cors\|origin"

# Monitor for unauthorized origin attempts
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep "origin not allowed"
```

Create alerts for suspicious CORS activity:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cors-alerts
  namespace: monitoring
spec:
  groups:
  - name: api-server-cors
    rules:
    - alert: UnauthorizedCORSAttempts
      expr: |
        rate(apiserver_request_total{
          verb="OPTIONS",
          code="403"
        }[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of unauthorized CORS attempts"
        description: "Detect potential CORS scanning or attacks"
```

## Testing CORS Configuration

Test CORS settings from different origins:

```bash
# Test from allowed origin
curl -H "Origin: https://dashboard.example.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  -k https://api.kubernetes.example.com:6443/api/v1/namespaces \
  -v

# Test from disallowed origin (should fail)
curl -H "Origin: https://malicious.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  -k https://api.kubernetes.example.com:6443/api/v1/namespaces \
  -v

# Test actual request
curl -H "Origin: https://dashboard.example.com" \
  -H "Authorization: Bearer <token>" \
  -k https://api.kubernetes.example.com:6443/api/v1/namespaces \
  -v
```

Create a test HTML page:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Kubernetes CORS Test</title>
</head>
<body>
    <h1>Kubernetes API CORS Test</h1>
    <button onclick="testCORS()">Test CORS Request</button>
    <pre id="result"></pre>

    <script>
    async function testCORS() {
        const token = prompt('Enter API token:');
        const resultEl = document.getElementById('result');

        try {
            const response = await fetch('https://api.kubernetes.example.com/api/v1/namespaces', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                mode: 'cors'
            });

            const data = await response.json();
            resultEl.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            resultEl.textContent = `Error: ${error.message}`;
        }
    }
    </script>
</body>
</html>
```

## Security Best Practices

Follow these guidelines for secure CORS configuration:

```yaml
# DON'T: Allow all origins in production
- --cors-allowed-origins=.*

# DO: Explicitly list production origins
- --cors-allowed-origins=https://dashboard.prod.example.com,https://grafana.prod.example.com

# DON'T: Use HTTP origins
- --cors-allowed-origins=http://dashboard.example.com

# DO: Use HTTPS only
- --cors-allowed-origins=https://dashboard.example.com

# DON'T: Use wildcards in production
- --cors-allowed-origins=https://*

# DO: Use specific domains
- --cors-allowed-origins=https://dashboard.example.com
```

## Troubleshooting CORS Issues

Common problems and solutions:

```bash
# Issue: Preflight request fails
# Check: Ensure OPTIONS method is allowed
kubectl logs -n kube-system kube-apiserver-<node> | grep OPTIONS

# Issue: Credentials not sent
# Fix: Add Access-Control-Allow-Credentials header
# In your fetch request:
fetch(url, {
  credentials: 'include'
})

# Issue: Headers not allowed
# Fix: Add custom headers to allowed list
# In nginx proxy:
add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Custom-Header';

# Issue: CORS works in dev but not production
# Check: Verify protocol, domain, and port match exactly
# https://app.example.com:443 !== https://app.example.com:8443
```

Configure CORS carefully to balance security and functionality. Use explicit origin lists in production, implement proper authentication alongside CORS, and monitor for unauthorized access attempts.
