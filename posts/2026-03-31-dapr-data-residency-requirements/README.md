# How to Implement Data Residency Requirements with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Compliance, Data Residency, Kubernetes, Security

Description: Learn how to configure Dapr components to enforce data residency requirements, ensuring data stays within designated geographic regions or jurisdictions.

---

## What Is Data Residency?

Data residency regulations (GDPR in Europe, LGPD in Brazil, PDPA in Thailand) require that certain types of personal or sensitive data be stored and processed within specific geographic boundaries. In a Dapr-based architecture, this means configuring state stores, pub/sub components, and bindings to use region-specific endpoints.

## Configuring Region-Specific State Stores

Deploy separate Dapr components for each geographic region:

```yaml
# EU data residency - state store in eu-west-1
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-eu
  namespace: eu-production
  labels:
    data-region: "eu"
    residency-required: "true"
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://mycosmosdb-eu.documents.azure.com:443/"
  - name: masterKey
    secretKeyRef:
      name: cosmosdb-secret-eu
      key: masterKey
  - name: database
    value: "UserData"
  - name: collection
    value: "eu-users"
scopes:
- user-service-eu
- profile-service-eu
```

```yaml
# US data residency - state store in us-east-1
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-us
  namespace: us-production
  labels:
    data-region: "us"
    residency-required: "false"
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "UserDataUS"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-secret
      key: secretKey
scopes:
- user-service-us
```

## Routing Services to Region-Specific Components

Use Kubernetes namespaces and service selectors to route workloads to the correct regional component:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: eu-production
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "user-service-eu"
        dapr.io/config: "eu-residency-config"
    spec:
      nodeSelector:
        topology.kubernetes.io/region: "eu-west-1"
      containers:
      - name: user-service
        image: myregistry/user-service:latest
        env:
        - name: DAPR_STATE_STORE
          value: "statestore-eu"
        - name: DATA_REGION
          value: "EU"
```

## Validating Data Residency at Runtime

Add application-level middleware to validate that requests from EU services only access EU-designated components:

```javascript
// residency-validator.js - Express middleware
app.use('/v1.0/state/:storeName/*', (req, res, next) => {
    const region = process.env.DATA_REGION;
    const storeName = req.params.storeName;

    if (region === 'EU' && !storeName.endsWith('-eu')) {
        return res.status(403).json({
            error: 'Data residency violation',
            message: `EU services must use EU-designated state stores`
        });
    }
    next();
});
```

## Enforcing Residency with Network Policies

Restrict network traffic to ensure services only communicate within their region:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: eu-data-residency-policy
  namespace: eu-production
spec:
  podSelector:
    matchLabels:
      data-region: "eu"
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          data-region: "eu"
    ports:
    - protocol: TCP
      port: 6379
    - protocol: TCP
      port: 443
```

## Auditing Residency Compliance

Regularly audit component usage to verify residency requirements are met:

```bash
#!/bin/bash
# residency-audit.sh
echo "=== Components by Region ==="
kubectl get components --all-namespaces -o json | \
  jq '.items[] | {
    name: .metadata.name,
    namespace: .metadata.namespace,
    region: .metadata.labels["data-region"],
    type: .spec.type
  }'
```

## Summary

Implementing data residency with Dapr involves deploying region-specific component definitions pointing to geographically constrained backends, using Kubernetes namespaces and node selectors to pin workloads to the correct region, and applying network policies to prevent cross-region data flows. Regular compliance audits should verify that component labels, scopes, and backend endpoints remain consistent with residency requirements.
