# How to Handle Jenkins Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, CI/CD, Security, DevOps, Credentials, Secrets Management, Automation

Description: A comprehensive guide to managing credentials in Jenkins securely. Learn how to store, access, and rotate secrets using the Jenkins Credentials Plugin, environment bindings, and integration with external secret managers.

---

Managing credentials in Jenkins pipelines requires careful attention to security. Hardcoding passwords, API keys, or SSH keys directly in your Jenkinsfile exposes sensitive information to anyone with repository access. Jenkins provides robust credential management capabilities that keep secrets encrypted at rest while making them available to your builds through controlled mechanisms.

## Understanding Jenkins Credentials System

The Jenkins Credentials Plugin provides a centralized store for secrets. Credentials are stored encrypted on the Jenkins controller and can be scoped to different levels of access.

```mermaid
flowchart TD
    subgraph CredentialsStore["Jenkins Credentials Store"]
        Global[Global Scope]
        System[System Scope]
        Folder[Folder Scope]
    end

    subgraph Types["Credential Types"]
        UP[Username/Password]
        SSH[SSH Private Key]
        Secret[Secret Text]
        File[Secret File]
        Cert[Certificate]
    end

    Global --> UP
    Global --> SSH
    Global --> Secret
    System --> UP
    System --> SSH
    Folder --> Secret
    Folder --> File

    subgraph Pipeline["Jenkins Pipeline"]
        Build[Build Stage]
        Deploy[Deploy Stage]
    end

    UP --> Build
    SSH --> Deploy
    Secret --> Build
```

## Credential Scopes Explained

Jenkins supports three credential scopes, each controlling where credentials can be accessed:

- **Global**: Available to all jobs and pipelines across the Jenkins instance
- **System**: Reserved for Jenkins system configuration (not available to jobs)
- **Folder**: Limited to jobs within a specific folder hierarchy

## Creating Credentials in Jenkins

### Via the Web Interface

Navigate to **Manage Jenkins > Credentials > System > Global credentials** to add new credentials. The interface provides forms for each credential type.

### Via Jenkins CLI

The following script demonstrates creating credentials programmatically using the Jenkins CLI. You need administrative access to run these commands.

```bash
#!/bin/bash
# create-credential.sh
# Creates a username/password credential via Jenkins CLI

JENKINS_URL="https://jenkins.example.com"
JENKINS_USER="admin"
JENKINS_TOKEN="${JENKINS_API_TOKEN}"

# Create the credential XML payload
cat > credential.xml << 'EOF'
<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
  <scope>GLOBAL</scope>
  <id>database-credentials</id>
  <description>Database connection credentials</description>
  <username>db_user</username>
  <password>db_password_here</password>
</com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
EOF

# Create the credential using Jenkins CLI
java -jar jenkins-cli.jar -s ${JENKINS_URL} \
  -auth ${JENKINS_USER}:${JENKINS_TOKEN} \
  create-credentials-by-xml system::system::jenkins _ < credential.xml

# Clean up the XML file
rm credential.xml
```

### Via Groovy Script Console

For bulk credential creation or automation, use the Script Console. Navigate to **Manage Jenkins > Script Console** and run Groovy code directly.

```groovy
// add-credentials.groovy
// Creates multiple credential types programmatically

import jenkins.model.Jenkins
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.domains.*
import com.cloudbees.plugins.credentials.impl.*
import com.cloudbees.jenkins.plugins.sshcredentials.impl.*
import hudson.util.Secret
import org.jenkinsci.plugins.plaincredentials.impl.*

// Get the credentials store
def store = Jenkins.instance.getExtensionList(
    'com.cloudbees.plugins.credentials.SystemCredentialsProvider'
)[0].getStore()

// Define the global domain
def domain = Domain.global()

// Create a username/password credential
def usernamePassword = new UsernamePasswordCredentialsImpl(
    CredentialsScope.GLOBAL,
    "github-credentials",         // Credential ID
    "GitHub access credentials",  // Description
    "github-username",           // Username
    "github-token-here"          // Password
)

// Create a secret text credential
def secretText = new StringCredentialsImpl(
    CredentialsScope.GLOBAL,
    "slack-webhook-token",       // Credential ID
    "Slack notification webhook", // Description
    Secret.fromString("xoxb-slack-token-here")
)

// Create an SSH private key credential
def sshKey = new BasicSSHUserPrivateKey(
    CredentialsScope.GLOBAL,
    "deploy-ssh-key",            // Credential ID
    "deploy",                    // Username
    new BasicSSHUserPrivateKey.DirectEntryPrivateKeySource(
        """-----BEGIN RSA PRIVATE KEY-----
        MIIEowIBAAKCAQEA...
        -----END RSA PRIVATE KEY-----"""
    ),
    "",                          // Passphrase (empty if none)
    "SSH key for deployment"     // Description
)

// Add credentials to the store
store.addCredentials(domain, usernamePassword)
store.addCredentials(domain, secretText)
store.addCredentials(domain, sshKey)

println "Credentials created successfully"
```

