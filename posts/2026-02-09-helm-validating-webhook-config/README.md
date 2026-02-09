# How to Build Helm Charts That Generate Kubernetes ValidatingWebhookConfiguration Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Security

Description: Learn how to build Helm charts that generate ValidatingWebhookConfiguration resources to enforce custom policies and validation rules in Kubernetes clusters.

---

ValidatingWebhookConfigurations enable custom validation logic that runs before Kubernetes admits resources to the cluster. Helm charts that generate these resources allow you to deploy policy enforcement alongside your applications. This creates a complete deployment package that includes both the application and its governance rules.

## Understanding Validating Webhooks

Kubernetes calls validating webhooks during resource admission. The webhook server receives the resource definition and returns an admission review response indicating whether to allow or reject the operation. This mechanism enforces custom business logic, security policies, and compliance requirements.

Validating webhooks intercept CREATE, UPDATE, and DELETE operations. Your webhook service receives the resource manifest, validates it against your rules, and responds with allow or deny.

## Structuring Helm Values for Webhook Configuration

Design values that control webhook behavior and certificate management.

```yaml
# values.yaml
webhook:
  enabled: true
  name: myapp-validator

  # Webhook service configuration
  service:
    name: myapp-webhook
    namespace: default
    port: 443
    path: /validate

  # Rules defining what resources to validate
  rules:
    - operations: ["CREATE", "UPDATE"]
      apiGroups: ["apps"]
      apiVersions: ["v1"]
      resources: ["deployments"]
      scope: "Namespaced"

    - operations: ["CREATE", "UPDATE"]
      apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      scope: "Namespaced"

  # Failure policy: Fail or Ignore
  failurePolicy: Fail

  # Match policy: Exact or Equivalent
  matchPolicy: Exact

  # Side effects: None, NoneOnDryRun
  sideEffects: None

  # Timeout in seconds
  timeoutSeconds: 10

  # Namespace selector
  namespaceSelector:
    matchLabels:
      webhook-validation: enabled

  # Object selector
  objectSelector:
    matchLabels:
      validate: "true"

  # Certificate configuration
  certificates:
    # Generate self-signed certs (for development)
    selfSigned: true
    # Or use cert-manager
    certManager:
      enabled: false
      issuerRef:
        name: ca-issuer
        kind: Issuer
    # Or provide existing secret
    existingSecret: ""
    # Certificate duration
    duration: 8760h  # 1 year
```

## Creating the ValidatingWebhookConfiguration Template

Build a template that generates the webhook configuration from values.

```yaml
# templates/validatingwebhookconfiguration.yaml
{{- if .Values.webhook.enabled }}
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: {{ include "myapp.fullname" . }}-webhook
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  {{- if .Values.webhook.certificates.certManager.enabled }}
  annotations:
    cert-manager.io/inject-ca-from: {{ .Release.Namespace }}/{{ include "myapp.fullname" . }}-webhook-cert
  {{- end }}
webhooks:
- name: {{ .Values.webhook.name }}.{{ .Release.Namespace }}.svc
  admissionReviewVersions: ["v1", "v1beta1"]

  clientConfig:
    service:
      name: {{ .Values.webhook.service.name }}
      namespace: {{ .Values.webhook.service.namespace | default .Release.Namespace }}
      port: {{ .Values.webhook.service.port }}
      path: {{ .Values.webhook.service.path }}
    {{- if not .Values.webhook.certificates.certManager.enabled }}
    caBundle: {{ include "myapp.webhookCABundle" . }}
    {{- end }}

  failurePolicy: {{ .Values.webhook.failurePolicy }}
  matchPolicy: {{ .Values.webhook.matchPolicy }}
  sideEffects: {{ .Values.webhook.sideEffects }}
  timeoutSeconds: {{ .Values.webhook.timeoutSeconds }}

  {{- with .Values.webhook.namespaceSelector }}
  namespaceSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}

  {{- with .Values.webhook.objectSelector }}
  objectSelector:
    {{- toYaml . | nindent 4 }}
  {{- end }}

  rules:
  {{- range .Values.webhook.rules }}
  - operations:
    {{- range .operations }}
    - {{ . }}
    {{- end }}
    apiGroups:
    {{- range .apiGroups }}
    - {{ . | quote }}
    {{- end }}
    apiVersions:
    {{- range .apiVersions }}
    - {{ . }}
    {{- end }}
    resources:
    {{- range .resources }}
    - {{ . }}
    {{- end }}
    scope: {{ .scope }}
  {{- end }}
{{- end }}
```

