# Validation Summary: How to Implement Nomad Rolling Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Nomad
- Nomad job specifications in HCL
- Nomad rolling deployments
- Nomad canary deployments
- Nomad service health checks
- Nomad CLI

## Sources Consulted
- HashiCorp Nomad update block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/update
- HashiCorp Nomad check block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/check
- HashiCorp Nomad service block documentation: https://developer.hashicorp.com/nomad/docs/job-specification/service
- HashiCorp Nomad blue-green and canary deployment documentation: https://developer.hashicorp.com/nomad/docs/job-declare/strategy/blue-green-canary
- HashiCorp Nomad deployment promote command reference: https://developer.hashicorp.com/nomad/commands/deployment/promote
- HashiCorp Nomad deployment status command reference: https://developer.hashicorp.com/nomad/commands/deployment/status
- HashiCorp Nomad deployment fail command reference: https://developer.hashicorp.com/nomad/commands/deployment/fail
- HashiCorp Nomad job revert command reference: https://developer.hashicorp.com/nomad/commands/job/revert
- HashiCorp Nomad job history command reference: https://developer.hashicorp.com/nomad/commands/job/history

## Issues Found
- The canary section implied that simply not promoting a canary can trigger automatic reversion. Nomad's documented rollback behavior is tied to a failed deployment, and unhealthy canaries should be handled by failing the deployment or otherwise replacing/reverting the job. Updated the sentence to say that failing an unhealthy canary deployment can trigger `auto_revert`.
- The rollback command was incomplete. `nomad job revert` requires both a job ID and a version number or tag. Updated the example to show `nomad job history -p api` followed by `nomad job revert api <version>`.
- The best-practices section referenced `nomad deployment status` without the required deployment ID or prefix. Updated it to `nomad deployment status <deployment-id>`.

## Review Notes
The `update` block fields, service check fields, `nomad deployment promote <deployment-id>`, and the general rolling deployment explanation match the current HashiCorp Nomad documentation. The local environment did not have the `nomad` CLI installed, so CLI verification was performed against official HashiCorp command documentation.
