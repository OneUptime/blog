# Validation Summary: How to Set Up RHEL Pay-As-You-Go Subscriptions on AWS Marketplace

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL)
- Amazon EC2
- AWS Marketplace AMI subscriptions
- AWS CLI
- Red Hat Subscription Management
- Red Hat Update Infrastructure (RHUI)
- DNF repositories

## Sources Consulted
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services (AWS): https://access.redhat.com/solutions/15356
- Red Hat Customer Portal: How do I identify an official Red Hat Enterprise Linux AMI on Amazon EC2?: https://access.redhat.com/solutions/99333
- Red Hat Documentation: Getting Started with RHEL System Registration, auto-registration v2: https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/getting_started_with_rhel_system_registration
- Red Hat Developer: Auto-registration v2: Easier management of Red Hat Enterprise Linux on AWS: https://developers.redhat.com/articles/2026/01/29/auto-registration-v2-easier-management-red-hat-enterprise-linux-aws
- AWS CLI Command Reference: ec2 describe-images: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI Command Reference: ec2 run-instances: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS Marketplace Buyer Guide: Paying for products in AWS Marketplace: https://docs.aws.amazon.com/marketplace/latest/buyerguide/buyer-paying-for-products.html
- AWS Systems Manager User Guide: How security patches are selected, RHEL repository IDs: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-selecting-patches.html

## Issues Found
- The post said PAYG instances use AWS-provided RHUI repositories and not the Red Hat CDN. That is accurate for older RHEL PAYG images, but it is no longer universally correct for current AWS Marketplace images: Red Hat documentation states that RHEL 9.7 and later AWS Marketplace AMIs sold by Red Hat use auto-registration v2 and pull updates from the Red Hat CDN by default, with RHUI turned off. Updated the verification and key-differences sections to distinguish RHEL 9.7+ auto-registration/CDN behavior from older RHUI-based PAYG images.

## Review Notes
The AWS CLI examples use valid `describe-images` and `run-instances` options. The Red Hat owner account ID `309956199498` matches Red Hat's documented account for official RHEL AMIs in standard AWS Regions; GovCloud uses a different Red Hat owner ID.
