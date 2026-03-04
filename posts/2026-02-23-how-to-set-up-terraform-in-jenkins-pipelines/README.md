# How to Set Up Terraform in Jenkins Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Jenkins, CI/CD, Infrastructure as Code, DevOps, Pipelines

Description: Build a complete Terraform CI/CD pipeline in Jenkins with Declarative and Scripted syntax, including plan approval gates, state management, and multi-environment deployments.

---

Jenkins remains one of the most widely used CI/CD tools, especially in enterprises with established infrastructure. If your organization runs Jenkins and needs to automate Terraform deployments, you do not need to migrate to a different CI/CD platform. Jenkins can handle Terraform workflows just fine, complete with plan reviews, approval gates, and multi-environment deployments.

This post covers setting up Terraform in Jenkins from scratch, starting with agent configuration and building up to a full production pipeline.

## Prerequisites

Before creating pipelines, ensure your Jenkins environment is ready:

1. **Terraform installed on agents**: Install Terraform on your Jenkins agents, or use Docker-based agents with the Terraform image
2. **Credentials configured**: Store cloud provider credentials in Jenkins credential store
3. **Pipeline plugin**: Ensure the Pipeline plugin is installed (included by default in modern Jenkins)

### Installing Terraform on Jenkins Agents

If you manage your own agents, install Terraform:

```bash
# On the Jenkins agent
TERRAFORM_VERSION="1.7.5"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
unzip "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo mv terraform /usr/local/bin/
terraform version
```

For Docker-based agents, use the official image in your pipeline:

```groovy
pipeline {
    agent {
        docker {
            image 'hashicorp/terraform:1.7.5'
            args '--entrypoint=""'
        }
    }
    // ... stages
}
```

## Storing Credentials in Jenkins

Go to Manage Jenkins, then Credentials, and add your cloud provider credentials:

For AWS:
- Kind: "Secret text" for access key and secret key separately
- Or kind: "AWS Credentials" if you have the AWS Credentials plugin

For Azure:
- Kind: "Secret text" for client ID, client secret, tenant ID, and subscription ID

For Terraform Cloud:
- Kind: "Secret text" for the API token

## Basic Declarative Pipeline

Here is a straightforward pipeline that plans on every build and applies with manual approval:

```groovy
// Jenkinsfile
// Basic Terraform pipeline with plan and apply stages

pipeline {
    agent any

    environment {
        // AWS credentials from Jenkins credential store
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        AWS_DEFAULT_REGION    = 'us-east-1'
        TF_IN_AUTOMATION      = 'true'
    }

    parameters {
        choice(
            name: 'ACTION',
            choices: ['plan', 'apply', 'destroy'],
            description: 'Terraform action to perform'
        )
        string(
            name: 'WORKSPACE',
            defaultValue: 'default',
            description: 'Terraform workspace'
        )
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Terraform Init') {
            steps {
                dir('terraform') {
                    sh '''
                        terraform init -input=false
                        terraform workspace select ${WORKSPACE} || terraform workspace new ${WORKSPACE}
                    '''
                }
            }
        }

        stage('Terraform Validate') {
            steps {
                dir('terraform') {
                    sh 'terraform validate'
                }
            }
        }

        stage('Terraform Plan') {
            steps {
                dir('terraform') {
                    sh 'terraform plan -out=tfplan -input=false'
                }
            }
        }

        stage('Approval') {
            when {
                expression { params.ACTION == 'apply' }
            }
            steps {
                // Show the plan output to the approver
                dir('terraform') {
                    sh 'terraform show -no-color tfplan'
                }
                // Wait for manual approval
                input message: 'Review the plan above. Approve to apply?',
                      ok: 'Apply'
            }
        }

        stage('Terraform Apply') {
            when {
                expression { params.ACTION == 'apply' }
            }
            steps {
                dir('terraform') {
                    sh 'terraform apply -input=false tfplan'
                }
            }
        }

        stage('Terraform Destroy') {
            when {
                expression { params.ACTION == 'destroy' }
            }
            steps {
                input message: 'Are you sure you want to destroy all resources?',
                      ok: 'Destroy'
                dir('terraform') {
                    sh 'terraform destroy -auto-approve -input=false'
                }
            }
        }
    }

    post {
        always {
            // Clean up plan files
            dir('terraform') {
                sh 'rm -f tfplan'
            }
        }
        failure {
            echo 'Terraform pipeline failed. Check the logs for details.'
        }
        success {
            echo 'Terraform pipeline completed successfully.'
        }
    }
}
```

## Multi-Environment Pipeline

For deploying to multiple environments with proper promotion:

