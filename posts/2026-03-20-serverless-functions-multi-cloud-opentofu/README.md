# How to Deploy Serverless Functions Across Multiple Clouds with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Serverless, Multi-Cloud, AWS Lambda, Azure Function, Infrastructure as Code

Description: Learn how to use OpenTofu to deploy and manage serverless functions across AWS, Azure, and GCP from a single configuration using modules and provider aliases.

## Introduction

Deploying serverless functions across multiple cloud providers can be complex when done manually. OpenTofu's provider model and module system make it possible to manage AWS Lambda and Azure Functions from a single codebase.

## Project Structure

```text
serverless-multi-cloud/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── aws-lambda/
│   │   └── main.tf
│   └── azure-function/
│       └── main.tf
```

## Provider Configuration

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "azurerm" {
  subscription_id = var.azure_subscription_id
  features {}
}
```

## AWS Lambda Module

```hcl
# modules/aws-lambda/main.tf

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.function_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "fn" {
  function_name    = var.function_name
  runtime          = "python3.11"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_exec.arn
  filename         = var.zip_path
  source_code_hash = filebase64sha256(var.zip_path)

  environment {
    variables = var.env_vars
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_logs]
}
```

## Azure Function Module

```hcl
# modules/azure-function/main.tf
terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

resource "azurerm_storage_account" "sa" {
  name                     = var.storage_account_name
  resource_group_name      = var.resource_group
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "plan" {
  name                = "${var.function_name}-plan"
  resource_group_name = var.resource_group
  location            = var.location
  os_type             = "Linux"
  sku_name            = "EP1"
}

resource "azurerm_linux_function_app" "fn" {
  name                = var.function_name
  resource_group_name = var.resource_group
  location            = var.location
  service_plan_id     = azurerm_service_plan.plan.id

  storage_account_name       = azurerm_storage_account.sa.name
  storage_account_access_key = azurerm_storage_account.sa.primary_access_key
  zip_deploy_file            = var.zip_path

  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE = "1"
  }

  site_config {
    application_stack {
      python_version = "3.11"
    }
  }
}
```

## Calling the Modules in main.tf

```hcl
module "aws_hello" {
  source        = "./modules/aws-lambda"
  function_name = "hello-world-aws"
  zip_path      = "function.zip"
  env_vars      = { ENV = "production" }
}

module "azure_hello" {
  source               = "./modules/azure-function"
  function_name        = "hello-world-azure"
  resource_group       = "my-rg"
  location             = "East US"
  storage_account_name = "helloworldazsa001"
  zip_path             = "function.zip"
}
```

## Deploying

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

OpenTofu's multi-provider support and module system make it practical to manage serverless functions across cloud providers with consistent patterns, reducing operational overhead and keeping all configurations in one place.
