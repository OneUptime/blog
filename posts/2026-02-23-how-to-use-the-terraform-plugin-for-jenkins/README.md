# How to Use the Terraform Plugin for Jenkins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Jenkins, CI/CD, Plugin, Infrastructure as Code, DevOps

Description: Install and configure the Terraform plugin for Jenkins to manage Terraform installations, integrate with the Jenkins tool ecosystem, and simplify pipeline configuration.

---

The Terraform plugin for Jenkins adds Terraform as a managed tool installation, similar to how Jenkins manages JDK or Maven versions. Instead of manually installing Terraform on every agent or relying on Docker images, the plugin handles version management, tool installation, and path configuration. It integrates with Jenkins Global Tool Configuration and works with both Declarative and Scripted pipelines.

This post covers installing the plugin, configuring managed Terraform installations, and using them in your pipelines.

## Installing the Plugin

Install the Terraform plugin through the Jenkins UI:

1. Go to Manage Jenkins, then Plugins
2. Click "Available plugins"
3. Search for "Terraform"
4. Check the box next to "Terraform Plugin" and click "Install"
5. Restart Jenkins if prompted

Or install via the CLI:

```bash
# Install using Jenkins CLI
java -jar jenkins-cli.jar -s http://localhost:8080/ install-plugin terraform

# Or using the plugin manager tool
jenkins-plugin-cli --plugins terraform
```

## Configuring Terraform Tool Installations

After installation, configure the Terraform versions your organization uses:

1. Go to Manage Jenkins, then Tools
2. Scroll to "Terraform installations"
3. Click "Add Terraform"
4. Enter a name (e.g., "terraform-1.7.5")
5. Check "Install automatically"
6. Select the version from the dropdown

You can add multiple versions for different projects:

```text
Name: terraform-1.7.5
Install automatically: checked
Version: 1.7.5

Name: terraform-1.6.6
Install automatically: checked
Version: 1.6.6
```

The plugin downloads the specified version on the first use and caches it on the agent.

## Using the Plugin in Declarative Pipelines

Reference the managed installation with the `tools` directive:

```groovy
// Jenkinsfile
// Using the Terraform plugin's managed installation

pipeline {
    agent any

    // Use the managed Terraform installation
    tools {
        terraform 'terraform-1.7.5'
    }

    environment {
        AWS_ACCESS_KEY_ID     = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        TF_IN_AUTOMATION      = 'true'
    }

    stages {
        stage('Init') {
            steps {
                dir('terraform') {
                    // terraform is now available on PATH
                    sh 'terraform version'
                    sh 'terraform init -input=false'
                }
            }
        }

        stage('Validate') {
            steps {
                dir('terraform') {
                    sh 'terraform validate'
                    sh 'terraform fmt -check -diff'
                }
            }
        }

        stage('Plan') {
            steps {
                dir('terraform') {
                    sh 'terraform plan -out=tfplan -input=false'
                    // Archive the plan for visibility
                    sh 'terraform show -no-color tfplan > plan.txt'
                    archiveArtifacts artifacts: 'plan.txt'
                }
            }
        }

        stage('Apply') {
            when {
                branch 'main'
            }
            steps {
                input message: 'Apply the Terraform plan?',
                      ok: 'Apply'
                dir('terraform') {
                    sh 'terraform apply -input=false tfplan'
                }
            }
        }
    }
}
```

The `tools` block tells Jenkins to install the specified Terraform version and add it to the PATH before any stage runs.

## Using in Scripted Pipelines

For Scripted pipelines, use the `tool` step:

```groovy
// Jenkinsfile (Scripted Pipeline)

node {
    // Get the Terraform tool installation path
    def tfHome = tool name: 'terraform-1.7.5', type: 'terraform'
    env.PATH = "${tfHome}:${env.PATH}"

    stage('Checkout') {
        checkout scm
    }

    stage('Init') {
        dir('terraform') {
            withCredentials([
                string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
            ]) {
                sh 'terraform init -input=false'
            }
        }
    }

    stage('Plan') {
        dir('terraform') {
            withCredentials([
                string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
            ]) {
                sh 'terraform plan -out=tfplan -input=false'
            }
        }
    }

    stage('Apply') {
        if (env.BRANCH_NAME == 'main') {
            input message: 'Apply changes?'
            dir('terraform') {
                withCredentials([
                    string(credentialsId: 'aws-access-key-id', variable: 'AWS_ACCESS_KEY_ID'),
                    string(credentialsId: 'aws-secret-access-key', variable: 'AWS_SECRET_ACCESS_KEY')
                ]) {
                    sh 'terraform apply -input=false tfplan'
                }
            }
        }
    }
}
```

## Dynamic Version Selection

Use pipeline parameters to let users select the Terraform version at build time:

