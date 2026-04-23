# Validation Summary: How to Remove an Environment from Portainer - From

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer UI
- Portainer HTTP API
- `curl`
- Python 3
- Docker environments
- Kubernetes environments
- Portainer Agent / Edge Agent

## Sources Consulted
- Portainer Environments documentation: https://docs.portainer.io/admin/environments/environments
- Portainer FAQ on changing environment connection without losing stacks: https://docs.portainer.io/faqs/troubleshooting/agents-and-environment-management/how-do-i-change-the-way-i-connect-to-an-environment-without-losing-my-existing-stacks
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://github.com/portainer/portainer-docs/blob/2.39/api/access.md
- Portainer API usage examples: https://github.com/portainer/portainer-docs/blob/2.39/api/examples.md
- Portainer Kubernetes agent documentation: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer Kubernetes Edge Agent documentation: https://docs.portainer.io/admin/environments/add/kubernetes/edge
- Portainer removal FAQ: https://docs.portainer.io/faqs/installing/how-do-i-remove-portainer
- Portainer source for environment deletion handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_delete.go
- Portainer source for API authentication handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go

## Issues Found
1. **UI removal steps were incorrect.** The original steps described finding an environment, creating a new configuration, applying settings, and saving changes, which is not how environment deletion works in Portainer. Updated the steps to match the documented removal flow: go to **Environment-related** > **Environments**, select the checkbox, click **Remove**, and confirm.
2. **API example did not remove anything.** The original API snippet only authenticated and listed environments. Added a validated `DELETE /api/endpoints/{id}` example so the code now performs the action described by the post.
3. **API terminology mismatch was unexplained.** Portainer uses the term "environment" in the UI, but the API routes still use `/api/endpoints`. Added a note so the route naming is technically clear to readers.
4. **The Kubernetes agent installation section was technically wrong for this topic.** It described installing an agent via Helm, which is not the removal workflow, and current Portainer docs state Kubernetes agent-only deployments use provided manifests while Helm agent-only charts are not yet generally documented there. Replaced the section with an accurate note that removing an environment from Portainer does not uninstall the Portainer Agent or Edge Agent, and that Docker stacks become orphaned and can be re-associated if the environment is added back.
5. **Best-practices example tags were broken placeholders.** Replaced the empty placeholder example with valid example tags.

## Review Notes
- Portainer documents both JWT-based authentication via `POST /api/auth` and access-token-based authentication via `X-API-Key`. The revised post keeps the JWT flow because it is still documented and supported, but access tokens are generally the better fit for ongoing automation.
- The post's description is technically consistent with current Portainer behavior: removing an environment removes it from Portainer management rather than deleting the underlying Docker host or Kubernetes cluster.
- No version-specific commands were pinned in the post. The validated behavior matches current Portainer 2.x documentation and the current Portainer source tree reviewed on April 23, 2026.
