# How to Migrate from Docker Swarm Stacks to Kubernetes Deployments with Helm Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Docker Swarm, Helm

Description: Learn how to migrate Docker Swarm applications to Kubernetes using Helm charts for better scalability, ecosystem support, and production-grade orchestration features.

---

Docker Swarm provides simple container orchestration, but Kubernetes offers superior scalability, a richer ecosystem, and better production features. Migrating from Swarm to Kubernetes requires translating stack files to Helm charts while adapting to Kubernetes concepts. This guide shows you how to migrate Swarm applications to Kubernetes systematically using Helm for package management.

## Understanding Swarm to Kubernetes Mapping

Docker Swarm and Kubernetes use different resource models.

```yaml
# Docker Swarm stack (docker-compose.yml)
version: '3.8'

services:
  web:
    image: nginx:1.21
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
      update_config:
        parallelism: 1
        delay: 10s
    ports:
      - "80:80"
    networks:
      - frontend
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf
    secrets:
      - ssl_cert

  api:
    image: api:v2.0
    deploy:
      replicas: 5
      placement:
        constraints:
          - node.labels.environment == production
    environment:
      - DATABASE_URL_FILE=/run/secrets/db_url
    networks:
      - frontend
      - backend
    secrets:
      - db_url

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay

configs:
  nginx_config:
    file: ./nginx.conf

secrets:
  ssl_cert:
    external: true
  db_url:
    external: true
```

This Swarm stack defines a typical multi-tier application.

## Creating Helm Chart Structure

Initialize a Helm chart to package the Kubernetes manifests.

```bash
#!/bin/bash
# Create Helm chart structure

APP_NAME="my-app"

helm create $APP_NAME

# Customize chart structure
cd $APP_NAME

# Remove default templates
rm templates/hpa.yaml templates/serviceaccount.yaml

# Create custom templates
mkdir -p templates/web templates/api

echo "Helm chart structure created"
tree .
```

Helm provides templating and value management for Kubernetes manifests.

## Translating Swarm Services to Deployments

Convert Swarm service definitions to Kubernetes Deployments.

```yaml
# templates/web/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.web.name }}
  labels:
    app: {{ .Values.web.name }}
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
spec:
  replicas: {{ .Values.web.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.web.name }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # From Swarm update_config
  template:
    metadata:
      labels:
        app: {{ .Values.web.name }}
    spec:
      {{- if .Values.web.nodeSelector }}
      nodeSelector:
        {{- toYaml .Values.web.nodeSelector | nindent 8 }}
      {{- end }}
      containers:
      - name: nginx
        image: "{{ .Values.web.image.repository }}:{{ .Values.web.image.tag }}"
        imagePullPolicy: {{ .Values.web.image.pullPolicy }}
        ports:
        - name: http
          containerPort: 80
          protocol: TCP
        resources:
          limits:
            cpu: {{ .Values.web.resources.limits.cpu }}
            memory: {{ .Values.web.resources.limits.memory }}
          requests:
            cpu: {{ .Values.web.resources.requests.cpu }}
            memory: {{ .Values.web.resources.requests.memory }}
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
        - name: ssl-cert
          mountPath: /etc/ssl/certs/cert.pem
          subPath: cert.pem
      volumes:
      - name: config
        configMap:
          name: {{ .Values.web.name }}-config
      - name: ssl-cert
        secret:
          secretName: {{ .Values.web.sslSecret }}
---
# templates/api/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.api.name }}
  labels:
    app: {{ .Values.api.name }}
spec:
  replicas: {{ .Values.api.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.api.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.api.name }}
    spec:
      {{- if .Values.api.nodeSelector }}
      nodeSelector:
        {{- toYaml .Values.api.nodeSelector | nindent 8 }}
      {{- end }}
      containers:
      - name: api
        image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ .Values.api.dbSecret }}
              key: url
        resources:
          {{- toYaml .Values.api.resources | nindent 10 }}
```

Helm templates use Go templating syntax with values from `values.yaml`.

## Converting Swarm Configs and Secrets

Map Swarm configs to ConfigMaps and secrets to Secrets.