## Using Credentials in Declarative Pipelines

Declarative pipelines provide a clean syntax for credential binding. The `credentials()` helper function references stored credentials by their ID.

### Environment Variable Binding

The environment block supports direct credential binding. Jenkins automatically injects credentials as environment variables available to all stages.

```groovy
// Jenkinsfile
// Pipeline demonstrating credential binding via environment block

pipeline {
    agent any

    // Bind credentials to environment variables for all stages
    environment {
        // Username/password credentials create two variables:
        // DATABASE_CREDS_USR and DATABASE_CREDS_PSW
        DATABASE_CREDS = credentials('database-credentials')

        // Secret text credentials create a single variable
        SLACK_TOKEN = credentials('slack-webhook-token')

        // AWS credentials example
        AWS_ACCESS_KEY_ID = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
    }

    stages {
        stage('Build') {
            steps {
                // Use credentials in shell commands
                // The actual values are masked in console output
                sh '''
                    echo "Connecting to database..."
                    mysql -u ${DATABASE_CREDS_USR} \
                          -p${DATABASE_CREDS_PSW} \
                          -h db.example.com \
                          -e "SELECT 1"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    # AWS CLI automatically uses AWS_ACCESS_KEY_ID
                    # and AWS_SECRET_ACCESS_KEY
                    aws s3 sync ./dist s3://my-bucket/
                '''
            }
        }

        stage('Notify') {
            steps {
                // Send Slack notification
                sh '''
                    curl -X POST \
                         -H "Authorization: Bearer ${SLACK_TOKEN}" \
                         -H "Content-Type: application/json" \
                         -d '{"channel":"#deployments","text":"Deployment complete"}' \
                         https://slack.com/api/chat.postMessage
                '''
            }
        }
    }
}
```

### Stage-Level Credential Binding

When credentials should only be available in specific stages, use the `withCredentials` block for fine-grained control.

```groovy
// Jenkinsfile
// Stage-specific credential binding for security isolation

pipeline {
    agent any

    stages {
        stage('Test') {
            steps {
                // Test stage runs without production credentials
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                // Docker Hub credentials only available in this block
                withCredentials([
                    usernamePassword(
                        credentialsId: 'docker-hub-creds',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                        echo "${DOCKER_PASS}" | docker login \
                            -u "${DOCKER_USER}" \
                            --password-stdin

                        docker build -t myapp:${BUILD_NUMBER} .
                        docker push myapp:${BUILD_NUMBER}
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                // SSH credentials for server deployment
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'production-ssh-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no \
                            ${SSH_USER}@prod.example.com \
                            "docker pull myapp:${BUILD_NUMBER} && \
                             docker-compose up -d"
                    '''
                }
            }
        }
    }
}
```

## Using Credentials in Scripted Pipelines

Scripted pipelines offer more flexibility with credential bindings. The same `withCredentials` wrapper applies.

