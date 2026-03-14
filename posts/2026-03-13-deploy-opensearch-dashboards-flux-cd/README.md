# How to Deploy OpenSearch Dashboards with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, OpenSearch, Dashboards, Visualization

Description: Deploy OpenSearch Dashboards visualization platform to Kubernetes using Flux CD for GitOps-managed log exploration and analytics.

---

## Introduction

OpenSearch Dashboards is the open-source visualization frontend for OpenSearch, providing interactive log exploration, saved searches, visualizations, and dashboards. It is the direct counterpart to Kibana but maintains its open-source character under the Apache 2.0 license. When paired with OpenSearch on Kubernetes, Dashboards gives your team a powerful self-hosted log analytics platform without license restrictions.

Deploying OpenSearch Dashboards via Flux CD ensures that connection settings, authentication configuration, and Ingress rules are version-controlled alongside the OpenSearch cluster itself. Changes to the Dashboards configuration — such as adding SAML integration or updating the OpenSearch endpoint — go through a standard pull request workflow.

This guide deploys OpenSearch Dashboards as a Flux HelmRelease, configures its connection to an OpenSearch cluster, enables OIDC authentication, and exposes it through an Ingress.

## Prerequisites

- OpenSearch cluster deployed and healthy (see the OpenSearch post)
- `kubectl` and `flux` CLIs installed
- OpenSearch HelmRepository added to Flux (`https://opensearch-project.github.io/helm-charts`)
- Ingress controller deployed in the cluster

## Step 1: Create the OpenSearch Dashboards Secret

Store the OpenSearch admin credentials that Dashboards uses to connect:

```yaml
# infrastructure/search/dashboards-secret.yaml (use SealedSecret in production)
apiVersion: v1
kind: Secret
metadata:
  name: opensearch-dashboards-config
  namespace: search
type: Opaque
stringData:
  opensearch.username: admin
  opensearch.password: "MyStr0ngP@ssword!"
  cookie.secure: "true"
  cookie.password: "a-32-character-random-string-here!"
```

## Step 2: Deploy OpenSearch Dashboards via HelmRelease

```yaml
# infrastructure/search/opensearch-dashboards.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: opensearch-dashboards
  namespace: search
spec:
  interval: 30m
  chart:
    spec:
      chart: opensearch-dashboards
      version: "2.23.0"
      sourceRef:
        kind: HelmRepository
        name: opensearch
        namespace: flux-system
  dependsOn:
    - name: opensearch
      namespace: search
  values:
    replicaCount: 2

    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"

    # OpenSearch connection settings
    opensearchHosts: "https://opensearch-cluster-master.search.svc.cluster.local:9200"

    # Mount credentials from Secret
    envFrom:
      - secretRef:
          name: opensearch-dashboards-config

    config:
      opensearch_dashboards.yml: |
        server.host: "0.0.0.0"
        server.name: opensearch-dashboards

        # OpenSearch connection
        opensearch.hosts: ["https://opensearch-cluster-master.search.svc.cluster.local:9200"]
        opensearch.username: "${opensearch.username}"
        opensearch.password: "${opensearch.password}"
        opensearch.ssl.verificationMode: certificate
        opensearch.ssl.certificateAuthorities: ["/usr/share/opensearch-dashboards/config/root-ca.pem"]
        opensearch.requestHeadersWhitelist: [Authorization, security_tenant]

        # Security plugin UI settings
        opensearch_security.multitenancy.enabled: true
        opensearch_security.multitenancy.tenants.enable_global: true
        opensearch_security.multitenancy.tenants.enable_private: true
        opensearch_security.multitenancy.tenants.preferred: ["Private", "Global"]
        opensearch_security.readonly_mode.roles: ["kibana_read_only"]

        # Cookie settings
        opensearch_security.cookie.secure: ${cookie.secure}
        opensearch_security.cookie.password: "${cookie.password}"

        # Logging
        logging.verbose: false

    ingress:
      enabled: true
      ingressClassName: nginx
      annotations:
        nginx.ingress.kubernetes.io/proxy-body-size: "100m"
        nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
      hosts:
        - host: dashboards.example.com
          paths:
            - path: /
              pathType: Prefix
      tls:
        - secretName: dashboards-tls
          hosts:
            - dashboards.example.com
```

## Step 3: Configure SAML Authentication (Optional)

For SSO integration, add SAML settings to the Dashboards configuration:

```yaml
    config:
      opensearch_dashboards.yml: |
        # (existing config above) ...

        # SAML SSO settings
        opensearch_security.auth.type: "saml"
        server.xsrf.whitelist: ["/_opendistro/_security/saml/acs", "/_opendistro/_security/saml/logout"]
```

And configure the OpenSearch backend Security plugin with your IdP metadata.

## Step 4: Pre-Load Saved Searches via ConfigMap

Store Dashboards saved objects (index patterns, dashboards) as a ConfigMap and import them on startup:

```yaml
# infrastructure/search/dashboards-objects-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dashboards-import-objects
  namespace: search
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: import
          image: curlimages/curl:8.7.1
          command:
            - /bin/sh
            - -c
            - |
              until curl -s http://opensearch-dashboards.search:5601/api/status | grep -q '"level":"available"'; do
                echo "Waiting for Dashboards..."; sleep 5
              done
              # Import default index pattern
              curl -XPOST \
                -H "osd-xsrf: true" \
                -H "Content-Type: application/json" \
                http://opensearch-dashboards.search:5601/api/saved_objects/index-pattern \
                -d '{"attributes":{"title":"kubernetes-*","timeFieldName":"@timestamp"}}'
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/search-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: opensearch-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/search
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: opensearch-dashboards
      namespace: search
```

## Step 6: Verify Dashboards

```bash
# Check Dashboards deployment
kubectl get deployment opensearch-dashboards -n search

# Port-forward for local access
kubectl port-forward svc/opensearch-dashboards 5601:5601 -n search

# Check Dashboards API status
curl http://localhost:5601/api/status | jq '.status.overall'
```

Navigate to `http://localhost:5601`, log in with admin credentials, and configure your first index pattern.

## Best Practices

- Run at least two Dashboards replicas with a load-balanced Service to avoid downtime during pod restarts.
- Store all credentials in Secrets managed by Sealed Secrets or External Secrets — never in plaintext YAML.
- Use multi-tenancy to give different teams isolated tenant spaces within a single Dashboards instance.
- Import saved dashboards and index patterns via CI jobs rather than manual UI clicks, so dashboards are reproducible.
- Enable the `opensearch_security.cookie.secure` setting and serve Dashboards over HTTPS in production.

## Conclusion

OpenSearch Dashboards deployed via Flux CD provides a fully open-source log visualization platform that integrates seamlessly with your GitOps workflow. Security settings, Ingress rules, and connection parameters are all managed as code, making the Dashboards deployment as reproducible as any other component in your infrastructure. Combined with GitOps-managed OpenSearch clusters and log shippers, you have a complete observability stack under full version control.