```yaml
# templates/web/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Values.web.name }}-config
data:
  nginx.conf: |
{{ .Files.Get "configs/nginx.conf" | indent 4 }}
---
# templates/api/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ .Values.api.dbSecret }}
type: Opaque
stringData:
  url: {{ .Values.api.databaseUrl | quote }}
---
# For external secrets (better practice)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: {{ .Values.web.name }}-ssl
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: {{ .Values.web.sslSecret }}
    creationPolicy: Owner
  data:
  - secretKey: cert.pem
    remoteRef:
      key: ssl/{{ .Values.environment }}/web-cert
```

External Secrets Operator provides better secret management than Swarm's built-in secrets.

## Creating Services and Ingress

Replace Swarm published ports with Kubernetes Services and Ingress.

```yaml
# templates/web/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.web.name }}
  labels:
    app: {{ .Values.web.name }}
spec:
  type: {{ .Values.web.service.type }}
  ports:
  - port: {{ .Values.web.service.port }}
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: {{ .Values.web.name }}
---
# templates/ingress.yaml
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Values.web.name }}-ingress
  annotations:
    {{- toYaml .Values.ingress.annotations | nindent 4 }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls }}
  tls:
  {{- range .Values.ingress.tls }}
  - hosts:
    {{- range .hosts }}
    - {{ . | quote }}
    {{- end }}
    secretName: {{ .secretName }}
  {{- end }}
  {{- end }}
  rules:
  {{- range .Values.ingress.hosts }}
  - host: {{ .host | quote }}
    http:
      paths:
      {{- range .paths }}
      - path: {{ .path }}
        pathType: {{ .pathType }}
        backend:
          service:
            name: {{ $.Values.web.name }}
            port:
              number: {{ $.Values.web.service.port }}
      {{- end }}
  {{- end }}
{{- end }}
```

Ingress provides HTTP routing unavailable in basic Swarm networking.

## Defining Helm Values

Create comprehensive values file matching Swarm stack configuration.

```yaml
# values.yaml
environment: production

web:
  name: web
  replicaCount: 3
  image:
    repository: nginx
    tag: "1.21"
    pullPolicy: IfNotPresent
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  service:
    type: ClusterIP
    port: 80
  nodeSelector:
    node-role.kubernetes.io/worker: "true"
  sslSecret: web-ssl-cert

api:
  name: api
  replicaCount: 5
  image:
    repository: api
    tag: "v2.0"
    pullPolicy: IfNotPresent
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
  nodeSelector:
    environment: production
  dbSecret: api-db-credentials
  databaseUrl: "postgresql://db:5432/myapp"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
  - host: app.example.com
    paths:
    - path: /
      pathType: Prefix
  tls:
  - secretName: app-tls
    hosts:
    - app.example.com
---
# values-staging.yaml (environment-specific overrides)
environment: staging

web:
  replicaCount: 2
  nodeSelector:
    environment: staging

api:
  replicaCount: 2
  nodeSelector:
    environment: staging

ingress:
  hosts:
  - host: staging.app.example.com
    paths:
    - path: /
      pathType: Prefix
```

Multiple values files support different environments.

## Creating Migration Script

Automate the migration process from Swarm to Kubernetes.

