# How to Implement Dark Launches Using Kubernetes and Header-Based Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Dark Launch, Progressive Delivery

Description: Learn how to implement dark launches in Kubernetes using header-based routing to deploy features to production while keeping them hidden from users until you're ready to reveal them.

---

You want to deploy new code to production and let it run with real data, but you're not ready to show the feature to users yet. Dark launching lets you deploy features in a disabled or hidden state, then enable them when you're confident they work correctly.

## What is a Dark Launch

A dark launch deploys code to production with new features disabled or visible only to internal users. Unlike feature flags that toggle behavior within a running application, dark launches use infrastructure-level routing to control who sees new versions.

Benefits of dark launches:

**Test in production**: New code runs with real data and production load.

**Gradual exposure**: Show features to internal users first, then expand.

**Decouple deployment from release**: Deploy anytime, release when ready.

**Instant rollback**: Hide features immediately if problems arise.

**Performance testing**: Measure performance before exposing to users.

## Basic Dark Launch with Deployments

Deploy two versions with separate services:

```yaml
# Production version - serves all users
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: myapp
      version: production
  template:
    metadata:
      labels:
        app: myapp
        version: production
    spec:
      containers:
      - name: app
        image: myregistry.io/myapp:v1.5.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: app-production
spec:
  selector:
    app: myapp
    version: production
  ports:
  - port: 80
    targetPort: 8080
---
# Dark launch version - hidden from users
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-dark
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
      version: dark
  template:
    metadata:
      labels:
        app: myapp
        version: dark
    spec:
      containers:
      - name: app
        image: myregistry.io/myapp:v2.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DARK_LAUNCH_MODE
          value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: app-dark
spec:
  selector:
    app: myapp
    version: dark
  ports:
  - port: 80
    targetPort: 8080
```

## Header-Based Routing with Nginx Ingress

Route internal users to dark launch version:

```yaml
# Main ingress for production traffic
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-production
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-production
            port:
              number: 80
---
# Dark launch ingress for internal users
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-dark
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Dark-Launch"
    nginx.ingress.kubernetes.io/canary-by-header-value: "enabled"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-dark
            port:
              number: 80
```

Users with `X-Dark-Launch: enabled` header see the dark version:

```bash
# Regular user sees production
curl https://app.example.com/

# Internal user sees dark launch
curl -H "X-Dark-Launch: enabled" https://app.example.com/
```

## Cookie-Based Dark Launch

Use cookies for persistent dark launch access:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-dark
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-cookie: "dark_launch_access"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-dark
            port:
              number: 80
```

Your application sets the cookie for authorized users:

```javascript
// API endpoint that grants dark launch access
app.post('/api/enable-dark-launch', requireInternalUser, (req, res) => {
  res.cookie('dark_launch_access', 'always', {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
  });

  res.json({ message: 'Dark launch enabled' });
});
```

## Istio Virtual Service for Dark Launch

Use Istio for more sophisticated routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-dark-launch
spec:
  hosts:
  - app.example.com
  http:
  # Route 1: Internal users with header
  - match:
    - headers:
        x-dark-launch:
          exact: enabled
    route:
    - destination:
        host: app-dark
        port:
          number: 80
  # Route 2: Beta testers (by user ID)
  - match:
    - headers:
        x-user-id:
          regex: "^(user-123|user-456|user-789)$"
    route:
    - destination:
        host: app-dark
        port:
          number: 80
  # Route 3: All other traffic
  - route:
    - destination:
        host: app-production
        port:
          number: 80
```

## Application-Level Dark Launch

Detect dark launch mode in your application:

```javascript
const isDarkLaunch = req.headers['x-dark-launch'] === 'enabled' ||
                     req.cookies.dark_launch_access === 'always';

app.get('/api/products', async (req, res) => {
  const products = await getProducts();

  if (isDarkLaunch) {
    // Show new feature to dark launch users
    products.forEach(p => {
      p.aiRecommendations = await getAIRecommendations(p.id);
    });
  }

  res.json(products);
});
```

## Progressive Dark Launch Exposure

Gradually expand dark launch access:

```yaml
# Week 1: Only specific internal users
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-dark
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Dark-Launch"
    nginx.ingress.kubernetes.io/canary-by-header-value: "enabled"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-dark
            port:
              number: 80
```

```yaml
# Week 2: Add percentage-based routing (5% of users)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-dark
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-by-header: "X-Dark-Launch"
    nginx.ingress.kubernetes.io/canary-by-header-value: "enabled"
    nginx.ingress.kubernetes.io/canary-weight: "5"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-dark
            port:
              number: 80
```

## Monitoring Dark Launch

Track dark launch usage:

```javascript
// Middleware to track dark launch access
app.use((req, res, next) => {
  const isDarkLaunch = req.headers['x-dark-launch'] === 'enabled';

  if (isDarkLaunch) {
    metrics.increment('dark_launch.requests', {
      endpoint: req.path,
      user: req.user?.id
    });
  }

  next();
});
```

Query metrics:

```promql
# Dark launch request rate
rate(dark_launch_requests_total[5m])

# Dark launch error rate
rate(dark_launch_requests_total{status=~"5.."}[5m])
  /
rate(dark_launch_requests_total[5m])

# Compare production vs dark launch
rate(http_requests_total{version="production"}[5m])
vs
rate(http_requests_total{version="dark"}[5m])
```

## Dark Launch Rollout Automation

Automate dark launch progression:

```bash
#!/bin/bash
# dark-launch-rollout.sh

# Phase 1: Deploy dark version
kubectl apply -f deployment-dark.yaml
kubectl apply -f ingress-dark-internal.yaml

echo "Phase 1: Dark launch deployed for internal users"
read -p "Press enter when ready for phase 2..."

# Phase 2: Expand to 5% of users
kubectl patch ingress app-dark -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/canary-weight": "5"
    }
  }
}'

echo "Phase 2: Dark launch at 5% of users"
read -p "Press enter when ready for phase 3..."

# Phase 3: Increase to 25%
kubectl patch ingress app-dark -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/canary-weight": "25"
    }
  }
}'

echo "Phase 3: Dark launch at 25% of users"
read -p "Press enter to complete rollout..."

# Phase 4: Full rollout
kubectl apply -f deployment-production-v2.yaml
kubectl delete ingress app-dark

echo "Phase 4: Full rollout complete"
```

## Dark Launch with Feature Flags

Combine infrastructure routing with feature flags:

```javascript
// Feature flag service determines visibility
const featureFlags = {
  'new-checkout': {
    darkLaunch: true,
    enabledFor: ['internal', 'beta-testers']
  }
};

function isFeatureEnabled(featureName, userGroup) {
  const feature = featureFlags[featureName];

  if (!feature) return false;

  // Infrastructure routed to dark version
  const isDarkVersion = process.env.VERSION === 'dark';

  // Check if feature is in dark launch mode
  if (feature.darkLaunch && !isDarkVersion) {
    return false;
  }

  // Check user group
  return feature.enabledFor.includes(userGroup);
}

app.post('/api/checkout', (req, res) => {
  if (isFeatureEnabled('new-checkout', req.user.group)) {
    return newCheckoutFlow(req, res);
  } else {
    return legacyCheckoutFlow(req, res);
  }
});
```

## Best Practices

**Start with smallest exposure**. Begin with internal users only.

**Monitor dark launch metrics closely**. Watch for errors or performance issues.

**Document dark launch features**. Keep track of what's in dark launch and why.

**Set timeframes**. Don't leave features in dark launch indefinitely.

**Test thoroughly before dark launch**. Dark launch isn't a substitute for staging testing.

**Communicate with stakeholders**. Let people know features are deployed but not visible.

**Have a disable plan**. Be ready to completely hide features if needed.

## Conclusion

Dark launches give you the best of both worlds: deploy code to production for real-world testing while controlling exactly who sees it. Use header-based or cookie-based routing to show features to internal users first, then gradually expand exposure.

Combined with monitoring and feature flags, dark launches provide a safe path from deployment to full release, letting you validate features with real production data before exposing them to all users.