```groovy
// Jenkinsfile
// Scripted pipeline with multiple credential types

node {
    // Clone repository with Git credentials
    stage('Checkout') {
        withCredentials([
            usernamePassword(
                credentialsId: 'github-credentials',
                usernameVariable: 'GIT_USER',
                passwordVariable: 'GIT_TOKEN'
            )
        ]) {
            sh '''
                git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/org/repo.git
            '''
        }
    }

    // Use multiple credential types together
    stage('Integration Tests') {
        withCredentials([
            usernamePassword(
                credentialsId: 'database-credentials',
                usernameVariable: 'DB_USER',
                passwordVariable: 'DB_PASS'
            ),
            string(
                credentialsId: 'api-key',
                variable: 'API_KEY'
            ),
            file(
                credentialsId: 'service-account-json',
                variable: 'GOOGLE_APPLICATION_CREDENTIALS'
            )
        ]) {
            sh '''
                export DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@localhost:5432/test"
                export API_KEY="${API_KEY}"

                # Service account file is written to GOOGLE_APPLICATION_CREDENTIALS path
                npm run integration-tests
            '''
        }
    }

    // Conditional credential usage based on branch
    stage('Deploy') {
        def credentialId = env.BRANCH_NAME == 'main'
            ? 'production-credentials'
            : 'staging-credentials'

        withCredentials([
            usernamePassword(
                credentialsId: credentialId,
                usernameVariable: 'DEPLOY_USER',
                passwordVariable: 'DEPLOY_PASS'
            )
        ]) {
            sh "./deploy.sh ${DEPLOY_USER} ${DEPLOY_PASS}"
        }
    }
}
```

## Working with SSH Credentials

SSH keys require special handling. Jenkins can bind keys to files or use them directly for Git operations.

```mermaid
flowchart LR
    subgraph Jenkins["Jenkins Controller"]
        Creds[SSH Credential Store]
        Agent[Build Agent]
    end

    subgraph Pipeline["Pipeline Execution"]
        Checkout[Git Checkout]
        Deploy[SSH Deploy]
    end

    subgraph Remote["Remote Servers"]
        Git[Git Server]
        Prod[Production Server]
    end

    Creds -->|Key Binding| Agent
    Agent --> Checkout
    Agent --> Deploy
    Checkout -->|SSH Auth| Git
    Deploy -->|SSH Auth| Prod
```

The following pipeline demonstrates SSH key usage for both Git operations and remote server deployment.

```groovy
// Jenkinsfile
// SSH key handling for Git and server deployment

pipeline {
    agent any

    stages {
        stage('Checkout with SSH') {
            steps {
                // Use SSH agent for Git operations
                sshagent(['github-deploy-key']) {
                    sh '''
                        git clone git@github.com:org/private-repo.git
                        cd private-repo
                        git submodule update --init --recursive
                    '''
                }
            }
        }

        stage('Deploy via SSH') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'production-ssh-key',
                        keyFileVariable: 'SSH_KEY_FILE',
                        usernameVariable: 'SSH_USER',
                        passphraseVariable: 'SSH_PASSPHRASE'
                    )
                ]) {
                    // Create SSH config for the connection
                    sh '''
                        # Set correct permissions on key file
                        chmod 600 ${SSH_KEY_FILE}

                        # Start ssh-agent and add key
                        eval $(ssh-agent -s)

                        # Add key with passphrase if set
                        if [ -n "${SSH_PASSPHRASE}" ]; then
                            SSH_ASKPASS_REQUIRE=force \
                            SSH_ASKPASS="echo ${SSH_PASSPHRASE}" \
                            ssh-add ${SSH_KEY_FILE}
                        else
                            ssh-add ${SSH_KEY_FILE}
                        fi

                        # Execute remote commands
                        ssh -o StrictHostKeyChecking=no \
                            ${SSH_USER}@production.example.com \
                            "cd /app && git pull && docker-compose restart"

                        # Clean up
                        ssh-agent -k
                    '''
                }
            }
        }
    }
}
```

## Secret Files and Certificates

Jenkins can store entire files as credentials, useful for configuration files, certificates, or service account keys.

