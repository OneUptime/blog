# How to Use Helm --set-file to Inject File Contents into Chart Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, DevOps

Description: Learn how to use Helm's --set-file flag to inject file contents directly into chart values, perfect for certificates, configuration files, and secrets without storing them in values files.

---

Helm's `--set-file` flag provides a powerful way to inject file contents directly into chart values during installation or upgrade. This capability is particularly valuable when working with certificates, configuration files, license keys, and other data that you don't want to store in values files or commit to version control. The file contents get read and passed as values to your templates, enabling dynamic configuration without exposing sensitive data.

## Understanding --set-file Basics

The `--set-file` flag reads a file from your local filesystem and assigns its contents to a specified value path. The syntax follows the pattern:

```bash
helm install myapp ./mychart --set-file key.path=./file.txt
```

This reads the contents of `file.txt` and makes it available in your templates as `.Values.key.path`. The file contents are base64-encoded when stored in the release, ensuring binary data remains intact.

## Injecting TLS Certificates

One of the most common use cases involves injecting TLS certificates and keys for secure communications. Create a template that expects certificate data:

```yaml
# templates/tls-secret.yaml
{{- if .Values.tls.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "myapp.fullname" . }}-tls
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
type: kubernetes.io/tls
data:
  tls.crt: {{ .Values.tls.certificate | b64enc }}
  tls.key: {{ .Values.tls.privateKey | b64enc }}
{{- end }}
```

Install the chart with certificate files:

```bash
helm install myapp ./mychart \
  --set tls.enabled=true \
  --set-file tls.certificate=./certs/server.crt \
  --set-file tls.privateKey=./certs/server.key
```

The certificate and key files are read, base64-encoded automatically by the template function, and stored in the secret.

## Injecting Configuration Files

Applications often require configuration files that are too complex for environment variables. Create a ConfigMap template:

```yaml
# templates/config-map.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "myapp.fullname" . }}-config
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
data:
  {{- if .Values.config.applicationConfig }}
  application.yaml: |
    {{ .Values.config.applicationConfig | nindent 4 }}
  {{- end }}
  {{- if .Values.config.loggingConfig }}
  logging.xml: |
    {{ .Values.config.loggingConfig | nindent 4 }}
  {{- end }}
```

Mount the ConfigMap in your deployment:

```yaml
# templates/deployment.yaml
spec:
  containers:
  - name: {{ .Chart.Name }}
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: {{ include "myapp.fullname" . }}-config
```

Deploy with configuration files:

```bash
helm install myapp ./mychart \
  --set-file config.applicationConfig=./configs/application.yaml \
  --set-file config.loggingConfig=./configs/logging.xml
```

## Handling Binary Files

The `--set-file` flag works with binary files, which is useful for license keys, keystores, or other binary data:

```yaml
# templates/license-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "myapp.fullname" . }}-license
type: Opaque
data:
  {{- if .Values.license.key }}
  license.key: {{ .Values.license.key | b64enc }}
  {{- end }}
  {{- if .Values.license.keystore }}
  keystore.jks: {{ .Values.license.keystore | b64enc }}
  {{- end }}
```

Install with binary files:

```bash
helm install myapp ./mychart \
  --set-file license.key=./license.key \
  --set-file license.keystore=./keystore.jks
```

## Injecting Multiple Files with a Script

When you need to inject many files, create a helper script:

```bash
#!/bin/bash
# inject-files.sh - Helper script for multiple file injections

CHART_DIR="$1"
RELEASE_NAME="$2"
NAMESPACE="${3:-default}"

# Define files to inject
declare -A FILES=(
    ["tls.certificate"]="./certs/server.crt"
    ["tls.privateKey"]="./certs/server.key"
    ["tls.caCertificate"]="./certs/ca.crt"
    ["config.applicationConfig"]="./configs/app.yaml"
    ["config.databaseConfig"]="./configs/database.yaml"
    ["secrets.apiKey"]="./secrets/api-key.txt"
)

# Build the helm command
HELM_CMD="helm install $RELEASE_NAME $CHART_DIR -n $NAMESPACE"

for key in "${!FILES[@]}"; do
    file="${FILES[$key]}"
    if [ -f "$file" ]; then
        HELM_CMD="$HELM_CMD --set-file $key=$file"
        echo "Adding file: $key <- $file"
    else
        echo "Warning: File not found: $file"
    fi
done

# Execute the command
echo "Executing: $HELM_CMD"
eval $HELM_CMD
```

Use the script:

```bash
chmod +x inject-files.sh
./inject-files.sh ./mychart myapp production
```

## Combining --set-file with Values Files

The `--set-file` flag works alongside regular values files, with the files taking precedence:

```yaml
# values.yaml
tls:
  enabled: true
  # certificate and privateKey will be provided via --set-file

config:
  replicaCount: 3
  # applicationConfig will be provided via --set-file
```

Install combining both approaches:

```bash
helm install myapp ./mychart \
  -f values.yaml \
  -f values-production.yaml \
  --set-file tls.certificate=./certs/prod-server.crt \
  --set-file tls.privateKey=./certs/prod-server.key \
  --set-file config.applicationConfig=./configs/prod-app.yaml
```

