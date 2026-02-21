# How to Run Ansible Playbooks in AWS CodePipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, CodePipeline, CI/CD, DevOps

Description: Integrate Ansible playbooks into AWS CodePipeline using CodeBuild for automated infrastructure deployments with IAM-based security.

---

If your infrastructure runs on AWS, using AWS CodePipeline for Ansible deployments makes a lot of sense. You get native integration with other AWS services, IAM-based access control, and you can leverage AWS Secrets Manager for credential storage. The trick is that CodePipeline itself does not run commands. You use CodeBuild as the execution engine within the pipeline.

This guide shows you how to set up CodePipeline with CodeBuild to run Ansible playbooks, manage secrets with AWS services, and build a proper deployment pipeline.

## Architecture Overview

The setup involves several AWS services working together.

```mermaid
graph LR
    A[CodeCommit/GitHub] --> B[CodePipeline]
    B --> C[CodeBuild - Lint]
    C --> D[CodeBuild - Deploy Staging]
    D --> E[Manual Approval]
    E --> F[CodeBuild - Deploy Production]
    G[Secrets Manager] --> D
    G --> F
    H[SSM Parameter Store] --> D
    H --> F
```

## CodeBuild Build Specification

CodeBuild uses a `buildspec.yml` file to define what commands to run. Create one for Ansible.

```yaml
# buildspec.yml - Ansible deployment build spec
version: 0.2

env:
  secrets-manager:
    SSH_PRIVATE_KEY: "ansible-secrets:ssh_private_key"
    ANSIBLE_VAULT_PASSWORD: "ansible-secrets:vault_password"
  variables:
    ANSIBLE_HOST_KEY_CHECKING: "false"
    ANSIBLE_FORCE_COLOR: "true"

phases:
  install:
    runtime-versions:
      python: 3.11
    commands:
      # Install Ansible and required tools
      - pip install ansible==8.7.0 ansible-lint
      - ansible-galaxy collection install -r requirements.yml
      - ansible --version

  pre_build:
    commands:
      # Set up SSH for connecting to target hosts
      - mkdir -p ~/.ssh
      - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
      - chmod 600 ~/.ssh/id_rsa
      - ssh-keyscan -H $TARGET_HOST >> ~/.ssh/known_hosts 2>/dev/null
      # Write vault password
      - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt
      # Lint playbooks
      - ansible-playbook --syntax-check playbooks/site.yml

  build:
    commands:
      # Run the Ansible playbook
      - |
        ansible-playbook \
          -i inventory/${ENVIRONMENT}.ini \
          --vault-password-file /tmp/vault_pass.txt \
          -e "deploy_version=${CODEBUILD_RESOLVED_SOURCE_VERSION}" \
          playbooks/site.yml

  post_build:
    commands:
      # Clean up sensitive files
      - rm -f /tmp/vault_pass.txt ~/.ssh/id_rsa
      - echo "Deployment to ${ENVIRONMENT} completed"

artifacts:
  files:
    - '**/*'
```

## Separate Buildspecs for Different Stages

Create different buildspec files for lint, staging, and production.

```yaml
# buildspec-lint.yml - Linting stage
version: 0.2

phases:
  install:
    runtime-versions:
      python: 3.11
    commands:
      - pip install ansible==8.7.0 ansible-lint

  build:
    commands:
      - ansible-lint playbooks/
      - ansible-playbook --syntax-check playbooks/site.yml
      - echo "Lint passed"
```

```yaml
# buildspec-deploy.yml - Deployment stage (used for both staging and production)
version: 0.2

env:
  secrets-manager:
    SSH_PRIVATE_KEY: "ansible-secrets:ssh_private_key"
    ANSIBLE_VAULT_PASSWORD: "ansible-secrets:vault_password"
  parameter-store:
    TARGET_HOST: "/ansible/${ENVIRONMENT}/target_host"

phases:
  install:
    runtime-versions:
      python: 3.11
    commands:
      - pip install ansible==8.7.0
      - ansible-galaxy collection install -r requirements.yml

  pre_build:
    commands:
      - mkdir -p ~/.ssh
      - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
      - chmod 600 ~/.ssh/id_rsa
      - ssh-keyscan -H $TARGET_HOST >> ~/.ssh/known_hosts 2>/dev/null
      - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass.txt

  build:
    commands:
      - |
        ansible-playbook \
          -i inventory/${ENVIRONMENT}.ini \
          --vault-password-file /tmp/vault_pass.txt \
          playbooks/site.yml

  post_build:
    commands:
      - rm -f /tmp/vault_pass.txt ~/.ssh/id_rsa
```