```bash
#!/bin/bash
# migrate-swarm-to-k8s.sh

SWARM_STACK="my-app"
HELM_CHART="./my-app"
NAMESPACE="production"

echo "=== Starting Swarm to Kubernetes Migration ==="

# Step 1: Backup Swarm configuration
echo "Backing up Swarm stack..."
docker stack ps $SWARM_STACK > swarm-state-backup.txt
docker service ls --filter "label=com.docker.stack.namespace=$SWARM_STACK" > swarm-services-backup.txt

# Step 2: Scale down Swarm services (prepare for traffic switch)
echo "Scaling down Swarm services..."
for SERVICE in $(docker service ls --filter "label=com.docker.stack.namespace=$SWARM_STACK" -q); do
  docker service scale $SERVICE=1
  sleep 5
done

# Step 3: Deploy to Kubernetes
echo "Deploying to Kubernetes..."
helm upgrade --install $SWARM_STACK $HELM_CHART \
  --namespace $NAMESPACE \
  --create-namespace \
  --values $HELM_CHART/values.yaml \
  --wait \
  --timeout 10m

# Step 4: Verify Kubernetes deployment
kubectl rollout status deployment -l "app.kubernetes.io/instance=$SWARM_STACK" -n $NAMESPACE

# Step 5: Run smoke tests
echo "Running smoke tests..."
POD=$(kubectl get pods -n $NAMESPACE -l app=web -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n $NAMESPACE $POD -- curl -s http://localhost/health

if [ $? -ne 0 ]; then
  echo "ERROR: Smoke tests failed. Rolling back..."
  helm rollback $SWARM_STACK -n $NAMESPACE
  exit 1
fi

# Step 6: Switch DNS/Load Balancer to Kubernetes
echo "Update your DNS or load balancer to point to Kubernetes ingress"
kubectl get ingress -n $NAMESPACE

read -p "Have you updated DNS? (yes/no): " DNS_UPDATED

if [ "$DNS_UPDATED" != "yes" ]; then
  echo "Update DNS before proceeding"
  exit 1
fi

# Step 7: Monitor Kubernetes for issues
echo "Monitoring Kubernetes deployment for 5 minutes..."
for i in {1..5}; do
  echo "Minute $i:"
  kubectl top pods -n $NAMESPACE
  ERROR_COUNT=$(kubectl get pods -n $NAMESPACE -o json | jq '[.items[] | select(.status.phase != "Running")] | length')
  if [ $ERROR_COUNT -gt 0 ]; then
    echo "WARNING: $ERROR_COUNT pods not running"
  fi
  sleep 60
done

# Step 8: Remove Swarm stack (only after validation)
read -p "Kubernetes stable. Remove Swarm stack? (yes/no): " REMOVE_SWARM

if [ "$REMOVE_SWARM" == "yes" ]; then
  echo "Removing Swarm stack..."
  docker stack rm $SWARM_STACK
  echo "Swarm stack removed"
fi

echo "Migration complete!"
```

This script handles the end-to-end migration process.

## Handling Swarm-Specific Features

Address Swarm features that require different approaches in Kubernetes.

```yaml
# Swarm global mode -> Kubernetes DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      containers:
      - name: agent
        image: monitoring-agent:v1.0
---
# Swarm placement constraints -> Kubernetes node selectors/affinity
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: environment
                operator: In
                values:
                - production
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
              topologyKey: kubernetes.io/hostname
```

Kubernetes provides more granular control than Swarm placement constraints.

## Testing and Validation

Validate the Helm chart before deployment.

```bash
#!/bin/bash
# Test Helm chart

CHART_DIR="./my-app"

# Lint chart
echo "Linting Helm chart..."
helm lint $CHART_DIR

# Dry run
echo "Performing dry run..."
helm install my-app-test $CHART_DIR --dry-run --debug

# Template rendering
echo "Rendering templates..."
helm template my-app $CHART_DIR --values $CHART_DIR/values.yaml > rendered-manifests.yaml

# Validate Kubernetes manifests
echo "Validating Kubernetes manifests..."
kubectl apply --dry-run=client -f rendered-manifests.yaml

# Check for deprecated APIs
echo "Checking for deprecated APIs..."
pluto detect-files -f rendered-manifests.yaml

echo "Validation complete"
```

Thorough validation prevents deployment issues.

## Conclusion

Migrating from Docker Swarm to Kubernetes with Helm provides better scalability and ecosystem support. Create a Helm chart structure to organize Kubernetes manifests with templating. Translate Swarm services to Kubernetes Deployments with equivalent resource limits and placement constraints. Convert Swarm configs to ConfigMaps and secrets to Kubernetes Secrets, preferably with External Secrets Operator. Replace Swarm published ports with Kubernetes Services and Ingress resources for routing. Use values files to manage environment-specific configuration. Handle Swarm global mode with DaemonSets and placement constraints with node selectors or affinity rules. Scale down Swarm services gradually while ramping up Kubernetes deployments. Update DNS or load balancers to point to Kubernetes after validation. Monitor both systems during transition and remove Swarm only after Kubernetes proves stable. Helm simplifies ongoing management with version control, rollback capabilities, and template reuse across environments.
