# Validation Summary: How to Set Up Azure CDN Caching Rules for Static Website Content

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure CDN Standard from Microsoft (classic)
- Azure CDN rules engine
- Azure CLI
- Azure Blob Storage static website hosting
- HTTP Cache-Control headers
- CDN cache purge workflows

## Sources Consulted
- Azure CLI documentation for `az cdn endpoint`: https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint?view=azure-cli-latest
- Azure CLI documentation for `az cdn endpoint rule`: https://learn.microsoft.com/en-us/cli/azure/cdn/endpoint/rule?view=azure-cli-latest
- Azure Blob Storage static website CLI documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob/service-properties?view=azure-cli-latest
- Azure Front Door and Azure CDN service comparison and classic-tier retirement information: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-cdn-comparison
- Microsoft CDN rule resource schema for cache expiration duration format: https://learn.microsoft.com/en-us/azure/templates/microsoft.cdn/profiles/rulesets/rules
- HTTP caching specification, RFC 9111: https://www.rfc-editor.org/rfc/rfc9111

## Issues Found
- The post originally created a new `Standard_Microsoft` Azure CDN profile and endpoint. Microsoft documentation states that Azure CDN Standard from Microsoft (classic) no longer supports new profile creation as of August 15, 2025. I changed the post to apply to existing CDN Standard from Microsoft endpoints and removed the new CDN profile/endpoint creation commands.
- The prerequisites implied that creating a new Standard Microsoft CDN endpoint was still a normal path. I updated the prerequisite to note that new deployments should use Azure Front Door Standard or Premium.
- Step 2 described `--query-string-caching-behavior` as global cache behavior. That flag controls query-string handling in the CDN cache key, not general cache expiration behavior. I corrected the heading, description, and command comment.
- The `BypassCaching` explanation said "Never cache," which was too broad. Azure CLI documentation defines it as preventing caching for requests that contain query strings. I corrected the description.
- The HTML cache duration used `0.00:05:00`. Azure CDN rule documentation expects cache durations in `[d.]hh:mm:ss` form, so I changed it to `00:05:00`.
- After removing new CDN creation commands, the remaining commands still used example resource, profile, and endpoint names. I added a note instructing readers to replace those values with their existing CDN resource group, profile, and endpoint names.
- The cleanup command could be read as deleting all CDN resources even though the revised post now targets an existing CDN endpoint. I narrowed the cleanup comment to the demo origin resource group.

## Review Notes
- The Azure CDN `az cdn endpoint rule` command group is documented as preview, but it remains the documented CLI path for delivery rules on CDN endpoints.
- Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
