# How to Set Up Terraform in CircleCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CircleCI, CI/CD, Infrastructure as Code, DevOps, Automation

Description: Build a Terraform CI/CD pipeline in CircleCI with orbs, approval workflows, caching, and multi-environment deployment strategies for automated infrastructure management.

---

CircleCI is known for fast builds and a clean configuration format. If your team uses CircleCI for application deployments, it makes sense to keep your Terraform infrastructure pipelines there too. CircleCI's workflow system, approval jobs, and context-based secrets work well for the plan-review-apply pattern that Terraform deployments need.

This post covers setting up Terraform in CircleCI from scratch, including using the official Terraform orb, building custom pipelines, and configuring multi-environment deployments with approval gates.

## Using the Terraform Orb

CircleCI orbs are reusable packages of configuration. The official Terraform orb from CircleCI gives you pre-built commands and jobs:

```yaml
# .circleci/config.yml
version: 2.1

# Import the Terraform orb
orbs:
  terraform: circleci/terraform@3.2

# Use orb commands directly
workflows:
  deploy:
    jobs:
      - terraform/validate:
          checkout: true
          path: terraform
      - terraform/plan:
          checkout: true
          path: terraform
          context: aws-credentials
      - hold:
          type: approval
          requires:
            - terraform/plan
      - terraform/apply:
          checkout: true
          path: terraform
          context: aws-credentials
          requires:
            - hold
          filters:
            branches:
              only: main
```

The orb handles Terraform installation, initialization, and command execution. The `context` reference pulls in credentials stored in CircleCI's organization-level contexts.

## Setting Up Contexts for Credentials

CircleCI contexts store environment variables that are shared across projects. Create contexts for each environment:

1. Go to Organization Settings in CircleCI
2. Click "Contexts"
3. Create contexts: `aws-dev`, `aws-staging`, `aws-production`

In each context, add the relevant environment variables:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1
```

Contexts can be restricted to specific security groups, so only authorized users can trigger jobs that use production credentials.

## Custom Pipeline Without Orbs

For more control, build your pipeline from scratch:

```yaml
# .circleci/config.yml
version: 2.1

# Define reusable commands
commands:
  install-terraform:
    description: "Install a specific version of Terraform"
    parameters:
      version:
        type: string
        default: "1.7.5"
    steps:
      - run:
          name: Install Terraform
          command: |
            wget -q "https://releases.hashicorp.com/terraform/<< parameters.version >>/terraform_<< parameters.version >>_linux_amd64.zip"
            unzip -o "terraform_<< parameters.version >>_linux_amd64.zip"
            sudo mv terraform /usr/local/bin/
            terraform version

  terraform-init:
    description: "Initialize Terraform with backend configuration"
    parameters:
      working_directory:
        type: string
        default: terraform
      backend_config:
        type: string
        default: ""
    steps:
      - run:
          name: Terraform Init
          working_directory: << parameters.working_directory >>
          command: |
            if [ -n "<< parameters.backend_config >>" ]; then
              terraform init -input=false -backend-config="<< parameters.backend_config >>"
            else
              terraform init -input=false
            fi

# Define jobs
jobs:
  validate:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - install-terraform
      - terraform-init:
          working_directory: terraform
      - run:
          name: Terraform Validate
          working_directory: terraform
          command: |
            terraform validate
            terraform fmt -check -diff

  plan:
    docker:
      - image: cimg/base:stable
    parameters:
      environment:
        type: string
    steps:
      - checkout
      - install-terraform
      - terraform-init:
          working_directory: terraform
          backend_config: "environments/<< parameters.environment >>/backend.hcl"
      - run:
          name: Terraform Plan
          working_directory: terraform
          command: |
            terraform plan \
              -var-file="environments/<< parameters.environment >>/terraform.tfvars" \
              -out=tfplan \
              -input=false
      - run:
          name: Show Plan
          working_directory: terraform
          command: terraform show -no-color tfplan > plan.txt
      # Save the plan for the apply job
      - persist_to_workspace:
          root: .
          paths:
            - terraform/tfplan
            - terraform/plan.txt
      # Store plan as an artifact for review
      - store_artifacts:
          path: terraform/plan.txt
          destination: terraform-plan

  apply:
    docker:
      - image: cimg/base:stable
    parameters:
      environment:
        type: string
    steps:
      - checkout
      - install-terraform
      - attach_workspace:
          at: .
      - terraform-init:
          working_directory: terraform
          backend_config: "environments/<< parameters.environment >>/backend.hcl"
      - run:
          name: Terraform Apply
          working_directory: terraform
          command: terraform apply -input=false tfplan