```groovy
// Jenkinsfile
// Handling file-based credentials

pipeline {
    agent any

    stages {
        stage('Deploy with Kubernetes Config') {
            steps {
                withCredentials([
                    // Kubernetes config file
                    file(
                        credentialsId: 'kubeconfig-production',
                        variable: 'KUBECONFIG'
                    ),
                    // TLS certificate and key
                    file(
                        credentialsId: 'tls-certificate',
                        variable: 'TLS_CERT'
                    ),
                    file(
                        credentialsId: 'tls-private-key',
                        variable: 'TLS_KEY'
                    )
                ]) {
                    sh '''
                        # Kubernetes config is automatically available
                        kubectl get nodes

                        # Create TLS secret in cluster
                        kubectl create secret tls app-tls \
                            --cert=${TLS_CERT} \
                            --key=${TLS_KEY} \
                            --dry-run=client -o yaml | kubectl apply -f -

                        # Deploy application
                        kubectl apply -f kubernetes/
                    '''
                }
            }
        }

        stage('GCP Deployment') {
            steps {
                withCredentials([
                    file(
                        credentialsId: 'gcp-service-account',
                        variable: 'GOOGLE_APPLICATION_CREDENTIALS'
                    )
                ]) {
                    sh '''
                        # Authenticate with service account
                        gcloud auth activate-service-account \
                            --key-file=${GOOGLE_APPLICATION_CREDENTIALS}

                        # Set project
                        gcloud config set project my-project

                        # Deploy to Cloud Run
                        gcloud run deploy my-service \
                            --image gcr.io/my-project/my-service:latest \
                            --region us-central1
                    '''
                }
            }
        }
    }
}
```

## Integrating with External Secret Managers

For organizations using dedicated secret management solutions, Jenkins can integrate with HashiCorp Vault, AWS Secrets Manager, and Azure Key Vault.

```mermaid
flowchart TD
    subgraph Jenkins["Jenkins"]
        Pipeline[Pipeline]
        Plugin[Vault Plugin]
    end

    subgraph Vault["HashiCorp Vault"]
        KV[KV Secrets Engine]
        Auth[AppRole Auth]
    end

    subgraph Cloud["Cloud Providers"]
        AWS[AWS Secrets Manager]
        Azure[Azure Key Vault]
        GCP[GCP Secret Manager]
    end

    Pipeline --> Plugin
    Plugin --> Auth
    Auth --> KV
    Pipeline --> AWS
    Pipeline --> Azure
    Pipeline --> GCP
```

### HashiCorp Vault Integration

Install the HashiCorp Vault Plugin and configure the Vault server connection in Jenkins global configuration.

```groovy
// Jenkinsfile
// HashiCorp Vault integration for dynamic secrets

pipeline {
    agent any

    stages {
        stage('Fetch Secrets from Vault') {
            steps {
                // Using the HashiCorp Vault Plugin
                withVault(
                    configuration: [
                        vaultUrl: 'https://vault.example.com',
                        vaultCredentialId: 'vault-approle'
                    ],
                    vaultSecrets: [
                        [
                            path: 'secret/data/myapp/database',
                            secretValues: [
                                [envVar: 'DB_USER', vaultKey: 'username'],
                                [envVar: 'DB_PASS', vaultKey: 'password']
                            ]
                        ],
                        [
                            path: 'secret/data/myapp/api',
                            secretValues: [
                                [envVar: 'API_KEY', vaultKey: 'key']
                            ]
                        ]
                    ]
                ) {
                    sh '''
                        echo "Connecting to database..."
                        psql "postgres://${DB_USER}:${DB_PASS}@db.example.com/app"
                    '''
                }
            }
        }

        stage('AWS Dynamic Secrets') {
            steps {
                // Vault can generate temporary AWS credentials
                withVault(
                    configuration: [
                        vaultUrl: 'https://vault.example.com',
                        vaultCredentialId: 'vault-approle'
                    ],
                    vaultSecrets: [
                        [
                            path: 'aws/creds/deploy-role',
                            secretValues: [
                                [envVar: 'AWS_ACCESS_KEY_ID', vaultKey: 'access_key'],
                                [envVar: 'AWS_SECRET_ACCESS_KEY', vaultKey: 'secret_key']
                            ]
                        ]
                    ]
                ) {
                    sh '''
                        # Use dynamically generated AWS credentials
                        aws s3 ls
                    '''
                }
            }
        }
    }
}
```

### AWS Secrets Manager Integration

Retrieve secrets from AWS Secrets Manager using the AWS SDK or CLI within your pipeline.

