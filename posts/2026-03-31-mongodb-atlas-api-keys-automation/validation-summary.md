# Validation Summary: How to Configure Atlas API Keys for Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Admin API v2
- Atlas CLI (`atlas`)
- curl with HTTP Digest authentication
- GitHub Actions (CI/CD workflow)
- Terraform (`mongodbatlas` provider)
- Shell scripting (Bash)

## Sources Consulted
- MongoDB Atlas CLI `atlas organizations apikeys create` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-apikeys-create/
- MongoDB Atlas CLI `atlas projects apikeys create` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-projects-apikeys-create/
- MongoDB Atlas CLI `atlas organizations apikeys accesslists create` documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-organizations-apikeys-accesslists-create/
- MongoDB Atlas Admin API v2 — List Clusters endpoint: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas API authentication (Digest auth): https://www.mongodb.com/docs/atlas/api/api-authentication/
- MongoDB Atlas versioned API overview: https://www.mongodb.com/docs/atlas/api/versioned-api-overview/
- MongoDB Atlas pause/resume cluster: https://www.mongodb.com/docs/atlas/pause-terminate-cluster/
- Terraform MongoDB Atlas provider configuration: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs
- MongoDB Atlas user roles reference: https://www.mongodb.com/docs/atlas/reference/user-roles/

## Issues Found
- **Missing `Accept` header in GitHub Actions curl command**: The GitHub Actions workflow example used `curl` with `--header "Content-Type: application/json"` but was missing the `Accept: application/vnd.atlas.2023-01-01+json` header. The shell script example earlier in the post correctly included this header. Without the versioned `Accept` header, the Atlas API v2 may not return the expected response format or could default to an older API version. Added the missing header for consistency and correctness.

## Review Notes
- The API version date `2023-01-01` used in the `Accept` header is valid but not the latest available. More recent dates (e.g., `2025-03-12`) are now available. The post's usage is still correct since Atlas supports older version dates.
- MongoDB is transitioning toward recommending service accounts over programmatic API keys for new integrations. The post's approach using API keys remains valid and widely used but may warrant a future update when service accounts become the standard recommendation.
- The CIDR example `10.0.0.0/16` is a private IP range, which is valid for self-hosted CI runners but less common for cloud-hosted CI/CD platforms that use public egress IPs. The example adequately demonstrates the syntax.
- All Atlas CLI commands, flags, role names (`ORG_GROUP_CREATOR`, `GROUP_CLUSTER_MANAGER`), API endpoints, Terraform provider arguments, and environment variable names were verified as correct.
