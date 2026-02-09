# How to Use Helm Range and With Blocks for Complex YAML Iteration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Master Helm's range and with blocks to iterate over collections and modify template context, enabling dynamic resource generation and sophisticated template logic for complex deployments.

---

Helm provides powerful control structures for working with collections and modifying template contexts. The `range` action iterates over lists and maps, while the `with` action changes the current context scope. Together, these actions enable you to generate dynamic resources, process complex data structures, and build flexible charts that adapt to varying configuration requirements.

## Understanding Range Basics

The `range` action iterates over arrays and maps, executing the template block for each element. For arrays, it provides the current value. For maps, it provides both the key and value:

```yaml
# Iterating over an array
{{- range .Values.environments }}
- {{ . }}
{{- end }}

# Iterating over a map
{{- range $key, $value := .Values.settings }}
{{ $key }}: {{ $value }}
{{- end }}
```

The dot (`.`) within a range block refers to the current iteration element, not the root context.

## Iterating Over Simple Lists

Generate multiple resources from a list in values:

```yaml
# values.yaml
databases:
  - postgres
  - mysql
  - mongodb
```

Create a ConfigMap entry for each database:

```yaml
# templates/database-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-databases
data:
  databases: |
    {{- range .Values.databases }}
    - name: {{ . }}
      enabled: true
    {{- end }}
```

## Iterating Over Maps with Key-Value Pairs

Maps provide structured configuration that you can iterate through:

```yaml
# values.yaml
environmentVariables:
  DATABASE_HOST: postgres.default.svc.cluster.local
  DATABASE_PORT: "5432"
  CACHE_ENABLED: "true"
  LOG_LEVEL: info
```

Generate environment variables from the map:

```yaml
# templates/deployment.yaml
spec:
  containers:
  - name: {{ .Chart.Name }}
    env:
    {{- range $key, $value := .Values.environmentVariables }}
    - name: {{ $key }}
      value: {{ $value | quote }}
    {{- end }}
```

## Accessing Root Context Within Range

Inside a range block, the dot refers to the current element. Access the root context by capturing it in a variable:

```yaml
{{- $root := . -}}
{{- range .Values.services }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ include "myapp.fullname" $root }}-{{ .name }}
  labels:
    {{- include "myapp.labels" $root | nindent 4 }}
    component: {{ .name }}
spec:
  type: {{ .type | default "ClusterIP" }}
  ports:
  {{- range .ports }}
  - port: {{ .port }}
    targetPort: {{ .targetPort }}
    name: {{ .name }}
  {{- end }}
  selector:
    {{- include "myapp.selectorLabels" $root | nindent 4 }}
    component: {{ .name }}
{{- end }}
```

This pattern allows you to call helper templates that need the root context while iterating over nested data.

## Creating Multiple Resources from Configuration

Define multiple services in values and generate all their resources:

```yaml
# values.yaml
services:
  - name: api
    type: ClusterIP
    ports:
      - name: http
        port: 8080
        targetPort: 8080
    replicas: 3
    image:
      repository: myapp/api
      tag: v1.2.3

  - name: worker
    type: ClusterIP
    ports:
      - name: metrics
        port: 9090
        targetPort: 9090
    replicas: 2
    image:
      repository: myapp/worker
      tag: v1.2.3
```

Generate deployments for each service:

```yaml
# templates/deployments.yaml
{{- $root := . -}}
{{- range .Values.services }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" $root }}-{{ .name }}
  labels:
    {{- include "myapp.labels" $root | nindent 4 }}
    component: {{ .name }}
spec:
  replicas: {{ .replicas | default 1 }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" $root | nindent 6 }}
      component: {{ .name }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" $root | nindent 8 }}
        component: {{ .name }}
    spec:
      containers:
      - name: {{ .name }}
        image: "{{ .image.repository }}:{{ .image.tag }}"
        ports:
        {{- range .ports }}
        - name: {{ .name }}
          containerPort: {{ .targetPort }}
        {{- end }}
{{- end }}
```

## Using With to Change Context

The `with` action changes the current context to a specific value, making deeply nested values easier to access:

```yaml
# Without with
image: "{{ .Values.app.image.repository }}:{{ .Values.app.image.tag }}"
imagePullPolicy: {{ .Values.app.image.pullPolicy }}

# With with
{{- with .Values.app.image }}
image: "{{ .repository }}:{{ .tag }}"
imagePullPolicy: {{ .pullPolicy }}
{{- end }}
```

The `with` block only executes if the value exists and is not empty, providing built-in conditional logic.

## Combining Range and With

Use both together for cleaner templates when working with nested structures:

```yaml
# values.yaml
ingress:
  enabled: true
  hosts:
    - host: app.example.com
      paths:
        - path: /api
          pathType: Prefix
          backend:
            service: api
            port: 8080
        - path: /admin
          pathType: Prefix
          backend:
            service: admin
            port: 8080
```

Generate ingress rules:

