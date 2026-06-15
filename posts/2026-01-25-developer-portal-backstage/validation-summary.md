# Validation Summary: How to Configure a Developer Portal with Backstage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Backstage
- Backstage Software Catalog
- Backstage TechDocs
- Backstage Software Templates / Scaffolder
- Backstage GitHub integrations
- Backstage GitHub authentication
- Backstage Kubernetes plugin
- MkDocs
- PostgreSQL
- Kubernetes

## Sources Consulted
- Backstage Getting Started: https://backstage.io/docs/getting-started/
- Backstage PostgreSQL database configuration: https://backstage.io/docs/getting-started/config/database/
- Backstage GitHub authentication provider: https://backstage.io/docs/auth/github/provider/
- Backstage sign-in identities and resolvers: https://backstage.io/docs/auth/identity-resolver/
- Backstage GitHub locations: https://backstage.io/docs/integrations/github/locations/
- Backstage GitHub discovery provider: https://backstage.io/docs/integrations/github/discovery/
- Backstage GitHub organizational data provider: https://backstage.io/docs/integrations/github/org/
- Backstage catalog descriptor format: https://backstage.io/docs/features/software-catalog/descriptor-format/
- Backstage TechDocs configuration: https://backstage.io/docs/features/techdocs/configuration/
- Backstage TechDocs getting started: https://backstage.io/docs/features/techdocs/getting-started/
- Backstage software templates documentation: https://backstage.io/docs/features/software-templates/writing-templates/
- Backstage Kubernetes plugin installation: https://backstage.io/docs/features/kubernetes/installation/
- Backstage Kubernetes configuration: https://backstage.io/docs/features/kubernetes/configuration/

## Issues Found
- The getting started command used `yarn dev`, but current Backstage generated apps are started with `yarn start`. Updated the command and removed the database prompt that is not shown in the current official getting started flow.
- The GitHub auth configuration used nonstandard environment variable names and omitted the required sign-in resolver for using GitHub as a login provider. Updated the snippet to use `AUTH_GITHUB_CLIENT_ID`, `AUTH_GITHUB_CLIENT_SECRET`, and `signIn.resolvers`.
- The catalog GitHub organization and discovery examples used older `catalog.locations` entries. Updated them to the current documented `catalog.providers.github` and `catalog.providers.githubOrg` configuration.
- The catalog entity example used `github.com/workflows`, which is not a documented Backstage catalog annotation, and `pagerduty.com/integration-key`, which has a newer `pagerduty.com/service-id` alternative. Removed the workflow annotation and switched the PagerDuty example to `pagerduty.com/service-id`.
- The Scaffolder `OwnerPicker` example used `allowedKinds`; current Backstage examples use `ui:options.catalogFilter.kind`. Updated the owner picker configuration.
- The Kubernetes plugin section showed manual old-frontend route wiring but omitted the required backend plugin import. Updated it to include the documented `backend.add(import('@backstage/plugin-kubernetes-backend'))` registration.

## Review Notes
The remaining snippets are illustrative and still require a real Backstage app to have the relevant backend modules installed and registered for GitHub auth, GitHub discovery, GitHub org ingestion, TechDocs, Scaffolder, and Kubernetes. For production, the TechDocs local publisher and `skipTLSVerify: true` Kubernetes example should be replaced with production-grade storage and TLS settings.
