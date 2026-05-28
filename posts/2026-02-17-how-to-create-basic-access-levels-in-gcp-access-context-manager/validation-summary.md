# Validation Summary: How to Create Basic Access Levels in GCP Access Context Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Access Context Manager
- Basic access levels
- VPC Service Controls
- Google Cloud CLI
- YAML access level specifications

## Sources Consulted
- Google Cloud: Creating a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud SDK: gcloud access-context-manager levels create: https://cloud.google.com/sdk/gcloud/reference/access-context-manager/levels/create
- Google Cloud: Access Context Manager accessLevels REST reference: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud: Managing access levels: https://cloud.google.com/access-context-manager/docs/manage-access-levels
- Google Cloud: VPC Service Controls ingress and egress rules: https://cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud: Design access levels for VPC Service Controls: https://cloud.google.com/vpc-service-controls/docs/access-level-design

## Issues Found
- The `--basic-level-spec` YAML examples used a top-level `conditions:` key. The gcloud command expects the file to be a YAML-formatted list of condition objects, so each example was changed to a top-level list.
- The OR conditions section said multiple top-level conditions are combined with OR by default. Google Cloud documents the default combine function as AND, so the text was corrected and `--combine-function=or` was added to the example command.
- The prerequisites implied an access policy is created automatically when setting up VPC Service Controls. Google Cloud documentation instructs users to create an access policy if one does not exist, so the prerequisite was corrected.
- The common patterns section recommended Cloud Shell IP ranges for developer access. Google Cloud's VPC Service Controls access level design guidance says VPC Service Controls does not support Cloud Shell and recommends Cloud Workstations instead, so that item was corrected.

## Review Notes
The remaining gcloud commands, access level condition fields, device policy fields, member syntax, region syntax, required access level references, and ingress rule structure were checked against Google Cloud documentation and are technically valid.