## Generating Self-Signed Certificates

Create a job that generates certificates during installation.

```yaml
# templates/webhook-cert-job.yaml
{{- if and .Values.webhook.enabled .Values.webhook.certificates.selfSigned }}
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-webhook-cert-setup
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    metadata:
      name: {{ include "myapp.fullname" . }}-webhook-cert-setup
    spec:
      restartPolicy: OnFailure
      serviceAccountName: {{ include "myapp.fullname" . }}-webhook-cert-sa
      containers:
      - name: create-cert
        image: k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.3.0
        imagePullPolicy: IfNotPresent
        args:
          - create
          - --host={{ .Values.webhook.service.name }},{{ .Values.webhook.service.name }}.{{ .Release.Namespace }}.svc
          - --namespace={{ .Release.Namespace }}
          - --secret-name={{ include "myapp.fullname" . }}-webhook-cert
          - --cert-name=tls.crt
          - --key-name=tls.key
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
{{- end }}
```

Create a service account for the certificate job.

```yaml
# templates/webhook-cert-rbac.yaml
{{- if and .Values.webhook.enabled .Values.webhook.certificates.selfSigned }}
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "myapp.fullname" . }}-webhook-cert-sa
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: {{ include "myapp.fullname" . }}-webhook-cert-role
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: {{ include "myapp.fullname" . }}-webhook-cert-rolebinding
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: {{ include "myapp.fullname" . }}-webhook-cert-role
subjects:
- kind: ServiceAccount
  name: {{ include "myapp.fullname" . }}-webhook-cert-sa
  namespace: {{ .Release.Namespace }}
{{- end }}
```

## Adding Helper Templates for Certificate Handling

Create helpers to read and encode certificates.

```yaml
# templates/_helpers.tpl
{{/*
Get webhook CA bundle from secret
*/}}
{{- define "myapp.webhookCABundle" -}}
{{- if .Values.webhook.certificates.existingSecret -}}
  {{- $secret := lookup "v1" "Secret" .Release.Namespace .Values.webhook.certificates.existingSecret -}}
  {{- if $secret -}}
    {{- index $secret.data "ca.crt" -}}
  {{- else -}}
    {{- printf "" -}}
  {{- end -}}
{{- else if .Values.webhook.certificates.selfSigned -}}
  {{- $secret := lookup "v1" "Secret" .Release.Namespace (printf "%s-webhook-cert" (include "myapp.fullname" .)) -}}
  {{- if $secret -}}
    {{- index $secret.data "ca.crt" | default (index $secret.data "tls.crt") -}}
  {{- else -}}
    {{- printf "" -}}
  {{- end -}}
{{- end -}}
{{- end -}}
```

## Creating the Webhook Service

Deploy the webhook server with proper service configuration.

```yaml
# templates/webhook-service.yaml
{{- if .Values.webhook.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.webhook.service.name }}
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  type: ClusterIP
  ports:
  - port: {{ .Values.webhook.service.port }}
    targetPort: webhook
    protocol: TCP
    name: webhook
  selector:
    {{- include "myapp.selectorLabels" . | nindent 4 }}
    component: webhook
{{- end }}
```

## Implementing the Webhook Server Deployment

Deploy the webhook server that performs validation.

```yaml
# templates/webhook-deployment.yaml
{{- if .Values.webhook.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}-webhook
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
    component: webhook
spec:
  replicas: {{ .Values.webhook.replicaCount | default 2 }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
      component: webhook
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
        component: webhook
    spec:
      serviceAccountName: {{ include "myapp.fullname" . }}-webhook-sa
      containers:
      - name: webhook
        image: {{ .Values.webhook.image.repository }}:{{ .Values.webhook.image.tag }}
        imagePullPolicy: {{ .Values.webhook.image.pullPolicy }}
        ports:
        - name: webhook
          containerPort: 8443
          protocol: TCP
        env:
        - name: TLS_CERT_FILE
          value: /etc/webhook/certs/tls.crt
        - name: TLS_KEY_FILE
          value: /etc/webhook/certs/tls.key
        volumeMounts:
        - name: webhook-certs
          mountPath: /etc/webhook/certs
          readOnly: true
        livenessProbe:
          httpGet:
            path: /healthz
            port: webhook
            scheme: HTTPS
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: webhook
            scheme: HTTPS
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          {{- toYaml .Values.webhook.resources | nindent 10 }}
      volumes:
      - name: webhook-certs
        secret:
          secretName: {{ include "myapp.fullname" . }}-webhook-cert
{{- end }}
```

