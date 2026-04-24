# Validation Summary: How to Set Up the Edge Administrator Role in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute
- Portainer RBAC
- Portainer HTTP API
- `curl`
- Python 3

## Sources Consulted
- Portainer Roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer Edge Compute settings documentation: https://docs.portainer.io/2.21/admin/settings/edge
- Portainer Edge Groups documentation: https://docs.portainer.io/user/edge/groups
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer Business Edition API spec 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source, edge route access (`edge-admin`): https://github.com/portainer/portainer/blob/2.39.1/app/edge/__module.js
- Portainer source, endpoint type enum: https://github.com/portainer/portainer/blob/2.39.1/api/portainer.go
- Portainer source, frontend user update flow: https://github.com/portainer/portainer/blob/2.39.1/app/portainer/services/api/userService.js

## Issues Found
- The post said Edge Administrator is assigned from **Settings → Users**. Portainer’s official docs place Edge Administrator assignment under **Settings → Edge Compute** in the **Edge Compute access** section, so the UI steps were corrected.
- The API example used `role: 4` and created an Edge Administrator directly via `POST /api/users`. The official BE API spec documents regular-user creation with role `2`, and user update with role `3` for Edge Administrator, so the example was corrected to a two-step create-then-promote flow.
- The post implied Edge Administrator could be scoped by region or branch. Portainer documents Edge Administrator as having control over **all Edge environments**, so the deployment scenario and explanatory text were corrected.
- The section on Edge Groups described them as access delegation for Edge Administrators. Edge Groups are used to organize and target Edge deployments; they do not scope the Edge Administrator role itself, so that explanation was corrected.
- The Edge Group API examples used fields and matching behavior that did not align with the official API spec. The examples were updated to the documented payload fields and now show `TagIDs` plus `PartialMatch` for dynamic groups.
- The validation test filtered the wrong endpoint types (`4, 7, 8`) and used `/api/users` as a forbidden test. Portainer documents Edge endpoint types as `4` and `7`, and `/users` is an authenticated endpoint rather than an admin-only one, so the example now tests `/api/settings` and expects `403`.
- The capabilities section included unsupported or overly broad claims. It was tightened to match Portainer’s documented Edge Administrator scope and Edge Compute features.

## Review Notes
- Portainer’s documentation and API material are not perfectly aligned: the UI docs describe assigning Edge Administrators through **Settings → Edge Compute**, while the BE API spec also exposes Edge Administrator as role `3` on `PUT /users/{id}`.
- The public Portainer source repository is CE-oriented in some backend areas, but it still usefully confirms Edge route access, frontend promotion behavior, and Edge endpoint type values.