# Define workflows
workflows:
  terraform-deploy:
    jobs:
      - validate

      - plan:
          name: plan-dev
          environment: dev
          context: aws-dev
          requires:
            - validate

      - apply:
          name: apply-dev
          environment: dev
          context: aws-dev
          requires:
            - plan-dev
          filters:
            branches:
              only: main

      - plan:
          name: plan-staging
          environment: staging
          context: aws-staging
          requires:
            - apply-dev

      - approve-staging:
          type: approval
          requires:
            - plan-staging

      - apply:
          name: apply-staging
          environment: staging
          context: aws-staging
          requires:
            - approve-staging

      - plan:
          name: plan-production
          environment: production
          context: aws-production
          requires:
            - apply-staging

      - approve-production:
          type: approval
          requires:
            - plan-production

      - apply:
          name: apply-production
          environment: production
          context: aws-production
          requires:
            - approve-production
```

## Caching Terraform Providers

Provider downloads can be slow. Cache them across builds:

```yaml
jobs:
  plan:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - install-terraform

      # Restore provider cache
      - restore_cache:
          keys:
            - terraform-providers-{{ checksum "terraform/.terraform.lock.hcl" }}
            - terraform-providers-

      - terraform-init:
          working_directory: terraform

      # Save provider cache
      - save_cache:
          key: terraform-providers-{{ checksum "terraform/.terraform.lock.hcl" }}
          paths:
            - terraform/.terraform/providers

      - run:
          name: Plan
          working_directory: terraform
          command: terraform plan -out=tfplan -input=false
```

## Using Docker Images

Instead of installing Terraform in every job, use the official Docker image:

```yaml
jobs:
  plan:
    docker:
      - image: hashicorp/terraform:1.7.5
    steps:
      - checkout
      - run:
          name: Init and Plan
          working_directory: terraform
          command: |
            terraform init -input=false
            terraform plan -out=tfplan -input=false
```

This is faster since Terraform is pre-installed in the image.

## OIDC Authentication with CircleCI

CircleCI supports OIDC for AWS authentication, eliminating the need for stored credentials:

```yaml
jobs:
  plan:
    docker:
      - image: cimg/base:stable
    environment:
      AWS_DEFAULT_REGION: us-east-1
    steps:
      - checkout
      - install-terraform

      # Use CircleCI OIDC to get AWS credentials
      - run:
          name: Configure AWS Credentials
          command: |
            # Get the OIDC token from CircleCI
            OIDC_TOKEN=$(curl -s -H "Authorization: Bearer ${CIRCLE_OIDC_TOKEN_V2}" \
              "${CIRCLE_OIDC_TOKEN_URL}" | jq -r '.oidc_token')

            # Assume the AWS role using the OIDC token
            CREDS=$(aws sts assume-role-with-web-identity \
              --role-arn "arn:aws:iam::123456789012:role/circleci-terraform" \
              --role-session-name "circleci-${CIRCLE_BUILD_NUM}" \
              --web-identity-token "${OIDC_TOKEN}" \
              --output json)

            # Export credentials for Terraform
            echo "export AWS_ACCESS_KEY_ID=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')" >> $BASH_ENV
            echo "export AWS_SECRET_ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')" >> $BASH_ENV
            echo "export AWS_SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')" >> $BASH_ENV

      - terraform-init:
          working_directory: terraform
      - run:
          name: Terraform Plan
          working_directory: terraform
          command: terraform plan -out=tfplan -input=false
```

## Pull Request-Only Plans

Run plans on pull requests without applying:

```yaml
workflows:
  # PR workflow - plan only
  pr-check:
    jobs:
      - validate:
          filters:
            branches:
              ignore: main
      - plan:
          name: plan-dev
          environment: dev
          context: aws-dev
          requires:
            - validate
          filters:
            branches:
              ignore: main

  # Main branch workflow - plan and apply
  deploy:
    jobs:
      - validate:
          filters:
            branches:
              only: main
      - plan:
          name: plan-dev
          environment: dev
          context: aws-dev
          requires:
            - validate
      - apply:
          name: apply-dev
          environment: dev
          context: aws-dev
          requires:
            - plan-dev
```

## Resource Classes for Performance

Use larger resource classes for plans that process many resources:

```yaml
jobs:
  plan-large:
    docker:
      - image: hashicorp/terraform:1.7.5
    resource_class: large  # 4 vCPUs, 8 GB RAM
    steps:
      - checkout
      - run:
          name: Plan
          working_directory: terraform
          command: |
            terraform init -input=false
            terraform plan -out=tfplan -input=false
          no_output_timeout: 30m  # Increase timeout for large plans
```

## Conclusion

CircleCI provides a clean platform for Terraform CI/CD with its workflow system handling the plan-approval-apply pattern naturally. The Terraform orb gets you started quickly, while custom pipelines give you full control. Contexts keep credentials secure and environment-scoped, and approval jobs give the right people control over production deployments. Whether you use the orb or build custom, CircleCI's fast execution and workspace system make it a solid choice for Terraform automation.

For another CI/CD platform option, see our guide on [setting up Terraform in Bitbucket Pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-terraform-in-bitbucket-pipelines/view).