```groovy
// Jenkinsfile
// AWS Secrets Manager integration

pipeline {
    agent any

    environment {
        // Base AWS credentials for Secrets Manager access
        AWS_ACCESS_KEY_ID = credentials('aws-access-key')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-key')
        AWS_REGION = 'us-east-1'
    }

    stages {
        stage('Fetch AWS Secrets') {
            steps {
                script {
                    // Retrieve secret from AWS Secrets Manager
                    def secretJson = sh(
                        script: '''
                            aws secretsmanager get-secret-value \
                                --secret-id myapp/production \
                                --query SecretString \
                                --output text
                        ''',
                        returnStdout: true
                    ).trim()

                    // Parse the JSON secret
                    def secrets = readJSON text: secretJson

                    // Set as environment variables for subsequent steps
                    env.DB_HOST = secrets.db_host
                    env.DB_USER = secrets.db_user
                    env.DB_PASS = secrets.db_password
                }
            }
        }

        stage('Use Secrets') {
            steps {
                sh '''
                    # Secrets are now available as environment variables
                    echo "Connecting to ${DB_HOST}"
                '''
            }
        }
    }
}
```

## Credential Rotation Strategies

Regular credential rotation reduces the impact of compromised secrets. Implement automated rotation workflows for your Jenkins credentials.

```groovy
// Jenkinsfile
// Automated credential rotation pipeline

pipeline {
    agent any

    triggers {
        // Run rotation monthly
        cron('0 0 1 * *')
    }

    stages {
        stage('Generate New Credentials') {
            steps {
                script {
                    // Generate new random password
                    def newPassword = sh(
                        script: "openssl rand -base64 32",
                        returnStdout: true
                    ).trim()

                    env.NEW_PASSWORD = newPassword
                }
            }
        }

        stage('Update External System') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'database-admin',
                        usernameVariable: 'ADMIN_USER',
                        passwordVariable: 'ADMIN_PASS'
                    )
                ]) {
                    sh '''
                        # Update password in database
                        mysql -u ${ADMIN_USER} -p${ADMIN_PASS} -e \
                            "ALTER USER 'app_user'@'%' IDENTIFIED BY '${NEW_PASSWORD}'"
                    '''
                }
            }
        }

        stage('Update Jenkins Credential') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'jenkins-admin',
                        usernameVariable: 'JENKINS_USER',
                        passwordVariable: 'JENKINS_TOKEN'
                    )
                ]) {
                    // Groovy script to update Jenkins credential
                    script {
                        def jenkinsUrl = env.JENKINS_URL

                        // Create updated credential XML
                        def credXml = """
                        <com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
                            <scope>GLOBAL</scope>
                            <id>database-credentials</id>
                            <description>Database credentials (rotated ${new Date().format('yyyy-MM-dd')})</description>
                            <username>app_user</username>
                            <password>${env.NEW_PASSWORD}</password>
                        </com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
                        """

                        writeFile file: 'cred.xml', text: credXml

                        sh '''
                            curl -X POST \
                                "${JENKINS_URL}/credentials/store/system/domain/_/credential/database-credentials/config.xml" \
                                --user "${JENKINS_USER}:${JENKINS_TOKEN}" \
                                -H "Content-Type: application/xml" \
                                -d @cred.xml
                        '''
                    }
                }
            }
        }

        stage('Verify New Credentials') {
            steps {
                // Wait for credential cache to update
                sleep(time: 10, unit: 'SECONDS')

                withCredentials([
                    usernamePassword(
                        credentialsId: 'database-credentials',
                        usernameVariable: 'DB_USER',
                        passwordVariable: 'DB_PASS'
                    )
                ]) {
                    sh '''
                        # Verify connection with new credentials
                        mysql -u ${DB_USER} -p${DB_PASS} -e "SELECT 1"
                        echo "Credential rotation successful"
                    '''
                }
            }
        }
    }

    post {
        failure {
            // Alert on rotation failure
            emailext(
                subject: "Credential Rotation Failed",
                body: "The automated credential rotation pipeline failed. Manual intervention required.",
                to: "security-team@example.com"
            )
        }
    }
}
```

## Security Best Practices

### Audit Credential Usage

Enable credential usage tracking to monitor which jobs access which credentials.