## Integrating with cert-manager

Use cert-manager for production certificate management.

```yaml
# templates/webhook-certificate.yaml
{{- if and .Values.webhook.enabled .Values.webhook.certificates.certManager.enabled }}
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: {{ include "myapp.fullname" . }}-webhook-cert
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  secretName: {{ include "myapp.fullname" . }}-webhook-cert
  duration: {{ .Values.webhook.certificates.duration }}
  renewBefore: 720h  # 30 days
  subject:
    organizations:
    - {{ .Release.Namespace }}
  commonName: {{ .Values.webhook.service.name }}.{{ .Release.Namespace }}.svc
  dnsNames:
  - {{ .Values.webhook.service.name }}
  - {{ .Values.webhook.service.name }}.{{ .Release.Namespace }}
  - {{ .Values.webhook.service.name }}.{{ .Release.Namespace }}.svc
  - {{ .Values.webhook.service.name }}.{{ .Release.Namespace }}.svc.cluster.local
  issuerRef:
    name: {{ .Values.webhook.certificates.certManager.issuerRef.name }}
    kind: {{ .Values.webhook.certificates.certManager.issuerRef.kind }}
  usages:
  - digital signature
  - key encipherment
  - server auth
{{- end }}
```

## Example Webhook Server Implementation

Here's a sample webhook server in Go.

```go
// cmd/webhook/main.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func validateDeployment(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    deployment := &appsv1.Deployment{}
    if err := json.Unmarshal(ar.Request.Object.Raw, deployment); err != nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("Failed to decode deployment: %v", err),
            },
        }
    }

    // Validation rule: Require resource limits
    for _, container := range deployment.Spec.Template.Spec.Containers {
        if container.Resources.Limits == nil {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf("Container %s missing resource limits", container.Name),
                },
            }
        }
    }

    // Validation rule: Require minimum replicas
    if deployment.Spec.Replicas != nil && *deployment.Spec.Replicas < 2 {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: "Deployments must have at least 2 replicas for high availability",
            },
        }
    }

    // Validation rule: Require security context
    if deployment.Spec.Template.Spec.SecurityContext == nil {
        return &admissionv1.AdmissionResponse{
            Allowed: false,
            Result: &metav1.Status{
                Message: "Deployment must specify pod security context",
            },
        }
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}

func handleValidate(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read request body", http.StatusBadRequest)
        return
    }

    ar := &admissionv1.AdmissionReview{}
    if err := json.Unmarshal(body, ar); err != nil {
        http.Error(w, "Failed to decode admission review", http.StatusBadRequest)
        return
    }

    response := validateDeployment(ar)
    response.UID = ar.Request.UID

    responseAR := &admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: response,
    }

    responseBytes, err := json.Marshal(responseAR)
    if err != nil {
        http.Error(w, "Failed to encode response", http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Write(responseBytes)
}

func main() {
    http.HandleFunc("/validate", handleValidate)
    http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })
    http.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    http.ListenAndServeTLS(":8443",
        "/etc/webhook/certs/tls.crt",
        "/etc/webhook/certs/tls.key",
        nil)
}
```

## Testing the Webhook

Create test deployments to verify webhook behavior.

```bash
# Test deployment that should pass validation
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: valid-deployment
  namespace: default
  labels:
    validate: "true"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
      - name: nginx
        image: nginx:latest
        resources:
          limits:
            cpu: 100m
            memory: 128Mi
EOF

# Test deployment that should fail validation (missing limits)
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: invalid-deployment
  namespace: default
  labels:
    validate: "true"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test
  template:
    metadata:
      labels:
        app: test
    spec:
      containers:
      - name: nginx
        image: nginx:latest
EOF
```

Building Helm charts with ValidatingWebhookConfiguration resources packages policy enforcement with application deployment. Use self-signed certificates for development and cert-manager for production. Structure your values to make webhook rules configurable and implement comprehensive validation logic in your webhook server to enforce organizational standards across your Kubernetes clusters.
