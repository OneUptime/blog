# How to Set Up Deployment Webhooks for Pre-Rollout Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Deployments

Description: Learn how to implement admission webhooks and pre-rollout validation hooks to automatically validate deployments before they roll out, preventing invalid configurations from reaching production.

---

Your deployment passes YAML validation but fails at runtime because the image doesn't exist, resource limits are too low, or configuration is invalid. By the time you discover the problem, pods are crash-looping and your service is degraded.

Deployment webhooks validate configuration before rollout, catching problems early.

## Types of Deployment Webhooks

**Validating Admission Webhooks**: Intercept deployment creation/updates and validate before Kubernetes accepts them.

**Mutating Admission Webhooks**: Modify deployments automatically (add labels, inject sidecars, etc.).

**Pre-Rollout Webhooks**: External validation before progressive delivery tools start rollouts.

## Validating Admission Webhook

Create a webhook that validates deployments:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: deployment-validator
webhooks:
- name: deployment.validator.example.com
  clientConfig:
    service:
      name: deployment-validator
      namespace: default
      path: "/validate"
    caBundle: LS0tLS...  # Base64 encoded CA cert
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: ["apps"]
    apiVersions: ["v1"]
    resources: ["deployments"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Fail  # Reject deployment if webhook fails
  timeoutSeconds: 5
```

## Webhook Server Implementation

Build a webhook server that validates deployments:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/validate', async (req, res) => {
  const admissionReview = req.body;
  const deployment = admissionReview.request.object;

  const validationResult = await validateDeployment(deployment);

  const response = {
    apiVersion: 'admission.k8s.io/v1',
    kind: 'AdmissionReview',
    response: {
      uid: admissionReview.request.uid,
      allowed: validationResult.allowed,
      status: {
        message: validationResult.message
      }
    }
  };

  res.json(response);
});

async function validateDeployment(deployment) {
  const checks = [];

  // Check 1: Image exists in registry
  const imageCheck = await validateImage(deployment);
  checks.push(imageCheck);

  // Check 2: Resource limits are reasonable
  const resourceCheck = validateResources(deployment);
  checks.push(resourceCheck);

  // Check 3: Required labels exist
  const labelCheck = validateLabels(deployment);
  checks.push(labelCheck);

  // Check 4: Secrets and ConfigMaps exist
  const configCheck = await validateConfig(deployment);
  checks.push(configCheck);

  const failedChecks = checks.filter(c => !c.passed);

  if (failedChecks.length > 0) {
    return {
      allowed: false,
      message: `Validation failed: ${failedChecks.map(c => c.message).join(', ')}`
    };
  }

  return {
    allowed: true,
    message: 'Validation passed'
  };
}

async function validateImage(deployment) {
  const container = deployment.spec.template.spec.containers[0];
  const image = container.image;

  // Check if image exists in registry
  try {
    const response = await fetch(`https://registry.example.com/v2/${image}/manifests/latest`, {
      headers: {
        'Authorization': `Bearer ${process.env.REGISTRY_TOKEN}`
      }
    });

    if (response.ok) {
      return { passed: true };
    } else {
      return {
        passed: false,
        message: `Image ${image} not found in registry`
      };
    }
  } catch (err) {
    return {
      passed: false,
      message: `Failed to validate image: ${err.message}`
    };
  }
}

function validateResources(deployment) {
  const container = deployment.spec.template.spec.containers[0];
  const resources = container.resources;

  if (!resources || !resources.requests || !resources.limits) {
    return {
      passed: false,
      message: 'Resource requests and limits must be specified'
    };
  }

  const memoryLimit = parseMemory(resources.limits.memory);
  const memoryRequest = parseMemory(resources.requests.memory);

  if (memoryLimit < memoryRequest) {
    return {
      passed: false,
      message: 'Memory limit must be >= memory request'
    };
  }

  if (memoryLimit > parseMemory('8Gi')) {
    return {
      passed: false,
      message: 'Memory limit exceeds maximum allowed (8Gi)'
    };
  }

  return { passed: true };
}

function validateLabels(deployment) {
  const requiredLabels = ['app', 'team', 'environment'];
  const labels = deployment.metadata.labels || {};

  const missingLabels = requiredLabels.filter(l => !labels[l]);

  if (missingLabels.length > 0) {
    return {
      passed: false,
      message: `Missing required labels: ${missingLabels.join(', ')}`
    };
  }

  return { passed: true };
}

async function validateConfig(deployment) {
  const spec = deployment.spec.template.spec;

  // Check all referenced ConfigMaps exist
  const configMaps = [];
  spec.volumes?.forEach(v => {
    if (v.configMap) {
      configMaps.push(v.configMap.name);
    }
  });

  for (const cm of configMaps) {
    const exists = await checkConfigMapExists(cm, deployment.metadata.namespace);
    if (!exists) {
      return {
        passed: false,
        message: `ConfigMap ${cm} does not exist`
      };
    }
  }

  return { passed: true };
}

function parseMemory(mem) {
  const units = { 'Ki': 1024, 'Mi': 1024**2, 'Gi': 1024**3 };
  const match = mem.match(/^(\d+)(Ki|Mi|Gi)$/);
  if (match) {
    return parseInt(match[1]) * units[match[2]];
  }
  return parseInt(mem);
}

app.listen(8443, () => {
  console.log('Webhook server listening on port 8443');
});
```

Deploy the webhook server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-validator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: deployment-validator
  template:
    metadata:
      labels:
        app: deployment-validator
    spec:
      containers:
      - name: webhook
        image: myregistry.io/deployment-validator:latest
        ports:
        - containerPort: 8443
        env:
        - name: REGISTRY_TOKEN
          valueFrom:
            secretKeyRef:
              name: registry-credentials
              key: token
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: webhook-certs
---
apiVersion: v1
kind: Service
metadata:
  name: deployment-validator
spec:
  selector:
    app: deployment-validator
  ports:
  - port: 443
    targetPort: 8443
```

