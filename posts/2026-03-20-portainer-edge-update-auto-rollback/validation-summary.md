# Validation Summary: How to Update Edge Agents with Automatic Rollback

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer HTTP API
- Bash / curl
- Python 3 JSON parsing

## Sources Consulted
- Portainer Documentation: Update & Rollback - https://docs.portainer.io/admin/environments/update
- Portainer Documentation: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer Documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer Documentation: API usage examples - https://docs.portainer.io/api/examples
- Portainer API Documentation (BE 2.39.1 OpenAPI) - https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The post described Portainer Edge Agent updates as supporting automatic rollback on failure. Portainer's current docs describe updates and rollbacks as separate scheduled actions on the Update & Rollback page, so I changed the title, description, introduction, rollback explanation, and conclusion to match the documented behavior.
- The Web UI navigation and form fields were incorrect. I changed the path from `Edge Compute -> Edge Update Schedules` to `Environment-related -> Update & Rollback`, replaced the undocumented "Add schedule" flow and rollback checkbox/timeout fields, and aligned the form fields with the official schedule form.
- The post implied the feature applies generally to Edge environments. I added the documented limitation that Update & Rollback is currently beta and only available for Edge Agents running on Docker Standalone environments.
- The examples used hardcoded outdated version `2.21.0` and did not reflect Portainer's requirement to match agent and server versions. I updated the examples to use `2.39.1` as the current LTS example as of 2026-04-24 and clarified that the agent version must match the Portainer Server version.
- The API examples used the wrong endpoint path and request schema. I changed `/api/edge/update_schedules` to `/api/edge_update_schedules` and replaced the unsupported lowercase fields (`name`, `version`, `groupIds`, `rollback`, `rollbackTimeout`, etc.) with the published BE 2.39.1 payload fields (`Name`, `Type`, `ScheduledTime`, `GroupIDs`, `AgentImage`, `UpdaterImage`).
- The monitoring example parsed undocumented response keys such as `Name`, `Status`, `SuccessCount`, and `FailedCount`. I rewrote the example to use the list endpoint's documented lowercase fields (`id`, `name`, `status`, `statusMessage`, `type`) and to inspect a single schedule with the published inspect endpoint.
- The staged rollout example targeted environments directly. I changed it to use separate Edge Groups, which is the documented scheduling target for the Update & Rollback feature.

## Review Notes
- Portainer's docs currently describe this feature as beta and limited to Docker Standalone Edge Agents.
- The UI exposes a version selector, but the BE 2.39.1 OpenAPI spec documents image-based API fields (`AgentImage`, `UpdaterImage`) rather than a `Version` field for schedule creation.
- Portainer publishes `/api/edge_update_schedules/agent_versions` for supported versions and `/api/edge_update_schedules/previous_versions` for rollback candidates.
- Runtime execution against a live Portainer instance was not possible in this workspace; validation was done against Portainer's current official documentation and BE 2.39.1 OpenAPI schema.