```groovy
// Jenkinsfile
// Multi-environment Terraform pipeline

pipeline {
    agent any

    environment {
        TF_IN_AUTOMATION = 'true'
    }

    stages {
        stage('Init and Plan - Dev') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-dev-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-dev-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/dev/backend.hcl" \
                            -reconfigure
                        terraform plan \
                            -var-file="environments/dev/terraform.tfvars" \
                            -out=tfplan-dev \
                            -input=false
                    '''
                }
            }
        }

        stage('Apply - Dev') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-dev-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-dev-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/dev/backend.hcl" \
                            -reconfigure
                        terraform apply -input=false tfplan-dev
                    '''
                }
            }
        }

        stage('Init and Plan - Staging') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-staging-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-staging-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/staging/backend.hcl" \
                            -reconfigure
                        terraform plan \
                            -var-file="environments/staging/terraform.tfvars" \
                            -out=tfplan-staging \
                            -input=false
                    '''
                }
            }
        }

        stage('Approve Staging') {
            steps {
                dir('terraform') {
                    sh 'terraform show -no-color tfplan-staging'
                }
                input message: 'Deploy to staging?', ok: 'Deploy'
            }
        }

        stage('Apply - Staging') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-staging-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-staging-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/staging/backend.hcl" \
                            -reconfigure
                        terraform apply -input=false tfplan-staging
                    '''
                }
            }
        }

        stage('Init and Plan - Production') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-prod-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-prod-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/production/backend.hcl" \
                            -reconfigure
                        terraform plan \
                            -var-file="environments/production/terraform.tfvars" \
                            -out=tfplan-prod \
                            -input=false
                    '''
                }
            }
        }

        stage('Approve Production') {
            steps {
                dir('terraform') {
                    sh 'terraform show -no-color tfplan-prod'
                }
                input message: 'Deploy to PRODUCTION?',
                      ok: 'Deploy to Production',
                      submitter: 'admin,platform-leads'
            }
        }

        stage('Apply - Production') {
            environment {
                AWS_ACCESS_KEY_ID     = credentials('aws-prod-access-key')
                AWS_SECRET_ACCESS_KEY = credentials('aws-prod-secret-key')
            }
            steps {
                dir('terraform') {
                    sh '''
                        terraform init \
                            -backend-config="environments/production/backend.hcl" \
                            -reconfigure
                        terraform apply -input=false tfplan-prod
                    '''
                }
            }
        }
    }

    post {
        always {
            dir('terraform') {
                sh 'rm -f tfplan-dev tfplan-staging tfplan-prod'
            }
        }
    }
}
```

## Using Shared Libraries

For organizations with multiple Terraform pipelines, extract common logic into a Jenkins shared library:

```groovy
// vars/terraformPipeline.groovy
// Shared library function for standardized Terraform pipelines

def call(Map config) {
    pipeline {
        agent any

        environment {
            TF_IN_AUTOMATION = 'true'
        }

        stages {
            stage('Init') {
                steps {
                    dir(config.workingDir ?: 'terraform') {
                        withCredentials([
                            string(credentialsId: config.accessKeyId, variable: 'AWS_ACCESS_KEY_ID'),
                            string(credentialsId: config.secretAccessKey, variable: 'AWS_SECRET_ACCESS_KEY')
                        ]) {
                            sh """
                                terraform init \
                                    -backend-config="${config.backendConfig}" \
                                    -input=false
                            """
                        }
                    }
                }
            }

            stage('Plan') {
                steps {
                    dir(config.workingDir ?: 'terraform') {
                        withCredentials([
                            string(credentialsId: config.accessKeyId, variable: 'AWS_ACCESS_KEY_ID'),
                            string(credentialsId: config.secretAccessKey, variable: 'AWS_SECRET_ACCESS_KEY')
                        ]) {
                            sh """
                                terraform plan \
                                    -var-file="${config.varFile}" \
                                    -out=tfplan \
                                    -input=false
                            """
                        }
                    }
                }
            }

            stage('Apply') {
                when {
                    branch 'main'
                }
                steps {
                    input message: "Apply changes to ${config.environment}?"
                    dir(config.workingDir ?: 'terraform') {
                        withCredentials([
                            string(credentialsId: config.accessKeyId, variable: 'AWS_ACCESS_KEY_ID'),
                            string(credentialsId: config.secretAccessKey, variable: 'AWS_SECRET_ACCESS_KEY')
                        ]) {
                            sh 'terraform apply -input=false tfplan'
                        }
                    }
                }
            }
        }
    }
}
```

Use it in project Jenkinsfiles:

```groovy
// Jenkinsfile
// Uses the shared library for a standardized pipeline

@Library('terraform-pipeline-lib') _

terraformPipeline(
    workingDir: 'terraform',
    environment: 'production',
    backendConfig: 'environments/production/backend.hcl',
    varFile: 'environments/production/terraform.tfvars',
    accessKeyId: 'aws-prod-access-key',
    secretAccessKey: 'aws-prod-secret-key'
)
```

## Notifications

Add Slack or email notifications for pipeline events:

```groovy
post {
    success {
        slackSend(
            color: 'good',
            message: "Terraform ${params.ACTION} succeeded for ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        )
    }
    failure {
        slackSend(
            color: 'danger',
            message: "Terraform ${params.ACTION} FAILED for ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        )
        emailext(
            subject: "Terraform Pipeline Failed: ${env.JOB_NAME}",
            body: "Check the console output: ${env.BUILD_URL}",
            recipientProviders: [requestor(), culprits()]
        )
    }
}
```

## Conclusion

Jenkins handles Terraform workflows well using declarative pipelines with `input` steps for approval gates and the credential store for secret management. The key is using `-input=false` and `-auto-approve` flags appropriately, saving plan files between stages, and scoping credentials to the stages that need them. For organizations with multiple Terraform projects, shared libraries standardize the pipeline across teams while allowing project-specific configuration.

For the Terraform plugin specifically, see our guide on [the Terraform plugin for Jenkins](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-plugin-for-jenkins/view).