```groovy
pipeline {
    agent any

    parameters {
        choice(
            name: 'TF_VERSION',
            choices: ['terraform-1.7.5', 'terraform-1.6.6', 'terraform-1.5.7'],
            description: 'Terraform version to use'
        )
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'Target environment'
        )
    }

    tools {
        // Dynamic version based on parameter
        terraform "${params.TF_VERSION}"
    }

    stages {
        stage('Version Check') {
            steps {
                sh 'terraform version'
            }
        }

        stage('Plan') {
            steps {
                dir('terraform') {
                    sh """
                        terraform init \
                            -backend-config="environments/${params.ENVIRONMENT}/backend.hcl" \
                            -input=false
                        terraform plan \
                            -var-file="environments/${params.ENVIRONMENT}/terraform.tfvars" \
                            -out=tfplan \
                            -input=false
                    """
                }
            }
        }

        stage('Apply') {
            steps {
                input message: "Apply to ${params.ENVIRONMENT}?"
                dir('terraform') {
                    sh 'terraform apply -input=false tfplan'
                }
            }
        }
    }
}
```

## Combining with the AnsiColor Plugin

Terraform output uses ANSI color codes. Install the AnsiColor plugin to render them properly in the Jenkins console:

```groovy
pipeline {
    agent any

    tools {
        terraform 'terraform-1.7.5'
    }

    options {
        // Enable ANSI color rendering
        ansiColor('xterm')
    }

    stages {
        stage('Plan') {
            steps {
                dir('terraform') {
                    // Plan output will have proper color highlighting
                    sh 'terraform plan -input=false'
                }
            }
        }
    }
}
```

## Workspace Cleanup

The Terraform plugin does not clean up workspace files by default. Add cleanup steps to prevent stale state:

```groovy
pipeline {
    agent any

    tools {
        terraform 'terraform-1.7.5'
    }

    options {
        // Clean workspace before each build
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                cleanWs()
                checkout scm
            }
        }

        stage('Plan') {
            steps {
                dir('terraform') {
                    sh 'terraform init -input=false'
                    sh 'terraform plan -out=tfplan -input=false'
                }
            }
        }
    }

    post {
        always {
            // Remove plan files that might contain sensitive data
            dir('terraform') {
                sh 'rm -f tfplan'
            }
        }
    }
}
```

## Integration with Credentials Binding

The plugin works well with Jenkins Credentials Binding for secure credential management:

```groovy
stage('Apply') {
    steps {
        dir('terraform') {
            // Bind multiple credential types
            withCredentials([
                // AWS credentials
                string(credentialsId: 'aws-access-key', variable: 'AWS_ACCESS_KEY_ID'),
                string(credentialsId: 'aws-secret-key', variable: 'AWS_SECRET_ACCESS_KEY'),
                // Terraform variables with sensitive values
                string(credentialsId: 'db-password', variable: 'TF_VAR_db_password'),
                string(credentialsId: 'api-token', variable: 'TF_VAR_api_token'),
                // Terraform Cloud token
                string(credentialsId: 'terraform-cloud-token', variable: 'TF_TOKEN_app_terraform_io')
            ]) {
                sh 'terraform apply -input=false tfplan'
            }
        }
    }
}
```

## Plugin Configuration as Code

If you use Jenkins Configuration as Code (JCasC), configure the Terraform tool declaratively:

```yaml
# jenkins.yaml (JCasC)
tool:
  terraform:
    installations:
      - name: "terraform-1.7.5"
        properties:
          - installSource:
              installers:
                - terraformInstaller:
                    id: "1.7.5"
      - name: "terraform-1.6.6"
        properties:
          - installSource:
              installers:
                - terraformInstaller:
                    id: "1.6.6"
```

This ensures your Terraform tool configuration is version controlled and reproducible across Jenkins instances.

## Troubleshooting

**Issue: "terraform: not found" despite plugin being installed**
Make sure the `tools` block or `tool` step references the exact name you configured in Global Tool Configuration. Names are case-sensitive.

**Issue: Plugin does not install the expected version**
Check the agent's filesystem for cached installations. The plugin caches downloads at `~/.jenkins/tools/`. Clear the cache if a corrupted download is causing issues.

**Issue: Different agents have different versions**
The plugin installs per-agent. If an agent does not have the version cached, it will download it on first use. This may cause the first build on a new agent to be slower.

## Conclusion

The Terraform plugin for Jenkins brings Terraform into Jenkins' managed tool ecosystem. Instead of managing Terraform installations across agents manually, the plugin handles versioning, installation, and path management. Combined with the `tools` directive in declarative pipelines, it makes Terraform version management as simple as managing any other build tool in Jenkins.

For building complete Terraform pipelines in Jenkins, see our guide on [setting up Terraform in Jenkins pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-in-jenkins-pipelines/view).
