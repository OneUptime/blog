# How to Configure Red Hat Hybrid Cloud Console Cloud Integrations for AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hybrid Cloud Console, AWS, Red Hat

Description: Configure Red Hat Hybrid Cloud Console integrations for AWS.

---

## Overview

Configure Red Hat Hybrid Cloud Console integrations for AWS. A cloud integration lets Hybrid Cloud Console services use data from your AWS account, including cost management and the RHEL management bundle.

## Prerequisites

- A Red Hat account with Organization Administrator permissions or Cloud Administrator permissions
- An AWS account that you want to connect to the Hybrid Cloud Console
- AWS IAM permissions for `CreatePolicy`, `CreateRole`, `AttachRolePolicy`, `GetPolicy`, and `GetRole`
- For the recommended account authorization method, an AWS access key ID and secret access key

## Step 1 - Choose Your Integration Services

You can connect an AWS integration to Hybrid Cloud Console services such as:

1. **Cost management** - track and analyze AWS cloud costs
2. **RHEL management bundle** - use Red Hat gold images and autoregistration for RHEL systems on AWS
3. **Red Hat Insights images** - launch customized RHEL images in AWS

## Step 2 - Add the AWS Integration

In the Red Hat Hybrid Cloud Console:

1. Go to **Settings > Integrations** and select the **Cloud** tab.
2. Click **Add integration** to open the cloud integration wizard.
3. Select **Amazon Web Services**, and then click **Next**.
4. Enter a descriptive integration name, such as `my_aws_integration`, and then click **Next**.

## Step 3 - Configure Account Authorization

For the recommended configuration mode, select **Account authorization**. This lets Red Hat configure and manage the integration after you provide your AWS access key ID and secret access key.

After you enter the AWS credentials, select the Hybrid Cloud Console services that you want the integration to use. Cost Management and RHEL management services are selected by default when they are available.

## Step 4 - Configure Manual Access

If you do not want to provide AWS account authorization credentials to Red Hat, select **Manual configuration** instead. The wizard provides the AWS IAM role and policy instructions that you must complete in your AWS account.

If you select a service such as Cost Management, follow the service-specific instructions shown in the wizard before continuing.

## Step 5 - Review and Add the Integration

On the **Review details** page, verify the AWS account and service selections. Click **Add** to create the AWS cloud integration.

After the integration is added, return to the **Integrations** page and select the **Cloud** tab. Confirm that your AWS integration is listed and that its status is **Ready**.

## Step 6 - Manage the Integration

From the **Integrations** page, you can edit the integration, pause or resume data collection, or remove the integration when it is no longer needed.

## Summary

You have learned how to configure Red Hat Hybrid Cloud Console cloud integrations for AWS. After the AWS account is connected, Hybrid Cloud Console services can use AWS data for the services you selected, such as cost management and RHEL management.