## Dynamic SSH Key Injection

Inject SSH keys for applications that need Git access or secure communications:

```yaml
# templates/ssh-secret.yaml
{{- if .Values.ssh.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "myapp.fullname" . }}-ssh
type: Opaque
data:
  {{- if .Values.ssh.privateKey }}
  id_rsa: {{ .Values.ssh.privateKey | b64enc }}
  {{- end }}
  {{- if .Values.ssh.publicKey }}
  id_rsa.pub: {{ .Values.ssh.publicKey | b64enc }}
  {{- end }}
  {{- if .Values.ssh.knownHosts }}
  known_hosts: {{ .Values.ssh.knownHosts | b64enc }}
  {{- end }}
{{- end }}
```

Mount in an init container that clones a repository:

```yaml
spec:
  initContainers:
  - name: git-clone
    image: alpine/git:latest
    command:
    - sh
    - -c
    - |
      mkdir -p ~/.ssh
      cp /ssh-keys/* ~/.ssh/
      chmod 600 ~/.ssh/id_rsa
      git clone git@github.com:myorg/myrepo.git /data
    volumeMounts:
    - name: ssh-keys
      mountPath: /ssh-keys
      readOnly: true
    - name: data
      mountPath: /data
  volumes:
  - name: ssh-keys
    secret:
      secretName: {{ include "myapp.fullname" . }}-ssh
      defaultMode: 0400
```

Deploy with SSH keys:

```bash
helm install myapp ./mychart \
  --set ssh.enabled=true \
  --set-file ssh.privateKey=~/.ssh/id_rsa \
  --set-file ssh.publicKey=~/.ssh/id_rsa.pub \
  --set-file ssh.knownHosts=~/.ssh/known_hosts
```

## Injecting Service Account Keys

For applications that need cloud provider credentials:

```yaml
# templates/cloud-credentials.yaml
{{- if .Values.cloudCredentials.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "myapp.fullname" . }}-cloud-creds
type: Opaque
data:
  {{- if .Values.cloudCredentials.gcp }}
  gcp-key.json: {{ .Values.cloudCredentials.gcp | b64enc }}
  {{- end }}
  {{- if .Values.cloudCredentials.aws }}
  aws-credentials: {{ .Values.cloudCredentials.aws | b64enc }}
  {{- end }}
{{- end }}
```

Reference in the deployment:

```yaml
spec:
  containers:
  - name: {{ .Chart.Name }}
    env:
    {{- if .Values.cloudCredentials.gcp }}
    - name: GOOGLE_APPLICATION_CREDENTIALS
      value: /credentials/gcp-key.json
    {{- end }}
    volumeMounts:
    - name: cloud-credentials
      mountPath: /credentials
      readOnly: true
  volumes:
  - name: cloud-credentials
    secret:
      secretName: {{ include "myapp.fullname" . }}-cloud-creds
```

Deploy with credentials:

```bash
helm install myapp ./mychart \
  --set cloudCredentials.enabled=true \
  --set-file cloudCredentials.gcp=./gcp-service-account.json
```

## Environment-Specific File Injection

Create environment-specific deployment scripts:

```bash
#!/bin/bash
# deploy-to-env.sh

ENVIRONMENT="$1"
RELEASE_NAME="myapp-$ENVIRONMENT"

case $ENVIRONMENT in
  development)
    helm install $RELEASE_NAME ./mychart \
      -f values.yaml \
      -f values-dev.yaml \
      --set-file tls.certificate=./certs/dev-cert.pem \
      --set-file tls.privateKey=./certs/dev-key.pem \
      --set-file config.applicationConfig=./configs/dev.yaml
    ;;
  staging)
    helm install $RELEASE_NAME ./mychart \
      -f values.yaml \
      -f values-staging.yaml \
      --set-file tls.certificate=./certs/staging-cert.pem \
      --set-file tls.privateKey=./certs/staging-key.pem \
      --set-file config.applicationConfig=./configs/staging.yaml
    ;;
  production)
    helm install $RELEASE_NAME ./mychart \
      -f values.yaml \
      -f values-prod.yaml \
      --set-file tls.certificate=./certs/prod-cert.pem \
      --set-file tls.privateKey=./certs/prod-key.pem \
      --set-file config.applicationConfig=./configs/prod.yaml \
      --set-file license.key=./licenses/prod-license.key
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac
```

## File Size Considerations

Be aware that Helm stores the entire release in Kubernetes secrets, which have size limits. For very large files, consider alternative approaches:

```yaml
# For large files, reference external storage
spec:
  initContainers:
  - name: fetch-config
    image: amazon/aws-cli:latest
    command:
    - sh
    - -c
    - |
      aws s3 cp s3://my-bucket/large-config.tar.gz /config/
      tar -xzf /config/large-config.tar.gz -C /config
    volumeMounts:
    - name: config
      mountPath: /config
```

The `--set-file` flag provides a secure and convenient way to inject external files into your Helm deployments. By keeping sensitive files out of version control and values files, you maintain better security while still enabling flexible configuration management.
