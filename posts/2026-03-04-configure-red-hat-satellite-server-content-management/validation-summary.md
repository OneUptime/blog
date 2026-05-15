# Validation Summary: How to Configure a Red Hat Satellite Server for Content Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Satellite 6.x
- Hammer CLI
- Red Hat Enterprise Linux content repositories
- Red Hat subscription manifests
- Satellite content views, lifecycle environments, sync plans, and activation keys

## Sources Consulted
- Red Hat Satellite 6.18 Managing content: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html-single/managing_content/index
- Red Hat Satellite 6.18 Hammer reference, subscription upload: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-subscription
- Red Hat Satellite 6.18 Hammer reference, content views and content view versions: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-view
- Red Hat Satellite 6.18 Hammer reference, content view filters: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-view-filter
- Red Hat Satellite 6.18 Hammer reference, sync plans: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-sync-plan
- Red Hat Satellite 6.18 Hammer reference, activation keys: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-activation-key
- Red Hat Satellite connected installation docs for Satellite Client 6 repository names: https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html-single/installing_satellite_server_in_a_connected_network_environment/index

## Issues Found
- The manifest generation instructions pointed only to the Red Hat Customer Portal subscription allocation flow. Current Red Hat Satellite 6.18 documentation directs connected Satellite users to the Red Hat Hybrid Cloud Console and keeps the Customer Portal path for disconnected Satellite servers. Updated the instructions accordingly.
- The Satellite Client repository example used `Red Hat Satellite Client 6 for RHEL x86_64 (RPMs)`, which omits the RHEL major version. Updated it to the documented RHEL 9 repository set name, `Red Hat Satellite Client 6 for RHEL 9 x86_64 (RPMs)`.
- The content view promotion commands did not specify a version. Red Hat's Hammer CLI examples promote a specific content view version with `--version`; added `--version 1` to match the initial publish described in the post.

## Review Notes
- The rest of the Hammer commands and options reviewed are consistent with the Red Hat Satellite 6.18 Hammer reference.
- Repository names in content views can vary by enabled release and repository label; using repository IDs from `hammer repository list` remains the most robust operational approach, though the post's name-based examples are plausible for the RHEL 9 repositories shown.