```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
{{- $root := . -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
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
            name: {{ include "myapp.fullname" $root }}-{{ .backend.service }}
            port:
              number: {{ .backend.port }}
      {{- end }}
  {{- end }}
{{- end }}
```

## Conditional Iteration with Range

Skip certain elements during iteration using conditionals:

```yaml
# values.yaml
features:
  - name: monitoring
    enabled: true
    port: 9090
  - name: tracing
    enabled: false
    port: 9091
  - name: logging
    enabled: true
    port: 9092
```

Generate only enabled features:

```yaml
spec:
  containers:
  - name: {{ .Chart.Name }}
    ports:
    {{- range .Values.features }}
    {{- if .enabled }}
    - name: {{ .name }}
      containerPort: {{ .port }}
    {{- end }}
    {{- end }}
```

## Generating ConfigMap Data from Maps

Create ConfigMap entries from complex maps:

```yaml
# values.yaml
configuration:
  database:
    host: postgres.default.svc
    port: 5432
    name: appdb
  cache:
    host: redis.default.svc
    port: 6379
    ttl: 3600
  features:
    authentication: true
    rateLimit: true
```

Generate a configuration file:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
data:
  config.yaml: |
    {{- range $section, $settings := .Values.configuration }}
    {{ $section }}:
      {{- range $key, $value := $settings }}
      {{ $key }}: {{ $value }}
      {{- end }}
    {{- end }}
```

## Creating Multiple Secrets from a Map

Generate individual secrets from a map structure:

```yaml
# values.yaml
secrets:
  database:
    username: dbuser
    password: secretpass
  api:
    key: apikey123
    token: token456
```

Create separate secrets:

```yaml
{{- $root := . -}}
{{- range $name, $data := .Values.secrets }}
---
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "myapp.fullname" $root }}-{{ $name }}
  labels:
    {{- include "myapp.labels" $root | nindent 4 }}
type: Opaque
data:
  {{- range $key, $value := $data }}
  {{ $key }}: {{ $value | b64enc }}
  {{- end }}
{{- end }}
```

## Advanced Range with Index

Access the index during iteration for numbered resources:

```yaml
# values.yaml
workers:
  - name: processor
    replicas: 3
  - name: aggregator
    replicas: 2
```

Create numbered StatefulSet instances:

```yaml
{{- $root := . -}}
{{- range $index, $worker := .Values.workers }}
{{- range $i, $_ := until (int $worker.replicas) }}
---
apiVersion: v1
kind: Pod
metadata:
  name: {{ include "myapp.fullname" $root }}-{{ $worker.name }}-{{ $i }}
  labels:
    {{- include "myapp.labels" $root | nindent 4 }}
    component: {{ $worker.name }}
    instance: "{{ $i }}"
spec:
  containers:
  - name: {{ $worker.name }}
    image: myapp/{{ $worker.name }}:latest
{{- end }}
{{- end }}
```

## Nested Range Loops

Iterate over nested structures for complex configurations:

```yaml
# values.yaml
deployments:
  - name: frontend
    environments:
      - name: production
        replicas: 5
        domain: app.example.com
      - name: staging
        replicas: 2
        domain: staging.app.example.com
```

Generate resources for each combination:

```yaml
{{- $root := . -}}
{{- range .Values.deployments }}
{{- $deployment := . -}}
{{- range .environments }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" $root }}-{{ $deployment.name }}-{{ .name }}
  labels:
    {{- include "myapp.labels" $root | nindent 4 }}
    component: {{ $deployment.name }}
    environment: {{ .name }}
spec:
  replicas: {{ .replicas }}
  selector:
    matchLabels:
      component: {{ $deployment.name }}
      environment: {{ .name }}
  template:
    metadata:
      labels:
        component: {{ $deployment.name }}
        environment: {{ .name }}
    spec:
      containers:
      - name: {{ $deployment.name }}
        image: myapp/{{ $deployment.name }}:latest
        env:
        - name: ENVIRONMENT
          value: {{ .name }}
        - name: DOMAIN
          value: {{ .domain }}
{{- end }}
{{- end }}
```

## Using Else with Range

Provide fallback content when a collection is empty:

```yaml
ports:
{{- range .Values.service.ports }}
- port: {{ .port }}
  name: {{ .name }}
{{- else }}
- port: 80
  name: http
{{- end }}
```

The `else` block executes only when the collection is empty or nil.

## Dictionary Building with Range

Build structured data during iteration:

```yaml
{{- $ports := dict -}}
{{- range .Values.services }}
{{- range .ports }}
{{- $_ := set $ports .name .port -}}
{{- end }}
{{- end }}

# Use the collected ports
ports:
{{- range $name, $port := $ports }}
  {{ $name }}: {{ $port }}
{{- end }}
```

Range and with blocks transform static templates into dynamic generators that adapt to your configuration. By mastering these control structures, you build charts that scale elegantly from simple to complex deployments without template duplication.