## Setting Up the Pipeline with CloudFormation

Here is a CloudFormation template that creates the full pipeline.

```yaml
# cloudformation/pipeline.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: Ansible deployment pipeline

Parameters:
  GitHubRepo:
    Type: String
    Description: GitHub repository name
  GitHubBranch:
    Type: String
    Default: main

Resources:
  # IAM role for CodeBuild
  CodeBuildRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: codebuild.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: CodeBuildPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: '*'
              - Effect: Allow
                Action:
                  - secretsmanager:GetSecretValue
                Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:ansible-secrets*'
              - Effect: Allow
                Action:
                  - ssm:GetParameter
                  - ssm:GetParameters
                Resource: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/ansible/*'

  # CodeBuild project for linting
  LintProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: ansible-lint
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Source:
        Type: CODEPIPELINE
        BuildSpec: buildspec-lint.yml
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/amazonlinux2-x86_64-standard:5.0

  # CodeBuild project for staging deployment
  StagingProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: ansible-deploy-staging
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Source:
        Type: CODEPIPELINE
        BuildSpec: buildspec-deploy.yml
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/amazonlinux2-x86_64-standard:5.0
        EnvironmentVariables:
          - Name: ENVIRONMENT
            Value: staging

  # CodeBuild project for production deployment
  ProductionProject:
    Type: AWS::CodeBuild::Project
    Properties:
      Name: ansible-deploy-production
      ServiceRole: !GetAtt CodeBuildRole.Arn
      Source:
        Type: CODEPIPELINE
        BuildSpec: buildspec-deploy.yml
      Environment:
        Type: LINUX_CONTAINER
        ComputeType: BUILD_GENERAL1_SMALL
        Image: aws/codebuild/amazonlinux2-x86_64-standard:5.0
        EnvironmentVariables:
          - Name: ENVIRONMENT
            Value: production
```

## Storing Secrets in AWS Secrets Manager

Store your Ansible secrets in AWS Secrets Manager.

```bash
# Create a secret with SSH key and vault password
aws secretsmanager create-secret \
  --name ansible-secrets \
  --secret-string '{
    "ssh_private_key": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
    "vault_password": "your-vault-password"
  }'
```

Store per-environment configuration in SSM Parameter Store.

```bash
# Store staging host
aws ssm put-parameter \
  --name "/ansible/staging/target_host" \
  --value "10.0.1.10" \
  --type String

# Store production host
aws ssm put-parameter \
  --name "/ansible/production/target_host" \
  --value "10.0.2.10" \
  --type String
```

## Using a Custom Docker Image in CodeBuild

For faster builds, use a custom Docker image stored in ECR.

```yaml
# buildspec with custom image reference
Environment:
  Type: LINUX_CONTAINER
  ComputeType: BUILD_GENERAL1_SMALL
  Image: !Sub '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/ansible-runner:latest'
  ImagePullCredentialsType: SERVICE_ROLE
```

Build and push the custom image.

```bash
# Build the custom Ansible image
docker build -t ansible-runner -f Dockerfile.ansible .

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
docker tag ansible-runner:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ansible-runner:latest
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/ansible-runner:latest
```

## VPC Configuration for Private Targets

If your Ansible targets are in a private VPC, configure CodeBuild to run inside that VPC.

```yaml
# CodeBuild project with VPC configuration
StagingProject:
  Type: AWS::CodeBuild::Project
  Properties:
    VpcConfig:
      VpcId: vpc-12345678
      Subnets:
        - subnet-private-1
        - subnet-private-2
      SecurityGroupIds:
        - sg-codebuild
```

## Tips for AWS CodePipeline with Ansible

1. Use AWS Secrets Manager for SSH keys and vault passwords. The CodeBuild buildspec can reference secrets directly.
2. IAM roles control what CodeBuild can access. Follow least privilege and only grant access to the specific secrets and parameters needed.
3. CodeBuild runs in isolated containers. Each build starts fresh, so there is no state leakage between runs.
4. For private infrastructure, put CodeBuild in the same VPC as your targets. This avoids needing public IP addresses.
5. Use SSM Parameter Store for non-sensitive, per-environment configuration. It is cheaper than Secrets Manager for simple string values.
6. Manual approval actions in CodePipeline send SNS notifications. Set up the SNS topic to email your team.

AWS CodePipeline with CodeBuild gives you a fully managed deployment pipeline for Ansible. The native integration with IAM, Secrets Manager, and VPC makes it particularly well-suited for AWS-heavy environments.