```groovy
// Jenkinsfile
// Pipeline with credential usage logging

pipeline {
    agent any

    stages {
        stage('Audit Example') {
            steps {
                script {
                    // Log credential access for audit trail
                    echo "Job ${env.JOB_NAME} build #${env.BUILD_NUMBER}"
                    echo "Accessing credential: database-credentials"
                    echo "Initiated by: ${currentBuild.getBuildCauses()[0].userId ?: 'automated'}"
                }

                withCredentials([
                    usernamePassword(
                        credentialsId: 'database-credentials',
                        usernameVariable: 'DB_USER',
                        passwordVariable: 'DB_PASS'
                    )
                ]) {
                    sh '''
                        # Your actual work here
                        echo "Using credentials for database operation"
                    '''
                }
            }
        }
    }
}
```

### Restrict Credential Access

Use folder-level credentials and role-based access control to limit who can use specific credentials.

```mermaid
flowchart TD
    subgraph Global["Global Credentials"]
        G1[Shared API Keys]
        G2[Public Registry Access]
    end

    subgraph Production["Production Folder"]
        ProdCreds[Production Secrets]
        ProdJobs[Production Jobs]
    end

    subgraph Staging["Staging Folder"]
        StageCreds[Staging Secrets]
        StageJobs[Staging Jobs]
    end

    G1 --> ProdJobs
    G1 --> StageJobs
    G2 --> ProdJobs
    G2 --> StageJobs
    ProdCreds --> ProdJobs
    StageCreds --> StageJobs
    ProdCreds -.->|Blocked| StageJobs
    StageCreds -.->|Blocked| ProdJobs
```

### Mask Sensitive Output

Jenkins automatically masks credential values in console output, but additional care is needed for derived values.

```groovy
// Jenkinsfile
// Proper credential masking techniques

pipeline {
    agent any

    stages {
        stage('Secure Output') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'api-credentials',
                        usernameVariable: 'API_USER',
                        passwordVariable: 'API_KEY'
                    )
                ]) {
                    script {
                        // Create masked variable for derived values
                        def authHeader = "Basic ${(env.API_USER + ':' + env.API_KEY).bytes.encodeBase64()}"

                        // Use the Mask Passwords Plugin for additional masking
                        wrap([$class: 'MaskPasswordsBuildWrapper',
                              varPasswordPairs: [[var: 'AUTH_HEADER', password: authHeader]]]) {
                            sh """
                                curl -H "Authorization: ${authHeader}" \
                                     https://api.example.com/data
                            """
                        }
                    }
                }
            }
        }
    }
}
```

## Troubleshooting Common Issues

### Credential Not Found

Verify the credential ID matches exactly and the credential is in an accessible scope.

```groovy
// Debug script to list available credentials
pipeline {
    agent any

    stages {
        stage('List Credentials') {
            steps {
                script {
                    // Only works with appropriate permissions
                    def creds = com.cloudbees.plugins.credentials.CredentialsProvider.lookupCredentials(
                        com.cloudbees.plugins.credentials.common.StandardCredentials.class,
                        Jenkins.instance,
                        null,
                        null
                    )

                    creds.each { c ->
                        println "ID: ${c.id}, Description: ${c.description}"
                    }
                }
            }
        }
    }
}
```

### Permission Denied

Ensure the pipeline has permission to access the credential scope.

```groovy
// Check credential permissions
pipeline {
    agent any

    stages {
        stage('Verify Access') {
            steps {
                script {
                    try {
                        withCredentials([
                            string(credentialsId: 'my-secret', variable: 'SECRET')
                        ]) {
                            echo "Credential access successful"
                        }
                    } catch (Exception e) {
                        echo "Credential access failed: ${e.message}"
                        echo "Verify credential scope and job permissions"
                    }
                }
            }
        }
    }
}
```

---

Proper credential management in Jenkins protects your infrastructure from unauthorized access while enabling automated deployments. By using the Credentials Plugin with appropriate scoping, integrating with external secret managers for dynamic credentials, and implementing regular rotation, you build a security foundation that scales with your organization. Start with basic credential bindings, then gradually adopt more sophisticated patterns like Vault integration as your security requirements grow.

**Related Reading:**

- [How to Use Helm with Jenkins CI/CD Pipelines](https://oneuptime.com/blog/post/2026-01-17-helm-cicd-jenkins-pipeline/view)
- [How to Use Vault with Kubernetes](https://oneuptime.com/blog/post/2026-02-02-vault-kubernetes/view)
