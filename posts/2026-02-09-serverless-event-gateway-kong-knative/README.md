# How to Build a Serverless Event Gateway with Kong and Knative on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kong, Knative, Kubernetes, API-Gateway, Event-Gateway

Description: Build a scalable serverless event gateway using Kong API Gateway with Knative Eventing to route, transform, and secure event-driven traffic on Kubernetes.

---

An event gateway acts as a central entry point for events flowing into your system. By combining Kong's powerful API gateway capabilities with Knative's event-driven architecture, you can build a robust gateway that handles authentication, rate limiting, transformation, and intelligent routing. This guide shows you how to implement this pattern on Kubernetes.

## Understanding the Architecture

Kong serves as the front door, handling HTTP requests and applying policies like authentication, rate limiting, and request transformation. Behind Kong, Knative Eventing provides event routing, filtering, and delivery guarantees. This separation of concerns creates a clean architecture where Kong handles gateway concerns and Knative handles event processing.

The gateway converts HTTP requests into CloudEvents and publishes them to Knative Brokers. Triggers route events to appropriate services based on event attributes. This pattern enables loose coupling between API consumers and backend services.

## Installing Kong on Kubernetes

Deploy Kong using the Kubernetes ingress controller:

```bash
# Install Kong
kubectl create namespace kong
helm repo add kong https://charts.konghq.com
helm repo update

helm install kong kong/kong \
  --namespace kong \
  --set ingressController.enabled=true \
  --set ingressController.installCRDs=false \
  --set postgres.enabled=false \
  --set env.database=off \
  --set env.router_flavor=traditional

# Verify installation
kubectl get pods -n kong
kubectl get svc -n kong kong-proxy
```

## Configuring Event Ingestion

Create a Kong service that forwards to Knative Broker:

```yaml
# kong-to-broker-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: event-gateway
  namespace: default
  annotations:
    konghq.com/plugins: rate-limiting,auth,request-transformer
spec:
  type: ExternalName
  externalName: orders-broker-ingress.default.svc.cluster.local
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: event-gateway
  namespace: default
  annotations:
    konghq.com/strip-path: "true"
spec:
  ingressClassName: kong
  rules:
  - http:
      paths:
      - path: /events
        pathType: Prefix
        backend:
          service:
            name: event-gateway
            port:
              number: 80
```

## Implementing Authentication and Authorization

Configure Kong authentication:

```yaml
# kong-auth-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: auth
  namespace: default
plugin: key-auth
config:
  key_names:
    - apikey
  hide_credentials: true
---
# Create API key
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: event-producer
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
username: event-producer
credentials:
  - event-producer-key
---
apiVersion: v1
kind: Secret
metadata:
  name: event-producer-key
  namespace: default
  labels:
    konghq.com/credential: key-auth
stringData:
  key: your-secret-api-key-here
```

## Adding Rate Limiting

Implement rate limiting to protect your system:

```yaml
# rate-limiting-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
  namespace: default
plugin: rate-limiting
config:
  minute: 100
  hour: 1000
  policy: local
  fault_tolerant: true
```

## Request Transformation

Transform incoming requests into CloudEvents:

```yaml
# request-transformer-plugin.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: request-transformer
  namespace: default
plugin: request-transformer
config:
  add:
    headers:
      - Ce-Id:$(uuid)
      - Ce-Specversion:1.0
      - Ce-Type:api.event.created
      - Ce-Source:kong-gateway
      - Content-Type:application/json
```

## Complete Event Gateway Implementation

Build a complete gateway with all components:

```javascript
// gateway-transformer.js - Deployed as Knative Service
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
app.use(express.json());

const BROKER_URL = process.env.BROKER_URL;

app.post('/transform', async (req, res) => {
  try {
    const eventType = req.headers['x-event-type'] || 'generic.event';
    const userId = req.headers['x-user-id'];

    const cloudEvent = {
      specversion: '1.0',
      id: uuidv4(),
      type: eventType,
      source: 'event-gateway',
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: req.body,
      extensions: {
        userid: userId,
        gateway: 'kong'
      }
    };

    // Publish to broker
    await axios.post(BROKER_URL, cloudEvent.data, {
      headers: {
        'Ce-Id': cloudEvent.id,
        'Ce-Specversion': cloudEvent.specversion,
        'Ce-Type': cloudEvent.type,
        'Ce-Source': cloudEvent.source,
        'Ce-Time': cloudEvent.time,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      status: 'accepted',
      eventId: cloudEvent.id
    });

  } catch (error) {
    console.error('Transformation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, () => console.log('Gateway transformer ready'));
```

Deploy the transformer:

```yaml
# gateway-transformer.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: gateway-transformer
spec:
  template:
    spec:
      containers:
      - image: your-registry/gateway-transformer:latest
        env:
        - name: BROKER_URL
          value: http://orders-broker-broker.default.svc.cluster.local
```

## Monitoring and Observability

Track gateway metrics:

```bash
# Kong metrics
kubectl port-forward -n kong svc/kong-admin 8001:8001
curl http://localhost:8001/status

# View Kong logs
kubectl logs -n kong -l app=kong --tail=100 -f
```

Create dashboards:

```promql
# Request rate
rate(kong_http_requests_total[5m])

# Latency
histogram_quantile(0.95, rate(kong_latency_bucket[5m]))

# Error rate
rate(kong_http_requests_total{code=~"5.."}[5m])
```

## Best Practices

Use API keys or OAuth for authentication. Never allow unauthenticated access to your event gateway in production.

Implement appropriate rate limits. Protect backend services from overload while allowing legitimate traffic through.

Transform at the edge. Convert requests to CloudEvents at the gateway rather than requiring clients to understand CloudEvents format.

Monitor gateway health. Track request rates, error rates, and latency. Set up alerts for anomalies.

Use dead letter queues. Configure DLQ handlers for events that fail processing to prevent data loss.

Version your APIs. Use path prefixes or headers to version event types, enabling smooth transitions during schema changes.

## Conclusion

Combining Kong and Knative creates a powerful serverless event gateway that handles both API gateway concerns and event routing. Kong provides enterprise-grade security, rate limiting, and transformation while Knative delivers reliable event delivery and routing. This architecture enables you to build scalable, secure event-driven systems that can grow with your needs while maintaining clear separation of concerns.
