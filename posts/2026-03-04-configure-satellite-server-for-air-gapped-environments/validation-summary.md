# Validation Summary: How to Configure Satellite Server for Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Satellite
- Red Hat Enterprise Linux
- Hammer CLI
- Satellite content views
- Satellite content export and import
- Disconnected and air-gapped Satellite deployments
- Red Hat subscription manifests

## Sources Consulted
- Red Hat Satellite 6.18, Managing content: Content synchronization by using export and import: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html-single/managing_content/index
- Red Hat Satellite 6.18, Installing Satellite Server in a disconnected network environment: Configuring Inter-Satellite Synchronization by using exports: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/installing_satellite_server_in_a_disconnected_network_environment/index
- Red Hat Satellite 6.18 Hammer reference: content-export commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-content-export
- Red Hat Satellite 6.18 Hammer reference: subscription upload command: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-subscription

## Issues Found
- The post described the export host as either a connected Satellite or a connected RHEL host with `subscription-manager`. Red Hat's documented `hammer content-export` workflow exports from Satellite Server, so the architecture and setup text now identify a connected Satellite as the export system.
- The post instructed readers to install `satellite-maintain` as the content export tooling. The documented export workflow uses Hammer content export commands on Satellite, so that package installation step was removed.
- The export path examples omitted the timestamped export directory required by Satellite exports. The examples now show the timestamped directory beneath `/var/lib/pulp/exports/.../1.0/`.
- The transfer and import commands copied/imported the content view version parent directory rather than the exported timestamp directory. The examples now copy the complete timestamped export directory and import using the full path to that directory under `/var/lib/pulp/imports`.
- The post used `hammer organization update --redhat-repository-url file:///var/lib/pulp/imports/` to avoid CDN sync attempts. Current Red Hat documentation uses `hammer organization configure-cdn --type export_sync` for air-gapped export sync, so the command was corrected and placed before the import.
- The automation example used `--version "latest"` for incremental export. Red Hat's Hammer examples require a content view version number, so the command now uses `--version "2.0"` to match the earlier incremental export example.

## Review Notes
The post remains a concise overview and does not cover all operational prerequisites, such as matching Satellite versions for importable exports, required content exporter/importer roles, download policy requirements, storage sizing, or ensuring the manifest includes subscriptions for exported Red Hat repositories. Those are important production caveats but were not added because the review scope was limited to correcting technical errors without restructuring the post.