## Argo Rollouts Pre-Rollout Webhook

Configure webhooks that run before Argo Rollouts starts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web-app
spec:
  replicas: 10
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: myregistry.io/web-app:v1.0.0
        ports:
        - containerPort: 8080
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: {duration: 5m}
      - setWeight: 25
      - pause: {duration: 5m}
      analysis:
        templates:
        - templateName: pre-rollout-checks
---
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: pre-rollout-checks
spec:
  metrics:
  - name: webhook-validation
    provider:
      web:
        url: http://validation-service/validate
        method: POST
        headers:
        - key: Content-Type
          value: application/json
        body: |
          {
            "deployment": "web-app",
            "version": "{{ args.version }}"
          }
        jsonPath: "{$.result.passed}"
    successCondition: "result == true"
    failureLimit: 1
```

## Policy Enforcement with OPA

Use Open Policy Agent for sophisticated validation:

```yaml
# OPA policy
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Deployment"
  not input.request.object.spec.template.spec.containers[_].resources.limits

  msg := "All containers must have resource limits"
}

deny[msg] {
  input.request.kind.kind == "Deployment"
  image := input.request.object.spec.template.spec.containers[_].image
  not startswith(image, "myregistry.io/")

  msg := sprintf("Image must be from approved registry: %v", [image])
}

deny[msg] {
  input.request.kind.kind == "Deployment"
  not input.request.object.metadata.labels.team

  msg := "Deployment must have 'team' label"
}
```

Deploy OPA as admission webhook:

```bash
# Install OPA Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/master/deploy/gatekeeper.yaml

# Create constraint template
kubectl apply -f opa-constraints.yaml
```

## Pre-Flight Checks Script

Run validation script before deployment:

```bash
#!/bin/bash
# pre-deployment-checks.sh

DEPLOYMENT_FILE=$1

echo "Running pre-deployment checks..."

# Check 1: YAML is valid
if ! kubectl apply -f $DEPLOYMENT_FILE --dry-run=client > /dev/null 2>&1; then
  echo "ERROR: Invalid YAML syntax"
  exit 1
fi

# Check 2: Extract and validate image
IMAGE=$(yq eval '.spec.template.spec.containers[0].image' $DEPLOYMENT_FILE)

if ! docker pull $IMAGE > /dev/null 2>&1; then
  echo "ERROR: Cannot pull image $IMAGE"
  exit 1
fi

# Check 3: Run container security scan
SCAN_RESULT=$(trivy image --severity HIGH,CRITICAL $IMAGE)
if echo "$SCAN_RESULT" | grep -q "Total: [1-9]"; then
  echo "ERROR: Image has high/critical vulnerabilities"
  echo "$SCAN_RESULT"
  exit 1
fi

# Check 4: Validate resource requests don't exceed quota
NAMESPACE=$(yq eval '.metadata.namespace' $DEPLOYMENT_FILE)
REPLICAS=$(yq eval '.spec.replicas' $DEPLOYMENT_FILE)
MEM_REQUEST=$(yq eval '.spec.template.spec.containers[0].resources.requests.memory' $DEPLOYMENT_FILE)

# More validation checks...

echo "All pre-deployment checks passed"
```

Use in CI/CD:

```yaml
deploy:
  script:
    - ./pre-deployment-checks.sh deployment.yaml
    - kubectl apply -f deployment.yaml
```

## Monitoring Webhook Performance

Track webhook latency and success rate:

```javascript
app.post('/validate', async (req, res) => {
  const start = Date.now();

  try {
    const admissionReview = req.body;
    const deployment = admissionReview.request.object;
    const validationResult = await validateDeployment(deployment);

    const duration = Date.now() - start;

    // Record metrics
    metrics.histogram('webhook.validation.duration', duration);
    metrics.increment('webhook.validation.total', {
      result: validationResult.allowed ? 'allowed' : 'denied'
    });

    res.json({
      apiVersion: 'admission.k8s.io/v1',
      kind: 'AdmissionReview',
      response: {
        uid: admissionReview.request.uid,
        allowed: validationResult.allowed,
        status: { message: validationResult.message }
      }
    });
  } catch (err) {
    metrics.increment('webhook.validation.errors');
    console.error('Webhook error:', err);

    // Fail open or closed based on policy
    res.json({
      apiVersion: 'admission.k8s.io/v1',
      kind: 'AdmissionReview',
      response: {
        uid: req.body.request.uid,
        allowed: false,  // Fail closed
        status: { message: `Webhook error: ${err.message}` }
      }
    });
  }
});
```

## Best Practices

**Fail closed for production**. Set `failurePolicy: Fail` to block invalid deployments.

**Keep webhooks fast**. Target < 1 second response time.

**Cache validation results**. Don't re-validate identical deployments.

**Monitor webhook health**. Alert if webhooks start timing out or failing.

**Have fallback**. Consider fail-open policy for development environments.

**Test webhooks thoroughly**. Validate with various deployment configurations.

**Version webhook API**. Support multiple admission review versions.

## Conclusion

Deployment webhooks provide essential guardrails for Kubernetes deployments. By validating configurations before they reach production, you catch errors early and prevent invalid deployments from degrading your services.

Implement admission webhooks for automatic validation at the Kubernetes API level, and use pre-rollout webhooks with progressive delivery tools for additional checks before traffic shifts. Combined with monitoring and fast response times, webhooks become an invisible safety layer that prevents problems without slowing down deployments.
