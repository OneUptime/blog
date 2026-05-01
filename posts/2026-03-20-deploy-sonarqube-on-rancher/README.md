# How to Deploy SonarQube on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SonarQube, Code Quality, Kubernetes, Helm, DevOps

Description: Deploy SonarQube on Rancher for continuous code quality analysis with PostgreSQL backend, persistent storage, and CI/CD integration.

## Introduction

SonarQube is the leading platform for continuous code quality and security analysis. It detects bugs, vulnerabilities, and code smells in 30+ programming languages. Deploying it on Rancher provides a team-shared, persistent code quality platform.

## Step 1: Deploy SonarQube with Helm

Use a PostgreSQL service that already exists in your cluster or a managed PostgreSQL instance, then point SonarQube at it with JDBC settings.

```bash
helm repo add sonarqube https://SonarSource.github.io/helm-chart-sonarqube
helm repo update
```

```yaml
# sonarqube-values.yaml

community:
  enabled: true

# Required for SonarQube liveness/readiness probes
monitoringPasscode: "change-this-passcode"

ingress:
  enabled: true
  ingressClassName: nginx
  hosts:
    - name: sonarqube.example.com
      path: /
  tls:
    - secretName: sonarqube-tls
      hosts:
        - sonarqube.example.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "64m"

jdbcOverwrite:
  enabled: true
  jdbcUrl: "jdbc:postgresql://postgresql.example.internal:5432/sonarqube"
  jdbcUsername: sonar
  jdbcSecretName: sonarqube-db
  jdbcSecretPasswordKey: jdbc-password

persistence:
  enabled: true
  storageClass: longhorn
  size: 20Gi    # Elasticsearch indexes for faster restarts

resources:
  requests:
    cpu: "500m"
    memory: "2Gi"
  limits:
    cpu: "2"
    memory: "4Gi"

# Required for SonarQube Elasticsearch
initSysctl:
  enabled: true
  vmMaxMapCount: 524288    # Required by Elasticsearch inside SonarQube
```

```bash
kubectl create namespace sonarqube
kubectl create secret generic sonarqube-db \
  --from-literal=jdbc-password='sonarpassword' \
  -n sonarqube
helm install sonarqube sonarqube/sonarqube \
  --namespace sonarqube \
  --values sonarqube-values.yaml
```

## Step 2: Access and Configure

```bash
# Port-forward for initial access
kubectl port-forward svc/sonarqube-sonarqube \
  -n sonarqube 9000:9000

# Default credentials: admin/admin (change immediately)
# Open http://localhost:9000
```

## Step 3: Generate Token for CI/CD

1. Log in as admin
2. Go to **My Account > Security > Generate Tokens**
3. Create a token for your CI/CD pipeline

## Step 4: Integrate with Jenkins/GitLab CI

```groovy
// Jenkins pipeline stage
stage('SonarQube Analysis') {
    steps {
        withSonarQubeEnv('sonarqube') {    // Server configured in Jenkins settings
            sh '''
                sonar-scanner \
                    -Dsonar.projectKey=my-project \
                    -Dsonar.sources=src \
                    -Dsonar.host.url=$SONAR_HOST_URL \
                    -Dsonar.token=$SONAR_AUTH_TOKEN
            '''
        }
    }
}

// Requires a SonarQube webhook pointing to <yourJenkinsInstance>/sonarqube-webhook/
stage('Quality Gate') {
    steps {
        timeout(time: 5, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
        }
    }
}
```

## Step 5: Configure Quality Gates

Define project-specific quality gates in SonarQube:
- Coverage: > 80%
- Duplications: < 3%
- New bugs: 0
- Security hotspots reviewed: 100%

## Conclusion

SonarQube on Rancher provides persistent, team-shared code quality enforcement. The Quality Gate integration with CI/CD pipelines automatically blocks deployments when code quality drops below defined thresholds. This shifts code quality left, catching issues in development rather than production.
